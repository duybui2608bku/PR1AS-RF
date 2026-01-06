import { VNPay, HashAlgorithm } from "vnpay";
import type { BuildPaymentUrl, ReturnQueryFromVNPay } from "vnpay/types-only";
import { config } from "../../config";
import { VNPAY_CONSTANTS } from "../../constants/wallet";
import { AppError } from "../../utils/AppError";
import { ErrorCode } from "../../types/common/error.types";
import { WALLET_MESSAGES } from "../../constants/messages";
import { HTTP_STATUS } from "../../constants/httpStatus";

const getHashAlgorithm = (): HashAlgorithm => {
  const algo = config.vnpay.hashAlgorithm.toUpperCase();
  if (algo === "SHA512") return HashAlgorithm.SHA512;
  if (algo === "SHA256") return HashAlgorithm.SHA256;
  return HashAlgorithm.MD5;
};

const vnpayInstance = new VNPay({
  tmnCode: config.vnpay.tmnCode,
  secureSecret: config.vnpay.secureSecret,
  vnpayHost: config.vnpay.vnpayHost,
  testMode: config.vnpay.testMode,
  hashAlgorithm: getHashAlgorithm(),
  enableLog: config.nodeEnv === "development",
});

export const buildDepositPaymentUrl = (
  amount: number,
  _userId: string,
  transactionId: string,
  ipAddress: string
): string => {
  if (!config.vnpay.tmnCode || !config.vnpay.secureSecret) {
    throw AppError.internal(WALLET_MESSAGES.PAYMENT_VERIFICATION_FAILED);
  }

  const createDate = new Date();
  const vnpCreateDate = parseInt(
    `${createDate.getFullYear()}${String(createDate.getMonth() + 1).padStart(2, "0")}${String(createDate.getDate()).padStart(2, "0")}${String(createDate.getHours()).padStart(2, "0")}${String(createDate.getMinutes()).padStart(2, "0")}${String(createDate.getSeconds()).padStart(2, "0")}`,
    10
  );

  const paymentParams = {
    vnp_Amount: amount * 100,
    vnp_Command: "pay",
    vnp_CreateDate: vnpCreateDate,
    vnp_CurrCode: "VND" as const,
    vnp_IpAddr: ipAddress,
    vnp_Locale: "vn" as const,
    vnp_OrderInfo: `${VNPAY_CONSTANTS.ORDER_INFO_PREFIX} - ${transactionId}`,
    vnp_OrderType: "other" as const,
    vnp_ReturnUrl: config.vnpay.returnUrl,
    vnp_TxnRef: transactionId,
    vnp_Version: "2.1.0",
  } as unknown as BuildPaymentUrl;

  const paymentUrl = vnpayInstance.buildPaymentUrl(paymentParams);

  return paymentUrl;
};

export const verifyPaymentReturn = (
  queryParams: Record<string, string>
): {
  isSuccess: boolean;
  transactionId: string;
  responseCode: string;
  amount: number;
  gatewayTransactionId: string;
} => {
  if (!config.vnpay.tmnCode || !config.vnpay.secureSecret) {
    throw AppError.internal(WALLET_MESSAGES.PAYMENT_VERIFICATION_FAILED);
  }

  const verifyParams = queryParams as unknown as ReturnQueryFromVNPay;

  const verifyResult = vnpayInstance.verifyReturnUrl(verifyParams);

  if (!verifyResult.isSuccess) {
    throw new AppError(
      WALLET_MESSAGES.PAYMENT_VERIFICATION_FAILED,
      HTTP_STATUS.BAD_REQUEST,
      ErrorCode.WALLET_PAYMENT_VERIFICATION_FAILED
    );
  }

  const transactionId = queryParams.vnp_TxnRef || "";
  const responseCode = queryParams.vnp_ResponseCode || "";
  const amount = parseInt(queryParams.vnp_Amount || "0", 10) / 100;
  const gatewayTransactionId = queryParams.vnp_TransactionNo || "";

  return {
    isSuccess: verifyResult.isSuccess,
    transactionId,
    responseCode,
    amount,
    gatewayTransactionId,
  };
};

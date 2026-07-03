import { Request, Response } from "express";
import { voucherService } from "../../services/voucher";
import { COMMON_MESSAGES, VOUCHER_MESSAGES } from "../../constants/messages";
import { R, validateWithSchema } from "../../utils";
import {
  createVouchersSchema,
  listVouchersQuerySchema,
  redeemVoucherSchema,
  updateVoucherSchema,
  voucherIdParamSchema,
} from "../../validations/voucher";
import { AuthRequest } from "../../middleware/auth";
import { extractUserIdFromRequest } from "../../utils";

export class VoucherController {
  async createVouchers(req: AuthRequest, res: Response): Promise<void> {
    const adminId = extractUserIdFromRequest(req);
    const payload = validateWithSchema(
      createVouchersSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const vouchers = await voucherService.createVouchers(adminId, payload);
    R.created(res, vouchers, VOUCHER_MESSAGES.VOUCHER_CREATED, req);
  }

  async listVouchers(req: Request, res: Response): Promise<void> {
    const query = validateWithSchema(
      listVouchersQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const result = await voucherService.listVouchers(query);
    R.success(res, result, VOUCHER_MESSAGES.VOUCHERS_FETCHED, req);
  }

  async getVoucherById(req: Request, res: Response): Promise<void> {
    const { id } = validateWithSchema(voucherIdParamSchema, req.params);
    const voucher = await voucherService.getVoucherById(id);
    R.success(res, voucher, VOUCHER_MESSAGES.VOUCHER_FETCHED, req);
  }

  async updateVoucher(req: Request, res: Response): Promise<void> {
    const { id } = validateWithSchema(voucherIdParamSchema, req.params);
    const payload = validateWithSchema(
      updateVoucherSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const voucher = await voucherService.updateVoucher(id, payload);
    R.success(res, voucher, VOUCHER_MESSAGES.VOUCHER_UPDATED, req);
  }

  async deleteVoucher(req: Request, res: Response): Promise<void> {
    const { id } = validateWithSchema(voucherIdParamSchema, req.params);
    await voucherService.deleteVoucher(id);
    R.success(res, null, VOUCHER_MESSAGES.VOUCHER_DELETED, req);
  }

  async redeemVoucher(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const payload = validateWithSchema(
      redeemVoucherSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const pricing = await voucherService.redeemVoucher(userId, payload.code);
    R.success(res, pricing, VOUCHER_MESSAGES.VOUCHER_REDEEMED, req);
  }
}

export const voucherController = new VoucherController();

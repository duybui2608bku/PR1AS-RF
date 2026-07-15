import { UserWalletService } from "./user-wallet.service";
import { walletRepository } from "../../repositories/wallet/wallet.repository";
import { TransactionStatus } from "../../constants/wallet";

jest.mock("../../repositories/wallet/wallet.repository", () => ({
  walletRepository: {
    findById: jest.fn(),
    expireIfDue: jest.fn(),
    expirePendingDeposits: jest.fn(),
  },
}));

const repo = walletRepository as jest.Mocked<typeof walletRepository>;
const service = new UserWalletService();

const USER_ID = "6512aaaa0000000000000001";
const TXN_ID = "6512bbbb0000000000000002";

const pendingTxn = (over: Record<string, unknown> = {}) =>
  ({
    _id: { toString: () => TXN_ID },
    user_id: USER_ID,
    status: TransactionStatus.PENDING,
    expires_at: new Date(Date.now() - 60_000),
    ...over,
  }) as never;

beforeEach(() => jest.clearAllMocks());

it("lazy-expires an overdue pending deposit on read", async () => {
  repo.findById.mockResolvedValue(pendingTxn());
  repo.expireIfDue.mockResolvedValue(
    pendingTxn({ status: TransactionStatus.EXPIRED }) as never
  );

  const result = await service.getWalletTransactionById(USER_ID, TXN_ID);

  expect(repo.expireIfDue).toHaveBeenCalledWith(TXN_ID, expect.any(Date));
  expect((result as { status: TransactionStatus }).status).toBe(
    TransactionStatus.EXPIRED
  );
});

it("does not expire a pending deposit that is not yet due", async () => {
  repo.findById.mockResolvedValue(
    pendingTxn({ expires_at: new Date(Date.now() + 60_000) })
  );

  const result = await service.getWalletTransactionById(USER_ID, TXN_ID);

  expect(repo.expireIfDue).not.toHaveBeenCalled();
  expect((result as { status: TransactionStatus }).status).toBe(
    TransactionStatus.PENDING
  );
});

it("does not touch a non-pending transaction", async () => {
  repo.findById.mockResolvedValue(
    pendingTxn({ status: TransactionStatus.SUCCESS, expires_at: new Date(Date.now() - 60_000) })
  );

  await service.getWalletTransactionById(USER_ID, TXN_ID);

  expect(repo.expireIfDue).not.toHaveBeenCalled();
});

it("expirePendingDeposits delegates to the repository", async () => {
  repo.expirePendingDeposits.mockResolvedValue(3);
  const count = await service.expirePendingDeposits();
  expect(count).toBe(3);
});

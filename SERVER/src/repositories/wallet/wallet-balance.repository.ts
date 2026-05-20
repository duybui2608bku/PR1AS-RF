import { Wallet } from "../../models/wallet";
import { IWalletDocument } from "../../types/wallet";
import { ClientSession } from "mongoose";

export class WalletBalanceRepository {
  async findByUserId(userId: string): Promise<IWalletDocument | null> {
    return Wallet.findOne({ user_id: userId });
  }

  async createOrUpdate(
    userId: string,
    balance: number,
    session?: ClientSession
  ): Promise<IWalletDocument> {
    return Wallet.findOneAndUpdate(
      { user_id: userId },
      {
        user_id: userId,
        balance: Math.max(0, balance),
        updated_at: new Date(),
      },
      { upsert: true, new: true, session }
    );
  }

  async updateBalance(
    userId: string,
    balance: number
  ): Promise<IWalletDocument | null> {
    return Wallet.findOneAndUpdate(
      { user_id: userId },
      {
        balance: Math.max(0, balance),
        updated_at: new Date(),
      },
      { new: true }
    );
  }

  /**
   * Atomically decrement balance only if it is greater than or equal to amount.
   * Returns null if insufficient balance — caller must treat as a failure.
   */
  async atomicDeduct(
    userId: string,
    amount: number,
    session?: ClientSession
  ): Promise<IWalletDocument | null> {
    return Wallet.findOneAndUpdate(
      { user_id: userId, balance: { $gte: amount } },
      {
        $inc: { balance: -amount },
        $set: { updated_at: new Date() },
      },
      { new: true, session }
    );
  }

  /**
   * Atomically increment balance (upserts the wallet doc if missing).
   */
  async atomicCredit(
    userId: string,
    amount: number,
    session?: ClientSession
  ): Promise<IWalletDocument> {
    return Wallet.findOneAndUpdate(
      { user_id: userId },
      {
        $inc: { balance: amount },
        $set: { updated_at: new Date() },
        $setOnInsert: { user_id: userId },
      },
      { upsert: true, new: true, session }
    );
  }

  async findAllUserIds(): Promise<string[]> {
    const wallets = await Wallet.find({}).select("user_id").lean();
    return wallets.map((wallet) => String(wallet.user_id));
  }
}

export const walletBalanceRepository = new WalletBalanceRepository();

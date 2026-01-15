import { Wallet } from "../../models/wallet";
import { IWalletDocument } from "../../types/wallet";

export class WalletBalanceRepository {
  async findByUserId(userId: string): Promise<IWalletDocument | null> {
    return Wallet.findOne({ user_id: userId });
  }

  async createOrUpdate(
    userId: string,
    balance: number
  ): Promise<IWalletDocument> {
    return Wallet.findOneAndUpdate(
      { user_id: userId },
      {
        user_id: userId,
        balance: Math.max(0, balance),
        updated_at: new Date(),
      },
      { upsert: true, new: true }
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

  async findAllUserIds(): Promise<string[]> {
    const wallets = await Wallet.find({}).select("user_id").lean();
    return wallets.map((wallet) => wallet.user_id);
  }
}

export const walletBalanceRepository = new WalletBalanceRepository();

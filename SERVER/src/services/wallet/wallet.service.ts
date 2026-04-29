import { UserWalletService } from "./user-wallet.service";
import { AdminWalletService } from "./admin-wallet.service";

class WalletService extends UserWalletService {
  private readonly admin = new AdminWalletService();

  getAdminTransactionHistory = this.admin.getAdminTransactionHistory.bind(this.admin);
  getTransactionStats = this.admin.getTransactionStats.bind(this.admin);
  getTopUsers = this.admin.getTopUsers.bind(this.admin);
  getTransactionChartData = this.admin.getTransactionChartData.bind(this.admin);
}

export const walletService = new WalletService();
export type { WalletService };

import { SiteLayout } from "@/components/layout/site-layout"
import { WalletDepositPage } from "@/components/wallet/wallet-deposit-page"

export default function WalletDepositRoutePage() {
  return (
    <SiteLayout hideFooter>
      <WalletDepositPage />
    </SiteLayout>
  )
}

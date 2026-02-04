"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/lib/components/auth-guard";
import { DepositModal } from "@/lib/components/deposit-modal";
import { AppRoute } from "@/lib/constants/routes";

function DepositContent() {
  const router = useRouter();
  const [depositModalOpen, setDepositModalOpen] = useState<boolean>(true);

  const handleClose = (): void => {
    setDepositModalOpen(false);
    router.push(AppRoute.CLIENT_WALLET);
  };

  return <DepositModal open={depositModalOpen} onClose={handleClose} />;
}

export default function DepositPage() {
  return (
    <AuthGuard>
      <DepositContent />
    </AuthGuard>
  );
}

 "use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/lib/components/auth-guard";
import { Breakpoint } from "@/lib/constants/ui.constants";
import { GroupChatView } from "./components/GroupChatView";
import styles from "../chat.module.scss";

function GroupChatContent() {
  const [isMobile, setIsMobile] = useState(false);
  const [showGroupList, setShowGroupList] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      const isMobileView = window.innerWidth < Breakpoint.MOBILE;
      setIsMobile(isMobileView);
      if (!isMobileView) {
        setShowGroupList(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className={styles.chatContainer}>
      <GroupChatView
        isMobile={isMobile}
        showGroupList={showGroupList}
        onBackToGroupList={() => setShowGroupList(true)}
        onGroupListVisibilityChange={setShowGroupList}
      />
    </div>
  );
}

export default function GroupChatPage() {
  return (
    <AuthGuard>
      <GroupChatContent />
    </AuthGuard>
  );
}


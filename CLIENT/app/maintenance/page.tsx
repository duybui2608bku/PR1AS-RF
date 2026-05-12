import type { Metadata } from "next"
import styles from "./maintenance.module.scss"

const MESSAGE =
  "Chào bạn, hiện tại trang web đang trong quá trình nâng cấp và hoàn thiện các tính năng cuối cùng để mang lại trải nghiệm tốt nhất. Chúng tôi sẽ sớm quay trở lại."

export const metadata: Metadata = {
  title: "PR1AS — Đang nâng cấp",
  description: MESSAGE,
}

export default function MaintenancePage() {
  return (
    <main className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.title}>Đang nâng cấp</h1>
        <p className={styles.message}>{MESSAGE}</p>
      </div>
    </main>
  )
}

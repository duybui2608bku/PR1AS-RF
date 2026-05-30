import * as React from "react"

// template.tsx remount mỗi lần điều hướng → hiệu ứng vào trang phát lại,
// tạo cảm giác chuyển màn hình như app native thay vì "nháy trắng".
// motion-reduce: tắt animation cho người dùng bật giảm chuyển động (a11y).
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out motion-reduce:animate-none">
      {children}
    </div>
  )
}

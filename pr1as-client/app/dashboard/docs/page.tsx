"use client"

import * as React from "react"
import {
  BellRing,
  BookOpen,
  CalendarCheck,
  CreditCard,
  Gem,
  Mail,
  MessageSquare,
  MessagesSquare,
  ShieldAlert,
  ShieldCheck,
  Star,
  Users,
  Wrench,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// ─── Types ──────────────────────────────────────────────────────────────────

type Icon = React.ComponentType<{ className?: string }>

interface ConfigItem {
  label: string
  value: string
}

interface ModuleDoc {
  id: string
  title: string
  icon: Icon
  /** Short one-line summary shown under the title. */
  summary: string
  /** Core capabilities, written as plain statements. */
  features: string[]
  /** Concrete numbers / enums the system enforces. */
  config?: ConfigItem[]
  /** Events that send the user an email (in addition to in-app). */
  emails?: string[]
}

// ─── Documentation content ────────────────────────────────────────────────────
// Nguồn sự thật: SERVER/src/constants, SERVER/src/services. Khi đổi logic ở
// backend, cập nhật lại nội dung dưới đây để tài liệu không bị lệch.

const MODULES: ModuleDoc[] = [
  {
    id: "user",
    title: "Người dùng & Xác thực",
    icon: Users,
    summary:
      "Quản lý tài khoản, vai trò, trạng thái và toàn bộ vòng đời đăng nhập của người dùng.",
    features: [
      "Một tài khoản có thể mang nhiều vai trò: Khách hàng (Client), Người thực hiện (Worker) và Quản trị (Admin). Hệ thống ghi nhớ vai trò đang hoạt động gần nhất để hiển thị đúng giao diện.",
      "Tài khoản có 6 trạng thái: ACTIVE (hoạt động), PENDING_VERIFY (chờ xác minh email), INACTIVE (vô hiệu hoá tạm thời), BANNED (bị khoá), PENDING_DELETE (chờ xoá) và DELETED (đã xoá, đã xoá thông tin cá nhân).",
      "Admin có thể KHOÁ tài khoản (BANNED), MỞ KHOÁ (về ACTIVE) hoặc VÔ HIỆU HOÁ (INACTIVE). Khoá là biện pháp xử phạt; vô hiệu hoá chỉ tạm ẩn, dữ liệu giữ nguyên và có thể bật lại.",
      "Đăng ký bằng email/mật khẩu phải xác minh email mới đăng nhập được. Đăng ký qua Google được bỏ qua bước này vì Google đã xác thực địa chỉ.",
      "Người dùng tự yêu cầu xoá tài khoản → chuyển sang PENDING_DELETE, đóng băng 30 ngày. Đăng nhập lại trong thời gian này sẽ khôi phục tài khoản. Hết hạn, hệ thống tự xoá thông tin cá nhân (PII) nhưng vẫn giữ bản ghi để các tham chiếu lịch sử (booking, đánh giá, giao dịch) không bị gãy.",
      "Bảo mật: mật khẩu băm bằng bcrypt; đăng nhập cấp JWT access token (15 phút) + refresh token (7 ngày, băm trong DB).",
    ],
    config: [
      { label: "JWT access token", value: "Hết hạn sau 15 phút" },
      { label: "JWT refresh token", value: "Hết hạn sau 7 ngày" },
      { label: "Thời gian đóng băng trước khi xoá", value: "30 ngày" },
      {
        label: "Admin được phép đặt trạng thái",
        value: "ACTIVE, BANNED, INACTIVE",
      },
    ],
    emails: [
      "Khi khoá tài khoản (BANNED): gửi email + thông báo, mức độ KHẨN CẤP, kèm lý do.",
      "Khi mở khoá tài khoản (về ACTIVE): gửi email + thông báo báo người dùng có thể đăng nhập lại.",
    ],
  },
  {
    id: "booking",
    title: "Đặt lịch (Booking)",
    icon: CalendarCheck,
    summary:
      "Vòng đời đặt lịch giữa khách hàng và người thực hiện, có cơ chế tự động xác nhận / hoàn thành / hết hạn.",
    features: [
      "Luồng trạng thái chính: PENDING (chờ worker xác nhận) → CONFIRMED → IN_PROGRESS → PENDING_CLIENT_ACCEPTANCE (worker báo xong, chờ khách xác nhận) → COMPLETED. Ngoài ra có CANCELLED, REJECTED, DISPUTED, EXPIRED.",
      "Khi đã IN_PROGRESS, không bên nào được huỷ đơn phương để tránh tranh chấp về chi phí. Mọi vấn đề phát sinh phải đi qua trạng thái DISPUTED để admin phân xử.",
      "Cron job tự động: hết hạn booking worker không xác nhận kịp, tự hoàn thành sau khi worker báo xong mà khách không phản hồi.",
      "Khung giờ booking bị khoá lịch của worker (unique index) nên không thể đặt trùng giờ một worker đang có lịch.",
      "Hệ thống PR1AS không giữ tiền trung gian cho booking — không có cơ chế ký quỹ (escrow) hay cổng thanh toán gắn vào booking.",
    ],
    config: [
      { label: "Đặt trước tối thiểu", value: "2 giờ" },
      { label: "Đặt trước tối đa", value: "30 ngày" },
      { label: "Tự xác nhận (auto-confirm)", value: "24 giờ" },
      { label: "Tự hoàn thành (auto-complete)", value: "2 giờ" },
      {
        label: "Hạn chót worker xác nhận trước giờ bắt đầu",
        value: "6 giờ",
      },
      { label: "Huỷ miễn phí trước", value: "24 giờ" },
      { label: "Thời lượng mỗi booking", value: "1 giờ – 24 giờ / tối đa 30 ngày" },
    ],
    emails: [
      "Nhắc lịch trước giờ bắt đầu (24 giờ và 1 giờ): gửi qua in-app + email + push.",
      "Tạo booking mới, đổi trạng thái, huỷ, cập nhật: gửi thông báo cho bên còn lại (mặc định qua in-app + email + push tuỳ tuỳ chọn của người dùng).",
    ],
  },
  {
    id: "dispute",
    title: "Khiếu nại & Tranh chấp",
    icon: MessageSquare,
    summary:
      "Cơ chế khiếu nại booking, có cửa sổ thời gian giới hạn và do admin đứng ra phân xử.",
    features: [
      "Cả khách hàng và người thực hiện đều có thể mở khiếu nại (worker cũng có quyền để không bị thiệt khi khách từ chối xác nhận hoàn thành).",
      "Chỉ mở được khiếu nại khi booking đang IN_PROGRESS, PENDING_CLIENT_ACCEPTANCE hoặc COMPLETED.",
      "Với booking đã COMPLETED, chỉ được mở khiếu nại trong vòng 3 ngày kể từ khi lịch hẹn KẾT THÚC. Quá hạn coi như chấp nhận kết quả, không thể khiếu nại nữa.",
      "Mỗi booking chỉ mở được một khiếu nại.",
      "Admin phân xử: nghiêng về khách (FAVOR_CLIENT) → booking chuyển HUỶ; nghiêng về worker (FAVOR_WORKER) → booking chuyển HOÀN THÀNH.",
    ],
    config: [
      {
        label: "Cửa sổ khiếu nại (booking đã hoàn thành)",
        value: "3 ngày kể từ khi lịch hẹn kết thúc",
      },
      {
        label: "Trạng thái cho phép mở khiếu nại",
        value: "IN_PROGRESS, PENDING_CLIENT_ACCEPTANCE, COMPLETED",
      },
    ],
    emails: [
      "Khi có khiếu nại mới: thông báo cho worker và admin, mức độ KHẨN CẤP.",
      "Khi khiếu nại được xử lý xong: thông báo cho cả hai bên kèm kết quả.",
    ],
  },
  {
    id: "wallet",
    title: "Ví & Giao dịch",
    icon: CreditCard,
    summary:
      "Nạp / rút / thanh toán / hoàn tiền qua cổng SePay, toàn bộ giao dịch dùng VND.",
    features: [
      "Bốn loại giao dịch: NẠP (deposit), RÚT (withdraw), THANH TOÁN (payment), HOÀN TIỀN (refund). Trạng thái: chờ xử lý, thành công, thất bại, đã huỷ.",
      "Cổng thanh toán hiện dùng SePay (nạp qua mã QR, mã thanh toán có tiền tố PRAS).",
      "Toàn bộ ví, booking và bảng giá hiện khoá cứng đơn vị tiền tệ là VND.",
      "Cron đối soát số dư định kỳ: nếu phát hiện lệch giữa số dư lưu và số dư tính lại, gửi cảnh báo cho admin.",
    ],
    config: [
      { label: "Nạp tối thiểu / tối đa", value: "100đ – 50.000.000đ" },
      { label: "Rút tối thiểu / tối đa", value: "10.000đ – 50.000.000đ" },
      { label: "Số dư tối thiểu", value: "0đ" },
      { label: "Cổng thanh toán", value: "SePay (QR)" },
    ],
    emails: [
      "Cảnh báo đối soát số dư lệch: gửi email cho admin, mức độ KHẨN CẤP.",
      "Các sự kiện ví của người dùng: gửi thông báo in-app, mức độ cao.",
    ],
  },
  {
    id: "pricing",
    title: "Gói dịch vụ (Pricing)",
    icon: Gem,
    summary:
      "Ba gói thành viên cho worker với bộ tính năng và hạn mức khác nhau.",
    features: [
      "STANDARD (miễn phí): không nhắn tin chủ động, đăng tối đa 1 tin tuyển/việc, có quảng cáo hiển thị, không đẩy hồ sơ.",
      "GOLD (199.000đ/tháng): nhắn tin tối đa 3 người nhận, đăng tối đa 3 tin, đẩy hồ sơ 1 lần/tháng, có quảng cáo.",
      "DIAMOND (399.000đ/tháng): nhắn tin không giới hạn người nhận, đăng tin không giới hạn, đẩy hồ sơ 3 lần/tháng, không hiển thị quảng cáo.",
      "Chính sách gia hạn: gia hạn cùng gói thì cộng dồn số ngày còn lại; nâng cấp sang gói khác thì bỏ số ngày còn lại của gói cũ và bắt đầu lại theo gói mới.",
    ],
    config: [
      { label: "STANDARD", value: "Miễn phí" },
      { label: "GOLD", value: "199.000đ / tháng" },
      { label: "DIAMOND", value: "399.000đ / tháng" },
    ],
  },
  {
    id: "moderation",
    title: "Kiểm duyệt & Báo cáo",
    icon: ShieldAlert,
    summary:
      "Tiếp nhận báo cáo vi phạm, xử lý nội dung và áp dụng lệnh hạn chế tính năng.",
    features: [
      "Người dùng báo cáo bài viết hoặc worker với các lý do: lừa đảo, chất lượng thấp, quấy rối, hồ sơ giả mạo, khác.",
      "Báo cáo có vòng trạng thái: mở (open) → đang xử lý (reviewing) → đã xử lý (resolved) hoặc bị từ chối (rejected).",
      "Admin có thể áp dụng lệnh hạn chế: cấm ĐĂNG BÀI (post_create) hoặc cấm HOẠT ĐỘNG WORKER (worker_activity). Lệnh cấm có thời hạn hoặc vĩnh viễn, và có thể được gỡ.",
      "Admin xoá bài vi phạm: tự động thông báo cho tác giả kèm lý do và (nếu có) lệnh cấm đi kèm.",
    ],
    config: [
      {
        label: "Lý do báo cáo",
        value: "Lừa đảo, Chất lượng thấp, Quấy rối, Hồ sơ giả, Khác",
      },
      {
        label: "Loại hạn chế",
        value: "Cấm đăng bài, Cấm hoạt động worker",
      },
    ],
    emails: [
      "Khi bài viết bị admin xoá: gửi email + thông báo cho tác giả.",
      "Khi báo cáo về một worker được xử lý xong: gửi email kết luận cho worker.",
      "Khi áp dụng lệnh hạn chế tính năng: gửi email + thông báo cho người bị hạn chế.",
    ],
  },
  {
    id: "reputation",
    title: "Điểm uy tín (Reputation)",
    icon: ShieldCheck,
    summary:
      "Hệ thống điểm uy tín 0–100 cho worker, ảnh hưởng tới quyền sử dụng tính năng.",
    features: [
      "Mỗi worker có điểm uy tín thang 0–100. Hoàn thành booking đúng hạn giúp duy trì điểm; vi phạm/để booking hết hạn làm giảm điểm.",
      "Khi điểm tụt xuống dưới 30, worker bị hạn chế một số tính năng.",
      "Admin cấu hình được mức điểm cộng/trừ cho từng hành vi tại trang Cấu hình điểm.",
    ],
    config: [
      { label: "Thang điểm", value: "0 – 100" },
      { label: "Ngưỡng bị hạn chế tính năng", value: "Dưới 30 điểm" },
    ],
    emails: [
      "Cảnh báo điểm uy tín thấp: gửi qua in-app + push (cảnh báo người dùng cải thiện).",
    ],
  },
  {
    id: "chat",
    title: "Chat & Tin nhắn",
    icon: MessagesSquare,
    summary:
      "Nhắn tin thời gian thực 1-1 và nhóm qua Socket.IO, có chặn người dùng.",
    features: [
      "Nhắn tin thời gian thực qua Socket.IO, hỗ trợ hội thoại 1-1 và nhóm.",
      "Có trạng thái đã đọc (read receipts), đếm số tin chưa đọc, tải lịch sử tin nhắn theo trang.",
      "Người dùng có thể chặn nhau (block) — không thể tự chặn chính mình.",
      "Quyền nhắn tin chủ động và số người nhận tối đa phụ thuộc gói dịch vụ (xem mục Gói dịch vụ).",
    ],
    emails: [
      "Tin nhắn mới (1-1 hoặc nhóm): gửi thông báo qua in-app + push (không gửi email).",
    ],
  },
  {
    id: "review",
    title: "Đánh giá (Review)",
    icon: Star,
    summary: "Khách hàng và worker đánh giá lẫn nhau sau khi hoàn thành booking.",
    features: [
      "Đánh giá gắn với một booking cụ thể giữa khách hàng và worker.",
      "Hỗ trợ tạo mới và cập nhật đánh giá; bên còn lại được thông báo.",
    ],
    emails: [
      "Có đánh giá mới hoặc đánh giá được cập nhật: gửi thông báo qua in-app + push.",
    ],
  },
  {
    id: "notification",
    title: "Thông báo (Notification)",
    icon: BellRing,
    summary:
      "Lớp thông báo đa kênh dùng chung cho mọi module, có tuỳ chọn theo người dùng.",
    features: [
      "Ba kênh gửi: trong ứng dụng (in-app, realtime qua Socket.IO), email (Nodemailer) và push trình duyệt (Web Push).",
      "Mỗi người dùng có tuỳ chọn (preferences) bật/tắt từng kênh; hệ thống dùng dedupe key để chống gửi trùng cùng một sự kiện.",
      "Phân loại theo nhóm: booking, tranh chấp, ví, chat, đánh giá, uy tín, quản trị, bảo mật.",
      "Mức độ ưu tiên: thường (normal), cao (high), khẩn cấp (urgent) — ảnh hưởng cách hiển thị và kênh gửi.",
    ],
  },
  {
    id: "marketing",
    title: "Email Marketing & Thông báo chung",
    icon: Mail,
    summary:
      "Công cụ admin gửi chiến dịch email và đăng thông báo (announcement) toàn hệ thống.",
    features: [
      "Admin tạo và gửi chiến dịch email marketing tới người dùng.",
      "Admin đăng thông báo chung (announcement) hiển thị cho người dùng.",
      "Trang Phản hồi (feedback) tổng hợp góp ý người dùng gửi về.",
    ],
  },
  {
    id: "settings",
    title: "Cài đặt hệ thống & Bảo trì",
    icon: Wrench,
    summary:
      "Cấu hình danh tính thương hiệu, SEO, liên kết mạng xã hội và chế độ bảo trì.",
    features: [
      "Cấu hình tên trang, logo, favicon, mô tả — dùng chung cho giao diện và email.",
      "Cấu hình SEO (URL trang, email liên hệ, ảnh Open Graph, từ khoá, Twitter handle) và liên kết mạng xã hội.",
      "Chế độ bảo trì: khi BẬT, mọi người dùng (trừ admin) bị chuyển hướng tới trang thông báo bảo trì với nội dung tuỳ chỉnh.",
      "Có thể đặt lại toàn bộ cài đặt về mặc định.",
    ],
    config: [
      {
        label: "Lưu ý SEO",
        value:
          "Một số thay đổi (tên trang, favicon) chỉ có hiệu lực sau khi cập nhật biến môi trường và re-deploy",
      },
    ],
  },
]

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionBlock({
  heading,
  children,
}: {
  heading: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
        {heading}
      </p>
      {children}
    </div>
  )
}

function ModuleCard({ module }: { module: ModuleDoc }) {
  const Icon = module.icon
  return (
    <Card id={module.id} className="scroll-mt-6">
      <CardHeader className="border-b bg-muted/30 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base">{module.title}</CardTitle>
            <CardDescription className="mt-1 text-sm">
              {module.summary}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <SectionBlock heading="Tính năng">
          <ul className="space-y-2">
            {module.features.map((feature, idx) => (
              <li
                key={idx}
                className="flex gap-2.5 text-sm leading-relaxed text-foreground/90"
              >
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </SectionBlock>

        {module.config && module.config.length > 0 ? (
          <>
            <Separator />
            <SectionBlock heading="Cấu hình / Tham số">
              <div className="grid gap-2 sm:grid-cols-2">
                {module.config.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border bg-background/50 px-3 py-2"
                  >
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="mt-0.5 text-sm font-medium">{item.value}</p>
                  </div>
                ))}
              </div>
            </SectionBlock>
          </>
        ) : null}

        {module.emails && module.emails.length > 0 ? (
          <>
            <Separator />
            <SectionBlock heading="Email & Thông báo tự động">
              <ul className="space-y-2">
                {module.emails.map((line, idx) => (
                  <li
                    key={idx}
                    className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-200"
                  >
                    <Mail className="mt-0.5 size-4 shrink-0" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </SectionBlock>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AdminDocsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <BookOpen className="size-6" />
          Tài liệu hệ thống
        </h1>
        <p className="text-sm text-muted-foreground">
          Tổng hợp các tính năng, cấu hình và quy tắc tự động của PR1AS theo
          từng module. Chọn tab để xem chi tiết từng module.
        </p>
      </div>

      <Tabs defaultValue={MODULES[0].id} className="gap-5">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1.5 bg-transparent p-0">
          {MODULES.map((m) => {
            const Icon = m.icon
            return (
              <TabsTrigger
                key={m.id}
                value={m.id}
                className="gap-1.5 rounded-lg border bg-muted/40 px-3 py-1.5 text-xs data-[state=active]:border-primary/40 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <Icon className="size-3.5" />
                {m.title}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {MODULES.map((m) => (
          <TabsContent key={m.id} value={m.id} className="mt-0">
            <ModuleCard module={m} />
          </TabsContent>
        ))}
      </Tabs>

      <p className="text-center text-xs text-muted-foreground/70">
        Tài liệu này được biên soạn từ cấu hình thực tế của hệ thống. Khi thay
        đổi logic ở backend, vui lòng cập nhật lại trang này để tránh sai lệch.
      </p>
    </div>
  )
}

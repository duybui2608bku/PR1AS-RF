import { SiteLayout } from "@/components/layout/site-layout"

export const metadata = {
  title: "Chính sách bảo mật",
}

export default function PrivacyPage() {
  return (
    <SiteLayout>
      <section className="container mx-auto max-w-3xl px-4 py-14 md:py-20">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Chính sách bảo mật</h1>
        <p className="mb-10 text-sm text-muted-foreground">Cập nhật lần cuối: tháng 5 năm 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h2 className="mb-3 text-base font-semibold text-foreground">1. Thông tin chúng tôi thu thập</h2>
            <p>
              Chúng tôi thu thập các thông tin bạn cung cấp khi đăng ký tài khoản bao gồm: họ và tên, địa chỉ
              email, số điện thoại, và thông tin thanh toán. Ngoài ra, chúng tôi có thể thu thập dữ liệu sử
              dụng như địa chỉ IP, loại trình duyệt, trang bạn truy cập và thời gian sử dụng nhằm cải thiện
              trải nghiệm dịch vụ.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-foreground">2. Mục đích sử dụng thông tin</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Tạo và quản lý tài khoản của bạn.</li>
              <li>Xử lý giao dịch và thanh toán.</li>
              <li>Gửi thông báo liên quan đến dịch vụ, bao gồm xác nhận đặt lịch và cập nhật hệ thống.</li>
              <li>Cải thiện và phát triển tính năng sản phẩm.</li>
              <li>Tuân thủ các nghĩa vụ pháp lý.</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-foreground">3. Chia sẻ thông tin</h2>
            <p>
              Chúng tôi không bán, trao đổi hoặc chuyển nhượng thông tin cá nhân của bạn cho bên thứ ba,
              ngoại trừ các đối tác cung cấp dịch vụ hỗ trợ vận hành nền tảng (ví dụ: cổng thanh toán) và
              trong trường hợp pháp luật yêu cầu.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-foreground">4. Bảo mật dữ liệu</h2>
            <p>
              Chúng tôi áp dụng các biện pháp kỹ thuật và tổ chức phù hợp để bảo vệ thông tin cá nhân của
              bạn trước nguy cơ truy cập trái phép, mất mát hoặc phá hủy. Mật khẩu được mã hóa một chiều và
              mọi kết nối đều sử dụng giao thức HTTPS.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-foreground">5. Cookie</h2>
            <p>
              Chúng tôi sử dụng cookie phiên để duy trì trạng thái đăng nhập và cookie phân tích để hiểu
              cách người dùng tương tác với nền tảng. Bạn có thể vô hiệu hóa cookie trong cài đặt trình
              duyệt, tuy nhiên một số tính năng có thể không hoạt động đúng.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-foreground">6. Quyền của bạn</h2>
            <p>
              Bạn có quyền truy cập, chỉnh sửa hoặc yêu cầu xóa thông tin cá nhân của mình bất kỳ lúc nào
              bằng cách liên hệ với chúng tôi qua email hỗ trợ. Chúng tôi sẽ phản hồi trong vòng 7 ngày làm
              việc.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-foreground">7. Liên hệ</h2>
            <p>
              Nếu bạn có bất kỳ câu hỏi nào về chính sách bảo mật này, vui lòng liên hệ với chúng tôi qua
              email được hiển thị ở chân trang.
            </p>
          </div>
        </div>
      </section>
    </SiteLayout>
  )
}

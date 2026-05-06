import { SiteLayout } from "@/components/layout/site-layout"

export const metadata = {
  title: "Điều khoản sử dụng",
}

export default function TermsPage() {
  return (
    <SiteLayout>
      <section className="container mx-auto max-w-3xl px-4 py-14 md:py-20">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">
          Điều khoản sử dụng
        </h1>
        <p className="mb-10 text-sm text-muted-foreground">
          Cập nhật lần cuối: tháng 5 năm 2026
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              1. Chấp nhận điều khoản
            </h2>
            <p>
              Bằng cách truy cập hoặc sử dụng nền tảng, bạn đồng ý bị ràng buộc
              bởi các điều khoản và điều kiện này. Nếu bạn không đồng ý với bất
              kỳ phần nào, vui lòng không sử dụng dịch vụ.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              2. Tài khoản người dùng
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Bạn phải đủ 18 tuổi trở lên để đăng ký và sử dụng dịch vụ.
              </li>
              <li>
                Bạn chịu trách nhiệm bảo mật thông tin đăng nhập của mình.
              </li>
              <li>
                Mỗi người dùng chỉ được tạo một tài khoản. Tài khoản trùng lặp
                có thể bị xóa.
              </li>
              <li>
                Thông tin tài khoản phải chính xác và được cập nhật kịp thời.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              3. Sử dụng dịch vụ
            </h2>
            <p>Bạn đồng ý không sử dụng nền tảng để:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Vi phạm bất kỳ luật pháp hoặc quy định hiện hành nào.</li>
              <li>Gửi nội dung spam, lừa đảo hoặc gây hại.</li>
              <li>
                Xâm phạm quyền riêng tư hoặc sở hữu trí tuệ của người khác.
              </li>
              <li>
                Phá hoại hoặc can thiệp vào hệ thống và máy chủ của chúng tôi.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              4. Thanh toán và hoàn tiền
            </h2>
            <p>
              Các giao dịch nạp ví được xử lý qua cổng thanh toán được chứng
              nhận. Số dư trong ví chỉ có thể được sử dụng trên nền tảng. Chúng
              tôi không hoàn trả số dư ví trừ khi có lỗi kỹ thuật được xác nhận
              từ phía hệ thống.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              5. Gói dịch vụ
            </h2>
            <p>
              Các gói nâng cấp (Gold, Diamond) có hiệu lực theo chu kỳ thanh
              toán đã chọn. Gói tự động gia hạn trừ khi bạn hủy trước ngày gia
              hạn. Chúng tôi có quyền thay đổi giá hoặc tính năng gói với thông
              báo trước ít nhất 30 ngày.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              6. Chấm dứt tài khoản
            </h2>
            <p>
              Chúng tôi có quyền tạm ngừng hoặc xóa tài khoản nếu phát hiện hành
              vi vi phạm điều khoản, gian lận hoặc gây hại cho người dùng khác.
              Bạn cũng có thể yêu cầu xóa tài khoản bất kỳ lúc nào bằng cách
              liên hệ với bộ phận hỗ trợ.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              7. Giới hạn trách nhiệm
            </h2>
            <p>
              Dịch vụ được cung cấp theo trạng thái &quot;như hiện tại&quot;.
              Chúng tôi không đảm bảo dịch vụ luôn hoạt động liên tục và không
              chịu trách nhiệm về thiệt hại gián tiếp phát sinh từ việc sử dụng
              nền tảng.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              8. Thay đổi điều khoản
            </h2>
            <p>
              Chúng tôi có thể cập nhật điều khoản này định kỳ. Mọi thay đổi sẽ
              được thông báo qua email hoặc thông báo trong ứng dụng. Việc tiếp
              tục sử dụng dịch vụ sau khi thay đổi được áp dụng đồng nghĩa với
              việc bạn chấp nhận điều khoản mới.
            </p>
          </div>
        </div>
      </section>
    </SiteLayout>
  )
}

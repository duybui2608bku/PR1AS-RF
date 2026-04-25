# Báo cáo các tính năng đã hoàn thành - PR1AS

Ngày cập nhật: 25/04/2026

## 1. Tổng quan

PR1AS là nền tảng kết nối khách hàng với người cung cấp dịch vụ, hỗ trợ đầy đủ các luồng chính: đăng ký/đăng nhập, quản lý hồ sơ, tìm kiếm dịch vụ, đặt lịch, ví điện tử, thanh toán qua VNPay, chat realtime và xử lý khiếu nại.

Hệ thống hiện có 3 nhóm người dùng chính:

- **Client**: Khách hàng tìm kiếm, đặt dịch vụ, thanh toán và quản lý lịch đặt.
- **Worker**: Người cung cấp dịch vụ, thiết lập hồ sơ, nhận lịch đặt và quản lý công việc.
- **Admin**: Quản trị viên theo dõi người dùng, giao dịch và dữ liệu vận hành.

## 2. Các tính năng nền tảng

### 2.1. Đăng ký, đăng nhập và phân quyền

- Đăng ký tài khoản người dùng.
- Đăng nhập bằng email/mật khẩu.
- Xác thực email.
- Quên mật khẩu / đặt lại mật khẩu.
- Quản lý phiên đăng nhập bằng JWT token.
- Tự động bảo vệ các trang yêu cầu đăng nhập.
- Phân quyền theo vai trò **Admin**, **Worker**, **Client**.

### 2.2. Giao diện và trải nghiệm người dùng

- Giao diện web hiện đại bằng Next.js và Ant Design.
- Hỗ trợ responsive trên desktop và mobile.
- Có trang chủ, trang dịch vụ, trang hồ sơ, trang điều khoản và chính sách riêng.
- Hỗ trợ chuyển đổi giao diện sáng/tối.
- Hỗ trợ đa ngôn ngữ:
  - Tiếng Việt
  - Tiếng Anh
  - Tiếng Hàn
  - Tiếng Trung

## 3. Tính năng dành cho Client

### 3.1. Hồ sơ khách hàng

- Xem thông tin hồ sơ cá nhân.
- Chỉnh sửa thông tin hồ sơ.
- Cập nhật avatar.
- Đổi mật khẩu.
- Theo dõi thông tin tài khoản đang đăng nhập.

### 3.2. Tìm kiếm và xem dịch vụ

- Xem danh sách dịch vụ công khai.
- Xem worker theo nhóm dịch vụ.
- Xem chi tiết hồ sơ worker.
- Xem dịch vụ, giá, thông tin cá nhân, mô tả và hình ảnh của worker.
- Phân loại dịch vụ theo các nhóm như hỗ trợ cá nhân, đồng hành, hướng dẫn viên, phiên dịch và các cấp độ companionship.

### 3.3. Đặt lịch dịch vụ

- Client có thể tạo booking với worker.
- Chọn dịch vụ, lịch làm việc và gói giá phù hợp.
- Gửi ghi chú yêu cầu cho worker.
- Theo dõi danh sách booking của mình.
- Xem chi tiết từng booking.
- Lọc và phân trang danh sách booking.
- Giao diện danh sách booking có hỗ trợ mobile.

### 3.4. Hủy booking và khiếu nại

- Client có thể hủy booking với lý do cụ thể.
- Client có thể tạo khiếu nại khi booking đang trong trạng thái phù hợp.
- Form khiếu nại hỗ trợ:
  - Chọn lý do khiếu nại.
  - Nhập mô tả chi tiết.
  - Đính kèm link bằng chứng.
- Khi booking bị khiếu nại, hệ thống có luồng chat nhóm giữa client, worker và admin để xử lý.

### 3.5. Đánh giá dịch vụ

- Client có thể tạo review sau khi sử dụng dịch vụ.
- Hệ thống có API lấy danh sách review, chi tiết review và thống kê đánh giá theo worker.
- Worker có thể phản hồi review.
- Admin có thể xem toàn bộ review.

## 4. Tính năng dành cho Worker

### 4.1. Thiết lập hồ sơ worker

- Worker có luồng thiết lập hồ sơ nhiều bước.
- Bước thông tin cơ bản gồm:
  - Vị trí
  - Ngày sinh
  - Giới tính
  - Chiều cao / cân nặng
  - Cung hoàng đạo
  - Phong cách sống
  - Sở thích
  - Giới thiệu bản thân
  - Câu quote yêu thích
  - Bộ sưu tập hình ảnh
- Bước cấu hình dịch vụ gồm:
  - Chọn danh mục dịch vụ.
  - Chọn dịch vụ cung cấp.
  - Cấu hình nhiều mức giá.
  - Thiết lập đơn vị tính theo giờ/ngày/tháng.

### 4.2. Quản lý booking của worker

- Worker xem danh sách booking được đặt.
- Worker có thể xác nhận hoặc từ chối booking mới.
- Worker có thể bắt đầu booking sau khi booking đã được xác nhận và thanh toán.
- Worker có thể hoàn thành booking khi công việc kết thúc.
- Worker có thể hủy booking trong trạng thái cho phép.
- Worker có thể mở chat khiếu nại khi booking đang ở trạng thái tranh chấp.
- Hệ thống kiểm tra lịch hết hạn để tránh thao tác sai trên booking quá hạn.

### 4.3. Ví và escrow của worker

- Worker có trang ví riêng.
- Worker có thể theo dõi các khoản escrow liên quan đến booking.
- Hệ thống có dữ liệu escrow để quản lý tiền giữ giữa client và worker trong quá trình booking.

## 5. Tính năng ví điện tử và thanh toán

### 5.1. Ví điện tử

- Mỗi user có ví điện tử để quản lý số dư.
- Xem số dư hiện tại.
- Xem lịch sử giao dịch.
- Lọc giao dịch theo loại và trạng thái.
- Hỗ trợ phân trang lịch sử giao dịch.

### 5.2. Nạp tiền qua VNPay

- Client có thể nạp tiền vào ví qua VNPay.
- Có form nạp tiền và các mức tiền gợi ý.
- Hệ thống tạo giao dịch ở trạng thái chờ thanh toán.
- Redirect người dùng sang cổng thanh toán VNPay.
- Nhận callback từ VNPay sau khi thanh toán.
- Xác thực chữ ký callback từ VNPay để tránh giả mạo.
- Cập nhật trạng thái giao dịch thành công/thất bại.
- Tự động cập nhật số dư ví sau khi thanh toán thành công.

### 5.3. Quản lý giao dịch

- Lưu lịch sử giao dịch đầy đủ.
- Có các trạng thái giao dịch: chờ xử lý, thành công, thất bại, đã hủy.
- Có các loại giao dịch: nạp tiền, rút tiền, thanh toán, hoàn tiền.
- Admin có thể xem dữ liệu giao dịch tổng quan.

## 6. Tính năng chat và xử lý khiếu nại

### 6.1. Chat 1-1 realtime

- Người dùng có thể gửi và nhận tin nhắn realtime bằng Socket.IO.
- Hỗ trợ danh sách cuộc trò chuyện.
- Hiển thị tin nhắn mới theo thời gian thực.
- Lưu lịch sử tin nhắn.
- Hỗ trợ phân trang lịch sử tin nhắn.
- Có trạng thái đã đọc.
- Có số lượng tin nhắn chưa đọc.
- Có thể xóa tin nhắn.

### 6.2. Chat nhóm khiếu nại theo booking

- Khi có khiếu nại, hệ thống tạo hoặc mở group chat theo booking.
- Group chat gồm client, worker và admin.
- Client/worker có thể mở lại group chat từ booking đang tranh chấp.
- Admin được tự động thêm vào group khi cần xử lý khiếu nại.
- Hỗ trợ gửi tin nhắn nhóm realtime.
- Hỗ trợ xem lịch sử tin nhắn nhóm.
- Hỗ trợ đánh dấu đã đọc và đếm tin nhắn chưa đọc trong group.
- Có thể mở trực tiếp group chat bằng query trên URL.

## 7. Tính năng dành cho Admin

### 7.1. Quản lý người dùng

- Admin có trang đăng nhập riêng.
- Admin có dashboard quản trị.
- Xem danh sách user.
- Cập nhật trạng thái user.
- Hỗ trợ phân trang và lọc theo vai trò/trạng thái ở API.

### 7.2. Theo dõi ví và giao dịch

- Admin có trang quản lý ví/giao dịch.
- Xem lịch sử giao dịch toàn hệ thống.
- Xem thống kê giao dịch.
- Xem top user theo giao dịch.
- Xem dữ liệu biểu đồ giao dịch.

### 7.3. Theo dõi escrow và review

- Admin có API xem toàn bộ escrow.
- Admin có API xem toàn bộ review.
- Admin có vai trò trong xử lý khiếu nại booking thông qua group chat.

## 8. Các điểm kỹ thuật đã hoàn thiện

- Backend Node.js + Express + TypeScript.
- Database MongoDB với Mongoose.
- Frontend Next.js 16 + React 19 + TypeScript.
- API response format thống nhất.
- Middleware xác thực và phân quyền.
- Validation dữ liệu bằng Zod.
- Logging bằng Winston.
- Bảo mật cơ bản với Helmet, CORS, rate limit và bcrypt.
- Socket.IO cho realtime messaging.
- Axios client có interceptor tự gắn token và xử lý lỗi 401.
- Zustand cho trạng thái đăng nhập, theme, ngôn ngữ và tiền tệ.
- React Query cho dữ liệu server.

## 9. Kịch bản demo đề xuất cho khách hàng

### Demo 1: Luồng Client

1. Đăng ký hoặc đăng nhập tài khoản client.
2. Xem trang chủ và danh sách dịch vụ.
3. Mở chi tiết worker.
4. Tạo booking với worker.
5. Xem booking trong trang booking của client.
6. Nạp tiền vào ví qua VNPay.
7. Mở chat với worker hoặc tạo khiếu nại nếu cần.

### Demo 2: Luồng Worker

1. Đăng nhập tài khoản worker.
2. Thiết lập/chỉnh sửa hồ sơ worker.
3. Chọn dịch vụ và cấu hình giá.
4. Xem danh sách booking được client đặt.
5. Xác nhận booking.
6. Bắt đầu booking khi đã được thanh toán.
7. Hoàn thành booking.
8. Xem thông tin ví/escrow.

### Demo 3: Luồng Admin

1. Đăng nhập trang admin.
2. Xem dashboard.
3. Xem danh sách người dùng.
4. Cập nhật trạng thái user.
5. Xem giao dịch ví toàn hệ thống.
6. Theo dõi thống kê, chart và top users.
7. Tham gia group chat xử lý khiếu nại.

## 10. Các tính năng nên trình bày nổi bật với khách hàng

- Hệ thống đã có đủ 3 vai trò: Client, Worker, Admin.
- Có luồng marketplace cơ bản: xem dịch vụ, xem worker, đặt lịch.
- Có ví điện tử và tích hợp VNPay.
- Có booking lifecycle: tạo, xác nhận, bắt đầu, hoàn thành, hủy, tranh chấp.
- Có escrow để phục vụ quản lý tiền theo booking.
- Có chat realtime 1-1 và group chat xử lý khiếu nại.
- Có review/rating để đánh giá worker.
- Có đa ngôn ngữ và giao diện responsive.
- Có dashboard admin để theo dõi người dùng và giao dịch.

## 11. Ghi chú cho buổi nghiệm thu

- Nên chuẩn bị sẵn 3 tài khoản demo: Client, Worker và Admin.
- Nên chuẩn bị sẵn dữ liệu mẫu gồm dịch vụ, worker profile, booking và giao dịch.
- Với VNPay, nên dùng môi trường sandbox/test để demo an toàn.
- Nếu demo khiếu nại, nên có sẵn một booking ở trạng thái phù hợp để mở complaint group chat.

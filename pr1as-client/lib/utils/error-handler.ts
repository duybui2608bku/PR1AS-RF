import { isAxiosError } from "axios"

type ServerErrorPayload = {
  message?: string
  error?: {
    code?: string
    message?: string
    details?: Array<{
      field?: string
      message?: string
    }>
  }
  errors?: Record<string, string[]>
}

const DEFAULT_ERROR_MESSAGE = "Có lỗi xảy ra. Vui lòng thử lại."

const FIELD_TRANSLATIONS: Record<string, string> = {
  body: "Nội dung",
  comment: "Bình luận",
  description: "Mô tả",
  email: "Email",
  end_time: "Thời gian kết thúc",
  full_name: "Họ và tên",
  limit: "Giới hạn",
  page: "Trang",
  password: "Mật khẩu",
  phone: "Số điện thoại",
  price: "Giá",
  rating: "Đánh giá",
  reason: "Lý do",
  start_time: "Thời gian bắt đầu",
  token: "Token",
}

const ERROR_CODE_MESSAGES: Record<string, string> = {
  AUTH_EMAIL_NOT_VERIFIED: "Vui lòng xác minh email trước khi đăng nhập.",
  BOOKING_ALREADY_DISPUTED: "Booking này đã có khiếu nại đang xử lý.",
  BOOKING_CANNOT_CANCEL: "Không thể hủy booking này.",
  BOOKING_CANNOT_UPDATE: "Không thể cập nhật booking này.",
  BOOKING_INVALID_PRICING: "Thông tin giá không hợp lệ.",
  BOOKING_INVALID_SCHEDULE: "Lịch booking không hợp lệ.",
  BOOKING_INVALID_STATUS: "Trạng thái booking không hợp lệ.",
  BOOKING_INVALID_STATUS_TRANSITION: "Không thể chuyển sang trạng thái này.",
  BOOKING_NOT_DISPUTED: "Booking này không ở trạng thái tranh chấp.",
  BOOKING_NOT_FOUND: "Không tìm thấy booking.",
  BOOKING_SELF_BOOKING_NOT_ALLOWED: "Bạn không thể đặt dịch vụ của chính mình.",
  BOOKING_UNAUTHORIZED_ACCESS: "Bạn không có quyền truy cập booking này.",
  COMMENT_NESTED_REPLY_NOT_ALLOWED: "Không hỗ trợ trả lời lồng nhau.",
  COMMENT_NOT_FOUND: "Không tìm thấy bình luận.",
  COMMENT_PARENT_POST_MISMATCH: "Bình luận cha không thuộc bài viết này.",
  COMMENT_UNAUTHORIZED_ACCESS: "Bạn không có quyền chỉnh sửa bình luận này.",
  COMMENTS_LOCKED: "Bình luận của bài viết này đã bị khóa.",
  CSRF_TOKEN_INVALID: "CSRF token không hợp lệ.",
  CSRF_TOKEN_MISSING: "Thiếu CSRF token.",
  DISPUTE_CANNOT_RESOLVE: "Không thể xử lý khiếu nại này.",
  EMAIL_EXISTS: "Email đã được đăng ký.",
  FORBIDDEN: "Bạn không có quyền thực hiện hành động này.",
  INTERNAL_SERVER_ERROR: "Đã xảy ra lỗi máy chủ.",
  INVALID_CREDENTIALS: "Email hoặc mật khẩu không đúng.",
  INVALID_ORIGIN: "Nguồn yêu cầu không hợp lệ.",
  INVALID_REFERER: "Referer không hợp lệ.",
  INVALID_TOKEN: "Token không hợp lệ hoặc đã hết hạn.",
  MISSING_ORIGIN: "Thiếu Origin hoặc Referer.",
  NOT_FOUND: "Không tìm thấy tài nguyên.",
  POST_CREATE_FEATURE_DISABLED: "Gói hiện tại không cho phép đăng bài.",
  POST_MEDIA_LIMIT_EXCEEDED: "Bài viết có quá nhiều tệp media.",
  POST_MONTHLY_LIMIT_EXCEEDED: "Bạn đã đạt giới hạn đăng bài trong tháng của gói hiện tại.",
  POST_NOT_FOUND: "Không tìm thấy bài viết.",
  POST_UNAUTHORIZED_ACCESS: "Bạn không có quyền chỉnh sửa bài viết này.",
  RATE_LIMIT_EXCEEDED: "Có quá nhiều yêu cầu. Vui lòng thử lại sau.",
  REACTION_INVALID_TARGET: "Đối tượng cảm xúc không hợp lệ.",
  REACTION_INVALID_TYPE: "Loại cảm xúc không hợp lệ.",
  REACTION_TARGET_NOT_FOUND: "Không tìm thấy đối tượng cảm xúc.",
  REPUTATION_SCORE_TOO_LOW: "Điểm uy tín của bạn quá thấp để thực hiện hành động này.",
  REVIEW_ALREADY_EXISTS: "Booking này đã có đánh giá.",
  REVIEW_CANNOT_UPDATE: "Không thể cập nhật đánh giá này.",
  REVIEW_INVALID_RATING: "Điểm đánh giá không hợp lệ.",
  REVIEW_NOT_FOUND: "Không tìm thấy đánh giá.",
  REVIEW_UNAUTHORIZED_ACCESS: "Bạn không có quyền truy cập đánh giá này.",
  UNAUTHORIZED: "Vui lòng đăng nhập để tiếp tục.",
  USER_BANNED: "Tài khoản đã bị khóa.",
  USER_PENDING_DELETE:
    "Tài khoản đang chờ xoá. Đăng nhập lại để huỷ thao tác.",
  USER_DELETED: "Tài khoản đã bị xoá.",
  ACCOUNT_DELETE_BLOCKED:
    "Vẫn còn nghĩa vụ chưa xử lý. Vui lòng kiểm tra ví, booking và khiếu nại trước khi xoá.",
  VALIDATION_ERROR: "Dữ liệu không hợp lệ.",
  WALLET_DEPOSIT_AMOUNT_TOO_HIGH: "Số tiền nạp quá cao.",
  WALLET_DEPOSIT_AMOUNT_TOO_LOW: "Số tiền nạp quá thấp.",
  WALLET_INSUFFICIENT_BALANCE: "Số dư ví không đủ.",
  WALLET_INVALID_AMOUNT: "Số tiền không hợp lệ.",
  WALLET_PAYMENT_VERIFICATION_FAILED: "Không thể xác minh thanh toán.",
  WALLET_TRANSACTION_FAILED: "Giao dịch thất bại.",
  WALLET_TRANSACTION_NOT_FOUND: "Không tìm thấy giao dịch.",
}

const SERVER_MESSAGE_TRANSLATIONS: Record<string, string> = {
  "Account has been banned": "Tài khoản đã bị khóa.",
  "Active role updated successfully": "Đã cập nhật vai trò đang sử dụng.",
  "All rating details must be between 1 and 5": "Tất cả điểm chi tiết phải từ 1 đến 5.",
  "At least one field must be provided for update": "Vui lòng cung cấp ít nhất một trường để cập nhật.",
  "Balance fetched successfully": "Đã tải số dư ví.",
  "Booking already has an active dispute": "Booking này đã có khiếu nại đang xử lý.",
  "Booking cancelled successfully": "Đã hủy booking.",
  "Booking cannot be scheduled more than 30 days in advance": "Không thể đặt lịch trước quá 30 ngày.",
  "Booking created successfully": "Đã tạo booking.",
  "Booking fetched successfully": "Đã tải booking.",
  "Booking is already cancelled": "Booking đã bị hủy.",
  "Booking must be scheduled at least 2 hours in advance": "Booking phải được đặt trước ít nhất 2 giờ.",
  "Booking not found": "Không tìm thấy booking.",
  "Booking status updated successfully": "Đã cập nhật trạng thái booking.",
  "Booking updated successfully": "Đã cập nhật booking.",
  "Bookings fetched successfully": "Đã tải danh sách booking.",
  "Cannot cancel a completed booking": "Không thể hủy booking đã hoàn thành.",
  "Cannot delete review": "Không thể xóa đánh giá.",
  "Cannot open complaint conversation.": "Không thể mở nhóm khiếu nại.",
  "Cannot review a booking that is not completed": "Chỉ có thể đánh giá booking đã hoàn thành.",
  "Cannot send group message.": "Không thể gửi tin nhắn nhóm.",
  "Cannot send message to yourself": "Bạn không thể gửi tin nhắn cho chính mình.",
  "Cannot send message.": "Không thể gửi tin nhắn.",
  "Cannot update a cancelled booking": "Không thể cập nhật booking đã hủy.",
  "Cannot update a completed booking": "Không thể cập nhật booking đã hoàn thành.",
  "Cannot update review after approval": "Không thể cập nhật đánh giá sau khi đã duyệt.",
  "Comment body length is invalid": "Độ dài bình luận không hợp lệ.",
  "Comment lock status updated successfully": "Đã cập nhật trạng thái khóa bình luận.",
  "Comment must be between 10 and 1000 characters": "Bình luận phải từ 10 đến 1000 ký tự.",
  "Comment must not exceed 500 characters": "Phản hồi không được vượt quá 500 ký tự.",
  "Comment not found": "Không tìm thấy bình luận.",
  "Comments are locked on this post": "Bình luận của bài viết này đã bị khóa.",
  "Comments fetched successfully": "Đã tải bình luận.",
  "Created successfully": "Tạo thành công.",
  "Current plan is already equal or higher than target plan": "Gói hiện tại đã bằng hoặc cao hơn gói đã chọn.",
  "Current pricing fetched successfully": "Đã tải gói hiện tại.",
  "Database not initialized. Call connectDatabase() first.": "Cơ sở dữ liệu chưa được khởi tạo.",
  "Deleted successfully": "Xóa thành công.",
  "Deposit amount is too high": "Số tiền nạp quá cao.",
  "Deposit amount is too low": "Số tiền nạp quá thấp.",
  "Deposit transaction created successfully": "Đã tạo giao dịch nạp tiền.",
  "Dispute created successfully": "Đã tạo khiếu nại.",
  "Dispute resolved successfully": "Đã xử lý khiếu nại.",
  "Email already registered": "Email đã được đăng ký.",
  "Email has been verified successfully": "Email đã được xác minh.",
  "Email is already verified": "Email đã được xác minh trước đó.",
  "Email is required": "Email là bắt buộc.",
  "Email verification failed": "Xác minh email thất bại.",
  "Failed to join conversation": "Không thể tham gia cuộc trò chuyện.",
  "Failed to mark messages as read": "Không thể đánh dấu tin nhắn đã đọc.",
  Forbidden: "Bạn không có quyền truy cập.",
  "Group conversation ID is required": "ID nhóm trò chuyện là bắt buộc.",
  "Group conversation not found": "Không tìm thấy nhóm trò chuyện.",
  "Group message not found": "Không tìm thấy tin nhắn nhóm.",
  "If the email exists, a password reset link has been sent": "Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.",
  "Insufficient permissions": "Bạn không đủ quyền thực hiện hành động này.",
  "Insufficient wallet balance": "Số dư ví không đủ.",
  "Insufficient wallet balance for upgrade": "Số dư ví không đủ để nâng cấp gói.",
  "Internal Server Error": "Đã xảy ra lỗi máy chủ.",
  "Internal server error": "Đã xảy ra lỗi máy chủ.",
  "Internal server error occurred": "Đã xảy ra lỗi máy chủ.",
  "Invalid amount": "Số tiền không hợp lệ.",
  "Invalid data": "Dữ liệu không hợp lệ.",
  "Invalid date range": "Khoảng thời gian không hợp lệ.",
  "Invalid email": "Email không hợp lệ.",
  "Invalid email or password": "Email hoặc mật khẩu không đúng.",
  "Invalid or expired refresh token": "Refresh token không hợp lệ hoặc đã hết hạn.",
  "Invalid or expired reset token": "Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.",
  "Invalid or expired verification token": "Token xác minh không hợp lệ hoặc đã hết hạn.",
  "Invalid origin": "Nguồn yêu cầu không hợp lệ.",
  "Invalid pricing information": "Thông tin giá không hợp lệ.",
  "Invalid refresh token": "Refresh token không hợp lệ.",
  "Invalid referer": "Referer không hợp lệ.",
  "Invalid referer format": "Định dạng referer không hợp lệ.",
  "Invalid request": "Yêu cầu không hợp lệ.",
  "Invalid schedule. Start time must be before end time": "Lịch không hợp lệ. Thời gian bắt đầu phải trước thời gian kết thúc.",
  "Invalid status": "Trạng thái không hợp lệ.",
  "Invalid status transition": "Chuyển trạng thái không hợp lệ.",
  "Invalid target plan": "Gói mục tiêu không hợp lệ.",
  "Invalid token": "Token không hợp lệ.",
  "Limit not found": "Không tìm thấy giới hạn.",
  "Login required": "Vui lòng đăng nhập để tiếp tục.",
  "Login successful": "Đăng nhập thành công.",
  "Logout successful": "Đăng xuất thành công.",
  "Media URL host is not allowed": "Host media không được phép.",
  "Media URL must be a valid URL": "URL media không hợp lệ.",
  "Message deleted successfully": "Đã xóa tin nhắn.",
  "Message ID is required": "ID tin nhắn là bắt buộc.",
  "Message not found": "Không tìm thấy tin nhắn.",
  "Message sent successfully": "Đã gửi tin nhắn.",
  "Messages marked as read": "Đã đánh dấu tin nhắn là đã đọc.",
  "Messaging is available only after booking is confirmed": "Chỉ có thể nhắn tin sau khi booking được xác nhận.",
  "Network Error": "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng.",
  "Nested replies are not allowed": "Không hỗ trợ trả lời lồng nhau.",
  "NEXT_PUBLIC_API_URL is required in production builds.": "Thiếu cấu hình NEXT_PUBLIC_API_URL khi build production.",
  "Only admin can resolve disputes": "Chỉ admin có thể xử lý khiếu nại.",
  "Only the assigned worker can update booking status": "Chỉ worker được phân công mới có thể cập nhật trạng thái booking.",
  "Only the assigned worker can update worker response": "Chỉ worker được phân công mới có thể cập nhật phản hồi.",
  "Only the client can open a dispute": "Chỉ khách hàng có thể mở khiếu nại.",
  "Only the client can update booking details": "Chỉ khách hàng có thể cập nhật chi tiết booking.",
  "Origin or Referer header required": "Thiếu Origin hoặc Referer.",
  "Page and limit are required": "Trang và giới hạn là bắt buộc.",
  "Page and limit must be greater than 0": "Trang và giới hạn phải lớn hơn 0.",
  "Page and limit must be less than 100": "Trang và giới hạn phải nhỏ hơn 100.",
  "Page and limit must be numbers": "Trang và giới hạn phải là số.",
  "Page and limit not found": "Không tìm thấy trang và giới hạn.",
  "Page not found": "Không tìm thấy trang.",
  "Password changed successfully": "Đổi mật khẩu thành công.",
  "Password has been reset successfully": "Đặt lại mật khẩu thành công.",
  "Password is required": "Mật khẩu là bắt buộc.",
  "Password must be at least 8 characters": "Mật khẩu phải có ít nhất 8 ký tự.",
  "Password reset failed": "Đặt lại mật khẩu thất bại.",
  "Payment verification failed": "Không thể xác minh thanh toán.",
  "Plan required": "Gói hiện tại không cho phép thực hiện hành động này.",
  "Please verify your email before logging in": "Vui lòng xác minh email trước khi đăng nhập.",
  "Post body length is invalid": "Độ dài bài viết không hợp lệ.",
  "Post created successfully": "Đăng bài thành công.",
  "Post deleted successfully": "Đã xóa bài viết.",
  "Post fetched successfully": "Đã tải bài viết.",
  "Post not found": "Không tìm thấy bài viết.",
  "Post updated successfully": "Đã cập nhật bài viết.",
  "Posts fetched successfully": "Đã tải danh sách bài viết.",
  "Pricing package already exists": "Gói pricing đã tồn tại.",
  "Pricing package created successfully": "Đã tạo gói pricing.",
  "Pricing package deleted successfully": "Đã xóa gói pricing.",
  "Pricing package fetched successfully": "Đã tải gói pricing.",
  "Pricing package not found": "Không tìm thấy gói pricing.",
  "Pricing package updated successfully": "Đã cập nhật gói pricing.",
  "Pricing packages fetched successfully": "Đã tải danh sách gói pricing.",
  "Pricing upgraded successfully": "Đã nâng cấp gói.",
  "Profile updated successfully": "Cập nhật hồ sơ thành công.",
  "Provide at least one field to update (body, media, or visibility)": "Vui lòng cung cấp ít nhất một trường để cập nhật.",
  "Rating must be between 1 and 5": "Điểm đánh giá phải từ 1 đến 5.",
  "Rating must be consistent with rating details": "Điểm tổng phải khớp với điểm chi tiết.",
  "Reaction removed successfully": "Đã gỡ cảm xúc.",
  "Reaction saved successfully": "Đã lưu cảm xúc.",
  "Reaction summary fetched successfully": "Đã tải tổng hợp cảm xúc.",
  "Reaction target not found": "Không tìm thấy đối tượng cảm xúc.",
  "Receiver not found": "Không tìm thấy người nhận.",
  "Refresh token reuse detected": "Phát hiện refresh token đã được dùng lại.",
  "Registration successful": "Đăng ký thành công.",
  "Registration successful. Please check your email to verify your account": "Đăng ký thành công. Vui lòng kiểm tra email để xác minh tài khoản.",
  "Reply message not found": "Không tìm thấy tin nhắn được trả lời.",
  "Reset token has expired": "Token đặt lại mật khẩu đã hết hạn.",
  "Reset token is required": "Token đặt lại mật khẩu là bắt buộc.",
  "Resource not found": "Không tìm thấy tài nguyên.",
  "Review already exists for this booking": "Booking này đã có đánh giá.",
  "Review created successfully": "Đã gửi đánh giá.",
  "Review deleted successfully": "Đã xóa đánh giá.",
  "Review fetched successfully": "Đã tải đánh giá.",
  "Review not found": "Không tìm thấy đánh giá.",
  "Review reply added successfully": "Đã thêm phản hồi đánh giá.",
  "Review updated successfully": "Đã cập nhật đánh giá.",
  "Reviews fetched successfully": "Đã tải danh sách đánh giá.",
  "Route not found": "Không tìm thấy đường dẫn.",
  "Socket.IO not initialized. Call initializeSocket() first.": "Socket.IO chưa được khởi tạo.",
  Success: "Thành công.",
  "Target pricing package is not available": "Gói pricing đã chọn hiện không khả dụng.",
  "This booking already has an active dispute": "Booking này đã có khiếu nại đang xử lý.",
  "This booking is not in disputed status": "Booking này không ở trạng thái tranh chấp.",
  "This feature is not available in your plan": "Tính năng này không khả dụng trong gói hiện tại.",
  "Token is invalid or expired": "Token không hợp lệ hoặc đã hết hạn.",
  "Token not provided": "Token chưa được cung cấp.",
  "Too many authentication attempts, please try again later": "Đăng nhập thất bại quá nhiều lần. Vui lòng thử lại sau 15 phút.",
  "Too many failed login attempts. Please try again after 15 minutes": "Đăng nhập thất bại quá 5 lần. Vui lòng thử lại sau 15 phút.",
  "Too many media items on this post": "Bài viết có quá nhiều tệp media.",
  "Too many requests, please try again later": "Có quá nhiều yêu cầu. Vui lòng thử lại sau.",
  "Transaction failed": "Giao dịch thất bại.",
  "Transaction not found": "Không tìm thấy giao dịch.",
  "Unauthorized access": "Bạn chưa được phép truy cập.",
  "Unauthorized to delete this message": "Bạn không có quyền xóa tin nhắn này.",
  "Updated successfully": "Cập nhật thành công.",
  "UPLOAD_MULTIPLE_UPLOAD_EMPTY": "Không nhận được ảnh sau khi tải lên.",
  "UPLOAD_REQUEST_FAILED": "Không thể tải ảnh lên.",
  "UPLOAD_RESPONSE_INVALID": "Phản hồi tải ảnh không hợp lệ.",
  "UPLOAD_RESULT_EMPTY": "Không nhận được ảnh sau khi tải lên.",
  "UPLOAD_RESULT_INVALID": "Kết quả tải ảnh không hợp lệ.",
  "User not found": "Không tìm thấy người dùng.",
  "User status updated successfully": "Đã cập nhật trạng thái tài khoản.",
  "Users fetched successfully": "Đã tải danh sách người dùng.",
  "Verification email has been sent": "Email xác minh đã được gửi.",
  "Verification token has expired": "Token xác minh đã hết hạn.",
  "Verification token is required": "Token xác minh là bắt buộc.",
  "Wallet not found": "Không tìm thấy ví.",
  "You cannot book your own service": "Bạn không thể đặt dịch vụ của chính mình.",
  "You do not have permission to access this booking": "Bạn không có quyền truy cập booking này.",
  "You do not have permission to access this review": "Bạn không có quyền truy cập đánh giá này.",
  "You do not have permission to modify this comment": "Bạn không có quyền chỉnh sửa bình luận này.",
  "You do not have permission to modify this post": "Bạn không có quyền chỉnh sửa bài viết này.",
  "You do not have permission to perform this action": "Bạn không có quyền thực hiện hành động này.",
  "Your current plan does not allow creating posts": "Gói hiện tại không cho phép đăng bài.",
  "Your current plan does not allow this action": "Gói hiện tại không cho phép thực hiện hành động này.",
  "Your post statistics fetched successfully": "Đã tải thống kê bài viết của bạn.",
  "You have reached your monthly post creation limit for the current plan": "Bạn đã đạt giới hạn đăng bài trong tháng của gói hiện tại.",
}

const translateField = (field: string): string =>
  FIELD_TRANSLATIONS[field.replace(/^"|"$/g, "")] ?? field.replace(/^"|"$/g, "")

const translateByPattern = (message: string): string | undefined => {
  const cannotTransition = message.match(/^Cannot transition from '(.+)' to '(.+)'$/)
  if (cannotTransition) {
    return `Không thể chuyển trạng thái từ "${cannotTransition[1]}" sang "${cannotTransition[2]}".`
  }

  const requestFailed = message.match(/^Request failed with status code (\d+)$/)
  if (requestFailed) {
    return `Yêu cầu thất bại với mã trạng thái ${requestFailed[1]}.`
  }

  const httpError = message.match(/^HTTP (\d+)$/)
  if (httpError) {
    return `Yêu cầu thất bại với mã HTTP ${httpError[1]}.`
  }

  const routeNotFound = message.match(/^Route not found(?::.*)?$/)
  if (routeNotFound) {
    return "Không tìm thấy đường dẫn."
  }

  const timeout = message.match(/^timeout of \d+ms exceeded$/)
  if (timeout) {
    return "Kết nối máy chủ quá thời gian chờ. Vui lòng thử lại."
  }

  const required = message.match(/^(.+) is required$/)
  if (required) {
    return `${translateField(required[1])} là bắt buộc.`
  }

  const invalid = message.match(/^(.+) is invalid$/)
  if (invalid) {
    return `${translateField(invalid[1])} không hợp lệ.`
  }

  const minLength = message.match(/^(.+) must be at least (\d+) characters$/)
  if (minLength) {
    return `${translateField(minLength[1])} phải có ít nhất ${minLength[2]} ký tự.`
  }

  const maxLength = message.match(/^(.+) must not exceed (\d+) characters$/)
  if (maxLength) {
    return `${translateField(maxLength[1])} không được vượt quá ${maxLength[2]} ký tự.`
  }

  const minValue = message.match(/^(.+) must be greater than or equal to (\d+)$/)
  if (minValue) {
    return `${translateField(minValue[1])} phải lớn hơn hoặc bằng ${minValue[2]}.`
  }

  const maxValue = message.match(/^(.+) must be less than or equal to (\d+)$/)
  if (maxValue) {
    return `${translateField(maxValue[1])} phải nhỏ hơn hoặc bằng ${maxValue[2]}.`
  }

  return undefined
}

const getStatusMessage = (statusCode: number | undefined): string | undefined => {
  switch (statusCode) {
    case 400:
      return "Yêu cầu không hợp lệ."
    case 401:
      return "Vui lòng đăng nhập để tiếp tục."
    case 403:
      return "Bạn không có quyền thực hiện hành động này."
    case 404:
      return "Không tìm thấy tài nguyên."
    case 409:
      return "Dữ liệu đã tồn tại hoặc bị xung đột."
    case 422:
      return "Dữ liệu không hợp lệ."
    case 429:
      return "Có quá nhiều yêu cầu. Vui lòng thử lại sau."
    case 500:
      return "Đã xảy ra lỗi máy chủ."
    case 503:
      return "Dịch vụ tạm thời không khả dụng."
    default:
      return undefined
  }
}

export const localizeServerMessage = (
  message: string | null | undefined,
  fallback = DEFAULT_ERROR_MESSAGE,
  code?: string,
  statusCode?: number
): string => {
  const trimmed = message?.trim()

  if (code && ERROR_CODE_MESSAGES[code]) {
    return ERROR_CODE_MESSAGES[code]
  }

  if (!trimmed) {
    return getStatusMessage(statusCode) ?? fallback
  }

  return (
    SERVER_MESSAGE_TRANSLATIONS[trimmed] ??
    translateByPattern(trimmed) ??
    trimmed
  )
}

export class ApiError extends Error {
  readonly code: string | undefined
  readonly statusCode: number | undefined
  readonly details: Array<{ field?: string; message?: string }> | undefined

  constructor({
    message,
    code,
    statusCode,
    details,
  }: {
    message: string
    code?: string
    statusCode?: number
    details?: Array<{ field?: string; message?: string }>
  }) {
    super(message)
    this.name = "ApiError"
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

const extractServerMessage = (data: ServerErrorPayload | undefined): string | undefined => {
  const detail = data?.error?.details?.find((item) => item.message)?.message
  if (detail) return detail

  const fieldErrors = data?.errors
  if (fieldErrors && typeof fieldErrors === "object") {
    const first = Object.values(fieldErrors).find((msgs) => Array.isArray(msgs) && msgs.length > 0)?.[0]
    if (first) return first
  }

  return data?.error?.message ?? data?.message
}

export const toApiError = (error: unknown): ApiError | null => {
  if (!isAxiosError<ServerErrorPayload>(error)) {
    return null
  }

  const data = error.response?.data
  const code = data?.error?.code
  const statusCode = error.response?.status
  const message = localizeServerMessage(
    extractServerMessage(data) ?? error.message,
    getStatusMessage(statusCode) ?? DEFAULT_ERROR_MESSAGE,
    code,
    statusCode
  )

  return new ApiError({
    message,
    code,
    statusCode,
    details: data?.error?.details,
  })
}

/**
 * For account-deletion 409s the server returns `error.details` as an array of
 * { field: blocker-code, message: stringified-detail }. This unpacks it back
 * into a typed list so the UI can render per-blocker guidance.
 */
export type AccountDeleteBlocker = {
  code: "WALLET_BALANCE" | "ACTIVE_BOOKINGS" | "OPEN_DISPUTES"
  detail: number
}

export const extractAccountDeleteBlockers = (
  error: unknown
): AccountDeleteBlocker[] => {
  if (!(error instanceof ApiError)) return []
  if (error.code !== "ACCOUNT_DELETE_BLOCKED") return []
  const details = error.details ?? []
  return details
    .map((d) => {
      if (!d.field || !d.message) return null
      if (
        d.field !== "WALLET_BALANCE" &&
        d.field !== "ACTIVE_BOOKINGS" &&
        d.field !== "OPEN_DISPUTES"
      ) {
        return null
      }
      const num = Number(d.message)
      return {
        code: d.field as AccountDeleteBlocker["code"],
        detail: Number.isFinite(num) ? num : 0,
      }
    })
    .filter((b): b is AccountDeleteBlocker => b !== null)
}

export const getErrorMessage = (error: unknown, fallback = DEFAULT_ERROR_MESSAGE): string => {
  if (error instanceof ApiError || error instanceof Error) {
    return localizeServerMessage(
      error.message,
      fallback,
      error instanceof ApiError ? error.code : undefined,
      error instanceof ApiError ? error.statusCode : undefined
    )
  }

  return fallback
}

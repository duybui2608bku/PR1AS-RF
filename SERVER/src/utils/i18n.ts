export type Locale = "en" | "vi" | "ko" | "zh";

const translations: Record<string, Record<Locale, string>> = {
  "auth.invalidData": {
    en: "Invalid data",
    vi: "Dữ liệu không hợp lệ",
    ko: "잘못된 데이터",
    zh: "无效数据",
  },
  "auth.emailRequired": {
    en: "Email is required",
    vi: "Email là bắt buộc",
    ko: "이메일은 필수입니다",
    zh: "需要电子邮件",
  },
  "auth.emailInvalid": {
    en: "Invalid email",
    vi: "Email không hợp lệ",
    ko: "잘못된 이메일",
    zh: "无效的电子邮件",
  },
  "auth.passwordRequired": {
    en: "Password is required",
    vi: "Mật khẩu là bắt buộc",
    ko: "비밀번호는 필수입니다",
    zh: "需要密码",
  },
  "auth.passwordMinLength": {
    en: "Password must be at least 8 characters",
    vi: "Mật khẩu phải có ít nhất 8 ký tự",
    ko: "비밀번호는 최소 8자 이상이어야 합니다",
    zh: "密码必须至少8个字符",
  },
  "auth.tokenNotProvided": {
    en: "Token not provided",
    vi: "Token không được cung cấp",
    ko: "토큰이 제공되지 않았습니다",
    zh: "未提供令牌",
  },
  "auth.tokenInvalid": {
    en: "Invalid token",
    vi: "Token không hợp lệ",
    ko: "잘못된 토큰",
    zh: "无效令牌",
  },
  "auth.tokenExpired": {
    en: "Token is invalid or expired",
    vi: "Token không hợp lệ hoặc đã hết hạn",
    ko: "토큰이 유효하지 않거나 만료되었습니다",
    zh: "令牌无效或已过期",
  },
  "auth.refreshTokenInvalid": {
    en: "Invalid refresh token",
    vi: "Refresh token không hợp lệ",
    ko: "잘못된 새로고침 토큰",
    zh: "无效的刷新令牌",
  },
  "auth.refreshTokenExpired": {
    en: "Invalid or expired refresh token",
    vi: "Refresh token không hợp lệ hoặc đã hết hạn",
    ko: "유효하지 않거나 만료된 새로고침 토큰",
    zh: "无效或过期的刷新令牌",
  },
  "auth.userBanned": {
    en: "Account has been banned",
    vi: "Tài khoản đã bị cấm",
    ko: "계정이 차단되었습니다",
    zh: "账户已被禁止",
  },
  "auth.userNotFound": {
    en: "User not found",
    vi: "Không tìm thấy người dùng",
    ko: "사용자를 찾을 수 없습니다",
    zh: "找不到用户",
  },
  "auth.emailExists": {
    en: "Email already registered",
    vi: "Email đã được đăng ký",
    ko: "이미 등록된 이메일",
    zh: "电子邮件已注册",
  },
  "auth.invalidCredentials": {
    en: "Invalid email or password",
    vi: "Email hoặc mật khẩu không đúng",
    ko: "이메일 또는 비밀번호가 잘못되었습니다",
    zh: "电子邮件或密码无效",
  },
  "auth.loginRequired": {
    en: "Login required",
    vi: "Yêu cầu đăng nhập",
    ko: "로그인이 필요합니다",
    zh: "需要登录",
  },
  "auth.oldPasswordIncorrect": {
    en: "Old password is incorrect",
    vi: "Mật khẩu cũ không đúng",
    ko: "기존 비밀번호가 잘못되었습니다",
    zh: "旧密码不正确",
  },
  "auth.passwordChangeSuccess": {
    en: "Password changed successfully",
    vi: "Đổi mật khẩu thành công",
    ko: "비밀번호가 성공적으로 변경되었습니다",
    zh: "密码更改成功",
  },
  "auth.resetTokenRequired": {
    en: "Reset token is required",
    vi: "Token đặt lại là bắt buộc",
    ko: "재설정 토큰이 필요합니다",
    zh: "需要重置令牌",
  },
  "auth.resetTokenInvalid": {
    en: "Invalid or expired reset token",
    vi: "Token đặt lại không hợp lệ hoặc đã hết hạn",
    ko: "유효하지 않거나 만료된 재설정 토큰",
    zh: "无效或过期的重置令牌",
  },
  "auth.passwordResetEmailSent": {
    en: "If the email exists, a password reset link has been sent",
    vi: "Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi",
    ko: "이메일이 존재하는 경우 비밀번호 재설정 링크가 전송되었습니다",
    zh: "如果电子邮件存在，已发送密码重置链接",
  },
  "auth.passwordResetSuccess": {
    en: "Password has been reset successfully",
    vi: "Mật khẩu đã được đặt lại thành công",
    ko: "비밀번호가 성공적으로 재설정되었습니다",
    zh: "密码已成功重置",
  },
  "auth.passwordResetFailed": {
    en: "Password reset failed",
    vi: "Đặt lại mật khẩu thất bại",
    ko: "비밀번호 재설정 실패",
    zh: "密码重置失败",
  },
  "auth.logoutSuccess": {
    en: "Logout successful",
    vi: "Đăng xuất thành công",
    ko: "로그아웃 성공",
    zh: "注销成功",
  },
  "auth.registerSuccess": {
    en: "Registration successful",
    vi: "Đăng ký thành công",
    ko: "등록 성공",
    zh: "注册成功",
  },
  "auth.loginSuccess": {
    en: "Login successful",
    vi: "Đăng nhập thành công",
    ko: "로그인 성공",
    zh: "登录成功",
  },
  "auth.profileUpdated": {
    en: "Profile updated successfully",
    vi: "Cập nhật hồ sơ thành công",
    ko: "프로필이 성공적으로 업데이트되었습니다",
    zh: "个人资料更新成功",
  },
  "common.internalServerError": {
    en: "Internal server error occurred",
    vi: "Đã xảy ra lỗi máy chủ",
    ko: "내부 서버 오류가 발생했습니다",
    zh: "发生内部服务器错误",
  },
  "common.notFound": {
    en: "Resource not found",
    vi: "Không tìm thấy tài nguyên",
    ko: "리소스를 찾을 수 없습니다",
    zh: "找不到资源",
  },
  "common.badRequest": {
    en: "Invalid request",
    vi: "Yêu cầu không hợp lệ",
    ko: "잘못된 요청",
    zh: "无效请求",
  },
  "common.success": {
    en: "Success",
    vi: "Thành công",
    ko: "성공",
    zh: "成功",
  },
  "common.created": {
    en: "Created successfully",
    vi: "Tạo thành công",
    ko: "생성되었습니다",
    zh: "创建成功",
  },
  "common.updated": {
    en: "Updated successfully",
    vi: "Cập nhật thành công",
    ko: "업데이트되었습니다",
    zh: "更新成功",
  },
  "common.deleted": {
    en: "Deleted successfully",
    vi: "Xóa thành công",
    ko: "삭제되었습니다",
    zh: "删除成功",
  },
  "common.forbidden": {
    en: "You do not have permission to perform this action",
    vi: "Bạn không có quyền thực hiện hành động này",
    ko: "이 작업을 수행할 권한이 없습니다",
    zh: "您没有执行此操作的权限",
  },

  // Email subjects
  "email.subject.emailVerification": {
    en: "{appName} Email Verification",
    vi: "{appName} - Xác thực địa chỉ email",
    ko: "{appName} 이메일 인증",
    zh: "{appName} 电子邮件验证",
  },
  "email.subject.passwordReset": {
    en: "{appName} Password Reset Request",
    vi: "{appName} - Yêu cầu đặt lại mật khẩu",
    ko: "{appName} 비밀번호 재설정 요청",
    zh: "{appName} 密码重置请求",
  },
  "email.subject.accountBanned": {
    en: "{appName} Account Locked",
    vi: "Tài khoản {appName} đã bị khóa",
    ko: "{appName} 계정이 잠겼습니다",
    zh: "{appName} 账户已被锁定",
  },

  // Email verification template
  "email.verification.heading": {
    en: "Verify Your Email Address",
    vi: "Xác thực địa chỉ email của bạn",
    ko: "이메일 주소를 인증하세요",
    zh: "验证您的电子邮件地址",
  },
  "email.verification.body": {
    en: "Thank you for registering with {appName}. Please click the button below to verify your email address:",
    vi: "Cảm ơn bạn đã đăng ký với {appName}. Vui lòng nhấp vào nút bên dưới để xác thực địa chỉ email của bạn:",
    ko: "{appName}에 등록해 주셔서 감사합니다. 아래 버튼을 클릭하여 이메일 주소를 인증하세요:",
    zh: "感谢您注册{appName}。请点击下面的按钮验证您的电子邮件地址：",
  },
  "email.verification.button": {
    en: "Verify Email",
    vi: "Xác thực email",
    ko: "이메일 인증",
    zh: "验证邮箱",
  },
  "email.verification.pasteLink": {
    en: "Or paste this link into your browser:",
    vi: "Hoặc dán liên kết này vào trình duyệt của bạn:",
    ko: "또는 이 링크를 브라우저에 붙여 넣으세요:",
    zh: "或将此链接粘贴到浏览器中：",
  },
  "email.verification.expiry": {
    en: "This link will expire in {hours} hours.",
    vi: "Liên kết này sẽ hết hạn trong {hours} giờ.",
    ko: "이 링크는 {hours}시간 후에 만료됩니다.",
    zh: "此链接将在{hours}小时后过期。",
  },
  "email.verification.notCreated": {
    en: "If you did not create an account, please ignore this email.",
    vi: "Nếu bạn không tạo tài khoản, vui lòng bỏ qua email này.",
    ko: "계정을 만들지 않으셨다면 이 이메일을 무시하세요.",
    zh: "如果您没有创建账户，请忽略此邮件。",
  },

  // Password reset template
  "email.passwordReset.heading": {
    en: "Password Reset Request",
    vi: "Yêu cầu đặt lại mật khẩu",
    ko: "비밀번호 재설정 요청",
    zh: "密码重置请求",
  },
  "email.passwordReset.greeting.named": {
    en: "Hello {name},",
    vi: "Xin chào {name},",
    ko: "안녕하세요 {name}님,",
    zh: "您好 {name}，",
  },
  "email.passwordReset.greeting.anonymous": {
    en: "Hello,",
    vi: "Xin chào,",
    ko: "안녕하세요,",
    zh: "您好，",
  },
  "email.passwordReset.body": {
    en: "We received a request to reset your password. Click the button below to create a new password:",
    vi: "Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu. Nhấp vào nút bên dưới để tạo mật khẩu mới:",
    ko: "비밀번호 재설정 요청을 받았습니다. 아래 버튼을 클릭하여 새 비밀번호를 만드세요:",
    zh: "我们收到了重置密码的请求。点击下面的按钮创建新密码：",
  },
  "email.passwordReset.button": {
    en: "Reset Password",
    vi: "Đặt lại mật khẩu",
    ko: "비밀번호 재설정",
    zh: "重置密码",
  },
  "email.passwordReset.pasteLink": {
    en: "Or paste this link into your browser:",
    vi: "Hoặc dán liên kết này vào trình duyệt của bạn:",
    ko: "또는 이 링크를 브라우저에 붙여 넣으세요:",
    zh: "或将此链接粘贴到浏览器中：",
  },
  "email.passwordReset.expiry": {
    en: "Important: This link will expire in {minutes} minutes.",
    vi: "Quan trọng: Liên kết này sẽ hết hạn trong {minutes} phút.",
    ko: "중요: 이 링크는 {minutes}분 후에 만료됩니다.",
    zh: "重要提示：此链接将在{minutes}分钟后过期。",
  },
  "email.passwordReset.notRequested": {
    en: "If you did not request a password reset, please ignore this email. Your password will not change.",
    vi: "Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này. Mật khẩu của bạn sẽ không thay đổi.",
    ko: "비밀번호 재설정을 요청하지 않으셨다면 이 이메일을 무시하세요. 비밀번호는 변경되지 않습니다.",
    zh: "如果您没有请求重置密码，请忽略此邮件。您的密码不会更改。",
  },
  "email.passwordReset.securityNote": {
    en: "For security reasons, do not share this link with anyone.",
    vi: "Vì lý do bảo mật, đừng chia sẻ liên kết này với bất kỳ ai.",
    ko: "보안을 위해 이 링크를 누구와도 공유하지 마세요.",
    zh: "出于安全原因，请勿与任何人分享此链接。",
  },

  // Password changed confirmation
  "email.subject.passwordChanged": {
    en: "{appName} password was changed",
    vi: "{appName} - Mật khẩu đã được thay đổi",
    ko: "{appName} 비밀번호가 변경되었습니다",
    zh: "{appName} 密码已更改",
  },
  "email.passwordChanged.heading": {
    en: "Your password was changed",
    vi: "Mật khẩu của bạn đã được thay đổi",
    ko: "비밀번호가 변경되었습니다",
    zh: "您的密码已更改",
  },
  "email.passwordChanged.greeting.named": {
    en: "Hello {name},",
    vi: "Xin chào {name},",
    ko: "안녕하세요 {name}님,",
    zh: "您好 {name}，",
  },
  "email.passwordChanged.greeting.anonymous": {
    en: "Hello,",
    vi: "Xin chào,",
    ko: "안녕하세요,",
    zh: "您好，",
  },
  "email.passwordChanged.body": {
    en: "This is a confirmation that the password for your {appName} account was just changed. For your security, all other active sessions have been signed out.",
    vi: "Đây là xác nhận rằng mật khẩu tài khoản {appName} của bạn vừa được thay đổi. Vì lý do bảo mật, tất cả các phiên đăng nhập khác đã bị đăng xuất.",
    ko: "{appName} 계정의 비밀번호가 방금 변경되었음을 확인하는 메일입니다. 보안을 위해 다른 모든 활성 세션은 로그아웃되었습니다.",
    zh: "这是确认您的 {appName} 账户密码刚刚被更改。出于安全考虑，所有其他活动会话均已退出登录。",
  },
  "email.passwordChanged.notYou": {
    en: "If you did NOT make this change, your account may be compromised. Please reset your password immediately and contact support.",
    vi: "Nếu bạn KHÔNG thực hiện thay đổi này, tài khoản của bạn có thể đã bị xâm phạm. Vui lòng đặt lại mật khẩu ngay và liên hệ bộ phận hỗ trợ.",
    ko: "본인이 변경하지 않았다면 계정이 침해되었을 수 있습니다. 즉시 비밀번호를 재설정하고 지원팀에 문의하세요.",
    zh: "如果这不是您本人的操作，您的账户可能已被入侵。请立即重置密码并联系客服。",
  },
  "email.passwordChanged.footer": {
    en: "This is an automated security notification from {appName}.",
    vi: "Đây là thông báo bảo mật tự động từ {appName}.",
    ko: "{appName}에서 보내는 자동 보안 알림입니다.",
    zh: "这是来自 {appName} 的自动安全通知。",
  },

  // Account banned template
  "email.banned.heading": {
    en: "Your {appName} Account Has Been Locked",
    vi: "Tài khoản {appName} của bạn đã bị khóa",
    ko: "회원님의 {appName} 계정이 잠겼습니다",
    zh: "您的{appName}账户已被锁定",
  },
  "email.banned.greeting.named": {
    en: "Hello {name},",
    vi: "Xin chào {name},",
    ko: "안녕하세요 {name}님,",
    zh: "您好 {name}，",
  },
  "email.banned.greeting.anonymous": {
    en: "Hello,",
    vi: "Xin chào,",
    ko: "안녕하세요,",
    zh: "您好，",
  },
  "email.banned.contact": {
    en: "Your {appName} account has been locked. Please contact admin via {adminEmailLink} for more details.",
    vi: "Tài khoản {appName} của bạn đã bị khóa. Vui lòng liên hệ admin qua {adminEmailLink} để biết thêm chi tiết.",
    ko: "{appName} 계정이 잠겼습니다. 자세한 내용은 {adminEmailLink}을 통해 관리자에게 문의하세요.",
    zh: "您的{appName}账户已被锁定。请通过{adminEmailLink}联系管理员了解更多详情。",
  },
  "email.banned.footer": {
    en: "If you believe this is a mistake, please respond soon to get support.",
    vi: "Nếu bạn cho rằng đây là nhầm lẫn, vui lòng phản hồi sớm để được hỗ trợ.",
    ko: "이것이 실수라고 생각되신다면, 빨리 답변하여 지원을 받으세요.",
    zh: "如果您认为这是错误，请尽快回复以获得支持。",
  },

  // ─── Notification titles & bodies ────────────────────────────────────────

  // Booking
  "notif.booking.created.title": {
    en: "New booking request",
    vi: "Yêu cầu đặt lịch mới",
    ko: "새 예약 요청",
    zh: "新预约请求",
  },
  "notif.booking.created.body": {
    en: "You have received a new booking request.",
    vi: "Bạn vừa nhận được một yêu cầu đặt lịch mới.",
    ko: "새 예약 요청을 받았습니다.",
    zh: "您收到了新的预约请求。",
  },
  "notif.service.added.title": {
    en: "New service available",
    vi: "Có dịch vụ mới",
    ko: "새로운 서비스 이용 가능",
    zh: "有新服务",
  },
  "notif.service.added.body": {
    en: "A new service was added. Add it to your profile to receive bookings.",
    vi: "Một dịch vụ mới vừa được thêm. Thêm vào hồ sơ của bạn để nhận đặt lịch.",
    ko: "새 서비스가 추가되었습니다. 예약을 받으려면 프로필에 추가하세요.",
    zh: "已新增一项服务。将其添加到您的资料中以接收预订。",
  },
  "notif.service.deprecated.title": {
    en: "A service was discontinued",
    vi: "Một dịch vụ đã ngừng",
    ko: "서비스가 중단되었습니다",
    zh: "一项服务已停用",
  },
  "notif.service.deprecated.body": {
    en: "A service you offer no longer accepts new bookings. Existing bookings are unaffected.",
    vi: "Một dịch vụ bạn cung cấp không còn nhận đặt lịch mới. Các đặt lịch hiện tại không bị ảnh hưởng.",
    ko: "제공 중인 서비스가 더 이상 새 예약을 받지 않습니다. 기존 예약은 영향을 받지 않습니다.",
    zh: "您提供的某项服务不再接受新预订。现有预订不受影响。",
  },
  "notif.booking.workerResponse": {
    en: 'Message from the worker: "{message}"',
    vi: 'Phản hồi từ người thực hiện: "{message}"',
    ko: '작업자의 메시지: "{message}"',
    zh: '服务者的留言："{message}"',
  },
  "notif.booking.status.confirmed.title": {
    en: "Booking confirmed",
    vi: "Booking đã được xác nhận",
    ko: "예약이 확인되었습니다",
    zh: "预约已确认",
  },
  "notif.booking.status.confirmed.body": {
    en: "Your booking has been confirmed by the worker.",
    vi: "Booking của bạn đã được người thực hiện xác nhận.",
    ko: "예약이 작업자에 의해 확인되었습니다.",
    zh: "您的预约已被服务者确认。",
  },
  "notif.booking.status.rejected.title": {
    en: "Booking rejected",
    vi: "Booking bị từ chối",
    ko: "예약이 거절되었습니다",
    zh: "预约已拒绝",
  },
  "notif.booking.status.rejected.body": {
    en: "Your booking request has been rejected.",
    vi: "Yêu cầu booking đã bị từ chối.",
    ko: "예약 요청이 거절되었습니다.",
    zh: "您的预约请求已被拒绝。",
  },
  "notif.booking.status.inProgress.title": {
    en: "Booking in progress",
    vi: "Booking đang thực hiện",
    ko: "예약이 진행 중입니다",
    zh: "预约进行中",
  },
  "notif.booking.status.inProgress.body": {
    en: "The booking has started and is being performed.",
    vi: "Booking đã bắt đầu và đang được thực hiện.",
    ko: "예약이 시작되어 진행 중입니다.",
    zh: "预约已开始并正在执行。",
  },
  "notif.booking.status.pendingAcceptance.title": {
    en: "Awaiting completion confirmation",
    vi: "Booking chờ xác nhận hoàn thành",
    ko: "완료 확인 대기 중",
    zh: "待确认完成",
  },
  "notif.booking.status.pendingAcceptance.body": {
    en: "The worker has reported completion. Please confirm or dispute if needed.",
    vi: "Worker đã báo hoàn thành. Vui lòng xác nhận hoặc khiếu nại nếu cần.",
    ko: "작업자가 완료를 보고했습니다. 확인하거나 이의를 제기하세요.",
    zh: "服务者已报告完成。请确认或提出异议。",
  },
  "notif.booking.status.completed.title": {
    en: "Booking completed",
    vi: "Booking đã hoàn thành",
    ko: "예약이 완료되었습니다",
    zh: "预约已完成",
  },
  "notif.booking.status.completed.body": {
    en: "The booking has been completed successfully.",
    vi: "Booking đã hoàn thành thành công.",
    ko: "예약이 성공적으로 완료되었습니다.",
    zh: "预约已成功完成。",
  },
  "notif.booking.status.cancelled.title": {
    en: "Booking cancelled",
    vi: "Booking đã bị hủy",
    ko: "예약이 취소되었습니다",
    zh: "预约已取消",
  },
  "notif.booking.status.cancelled.body": {
    en: "The booking has been cancelled.",
    vi: "Booking đã bị hủy.",
    ko: "예약이 취소되었습니다.",
    zh: "预约已取消。",
  },
  "notif.booking.status.disputed.title": {
    en: "Booking disputed",
    vi: "Booking đang tranh chấp",
    ko: "예약 분쟁 중",
    zh: "预约争议中",
  },
  "notif.booking.status.disputed.body": {
    en: "A dispute has been opened for this booking.",
    vi: "Một khiếu nại đã được mở cho booking này.",
    ko: "이 예약에 대한 분쟁이 접수되었습니다.",
    zh: "此预约已开启争议。",
  },
  "notif.booking.status.expired.title": {
    en: "Booking expired",
    vi: "Booking đã hết hạn",
    ko: "예약이 만료되었습니다",
    zh: "预约已过期",
  },
  "notif.booking.status.expired.body": {
    en: "The booking has expired.",
    vi: "Booking đã hết hạn.",
    ko: "예약이 만료되었습니다.",
    zh: "预约已过期。",
  },
  "notif.booking.status.default.title": {
    en: "Booking status updated",
    vi: "Trạng thái booking đã cập nhật",
    ko: "예약 상태가 업데이트되었습니다",
    zh: "预约状态已更新",
  },
  "notif.booking.status.default.body": {
    en: "Your booking status is now {status}.",
    vi: "Trạng thái booking của bạn hiện là {status}.",
    ko: "현재 예약 상태는 {status}입니다.",
    zh: "您的预约状态现在为 {status}。",
  },
  "notif.booking.cancelled.title": {
    en: "Booking cancelled",
    vi: "Booking đã bị hủy",
    ko: "예약이 취소되었습니다",
    zh: "预约已取消",
  },
  "notif.booking.cancelled.body": {
    en: "A booking has been cancelled by {cancelledBy}.",
    vi: "Một booking đã bị hủy bởi {cancelledBy}.",
    ko: "예약이 {cancelledBy}에 의해 취소되었습니다.",
    zh: "预约已由 {cancelledBy} 取消。",
  },
  "notif.booking.autoExpired.title": {
    en: "Warning: booking expired",
    vi: "Cảnh báo: booking đã hết hạn",
    ko: "경고: 예약 만료됨",
    zh: "警告：预约已过期",
  },
  "notif.booking.autoExpired.body.shortNotice": {
    en: "The booking expired because you did not confirm within the allowed time.",
    vi: "Booking đã hết hạn vì bạn không xác nhận trong thời gian cho phép.",
    ko: "허용 시간 내에 확인하지 않아 예약이 만료되었습니다.",
    zh: "由于您未在规定时间内确认，预约已过期。",
  },
  "notif.booking.autoExpired.body.confirmationDeadline": {
    en: "The booking expired because you did not confirm 6 hours before the start time.",
    vi: "Booking đã hết hạn vì bạn không xác nhận trước giờ bắt đầu 6 giờ.",
    ko: "시작 6시간 전에 확인하지 않아 예약이 만료되었습니다.",
    zh: "由于您未在开始前6小时确认，预约已过期。",
  },
  "notif.booking.autoExpired.suffix": {
    en: "Please respond to bookings on time to avoid affecting your reputation.",
    vi: "Vui lòng phản hồi booking đúng hạn để tránh ảnh hưởng uy tín.",
    ko: "평판에 영향을 미치지 않도록 예약에 제때 응답하세요.",
    zh: "请按时响应预约，以免影响您的信誉。",
  },
  "notif.booking.updated.title": {
    en: "Booking updated",
    vi: "Booking đã được cập nhật",
    ko: "예약이 업데이트되었습니다",
    zh: "预约已更新",
  },
  "notif.booking.updated.body": {
    en: "Booking information has been updated.",
    vi: "Thông tin booking đã được cập nhật.",
    ko: "예약 정보가 업데이트되었습니다.",
    zh: "预约信息已更新。",
  },
  "notif.booking.reminder.title": {
    en: "Booking starts in {hours}h",
    vi: "Booking bắt đầu trong {hours}h",
    ko: "{hours}시간 후 예약 시작",
    zh: "预约将在 {hours} 小时后开始",
  },
  "notif.booking.reminder.body": {
    en: "Your booking starts at {startsAt}.",
    vi: "Booking của bạn bắt đầu lúc {startsAt}.",
    ko: "예약이 {startsAt}에 시작됩니다.",
    zh: "您的预约将于 {startsAt} 开始。",
  },

  // Dispute
  "notif.dispute.created.title": {
    en: "New booking dispute",
    vi: "Có khiếu nại booking mới",
    ko: "새 예약 분쟁",
    zh: "新预约争议",
  },
  "notif.dispute.created.body": {
    en: "A new dispute has been created for the booking.",
    vi: "Một khiếu nại mới đã được tạo cho booking.",
    ko: "예약에 대한 새 분쟁이 생성되었습니다.",
    zh: "预约已创建新争议。",
  },
  "notif.dispute.resolved.title": {
    en: "Booking dispute resolved",
    vi: "Khiếu nại booking đã được xử lý",
    ko: "예약 분쟁 해결됨",
    zh: "预约争议已解决",
  },
  "notif.dispute.resolved.body": {
    en: "The booking dispute has been resolved with result: {resolution}.",
    vi: "Khiếu nại booking đã được xử lý với kết quả: {resolution}.",
    ko: "예약 분쟁이 {resolution}(으)로 해결되었습니다.",
    zh: "预约争议已以 {resolution} 结果解决。",
  },

  // Chat
  "notif.chat.message.title": {
    en: "New message",
    vi: "Tin nhắn mới",
    ko: "새 메시지",
    zh: "新消息",
  },
  "notif.chat.message.body": {
    en: "You have a new message.",
    vi: "Bạn có tin nhắn mới.",
    ko: "새 메시지가 있습니다.",
    zh: "您有一条新消息。",
  },
  "notif.chat.groupMessage.title": {
    en: "New group message",
    vi: "Tin nhắn nhóm mới",
    ko: "새 그룹 메시지",
    zh: "新群组消息",
  },
  "notif.chat.groupMessage.body": {
    en: "You have a new message in the group.",
    vi: "Bạn có tin nhắn mới trong nhóm.",
    ko: "그룹에 새 메시지가 있습니다.",
    zh: "群组中有新消息。",
  },

  // Review
  "notif.review.created.title": {
    en: "New review",
    vi: "Đánh giá mới",
    ko: "새 리뷰",
    zh: "新评价",
  },
  "notif.review.created.body": {
    en: "A new review has been submitted for your booking.",
    vi: "Một đánh giá mới đã được gửi cho booking của bạn.",
    ko: "예약에 새 리뷰가 제출되었습니다.",
    zh: "您的预约收到了新评价。",
  },
  "notif.review.updated.title": {
    en: "Review updated",
    vi: "Đánh giá đã được cập nhật",
    ko: "리뷰가 업데이트되었습니다",
    zh: "评价已更新",
  },
  "notif.review.updated.body": {
    en: "A review for your booking has been updated.",
    vi: "Một đánh giá về booking của bạn đã được cập nhật.",
    ko: "예약 리뷰가 업데이트되었습니다.",
    zh: "您的预约评价已更新。",
  },

  // Reputation
  "notif.reputation.warning.title": {
    en: "Reputation score warning",
    vi: "Cảnh báo điểm uy tín",
    ko: "평판 점수 경고",
    zh: "信誉分数警告",
  },
  "notif.reputation.warning.body.critical": {
    en: "Your reputation score is {score}/100. Below 30, some features are restricted.",
    vi: "Điểm uy tín của bạn hiện là {score}/100. Dưới 30 điểm, bạn bị hạn chế một số tính năng.",
    ko: "평판 점수가 {score}/100입니다. 30점 미만이면 일부 기능이 제한됩니다.",
    zh: "您的信誉分数为 {score}/100。低于30分时，部分功能将受限。",
  },
  "notif.reputation.warning.body.normal": {
    en: "Your reputation score is {score}/100. Complete bookings on time to maintain your score.",
    vi: "Điểm uy tín của bạn hiện là {score}/100. Hãy hoàn thành booking đúng hạn để duy trì điểm.",
    ko: "평판 점수가 {score}/100입니다. 예약을 제때 완료하여 점수를 유지하세요.",
    zh: "您的信誉分数为 {score}/100。请按时完成预约以维持分数。",
  },

  // Report reasons
  "notif.reportReason.scam": {
    en: "Scam",
    vi: "Lừa đảo",
    ko: "사기",
    zh: "诈骗",
  },
  "notif.reportReason.lowQuality": {
    en: "Low quality",
    vi: "Chất lượng thấp",
    ko: "저품질",
    zh: "低质量",
  },
  "notif.reportReason.harassment": {
    en: "Harassment",
    vi: "Quấy rối",
    ko: "괴롭힘",
    zh: "骚扰",
  },
  "notif.reportReason.fakeProfile": {
    en: "Fake profile",
    vi: "Hồ sơ giả mạo",
    ko: "허위 프로필",
    zh: "虚假资料",
  },
  "notif.reportReason.other": {
    en: "Other",
    vi: "Khác",
    ko: "기타",
    zh: "其他",
  },

  // Restriction feature labels
  "notif.restrictionFeature.postCreate": {
    en: "post creation",
    vi: "đăng bài",
    ko: "게시물 작성",
    zh: "发帖",
  },
  "notif.restrictionFeature.workerActivity": {
    en: "worker activity",
    vi: "hoạt động worker",
    ko: "워커 활동",
    zh: "工作者活动",
  },

  // Restriction descriptions
  "notif.restriction.permanent": {
    en: "You are permanently banned from {feature}.",
    vi: "Bạn đang bị cấm {feature} vĩnh viễn.",
    ko: "{feature}이/가 영구적으로 금지되었습니다.",
    zh: "您已被永久禁止{feature}。",
  },
  "notif.restriction.until": {
    en: "You are banned from {feature} until {endsAt}.",
    vi: "Bạn đang bị cấm {feature} đến {endsAt}.",
    ko: "{endsAt}까지 {feature}이/가 금지되었습니다.",
    zh: "您被禁止{feature}直到 {endsAt}。",
  },

  // Moderation — post deleted
  "notif.moderation.postDeleted.title": {
    en: "Your post has been deleted by admin",
    vi: "Bài viết của bạn đã bị admin xóa",
    ko: "관리자에 의해 게시물이 삭제되었습니다",
    zh: "您的帖子已被管理员删除",
  },
  "notif.moderation.postDeleted.intro": {
    en: "One of your posts was deleted by admin for violating community guidelines.",
    vi: "Một bài viết của bạn đã bị admin xóa do vi phạm quy định cộng đồng.",
    ko: "커뮤니티 가이드라인 위반으로 게시물이 관리자에 의해 삭제되었습니다.",
    zh: "您的一篇帖子因违反社区准则被管理员删除。",
  },
  "notif.moderation.postDeleted.preview": {
    en: 'Post excerpt: "{excerpt}"',
    vi: 'Trích đoạn bài viết: "{excerpt}"',
    ko: '게시물 발췌: "{excerpt}"',
    zh: '帖子摘录："{excerpt}"',
  },
  "notif.moderation.postDeleted.reason": {
    en: "Report reason: {reason}",
    vi: "Lý do báo cáo: {reason}",
    ko: "신고 이유: {reason}",
    zh: "举报原因：{reason}",
  },
  "notif.moderation.postDeleted.description": {
    en: "Report description: {description}",
    vi: "Mô tả báo cáo: {description}",
    ko: "신고 설명: {description}",
    zh: "举报描述：{description}",
  },
  "notif.moderation.postDeleted.adminNote": {
    en: "Admin note: {note}",
    vi: "Ghi chú admin: {note}",
    ko: "관리자 메모: {note}",
    zh: "管理员备注：{note}",
  },
  "notif.moderation.postDeleted.noRestriction": {
    en: "No posting ban has been applied to your account yet.",
    vi: "Hiện chưa áp dụng lệnh cấm đăng bài đối với tài khoản của bạn.",
    ko: "현재 계정에 게시물 금지가 적용되지 않았습니다.",
    zh: "目前未对您的账户执行发帖禁令。",
  },

  // Moderation — worker report resolved
  "notif.moderation.reportResolved.title.sanctioned": {
    en: "Report about you resolved — sanctions applied",
    vi: "Báo cáo về bạn đã xử lý — áp dụng chế tài",
    ko: "귀하에 대한 신고 처리 완료 — 제재 적용됨",
    zh: "关于您的举报已处理 — 已施加制裁",
  },
  "notif.moderation.reportResolved.title.clean": {
    en: "Report about you resolved — no violation",
    vi: "Báo cáo về bạn đã xử lý — không vi phạm",
    ko: "귀하에 대한 신고 처리 완료 — 위반 없음",
    zh: "关于您的举报已处理 — 无违规",
  },
  "notif.moderation.reportResolved.intro": {
    en: "A report involving you has been reviewed by admin.",
    vi: "Báo cáo liên quan đến bạn đã được admin xem xét xong.",
    ko: "귀하와 관련된 신고가 관리자에 의해 검토되었습니다.",
    zh: "涉及您的举报已由管理员审核。",
  },
  "notif.moderation.reportResolved.reason": {
    en: "Report reason: {reason}",
    vi: "Lý do báo cáo: {reason}",
    ko: "신고 이유: {reason}",
    zh: "举报原因：{reason}",
  },
  "notif.moderation.reportResolved.description": {
    en: "Report description: {description}",
    vi: "Mô tả báo cáo: {description}",
    ko: "신고 설명: {description}",
    zh: "举报描述：{description}",
  },
  "notif.moderation.reportResolved.adminNote": {
    en: "Admin note: {note}",
    vi: "Ghi chú admin: {note}",
    ko: "관리자 메모: {note}",
    zh: "管理员备注：{note}",
  },
  "notif.moderation.reportResolved.conclusion.clean": {
    en: "Conclusion: No violation found. No sanctions have been applied to your account.",
    vi: "Kết luận: Không có dấu hiệu vi phạm. Tài khoản của bạn không bị áp dụng chế tài.",
    ko: "결론: 위반 사항 없음. 계정에 제재가 적용되지 않았습니다.",
    zh: "结论：未发现违规行为。您的账户未受到任何制裁。",
  },
  "notif.moderation.reportResolved.conclusion.sanctioned": {
    en: "Conclusion: {description}",
    vi: "Kết luận: {description}",
    ko: "결론: {description}",
    zh: "结论：{description}",
  },
  "notif.moderation.reportResolved.restrictionReason": {
    en: "Ban reason: {reason}",
    vi: "Lý do cấm: {reason}",
    ko: "금지 이유: {reason}",
    zh: "禁令原因：{reason}",
  },

  // Moderation — restriction applied
  "notif.moderation.restriction.title": {
    en: "You have been banned from {feature}",
    vi: "Bạn đã bị cấm {feature}",
    ko: "{feature}이/가 금지되었습니다",
    zh: "您已被禁止{feature}",
  },
  "notif.moderation.restriction.reason": {
    en: "Reason: {reason}",
    vi: "Lý do: {reason}",
    ko: "이유: {reason}",
    zh: "原因：{reason}",
  },
  "notif.moderation.restriction.fromReport": {
    en: "This ban was applied after admin reviewed a related report.",
    vi: "Lệnh cấm này được áp dụng sau khi admin xử lý báo cáo liên quan.",
    ko: "이 금지는 관련 신고를 관리자가 검토한 후 적용되었습니다.",
    zh: "此禁令是在管理员审核相关举报后施加的。",
  },
  "notif.moderation.restriction.defaultReason": {
    en: "Community policy violation",
    vi: "Vi phạm chính sách cộng đồng",
    ko: "커뮤니티 정책 위반",
    zh: "社区政策违规",
  },

  // Account
  "notif.account.banned.title": {
    en: "Your account has been locked",
    vi: "Tài khoản của bạn đã bị khóa",
    ko: "계정이 잠겼습니다",
    zh: "您的账户已被锁定",
  },
  "notif.account.banned.body.intro": {
    en: "You can no longer use this account.",
    vi: "Bạn không thể tiếp tục sử dụng tài khoản này.",
    ko: "이 계정을 더 이상 사용할 수 없습니다.",
    zh: "您无法再使用此账户。",
  },
  "notif.account.banned.body.reason": {
    en: "Reason: {reason}",
    vi: "Lý do: {reason}",
    ko: "이유: {reason}",
    zh: "原因：{reason}",
  },
  "notif.account.banned.body.defaultReason": {
    en: "Reason: Violation of system policy.",
    vi: "Lý do: Vi phạm chính sách của hệ thống.",
    ko: "이유: 시스템 정책 위반.",
    zh: "原因：违反系统政策。",
  },
  "notif.account.banned.body.contact": {
    en: "If you believe this is a mistake, please contact support.",
    vi: "Nếu bạn cho rằng đây là nhầm lẫn, vui lòng liên hệ bộ phận hỗ trợ.",
    ko: "이것이 실수라고 생각되면 지원팀에 문의하세요.",
    zh: "如果您认为这是错误，请联系客服。",
  },
  "notif.account.unbanned.title": {
    en: "Your account has been unlocked",
    vi: "Tài khoản của bạn đã được mở khóa",
    ko: "계정이 잠금 해제되었습니다",
    zh: "您的账户已解锁",
  },
  "notif.account.unbanned.body": {
    en: "You can log in and use the system normally again.",
    vi: "Bạn có thể đăng nhập và sử dụng hệ thống bình thường trở lại.",
    ko: "다시 정상적으로 로그인하고 시스템을 사용할 수 있습니다.",
    zh: "您可以再次正常登录和使用系统。",
  },

  // Wallet
  "notif.wallet.depositFailed.title": {
    en: "Deposit failed",
    vi: "Nạp tiền thất bại",
    ko: "충전 실패",
    zh: "充值失败",
  },
  "notif.wallet.depositFailed.body": {
    en: "The transferred amount does not match the requested deposit amount.",
    vi: "Số tiền chuyển không khớp với số tiền yêu cầu nạp.",
    ko: "이체된 금액이 요청한 충전 금액과 일치하지 않습니다.",
    zh: "转账金额与请求充值金额不符。",
  },
  "notif.wallet.depositSuccess.title": {
    en: "Deposit successful",
    vi: "Nạp tiền thành công",
    ko: "충전 성공",
    zh: "充值成功",
  },
  "notif.wallet.depositSuccess.body": {
    en: "Your wallet balance has been updated.",
    vi: "Số dư ví của bạn đã được cập nhật.",
    ko: "지갑 잔액이 업데이트되었습니다.",
    zh: "您的钱包余额已更新。",
  },
  "notif.wallet.planActivated.title": {
    en: "Pricing plan activated",
    vi: "Gói cước đã được kích hoạt",
    ko: "요금제가 활성화되었습니다",
    zh: "套餐已激活",
  },
  "notif.wallet.planActivated.body": {
    en: "Your {plan} plan has been activated successfully.",
    vi: "Gói {plan} của bạn đã được kích hoạt thành công.",
    ko: "{plan} 요금제가 성공적으로 활성화되었습니다.",
    zh: "您的 {plan} 套餐已成功激活。",
  },

  // Ask the Worker — Q&A
  "notif.workerQuestion.created.title": {
    en: "New question on your profile",
    vi: "Có câu hỏi mới trên hồ sơ của bạn",
    ko: "프로필에 새 질문이 있습니다",
    zh: "您的资料收到新提问",
  },
  "notif.workerQuestion.created.body": {
    en: 'Someone asked: "{excerpt}". Reply soon to keep them engaged.',
    vi: 'Có người hỏi: "{excerpt}". Hãy trả lời sớm để giữ chân khách.',
    ko: '누군가 질문했습니다: "{excerpt}". 빠르게 답변해 주세요.',
    zh: '有人提问："{excerpt}"。请尽快回复。',
  },
  "notif.workerQuestion.answered.title": {
    en: "Your question has been answered",
    vi: "Câu hỏi của bạn đã được trả lời",
    ko: "질문에 답변이 등록되었습니다",
    zh: "您的问题已得到回复",
  },
  "notif.workerQuestion.answered.body": {
    en: 'The worker replied: "{answer}".',
    vi: 'Người thực hiện đã trả lời: "{answer}".',
    ko: '작업자가 답변했습니다: "{answer}".',
    zh: '服务者回复："{answer}"。',
  },
  "notif.workerQuestion.answered.emailIntro": {
    en: "The worker has answered the question you asked.",
    vi: "Người thực hiện đã trả lời câu hỏi mà bạn đã gửi.",
    ko: "문의하신 질문에 작업자가 답변했습니다.",
    zh: "服务者已回复您提出的问题。",
  },
  "notif.workerQuestion.answered.emailQuestionLabel": {
    en: "Your question",
    vi: "Câu hỏi của bạn",
    ko: "질문 내용",
    zh: "您的问题",
  },
  "notif.workerQuestion.answered.emailAnswerLabel": {
    en: "Answer",
    vi: "Câu trả lời",
    ko: "답변",
    zh: "回复",
  },
};

export function t(
  key: string,
  locale: Locale = "en",
  vars?: Record<string, string | number>
): string {
  const translation = translations[key];
  if (!translation) return key;
  let result = translation[locale] || translation.en || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return result;
}

export function getLocaleFromHeader(acceptLanguage?: string): Locale {
  if (!acceptLanguage) return "en";

  const locales: Locale[] = ["vi", "ko", "zh", "en"];
  const languages = acceptLanguage
    .toLowerCase()
    .split(",")
    .map((lang) => lang.split(";")[0].trim());

  for (const lang of languages) {
    if (locales.includes(lang as Locale)) {
      return lang as Locale;
    }
    const prefix = lang.split("-")[0];
    if (locales.includes(prefix as Locale)) {
      return prefix as Locale;
    }
  }

  return "en";
}

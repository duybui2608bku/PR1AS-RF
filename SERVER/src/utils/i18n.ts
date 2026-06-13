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
};

export function t(key: string, locale: Locale = "en", vars?: Record<string, string | number>): string {
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

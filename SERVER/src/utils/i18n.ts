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
  "common.forbidden": {
    en: "You do not have permission to perform this action",
    vi: "Bạn không có quyền thực hiện hành động này",
    ko: "이 작업을 수행할 권한이 없습니다",
    zh: "您没有执行此操作的权限",
  },
};

export function t(key: string, locale: Locale = "en"): string {
  const translation = translations[key];
  if (!translation) {
    return key;
  }
  return translation[locale] || translation.en || key;
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

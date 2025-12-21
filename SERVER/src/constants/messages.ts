/**
 * Centralized messages constants
 * Quản lý tập trung các thông báo lỗi và thành công
 */

/**
 * Auth Messages - Thông báo liên quan đến xác thực
 */
export const AUTH_MESSAGES = {
  // Validation
  INVALID_DATA: "Dữ liệu không hợp lệ",
  EMAIL_REQUIRED: "Email là bắt buộc",
  EMAIL_INVALID: "Email không hợp lệ",
  PASSWORD_REQUIRED: "Mật khẩu là bắt buộc",
  PASSWORD_MIN_LENGTH: "Mật khẩu phải có ít nhất 8 ký tự",

  // Token
  TOKEN_NOT_PROVIDED: "Token không được cung cấp",
  TOKEN_INVALID: "Token không hợp lệ",
  TOKEN_EXPIRED: "Token không hợp lệ hoặc đã hết hạn",

  // User status
  USER_BANNED: "Tài khoản đã bị khóa",
  USER_NOT_FOUND: "Không tìm thấy người dùng",
  EMAIL_EXISTS: "Email đã được đăng ký",

  // Credentials
  INVALID_CREDENTIALS: "Email hoặc mật khẩu không chính xác",
  LOGIN_REQUIRED: "Yêu cầu đăng nhập",

  // Success
  LOGOUT_SUCCESS: "Đăng xuất thành công",
  REGISTER_SUCCESS: "Đăng ký thành công",
  LOGIN_SUCCESS: "Đăng nhập thành công",
} as const;

/**
 * Authorization Messages - Thông báo liên quan đến phân quyền
 */
export const AUTHZ_MESSAGES = {
  FORBIDDEN: "Bạn không có quyền thực hiện hành động này",
  INSUFFICIENT_PERMISSIONS: "Không đủ quyền truy cập",
} as const;

/**
 * Common Messages - Thông báo chung
 */
export const COMMON_MESSAGES = {
  INTERNAL_SERVER_ERROR: "Đã xảy ra lỗi hệ thống",
  NOT_FOUND: "Không tìm thấy tài nguyên",
  BAD_REQUEST: "Yêu cầu không hợp lệ",
  SUCCESS: "Thành công",
  CREATED: "Tạo mới thành công",
  UPDATED: "Cập nhật thành công",
  DELETED: "Xóa thành công",
} as const;

/**
 * Validation Messages - Thông báo validation chung
 */
export const VALIDATION_MESSAGES = {
  REQUIRED: (field: string) => `${field} là bắt buộc`,
  INVALID: (field: string) => `${field} không hợp lệ`,
  MIN_LENGTH: (field: string, length: number) =>
    `${field} phải có ít nhất ${length} ký tự`,
  MAX_LENGTH: (field: string, length: number) =>
    `${field} không được vượt quá ${length} ký tự`,
  MIN_VALUE: (field: string, value: number) =>
    `${field} phải lớn hơn hoặc bằng ${value}`,
  MAX_VALUE: (field: string, value: number) =>
    `${field} phải nhỏ hơn hoặc bằng ${value}`,
} as const;

/**
 * User Messages - Thông báo liên quan đến quản lý người dùng
 */
export const USER_MESSAGES = {
  USER_NOT_FOUND: "Không tìm thấy người dùng",
  INVALID_STATUS: "Trạng thái không hợp lệ",
  STATUS_UPDATED: "Cập nhật trạng thái người dùng thành công",
  USERS_FETCHED: "Lấy danh sách người dùng thành công",
} as const;

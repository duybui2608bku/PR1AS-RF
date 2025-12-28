import {
  AUTH_MESSAGES,
  COMMON_MESSAGES,
  AUTHZ_MESSAGES,
} from "../constants/messages";

export const MESSAGE_KEY_MAP: Record<string, string> = {
  [AUTH_MESSAGES.INVALID_DATA]: "auth.invalidData",
  [AUTH_MESSAGES.EMAIL_REQUIRED]: "auth.emailRequired",
  [AUTH_MESSAGES.EMAIL_INVALID]: "auth.emailInvalid",
  [AUTH_MESSAGES.PASSWORD_REQUIRED]: "auth.passwordRequired",
  [AUTH_MESSAGES.PASSWORD_MIN_LENGTH]: "auth.passwordMinLength",
  [AUTH_MESSAGES.TOKEN_NOT_PROVIDED]: "auth.tokenNotProvided",
  [AUTH_MESSAGES.TOKEN_INVALID]: "auth.tokenInvalid",
  [AUTH_MESSAGES.TOKEN_EXPIRED]: "auth.tokenExpired",
  [AUTH_MESSAGES.REFRESH_TOKEN_INVALID]: "auth.refreshTokenInvalid",
  [AUTH_MESSAGES.REFRESH_TOKEN_EXPIRED]: "auth.refreshTokenExpired",
  [AUTH_MESSAGES.USER_BANNED]: "auth.userBanned",
  [AUTH_MESSAGES.USER_NOT_FOUND]: "auth.userNotFound",
  [AUTH_MESSAGES.EMAIL_EXISTS]: "auth.emailExists",
  [AUTH_MESSAGES.INVALID_CREDENTIALS]: "auth.invalidCredentials",
  [AUTH_MESSAGES.LOGIN_REQUIRED]: "auth.loginRequired",
  [AUTH_MESSAGES.OLD_PASSWORD_INCORRECT]: "auth.oldPasswordIncorrect",
  [AUTH_MESSAGES.PASSWORD_CHANGE_SUCCESS]: "auth.passwordChangeSuccess",
  [AUTH_MESSAGES.RESET_TOKEN_REQUIRED]: "auth.resetTokenRequired",
  [AUTH_MESSAGES.RESET_TOKEN_INVALID]: "auth.resetTokenInvalid",
  [AUTH_MESSAGES.PASSWORD_RESET_EMAIL_SENT]: "auth.passwordResetEmailSent",
  [AUTH_MESSAGES.PASSWORD_RESET_SUCCESS]: "auth.passwordResetSuccess",
  [AUTH_MESSAGES.PASSWORD_RESET_FAILED]: "auth.passwordResetFailed",
  [AUTH_MESSAGES.LOGOUT_SUCCESS]: "auth.logoutSuccess",
  [AUTH_MESSAGES.REGISTER_SUCCESS]: "auth.registerSuccess",
  [AUTH_MESSAGES.LOGIN_SUCCESS]: "auth.loginSuccess",
  [AUTH_MESSAGES.PROFILE_UPDATED]: "auth.profileUpdated",
  [COMMON_MESSAGES.INTERNAL_SERVER_ERROR]: "common.internalServerError",
  [COMMON_MESSAGES.NOT_FOUND]: "common.notFound",
  [COMMON_MESSAGES.BAD_REQUEST]: "common.badRequest",
  [COMMON_MESSAGES.SUCCESS]: "common.success",
  [AUTHZ_MESSAGES.FORBIDDEN]: "common.forbidden",
};

export function getMessageKey(message: string): string {
  return MESSAGE_KEY_MAP[message] || message;
}

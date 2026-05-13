import { APP_CONSTANTS } from "../constants/app";
import { TOKEN_EXPIRY } from "../constants/time";

export const emailVerificationTemplate = (verificationLink: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Xác thực địa chỉ email</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
        <h2 style="color: #333;">Xác thực địa chỉ email của bạn</h2>
        <p>Cảm ơn bạn đã đăng ký với ${APP_CONSTANTS.NAME}. Vui lòng nhấp vào nút bên dưới để xác thực địa chỉ email của bạn:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
        </div>
        <p>Hoặc dán liên kết này vào trình duyệt của bạn:</p>
        <p style="word-break: break-all; color: #007bff;">${verificationLink}</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">Liên kết này sẽ hết hạn trong ${TOKEN_EXPIRY.EMAIL_VERIFICATION_HOURS} giờ.</p>
        <p style="color: #666; font-size: 12px;">Nếu bạn không tạo tài khoản, vui lòng bỏ qua email này.</p>
      </div>
    </body>
    </html>
  `;
};

export const passwordResetTemplate = (resetLink: string, userName?: string) => {
  const greeting = userName ? `Hello ${userName},` : "Hello,";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Yêu cầu đặt lại mật khẩu</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
        <h2 style="color: #333;">Yêu cầu đặt lại mật khẩu</h2>
        <p>${greeting}</p>
        <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu. Nhấp vào nút bên dưới để tạo mật khẩu mới:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        </div>
        <p>Hoặc dán liên kết này vào trình duyệt của bạn:</p>
        <p style="word-break: break-all; color: #dc3545;">${resetLink}</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;"><strong>Quan trọng:</strong> Liên kết này sẽ hết hạn trong ${TOKEN_EXPIRY.PASSWORD_RESET_MINUTES} phút.</p>
        <p style="color: #666; font-size: 12px;">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này. Mật khẩu của bạn sẽ không thay đổi.</p>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">Vì lý do bảo mật, đừng chia sẻ liên kết này với bất kỳ ai.</p>
      </div>
    </body>
    </html>
  `;
};

import { APP_CONSTANTS } from "../constants/app";
import { TOKEN_EXPIRY } from "../constants/time";

export const emailVerificationTemplate = (verificationLink: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
        <h2 style="color: #333;">Verify Your Email Address</h2>
        <p>Thank you for registering with ${APP_CONSTANTS.NAME}. Please click the button below to verify your email address:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #007bff;">${verificationLink}</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">This link will expire in ${TOKEN_EXPIRY.EMAIL_VERIFICATION_HOURS} hours.</p>
        <p style="color: #666; font-size: 12px;">If you didn't create an account, please ignore this email.</p>
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
      <title>Password Reset Request</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>${greeting}</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #dc3545;">${resetLink}</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;"><strong>Important:</strong> This link will expire in ${TOKEN_EXPIRY.PASSWORD_RESET_MINUTES} minutes.</p>
        <p style="color: #666; font-size: 12px;">If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">For security reasons, never share this link with anyone.</p>
      </div>
    </body>
    </html>
  `;
};

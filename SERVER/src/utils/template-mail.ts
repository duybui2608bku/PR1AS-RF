import { APP_CONSTANTS } from "../constants/app";
import { TOKEN_EXPIRY } from "../constants/time";
import { Locale, t } from "./i18n";

export interface EmailTemplate {
  subject: string;
  html: string;
}

export const emailVerificationTemplate = (
  verificationLink: string,
  locale: Locale = "en"
): EmailTemplate => {
  const appName = APP_CONSTANTS.NAME;
  const subject = t("email.subject.emailVerification", locale, { appName });
  const heading = t("email.verification.heading", locale);
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${heading}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
        <h2 style="color: #333;">${heading}</h2>
        <p>${t("email.verification.body", locale, { appName })}</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">${t("email.verification.button", locale)}</a>
        </div>
        <p>${t("email.verification.pasteLink", locale)}</p>
        <p style="word-break: break-all; color: #007bff;">${verificationLink}</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">${t("email.verification.expiry", locale, { hours: TOKEN_EXPIRY.EMAIL_VERIFICATION_HOURS })}</p>
        <p style="color: #666; font-size: 12px;">${t("email.verification.notCreated", locale)}</p>
      </div>
    </body>
    </html>
  `;
  return { subject, html };
};

export const passwordResetTemplate = (
  resetLink: string,
  userName?: string,
  locale: Locale = "en"
): EmailTemplate => {
  const appName = APP_CONSTANTS.NAME;
  const greeting = userName
    ? t("email.passwordReset.greeting.named", locale, { name: userName })
    : t("email.passwordReset.greeting.anonymous", locale);
  const subject = t("email.subject.passwordReset", locale, { appName });
  const heading = t("email.passwordReset.heading", locale);
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${heading}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
        <h2 style="color: #333;">${heading}</h2>
        <p>${greeting}</p>
        <p>${t("email.passwordReset.body", locale)}</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">${t("email.passwordReset.button", locale)}</a>
        </div>
        <p>${t("email.passwordReset.pasteLink", locale)}</p>
        <p style="word-break: break-all; color: #dc3545;">${resetLink}</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;"><strong>${t("email.passwordReset.expiry", locale, { minutes: TOKEN_EXPIRY.PASSWORD_RESET_MINUTES })}</strong></p>
        <p style="color: #666; font-size: 12px;">${t("email.passwordReset.notRequested", locale)}</p>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">${t("email.passwordReset.securityNote", locale)}</p>
      </div>
    </body>
    </html>
  `;
  return { subject, html };
};

export const accountBannedTemplate = (
  adminEmail: string,
  userName?: string,
  locale: Locale = "en"
): EmailTemplate => {
  const appName = APP_CONSTANTS.NAME;
  const greeting = userName
    ? t("email.banned.greeting.named", locale, { name: userName })
    : t("email.banned.greeting.anonymous", locale);
  const adminEmailLink = `<a href="mailto:${adminEmail}" style="color: #007bff;">${adminEmail}</a>`;
  const subject = t("email.subject.accountBanned", locale, { appName });
  const heading = t("email.banned.heading", locale, { appName });
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${heading}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
        <h2 style="color: #333;">${heading}</h2>
        <p>${greeting}</p>
        <p>${t("email.banned.contact", locale, { appName, adminEmailLink })}</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">${t("email.banned.footer", locale)}</p>
      </div>
    </body>
    </html>
  `;
  return { subject, html };
};

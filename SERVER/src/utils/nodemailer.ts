import nodemailer from "nodemailer";
import { config } from "../config";
import { APP_CONSTANTS } from "../constants/app";

// Prefer an explicit SMTP transport (a real ESP such as Resend in production)
// so the From domain's SPF/DKIM/DMARC align and mail reaches the inbox. When
// SMTP_HOST is unset we fall back to the Gmail account — fine for local dev,
// but it lands in spam in production because the From domain can't be
// authenticated. See SMTP_* / EMAIL_FROM in the deploy env.
const transporter = config.mail.smtpHost
  ? nodemailer.createTransport({
      host: config.mail.smtpHost,
      port: config.mail.smtpPort,
      secure: config.mail.smtpPort === 465,
      auth: {
        user: config.mail.smtpUser,
        pass: config.mail.smtpPass,
      },
    })
  : nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: config.emailAccount,
        pass: config.googleAppPassword,
      },
    });

interface SendEmailOptions {
  email: string;
  html: string;
  subject?: string;
}

const nodemailerUtils = async ({
  email,
  html,
  subject = APP_CONSTANTS.DEFAULT_EMAIL_SUBJECT,
}: SendEmailOptions) => {
  await transporter.sendMail({
    from: config.mail.from,
    to: email,
    subject: subject,
    html: html,
  });
};

export default nodemailerUtils;

import nodemailer from "nodemailer";
import { config } from "../config";
import { APP_CONSTANTS } from "../constants/app";

const transporter = nodemailer.createTransport({
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
    from: APP_CONSTANTS.DEFAULT_EMAIL_FROM,
    to: email,
    subject: subject,
    html: html,
  });
};

export default nodemailerUtils;

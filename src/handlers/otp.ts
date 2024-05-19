import express, { Request, Response } from "express";
import ejs from "ejs";
import Mail from "nodemailer/lib/mailer";
import path from "path";
import cryptoRandomString from "crypto-random-string";
import bcrypt from "bcrypt";

import { transporter, HOST_EMAIL, CS_EMAIL } from "../config/email";
import generateText from "../emails/email-texts/otp";
import { ReqBody, ResBody } from "../types";
import { OTP_SALT, OTP_SALT_ROUND } from "../config";

interface OTPRequst extends ReqBody {}

class OTPResponse extends ResBody {
  otp: string;
  constructor(message: string, otp: string) {
    super(message);
    this.otp = otp;
  }
}

const send_otp = async (
  req: Request<Record<string, never>, ResBody, OTPRequst>,
  res: Response<ResBody>,
) => {
  const { email, name, sender } = req.body;

  // TODO: need to check the type of request body here

  try {
    // Generate OTP
    const otpContent = cryptoRandomString({ length: 6, type: "numeric" });

    // Encode OTP with salt
    const encodedOtp = bcrypt.hashSync(
      otpContent + OTP_SALT,
      parseInt(OTP_SALT_ROUND || "5"),
    );

    // Generate Email HTML
    let html;
    ejs.renderFile(
      path.join(__dirname, "../emails/email-templates/otp.ejs"),
      {
        name,
        sender,
        otpContent,
        csEmail: CS_EMAIL,
      },
      (err, str) => (html = str),
    );

    // Generate Email Text
    const text = generateText({ name, sender, otpContent, csEmail: CS_EMAIL });

    // Config Email Sending
    const mailOptions: Mail.Options = {
      to: email,
      subject: "One Time Password",
      text: text,
      html: html,
      bcc: CS_EMAIL,
      from: {
        name: sender || "Email.Service.Studio",
        address: HOST_EMAIL || "",
      },
    };

    // Send Email
    await transporter.sendMail(mailOptions);

    // Send back the encoded OTP to requested server
    res.status(200).send(new OTPResponse("An OTP email sent", encodedOtp));
  } catch (error) {
    res
      .status(500)
      .send(
        new ResBody(`Nodemailer error sending email to ${email}: ${error}`),
      );
  }
};

// export const otpRoute = (app: express.Application) => {
//   app.post("/otp", validateAuth, send_otp);
// };

export const otpRoute = (app: express.Application) => {
  app.post("/otp", send_otp);
};

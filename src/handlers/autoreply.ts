import express, { Request, Response } from "express";
import ejs from "ejs";
import Mail from "nodemailer/lib/mailer";
import path from "path";

import { transporter, HOST_EMAIL, CS_EMAIL } from "../config/email";
import generateText from "../emails/email-texts/autoreply";
import { ReqBody, ResBody } from "../types";

interface AutoreplyRequst extends ReqBody {
  formContent: string;
}

const send_autoreply = async (
  req: Request<Record<string, never>, ResBody, AutoreplyRequst>,
  res: Response<ResBody>,
) => {
  const { email, name, formContent, sender, contactEmail: senderContactEmail } = req.body;

  // TODO: need to check the type of request body here

  const contactEmail = senderContactEmail || CS_EMAIL
  if(!contactEmail){
    return res
      .status(500)
      .send(new ResBody(`Contact Email is not configured`));
  }

  try {
    // Generate Email HTML
    let html;
    ejs.renderFile(
      path.join(__dirname, "../emails/email-templates/autoreply.ejs"),
      {
        name,
        formContent,
        sender,
        contactEmail: contactEmail,
      },
      (err, str) => (html = str),
    );

    // Generate Email Text
    const text = generateText({ name, sender, contactEmail: contactEmail });

    // Config Email Sending
    const mailOptions: Mail.Options = {
      to: email,
      subject: "Your contact form was received!",
      text: text,
      html: html,
      bcc: contactEmail,
      from: {
        name: sender || "Email.Service.Studio",
        address: HOST_EMAIL || "",
      },
    };

    // Send Email
    await transporter.sendMail(mailOptions);
    res.status(200).end();
  } catch (error) {
    res
      .status(500)
      .send(
        new ResBody(`Failed to send email to ${email}: ${error}`),
      );
  }
};

export const autoreplyRoute = (app: express.Application) => {
  app.post("/autoreply", send_autoreply);
};

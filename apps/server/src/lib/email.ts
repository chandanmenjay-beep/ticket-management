import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.IMAP_EMAIL,
    pass: process.env.IMAP_PASSWORD,
  },
});

export const sendEmail = async (to: string, subject: string, html: string, inReplyTo?: string) => {
  if (!process.env.IMAP_EMAIL || !process.env.IMAP_PASSWORD) {
    console.warn("Email variables not set, skipping sendEmail.");
    return;
  }
  
  const mailOptions: any = {
    from: process.env.IMAP_EMAIL,
    to,
    subject,
    html,
  };

  if (inReplyTo) {
    mailOptions.inReplyTo = inReplyTo;
    mailOptions.references = [inReplyTo];
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Service] Sent email to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[Email Service] Failed to send email to ${to}:`, error);
  }
};

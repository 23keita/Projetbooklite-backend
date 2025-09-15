import nodemailer from 'nodemailer';
import 'dotenv/config';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Sends an email.
 * @param {object} mailOptions - The mail options.
 * @param {string} mailOptions.to - Recipient's email address.
 * @param {string} mailOptions.subject - Email subject.
 * @param {string} mailOptions.html - HTML body of the email.
 */
export const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"Booklite" <${process.env.EMAIL_USER}>`, // sender address
      to,
      subject,
      html,
    });
    console.log('Message sent: %s', info.messageId);
  } catch (error) {
    console.error("Error sending email: ", error);
    // Ne pas bloquer le flux principal si l'envoi d'e-mail échoue, mais enregistrer l'erreur.
    // Dans une application de production, vous pourriez utiliser un système de journalisation plus robuste.
    throw new Error('Failed to send email.');
  }
};
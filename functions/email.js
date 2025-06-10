import nodemailer from 'nodemailer';

export async function sendVerificationEmail(toEmail, verificationLink) {
  // Configure your SMTP transporter
  const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: 465, // SSL port
    secure: true, // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER, // noreply@rekietalabs.com
      pass: process.env.SMTP_PASS, // your SMTP password
    },
  });

  // Define the email content
  const mailOptions = {
    from: '"RekietaLabs" <noreply@rekietalabs.com>',
    to: toEmail,
    subject: 'Verify your MyLabs Account',
    html: `
      <p>Hello,</p>
      <p>Please verify your MyLabs account by clicking the link below:</p>
      <p><a href="${verificationLink}">${verificationLink}</a></p>
      <p>If you did not request this, please ignore this email.</p>
      <p>Thank you,<br>RekietaLabs Team</p>
    `,
  };

  // Send the email
  await transporter.sendMail(mailOptions);
  console.log(`Verification email sent to ${toEmail}`);
}

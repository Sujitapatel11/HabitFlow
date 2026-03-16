const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOtpEmail = async (toEmail, otp, userName) => {
  const mailOptions = {
    from: `"HabitFlow" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'HabitFlow — Your Password Reset OTP',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;background:#f7f8fc;padding:2rem;border-radius:16px;">
        <div style="text-align:center;margin-bottom:1.5rem;">
          <span style="font-size:2rem;">✦</span>
          <h2 style="color:#6c63ff;margin:.5rem 0 0;font-size:1.4rem;">HabitFlow</h2>
        </div>
        <div style="background:#fff;border-radius:12px;padding:1.75rem;border:1px solid #e0e7ff;">
          <p style="color:#374151;margin:0 0 1rem;">Hi <strong>${userName}</strong>,</p>
          <p style="color:#374151;margin:0 0 1.5rem;">Use the OTP below to reset your password. It expires in <strong>10 minutes</strong>.</p>
          <div style="text-align:center;margin:1.5rem 0;">
            <span style="font-size:2.5rem;font-weight:800;letter-spacing:.5rem;color:#6c63ff;background:#f5f3ff;padding:.75rem 1.5rem;border-radius:12px;display:inline-block;">${otp}</span>
          </div>
          <p style="color:#888;font-size:.85rem;margin:1rem 0 0;">If you didn't request this, ignore this email. Your account is safe.</p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendOtpEmail };

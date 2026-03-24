const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const BASE_STYLE = `
  font-family:'Inter',Arial,sans-serif;max-width:520px;margin:0 auto;
  background:#0A0A1A;border-radius:16px;overflow:hidden;
  border:1px solid #1E2240;
`;
const HEADER = (icon, title) => `
  <div style="background:linear-gradient(135deg,#0F1128,#151830);padding:2rem;text-align:center;border-bottom:1px solid #1E2240;">
    <div style="font-size:2.5rem;margin-bottom:.5rem;">${icon}</div>
    <div style="color:#00D4FF;font-size:1.1rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">${title}</div>
  </div>
`;
const FOOTER = `
  <div style="padding:1.25rem;text-align:center;border-top:1px solid #1E2240;">
    <p style="color:#2E3A5C;font-size:.75rem;margin:0;">
      HabitFlow · If you didn't request this, ignore this email.
    </p>
  </div>
`;

/** Verification email — sent on signup */
const sendVerificationEmail = async (toEmail, token, userName) => {
  const url = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  await transporter.sendMail({
    from: `"HabitFlow ✦" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'HabitFlow — Verify your email to launch 🚀',
    html: `
      <div style="${BASE_STYLE}">
        ${HEADER('🛸', 'Verify Your Account')}
        <div style="padding:2rem;">
          <p style="color:#E8EEFF;margin:0 0 1rem;">Hi <strong style="color:#00D4FF;">${userName}</strong>,</p>
          <p style="color:#6B7DB3;margin:0 0 1.75rem;line-height:1.6;">
            Your HabitFlow account is ready. Click below to verify your email and begin your mission.
            This link expires in <strong style="color:#FFB800;">15 minutes</strong>.
          </p>
          <div style="text-align:center;margin:1.75rem 0;">
            <a href="${url}" style="
              display:inline-block;background:linear-gradient(135deg,#00D4FF,#BF5FFF);
              color:#000;font-weight:800;font-size:1rem;padding:.85rem 2.5rem;
              border-radius:10px;text-decoration:none;letter-spacing:.04em;
            ">Verify Email →</a>
          </div>
          <p style="color:#2E3A5C;font-size:.78rem;text-align:center;margin:0;">
            Or paste this link: <span style="color:#00D4FF;">${url}</span>
          </p>
        </div>
        ${FOOTER}
      </div>
    `,
  });
};

/** OTP email — sent on forgot password */
const sendOtpEmail = async (toEmail, otp, userName) => {
  await transporter.sendMail({
    from: `"HabitFlow ✦" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'HabitFlow — Password Reset OTP',
    html: `
      <div style="${BASE_STYLE}">
        ${HEADER('🔐', 'Password Reset')}
        <div style="padding:2rem;">
          <p style="color:#E8EEFF;margin:0 0 1rem;">Hi <strong style="color:#00D4FF;">${userName}</strong>,</p>
          <p style="color:#6B7DB3;margin:0 0 1.75rem;line-height:1.6;">
            Use the code below to reset your password.
            Expires in <strong style="color:#FFB800;">10 minutes</strong>.
          </p>
          <div style="text-align:center;margin:1.75rem 0;">
            <div style="
              display:inline-block;background:#0F1128;border:1px solid #00D4FF;
              border-radius:12px;padding:1rem 2rem;
            ">
              <span style="font-size:2.8rem;font-weight:900;letter-spacing:.6rem;color:#00D4FF;">${otp}</span>
            </div>
          </div>
          <p style="color:#2E3A5C;font-size:.78rem;text-align:center;margin:0;">
            Do not share this code with anyone.
          </p>
        </div>
        ${FOOTER}
      </div>
    `,
  });
};

module.exports = { sendVerificationEmail, sendOtpEmail };

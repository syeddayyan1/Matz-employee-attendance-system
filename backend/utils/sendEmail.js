
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendEmail = async (to, name, password, idCardPdf = null) => {
  const mailOptions = {
    from: `"MATZ Solutions" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Welcome to MATZ Solutions — Employee Account",
    text: `Welcome ${name},

Your employee account has been created successfully.

Email: ${to}
Password: ${password}

Please keep your login credentials secure.

Regards,
MATZ Solutions`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;">
        <div style="background:#087f5b;padding:24px;color:white;">
          <h2 style="margin:0;">MATZ Solutions</h2>
          <p style="margin-bottom:0;">Employee Account Details</p>
        </div>

        <div style="padding:24px;border:1px solid #ddd;">
          <h3>Welcome, ${escapeHtml(name)}!</h3>

          <p>Your employee account has been created successfully.</p>

          <div style="background:#f4f8f6;padding:16px;border-radius:8px;">
            <p><strong>Email:</strong> ${escapeHtml(to)}</p>
            <p><strong>Password:</strong> ${escapeHtml(password)}</p>
          </div>

          <p>Please keep your login credentials secure.</p>

          <p>Regards,<br><strong>MATZ Solutions</strong></p>
        </div>
      </div>
    `,
  };

  if (idCardPdf) {
    mailOptions.attachments = [
      {
        filename: "MATZ-Employee-ID-Card.pdf",
        content: idCardPdf,
        contentType: "application/pdf",
      },
    ];
  }

  await transporter.sendMail(mailOptions);
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

module.exports = sendEmail;

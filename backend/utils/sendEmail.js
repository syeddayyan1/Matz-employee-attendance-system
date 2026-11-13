
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendEmail = async (to, name, password) => {
  const mailOptions = {
    from: `"MATZ Solutions" <${process.env.EMAIL_USER}>`,
    to,

    subject: "Employee Registration Successful | MATZ Solutions",

    text: `Dear ${name},

Your employee account has been successfully created in the MATZ Solutions Attendance Management System.

Your login credentials are:

Email: ${to}
Password: ${password}

You can use these credentials to log in and view your attendance records.

Please keep your credentials secure.

Thank you for being a part of MATZ Solutions.

Best Regards,
HR Department
MATZ SOLUTIONS`,

    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#333;background:#f5f8f6;padding:25px;">

        <div style="background:#173f33;padding:25px;text-align:center;color:white;border-radius:10px 10px 0 0;">
          <h2 style="margin:0;">MATZ SOLUTIONS</h2>
          <p style="margin-bottom:0;">Employee Registration Confirmation</p>
        </div>

        <div style="background:white;padding:30px;border:1px solid #e5e7eb;border-radius:0 0 10px 10px;">

          <h3>Dear ${escapeHtml(name)},</h3>

          <p style="line-height:1.7;">
            We are pleased to inform you that your employee account has been successfully created in the MATZ Solutions Attendance Management System.
          </p>

          <div style="background:#edf5ef;padding:18px;border-radius:8px;text-align:center;margin:25px 0;">
            <h3 style="color:#173f33;margin:0;">
              Registration Successful!
            </h3>
            <p style="margin-bottom:0;color:#555;">
              Your employee registration is complete.
            </p>
          </div>

          <h3 style="color:#173f33;">Your Login Credentials</h3>

          <div style="background:#f4f8f6;padding:16px;border-radius:8px;">
            <p><strong>Email:</strong> ${escapeHtml(to)}</p>
            <p><strong>Password:</strong> ${escapeHtml(password)}</p>
          </div>

          <p style="line-height:1.7;">
            You can use these credentials to log in and view your attendance records.
          </p>

          <p style="color:#b45309;font-size:13px;">
            Please keep your login credentials secure and do not share them with anyone.
          </p>

          <p style="margin-top:30px;">
            Best Regards,<br>
            <strong>HR Department</strong><br>
            MATZ SOLUTIONS
          </p>

          <hr style="border:none;border-top:1px solid #eee;margin-top:25px;">

          <p style="font-size:12px;color:#888;text-align:center;">
            This is an automated confirmation email.
          </p>

        </div>
      </div>
    `,
  };

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

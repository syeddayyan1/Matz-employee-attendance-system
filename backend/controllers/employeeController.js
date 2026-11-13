
const bcrypt = require("bcrypt");
const pool = require("../config/db");
const sendEmail = require("../utils/sendEmail");
const jwt = require("jsonwebtoken");

// Create employee and save face descriptor
const addEmployee = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      designation,
      photo_url,
      face_descriptor,
    } = req.body;

    // Validate employee details
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long",
      });
    }

    // Validate face descriptor
    if (
      !Array.isArray(face_descriptor) ||
      face_descriptor.length !== 128 ||
      !face_descriptor.every(
        (value) =>
          typeof value === "number" && Number.isFinite(value)
      )
    ) {
      return res.status(400).json({
        message: "Please capture the employee's face before saving",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Check duplicate email
    const existingEmployee = await pool.query(
      "SELECT id FROM employees WHERE email = $1",
      [cleanEmail]
    );

    if (existingEmployee.rows.length > 0) {
      return res.status(409).json({
        message: "An employee with this email already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save employee and face descriptor
    const result = await pool.query(
      `INSERT INTO employees
        (
          name,
          email,
          password,
          designation,
          photo_url,
          face_descriptor
        )
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING id, name, email, designation, photo_url`,
      [
        cleanName,
        cleanEmail,
        hashedPassword,
        designation?.trim() || null,
        photo_url || null,
        JSON.stringify(face_descriptor),
      ]
    );

    const employee = result.rows[0];

    // Send employee registration email
    let emailSent = false;

    try {
      await sendEmail(
        employee.email,
        employee.name,
        password
      );

      emailSent = true;

    } catch (emailError) {
      console.error(
        "Employee confirmation email failed:",
        emailError.message
      );
    }

    return res.status(201).json({
      message: emailSent
        ? "Employee created and confirmation email sent successfully"
        : "Employee created, but confirmation email could not be sent",

      employee,
      emailSent,
    });

  } catch (error) {
    console.error("Add employee error:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "An employee with this email already exists",
      });
    }

    return res.status(500).json({
      message: "Failed to create employee",
    });
  }
};

// Employee login
const loginEmployee = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const result = await pool.query(
      `SELECT id, name, email, password, role
       FROM employees
       WHERE email = $1`,
      [email.trim().toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const employee = result.rows[0];

    const isPasswordValid = await bcrypt.compare(
      password,
      employee.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: employee.id,
        email: employee.email,
        role: employee.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
      },
    });

  } catch (error) {
    console.error("Employee login error:", error.message);

    return res.status(500).json({
      message: "Login failed",
    });
  }
};

module.exports = {
  addEmployee,
  loginEmployee,
};

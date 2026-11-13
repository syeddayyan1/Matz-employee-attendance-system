
const pool = require("../config/db");

const FACE_MATCH_THRESHOLD = 0.6;

function getPakistanDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getPakistanTime() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

function isValidDescriptor(descriptor) {
  return (
    Array.isArray(descriptor) &&
    descriptor.length === 128 &&
    descriptor.every(
      (value) => typeof value === "number" && Number.isFinite(value)
    )
  );
}

function getFaceDistance(first, second) {
  let sum = 0;

  for (let i = 0; i < first.length; i++) {
    const difference = first[i] - second[i];
    sum += difference * difference;
  }

  return Math.sqrt(sum);
}

function parseSavedDescriptor(value) {
  if (typeof value === "string") {
    return JSON.parse(value);
  }

  return value;
}

// Kiosk Face Recognition Attendance
const markKioskAttendance = async (req, res) => {
  const { faceDescriptor, action, livenessVerified } = req.body;

  if (!faceDescriptor || !action) {
    return res.status(400).json({
      message: "Face descriptor and action are required.",
    });
  }

  if (!["IN", "OUT"].includes(action)) {
    return res.status(400).json({
      message: "Invalid attendance action.",
    });
  }

  if (!isValidDescriptor(faceDescriptor)) {
    return res.status(400).json({
      message: "Invalid face descriptor.",
    });
  }

  if (livenessVerified !== true) {
    return res.status(403).json({
      message: "Live face verification required.",
    });
  }

  try {
    // Get all employees having registered faces
    const employeeResult = await pool.query(
      `SELECT id, name, email, face_descriptor
       FROM employees
       WHERE face_descriptor IS NOT NULL`
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({
        message: "No registered employee faces found.",
      });
    }

    // Find the closest matching employee
    let matchedEmployee = null;
    let bestDistance = Infinity;

    for (const employee of employeeResult.rows) {
      let savedDescriptor;

      try {
        savedDescriptor = parseSavedDescriptor(employee.face_descriptor);
      } catch (error) {
        continue;
      }

      if (!isValidDescriptor(savedDescriptor)) {
        continue;
      }

      const distance = getFaceDistance(
        faceDescriptor,
        savedDescriptor
      );

      if (distance < bestDistance) {
        bestDistance = distance;
        matchedEmployee = employee;
      }
    }

    console.log("FACE MATCH DEBUG:", {
      employeeId: matchedEmployee?.id,
      employeeName: matchedEmployee?.name,
      distance: bestDistance,
      threshold: FACE_MATCH_THRESHOLD,
    });

    if (
      !matchedEmployee ||
      bestDistance > FACE_MATCH_THRESHOLD
    ) {
      return res.status(403).json({
        message: "Face does not match any registered employee.",
      });
    }

    const employee = matchedEmployee;

    // Pakistan date and time
    const date = getPakistanDate();
    const time = getPakistanTime();

    // DAY IN
    if (action === "IN") {
      const existing = await pool.query(
        `SELECT id
         FROM attendance
         WHERE employee_id = $1 AND date = $2`,
        [employee.id, date]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({
          message: "Attendance already marked for today.",
        });
      }

      const result = await pool.query(
        `INSERT INTO attendance
         (employee_id, name, email, date, login_time, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          employee.id,
          employee.name,
          employee.email,
          date,
          time,
          "Present",
        ]
      );

      return res.status(201).json({
        message: "Day IN attendance marked successfully.",
        employeeName: employee.name,
        attendance: result.rows[0],
      });
    }

    // DAY OUT
    if (action === "OUT") {
      const result = await pool.query(
        `UPDATE attendance
         SET logout_time = $1
         WHERE employee_id = $2
         AND date = $3
         AND logout_time IS NULL
         RETURNING id`,
        [time, employee.id, date]
      );

      if (result.rows.length === 0) {
        const existing = await pool.query(
          `SELECT id, logout_time
           FROM attendance
           WHERE employee_id = $1 AND date = $2`,
          [employee.id, date]
        );

        if (existing.rows.length === 0) {
          return res.status(404).json({
            message: "Please mark Day IN before marking Day OUT.",
          });
        }

        return res.status(409).json({
          message: "Day OUT attendance already marked for today.",
        });
      }

      return res.status(200).json({
        message: "Day OUT attendance marked successfully.",
        employeeName: employee.name,
        attendance: result.rows[0],
      });
    }
  } catch (error) {
    console.error("Kiosk attendance error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "Attendance already marked for today.",
      });
    }

    return res.status(500).json({
      message: "Server error while marking attendance.",
    });
  }
};

// Block direct attendance marking
const markAttendance = async (req, res) => {
  return res.status(403).json({
    message: "Attendance can only be marked through the kiosk.",
  });
};

// Block direct Day OUT
const markDayOut = async (req, res) => {
  return res.status(403).json({
    message: "Attendance can only be marked through the kiosk.",
  });
};

// Employee Attendance Records
const getRecord = async (req, res) => {
  try {
    const employeeId = req.user.id;

    const result = await pool.query(
      `SELECT *
       FROM attendance
       WHERE employee_id = $1
       ORDER BY date DESC`,
      [employeeId]
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get attendance records error:", error);

    return res.status(500).json({
      message: "Unable to fetch attendance records.",
    });
  }
};

module.exports = {
  markKioskAttendance,
  markAttendance,
  markDayOut,
  getRecord,
};

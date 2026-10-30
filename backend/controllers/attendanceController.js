
const pool = require("../config/db");

const FACE_MATCH_THRESHOLD = 0.7;

function getPakistanDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
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
      (value) =>
        typeof value === "number" &&
        Number.isFinite(value)
    )
  );
}

function getFaceDistance(first, second) {
  if (
    !isValidDescriptor(first) ||
    !isValidDescriptor(second)
  ) {
    return Infinity;
  }

  let sum = 0;

  for (let i = 0; i < first.length; i += 1) {
    const difference = first[i] - second[i];
    sum += difference * difference;
  }

  return Math.sqrt(sum);
}

function parseSavedDescriptor(value) {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  return value;
}

const markKioskAttendance = async (req, res) => {
    console.log("KIOSK API HIT!");

  try {
    const {
      qrToken,
      faceDescriptor,
      action,
      livenessVerified,
    } = req.body;

    if (!qrToken || !faceDescriptor || !action) {
      return res.status(400).json({
        message:
          "QR token, face descriptor and action are required.",
      });
    }

      console.log("Request Data:", {
    qrToken: !!qrToken,
    faceDescriptorLength: faceDescriptor?.length,
    action,
    livenessVerified,
  });


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

    // This is a client-supplied flag, not server-verified liveness proof.
    if (livenessVerified !== true) {
      return res.status(403).json({
        message: "Live face verification is required.",
      });
    }

    const employeeResult = await pool.query(
      `SELECT id, name, email, face_descriptor
       FROM employees
       WHERE qr_token = $1`,
      [qrToken]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({
        message: "Invalid employee QR code.",
      });
    }

    const employee = employeeResult.rows[0];

    const savedDescriptor = parseSavedDescriptor(
      employee.face_descriptor
    );

    if (!isValidDescriptor(savedDescriptor)) {
      console.error("Saved face descriptor is invalid:", {
        employeeId: employee.id,
        descriptorType: typeof savedDescriptor,
        descriptorLength: Array.isArray(savedDescriptor)
          ? savedDescriptor.length
          : null,
      });

      return res.status(409).json({
        message:
          "No valid registered face found for this employee.",
      });
    }

    const distance = getFaceDistance(
      faceDescriptor,
      savedDescriptor
    );

    // Temporary debugging: inspect the actual match distance.
     console.log("REACHED FACE MATCH CHECK");
    console.log("Face Match Debug:", {
      
      employeeId: employee.id,
      employeeName: employee.name,
      liveDescriptorLength: faceDescriptor.length,
      savedDescriptorLength: savedDescriptor.length,
      distance: Number.isFinite(distance)
        ? Number(distance.toFixed(4))
        : "Invalid",
      threshold: FACE_MATCH_THRESHOLD,
      matched: distance <= FACE_MATCH_THRESHOLD,
    });
   
    console.log("ACTIVE FACE THRESHOLD:", FACE_MATCH_THRESHOLD);

    if (distance > FACE_MATCH_THRESHOLD) {
      return res.status(403).json({
        message: "Face does not match this employee.",
      });
    }

    const date = getPakistanDate();
    const time = getPakistanTime();

    if (action === "IN") {
      const existing = await pool.query(
        `SELECT id
         FROM attendance
         WHERE employee_id = $1 AND date = $2`,
        [employee.id, date]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({
          message:
            "IN attendance has already been recorded today.",
        });
      }

      await pool.query(
        `INSERT INTO attendance
          (employee_id, name, email, date, time, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
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
        message: "IN attendance recorded successfully.",
        action: "IN",
        date,
        time,
      });
    }

    const updateResult = await pool.query(
      `UPDATE attendance
       SET logout_time = $1
       WHERE employee_id = $2
         AND date = $3
         AND logout_time IS NULL
       RETURNING id`,
      [time, employee.id, date]
    );

    if (updateResult.rows.length === 0) {
      const existing = await pool.query(
        `SELECT id, logout_time
         FROM attendance
         WHERE employee_id = $1 AND date = $2`,
        [employee.id, date]
      );

      if (existing.rows.length === 0) {
        return res.status(409).json({
          message:
            "Today's IN attendance must be recorded first.",
        });
      }

      return res.status(409).json({
        message:
          "OUT attendance has already been recorded today.",
      });
    }

    return res.status(200).json({
      message: "OUT attendance recorded successfully.",
      action: "OUT",
      date,
      time,
    });
  } catch (error) {
    console.error("Kiosk attendance error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message:
          "Attendance has already been recorded today.",
      });
    }

    return res.status(500).json({
      message: "Server error while recording attendance.",
    });
  }
};

const markAttendance = async (req, res) => {
  return res.status(403).json({
    message:
      "Use the office attendance kiosk to mark attendance.",
  });
};

const markDayOut = async (req, res) => {
  return res.status(403).json({
    message:
      "Use the office attendance kiosk to mark attendance.",
  });
};

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
    console.error("Attendance record error:", error);

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

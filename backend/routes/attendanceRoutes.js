const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");

const {
  markAttendance,
  markDayOut,
  getRecord,
  markKioskAttendance,
} = require("../controllers/attendanceController");

const router = express.Router();

// Office kiosk: QR + face matching + frontend liveness check
router.post("/kiosk", markKioskAttendance);

// Employee apne attendance records dekh sakta hai
router.get("/record", authMiddleware, getRecord);

// Employee login se direct attendance mark nahi kar sakta
router.post("/day-in", authMiddleware, markAttendance);
router.post("/day-out", authMiddleware, markDayOut);

module.exports = router;
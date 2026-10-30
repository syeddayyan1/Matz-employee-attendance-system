
const express = require("express");
const {addEmployee,loginEmployee,} = require("../controllers/employeeController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Sirf logged-in admin employee create kar sakta hai
const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      message: "Only an admin can add employees",
    });
  }

  next();
};
// Employee creation: authentication + admin role required
router.post("/", authMiddleware, adminOnly, addEmployee);

// Employee login public rahega
router.post("/login", loginEmployee);

module.exports = router;





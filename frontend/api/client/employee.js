
import api from "../axios";

// Create Employee
export const createEmployee = async (employeeData) => {
  const adminToken = localStorage.getItem("adminToken");

  const response = await api.post("/employees", employeeData, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  return response.data;
};

// Employee Login
export const loginEmployee = async (employeeData) => {
  const response = await api.post("/employees/login", employeeData);

  return response.data;
};

// Face Recognition Attendance
export const markKioskAttendance = async ({
  faceDescriptor,
  action,
  livenessVerified,
}) => {
  if (
    !Array.isArray(faceDescriptor) ||
    faceDescriptor.length !== 128 ||
    !faceDescriptor.every(Number.isFinite)
  ) {
    throw new Error("Valid face verification is required.");
  }

  if (!["IN", "OUT"].includes(action)) {
    throw new Error("Action must be IN or OUT.");
  }

  if (livenessVerified !== true) {
    throw new Error("Live face verification is required.");
  }

  const response = await api.post("/attendance/kiosk", {
    faceDescriptor,
    action,
    livenessVerified,
  });

  return response.data;
};

// Get Employee Attendance Records
export const getRecord = async (token) => {
  const response = await api.get("/attendance/record", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};
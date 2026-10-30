
import api from "../axios";

// Create employee — admin login required
export const createEmployee = async (employeeData) => {
  const adminToken = localStorage.getItem("adminToken");

  if (!adminToken) {
    throw new Error("Please login as admin before adding an employee.");
  }

  const response = await api.post("/employees", employeeData, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  return response.data;
};

// Employee login
export const loginEmployee = async (employeeData) => {
  const response = await api.post("/employees/login", employeeData);
  return response.data;
};


// Office kiosk attendance — QR + face + liveness + IN/OUT
export const markKioskAttendance = async ({
  qrToken,
  faceDescriptor,
  action,
  livenessVerified,
}) => {
  if (!qrToken || !Array.isArray(faceDescriptor)) {
    throw new Error("QR code and face verification are required.");
  }

  if (!["IN", "OUT"].includes(action)) {
    throw new Error("Action must be IN or OUT.");
  }

  if (livenessVerified !== true) {
    throw new Error("Live face verification is required.");
  }

  const response = await api.post("/attendance/kiosk", {
    qrToken,
    faceDescriptor,
    action,
    livenessVerified,
  });

  return response.data;
};


// Get the logged-in employee's own attendance records
export const getRecord = async (token) => {
  const response = await api.get("/attendance/record", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

"use client";

import { QRCodeCanvas } from "qrcode.react";

export default function QRPage() {
  const Url ="https://1sxrbgcr-3000.inc1.devtunnels.ms/day-out";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Attendance Time - Out QR Code
      </h1>

      <QRCodeCanvas
        value={Url}
        size={350}
        bgColor="#ffffff"
        fgColor="#000000"
      />

      <p className="mt-5 text-gray-600">
        Scan this QR code to mark logout Time
      </p>
    </div>
  );
}
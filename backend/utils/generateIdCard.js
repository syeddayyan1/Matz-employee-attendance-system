
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

// Convert PDF document into buffer
function createPdfBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.end();
  });
}

// Convert captured photo data URL into image buffer
function getPhotoBuffer(photoUrl) {
  if (
    typeof photoUrl !== "string" ||
    !photoUrl.startsWith("data:image/")
  ) {
    return null;
  }

  const match = photoUrl.match(
    /^data:image\/(jpeg|jpg|png|webp);base64,([\s\S]+)$/i
  );

  if (!match) return null;

  try {
    return Buffer.from(match[2], "base64");
  } catch (error) {
    console.error("Unable to read employee photo:", error.message);
    return null;
  }
}

async function generateIdCard(employee, qrToken) {
  const doc = new PDFDocument({
    size: [380, 540],
    margins: {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    },
    info: {
      Title: "MATZ Solutions Employee ID Card",
      Author: "MATZ Solutions",
    },
  });

  const green = "#087f5b";
  const darkGreen = "#173f32";
  const muted = "#64776e";
  const lightBg = "#f3f8f5";

  const qrBuffer = await QRCode.toBuffer(qrToken, {
    type: "png",
    width: 300,
    margin: 1,
    errorCorrectionLevel: "M",
  });

  const photoBuffer = getPhotoBuffer(employee.photo_url);

  // Background
  doc.rect(0, 0, 380, 540).fill(lightBg);

  // Top header
  doc.rect(0, 0, 380, 100).fill(darkGreen);

  doc.rect(0, 96, 380, 4).fill(green);

  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(23)
    .text("MATZ SOLUTIONS", 20, 25, {
      width: 340,
      align: "center",
      characterSpacing: 1,
    });

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#d5e9df")
    .text("EMPLOYEE IDENTIFICATION CARD", 20, 58, {
      width: 340,
      align: "center",
      characterSpacing: 1.5,
    });

  // Main card content
  doc
    .fillColor(darkGreen)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text("EMPLOYEE DETAILS", 25, 121);

  doc
    .fillColor(darkGreen)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text("ATTENDANCE QR", 215, 121);

  // Left side - Employee photo
  const photoX = 35;
  const photoY = 150;
  const photoSize = 125;

  doc
    .roundedRect(photoX - 4, photoY - 4, photoSize + 8, photoSize + 8, 10)
    .fill("#ffffff");

  if (photoBuffer) {
    try {
      doc.image(photoBuffer, photoX, photoY, {
        fit: [photoSize, photoSize],
        align: "center",
        valign: "center",
      });
    } catch (error) {
      console.error("Could not add employee photo:", error.message);

      doc.rect(photoX, photoY, photoSize, photoSize).fill("#e1eee7");

      doc
        .fillColor(green)
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("PHOTO", photoX, photoY + 55, {
          width: photoSize,
          align: "center",
        });
    }
  } else {
    doc.rect(photoX, photoY, photoSize, photoSize).fill("#e1eee7");

    doc
      .fillColor(green)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("PHOTO", photoX, photoY + 55, {
        width: photoSize,
        align: "center",
      });
  }

  // Employee name
  doc
    .fillColor(darkGreen)
    .font("Helvetica-Bold")
    .fontSize(15)
    .text(String(employee.name || "Employee"), 25, 293, {
      width: 165,
      align: "center",
      ellipsis: true,
    });

  // Designation
  doc
    .fillColor(muted)
    .font("Helvetica")
    .fontSize(11)
    .text(String(employee.designation || "Employee"), 25, 320, {
      width: 165,
      align: "center",
      ellipsis: true,
    });

  // Employee ID
  doc
    .roundedRect(25, 355, 165, 48, 7)
    .fill("#e3eee8");

  doc
    .fillColor(muted)
    .font("Helvetica")
    .fontSize(8)
    .text("EMPLOYEE ID", 35, 363, {
      width: 145,
      align: "center",
    });

  doc
    .fillColor(darkGreen)
    .font("Helvetica-Bold")
    .fontSize(13)
    .text(String(employee.id || "N/A"), 35, 379, {
      width: 145,
      align: "center",
      ellipsis: true,
    });

  // Vertical divider
  doc
    .moveTo(200, 145)
    .lineTo(200, 420)
    .lineWidth(1)
    .strokeColor("#d6e4dc")
    .stroke();

  // Right side - QR code container
  doc
    .roundedRect(213, 150, 142, 165, 9)
    .fill("#ffffff");

  // QR code
  doc.image(qrBuffer, 230, 165, {
    width: 108,
    height: 108,
  });

  doc
    .fillColor(darkGreen)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text("SCAN TO VERIFY", 218, 282, {
      width: 132,
      align: "center",
    });

  doc
    .fillColor(muted)
    .font("Helvetica")
    .fontSize(8)
    .text("Use the office attendance kiosk", 215, 330, {
      width: 138,
      align: "center",
    });

  // Security note
  doc
    .roundedRect(213, 360, 142, 43, 7)
    .fill("#e3eee8");

  doc
    .fillColor(green)
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("OFFICIAL ID", 218, 372, {
      width: 132,
      align: "center",
    });

  doc
    .fillColor(muted)
    .font("Helvetica")
    .fontSize(8)
    .text("Authorized Employee", 218, 387, {
      width: 132,
      align: "center",
    });

  // Bottom footer
  doc.rect(0, 455, 380, 85).fill(darkGreen);

  doc.rect(0, 455, 380, 3).fill(green);

  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(13)
    .text("MATZ SOLUTIONS", 20, 475, {
      width: 340,
      align: "center",
      characterSpacing: 1,
    });

  doc
    .fillColor("#d5e9df")
    .font("Helvetica")
    .fontSize(9)
    .text("Please carry your ID card at the office", 20, 500, {
      width: 340,
      align: "center",
    });

  doc
    .fillColor("#a9c7b8")
    .font("Helvetica")
    .fontSize(8)
    .text("OFFICIAL EMPLOYEE IDENTIFICATION", 20, 520, {
      width: 340,
      align: "center",
      characterSpacing: 1,
    });

  return createPdfBuffer(doc);
}

module.exports = generateIdCard;

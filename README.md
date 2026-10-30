# MATZ Solutions – Smart Employee Attendance Management System

A full-stack employee attendance management system developed for MATZ Solutions to simplify and secure daily employee attendance tracking.

### Key Features

- **Admin Management:** Create and manage employee records.
- **Employee Authentication:** Secure login using employee credentials.
- **QR Code Verification:** Every employee receives a unique QR code.
- **Live Face Recognition:** Verify employee identity using live camera capture and face descriptor matching.
- **Attendance Kiosk:** A centralized office kiosk for employee check-in and check-out.
- **Employee ID Card Generation:** Automatically generate professional PDF ID cards with employee photo, details, and QR code.
- **Email Integration:** Send employee credentials and ID cards through email.
- **Attendance Records:** View employee attendance history.

### Tech Stack

**Frontend:** Next.js, React.js, Tailwind CSS, TanStack Query

**Backend:** Node.js, Express.js

**Database:** PostgreSQL

**Authentication:** JWT, bcrypt

**Additional Libraries:** face-api.js, Html5Qrcode, QRCode, PDFKit, Nodemailer

### Attendance Workflow

1. Admin creates an employee account.
2. The system generates unique employee credentials and a QR code.
3. An employee ID card is generated and sent through email.
4. Employee visits the office attendance kiosk.
5. The kiosk scans the employee's QR code.
6. Live face verification is performed.
7. Employee selects IN or OUT.
8. Attendance is recorded in the PostgreSQL database.

### Security

The system combines unique QR verification with live face matching to help prevent unauthorized attendance marking.

---

**Developed at Syed Dayyan Noor.**

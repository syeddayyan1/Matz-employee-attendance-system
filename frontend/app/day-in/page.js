// "use client";

// import { useEffect, useRef, useState } from "react";
// import { useMutation } from "@tanstack/react-query";
// import { Html5Qrcode } from "html5-qrcode";
// import { markAttendance } from "@/api/client/employee";

// export default function Attendance() {
//   const scannerRef = useRef(null);
//   const startedRef = useRef(false);
//   const processingRef = useRef(false);

//   const [scannedQR, setScannedQR] = useState("");
//   const [attendanceMarked, setAttendanceMarked] = useState(false);

//   const mutation = useMutation({
//     mutationFn: markAttendance,

//     onSuccess: (data) => {
//       console.log(data.message);

//       // Attendance successful
//       setAttendanceMarked(true);

//       // Dobara scan nahi hoga
//       processingRef.current = true;

//       // QR detected message remove
//       setScannedQR("");
//     },

//     onError: (error) => {
//       console.log(
//         error.response?.data?.message ||
//           error.message
//       );

//       // Error ke baad dobara scan allow
//       processingRef.current = false;
//     },
//   });

//   useEffect(() => {

//     if (startedRef.current) return;

//     startedRef.current = true;

//     const startScanner = async () => {
//       const token = localStorage.getItem("token");

//       if (!token) {
//         console.log("Please login first");
//         return;
//       }


//       const scanner = new Html5Qrcode("reader");

//       scannerRef.current = scanner;

//       try {
//         await scanner.start(
//           { facingMode: "environment" },
//           {
//             fps: 10,

//             // EXACTLY ONE QR BOX
//             qrbox: {
//               width: 220,
//               height: 220,
//             },
//           },

//           async (decodedText) => {
//             // Already processing
//             if (processingRef.current) {
//               return;
//             }

//             // --------------------------------
//             // DAY-IN QR CHECK
//             // --------------------------------

//             if (!decodedText.includes("/day-in")) {
//               alert("Please scan the Day-In QR code");
//               return;
//             }

//             // Lock scanning
//             processingRef.current = true;

//             setScannedQR(decodedText);

//             // --------------------------------
//             // LOCATION
//             // --------------------------------

//             if (!navigator.geolocation) {
//               processingRef.current = false;
//               setScannedQR("");

//               alert(
//                 "Location is not supported by your browser."
//               );

//               return;
//             }

//             navigator.geolocation.getCurrentPosition(
//               (position) => {
//                 const latitude = position.coords.latitude;

//                 const longitude = position.coords.longitude;

//                 const accuracy = position.coords.accuracy;

//                 console.log("Latitude:",latitude);

//                 console.log("Longitude:",longitude);

//                 console.log(
//                   "GPS Accuracy:",accuracy,"meters");

//                 // --------------------------------
//                 // MARK ATTENDANCE
//                 // --------------------------------

//                 mutation.mutate({token,latitude,longitude,accuracy,});
//               },

//               (error) => {
//                 console.log("Location error:",error);

//                 processingRef.current = false;
//                 setScannedQR("");

//                 alert("Please allow location access to mark attendance.");
//               },

//               {
//                 enableHighAccuracy: true,
//                 timeout: 15000,
//                 maximumAge: 0,
//               }
//             );
//           }
//         );

//         console.log("QR scanner started");
//       }
      
//       catch (error) {
//         console.log("Scanner start error:",error);
//         startedRef.current = false;
//       }
//     };

//     startScanner();

//     // --------------------------------
//     // IMPORTANT:
//     // Scanner ko yahan stop nahi karna
//     // --------------------------------

//     return () => {
//       scannerRef.current = null;
//     };

//   }, []);

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700
//     flex items-center justify-center px-4">

//       <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">

//         {/* Heading */}

//         <div className="text-center mb-6">

//           <h1 className="text-3xl font-bold text-gray-800">
//             Employee Attendance
//           </h1>

//           <p className="text-gray-500 mt-2">
//             {attendanceMarked
//               ? "Your attendance has been marked"
//               : "Scan the QR code to mark attendance"}
//           </p>

//         </div>

//         {/* =================================
//             ONLY ONE CAMERA BOX
//             ================================= */}

//         {!attendanceMarked && (
//           <div
//             id="reader"
//             className="w-full overflow-hidden rounded-xl"
//           />
//         )}

//         {/* QR Detected */}

//         {scannedQR &&
//           !attendanceMarked &&
//           !mutation.isError && (
//           <div className="mt-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3
//             rounded-lg text-sm text-center">

//               <p className="font-semibold">
//                 QR Detected
//               </p>

//               <p className="mt-1">
//                 Checking your location...
//               </p>

//             </div>
//           )}

//         {/* Loading */}

//         {mutation.isPending && (
//           <div className="mt-5 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3
//           rounded-lg text-sm text-center">

//             Checking office location...

//           </div>
//         )}

//         {/* =================================
//             SUCCESS
//             ================================= */}

//         {mutation.isSuccess && (
//           <div className="mt-5 bg-green-50 border border-green-200 text-green-700 px-5 py-5
//           rounded-xl text-center">

//             <div className="text-3xl mb-2">
//               ✓
//             </div>

//             <p className="font-bold text-lg">
//               Attendance Marked Successfully
//             </p>

//             <p className="mt-2 text-sm">
//               {mutation.data.message}
//             </p>

//             <p className="mt-2 text-xs text-green-600">
//               Your attendance for today has been
//               recorded successfully.
//             </p>

//           </div>
//         )}

//         {/* =================================
//             ERROR
//             ================================= */}

//         {mutation.isError && (
//           <div className="mt-5 bg-red-50 border border-red-200 text-red-700 px-5 py-5 rounded-xl
//           text-center">

//             <p className="font-bold text-lg">
//               Attendance Failed
//             </p>

//             <p className="mt-2 text-sm">
//               {mutation.error.response?.data?.message ||
//                 mutation.error.message ||
//                 "Something went wrong"}
//             </p>

//           </div>
//         )}

//       </div>

//     </div>
//   );
// }

// "use client";

// import { useEffect, useRef, useState } from "react";
// import * as faceapi from "@vladmandic/face-api";

// export default function FaceTestPage() {
//   const videoRef = useRef(null);
//   const streamRef = useRef(null);
//   const intervalRef = useRef(null);

//   const [modelsReady, setModelsReady] = useState(false);
//   const [cameraOn, setCameraOn] = useState(false);
//   const [status, setStatus] = useState("Loading face models...");
//   const [faceFound, setFaceFound] = useState(false);

//   useEffect(() => {
//     let cancelled = false;

//     async function loadModels() {
//       try {
//         await faceapi.tf.ready();

//         await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
//         await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
//         await faceapi.nets.faceRecognitionNet.loadFromUri("/models");

//         if (!cancelled) {
//           setModelsReady(true);
//           setStatus("Models ready. Start the camera.");
//         }
//       } catch (error) {
//         console.error("Model loading error:", error);

//         if (!cancelled) {
//           setStatus("Model loading failed. Check the console.");
//         }
//       }
//     }

//     loadModels();

//     return () => {
//       cancelled = true;

//       if (intervalRef.current) {
//         clearInterval(intervalRef.current);
//       }

//       if (streamRef.current) {
//         streamRef.current.getTracks().forEach((track) => track.stop());
//       }
//     };
//   }, []);

//   const startCamera = async () => {
//     try {
//       if (!modelsReady) {
//         setStatus("Please wait for the models to load.");
//         return;
//       }

//       if (!navigator.mediaDevices?.getUserMedia) {
//         setStatus("Camera is unavailable. Open the app on localhost or HTTPS.");
//         return;
//       }

//       setStatus("Requesting camera permission...");

//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: {
//           facingMode: "user",
//           width: { ideal: 640 },
//           height: { ideal: 480 },
//         },
//         audio: false,
//       });

//       streamRef.current = stream;
//       videoRef.current.srcObject = stream;

//       await videoRef.current.play();

//       setCameraOn(true);
//       setStatus("Camera is on. Looking for a face...");

//       intervalRef.current = setInterval(async () => {
//         const video = videoRef.current;

//         if (!video || video.readyState < 2 || video.paused) {
//           return;
//         }

//         try {
//           const detection = await faceapi.detectSingleFace(
//             video,
//             new faceapi.TinyFaceDetectorOptions({
//               inputSize: 320,
//               scoreThreshold: 0.5,
//             })
//           );

//           if (detection) {
//             setFaceFound(true);
//             setStatus("Face detected successfully!");
//           } else {
//             setFaceFound(false);
//             setStatus("No face detected. Look at the camera.");
//           }
//         } catch (error) {
//           console.error("Face detection error:", error);
//           setStatus("Face detection failed. Check the console.");
//         }
//       }, 500);
//     } catch (error) {
//       console.error("Camera error:", error);

//       setStatus(
//         error.name === "NotAllowedError"
//           ? "Camera permission denied. Allow camera access in your browser."
//           : "Could not start camera. Check that your camera is available."
//       );
//     }
//   };

//   const stopCamera = () => {
//     if (intervalRef.current) {
//       clearInterval(intervalRef.current);
//       intervalRef.current = null;
//     }

//     if (streamRef.current) {
//       streamRef.current.getTracks().forEach((track) => track.stop());
//       streamRef.current = null;
//     }

//     if (videoRef.current) {
//       videoRef.current.srcObject = null;
//     }

//     setCameraOn(false);
//     setFaceFound(false);
//     setStatus("Camera stopped.");
//   };

//   return (
//     <main className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
//       <section className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-lg">
//         <h1 className="text-2xl font-bold text-gray-800">
//           Live Face Detection Test
//         </h1>

//         <p className="mt-2 text-sm text-gray-600">
//           Camera test only. Attendance will not be marked here.
//         </p>

//         <div className="mt-5 overflow-hidden rounded-xl bg-black">
//           <video
//             ref={videoRef}
//             autoPlay
//             muted
//             playsInline
//             className="block w-full min-h-64 object-cover"
//           />
//         </div>

//         <div className="mt-4 rounded-lg bg-gray-50 p-4">
//           <p className="font-medium text-gray-800">{status}</p>

//           <p className="mt-2 text-sm text-gray-600">
//             Models: {modelsReady ? "Ready" : "Loading"}
//           </p>

//           <p className="text-sm text-gray-600">
//             Face detected: {faceFound ? "Yes" : "No"}
//           </p>
//         </div>

//         <div className="mt-5 flex flex-wrap gap-3">
//           <button
//             type="button"
//             onClick={startCamera}
//             disabled={!modelsReady || cameraOn}
//             className="rounded-lg bg-green-700 px-5 py-3 font-semibold text-white disabled:opacity-50"
//           >
//             Start Camera
//           </button>

//           <button
//             type="button"
//             onClick={stopCamera}
//             disabled={!cameraOn}
//             className="rounded-lg bg-gray-700 px-5 py-3 font-semibold text-white disabled:opacity-50"
//           >
//             Stop Camera
//           </button>
//         </div>
//       </section>
//     </main>
//   );
// }
    
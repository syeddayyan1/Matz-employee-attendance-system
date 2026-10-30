
"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createEmployee } from "@/api/client/employee";

const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";

export default function Home() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const faceApiRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [cameraMessage, setCameraMessage] = useState("");
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingCamera, setLoadingCamera] = useState(false);

  const mutation = useMutation({
    mutationFn: createEmployee,

    onSuccess: () => {
      const form = document.getElementById("add-employee-form");

      if (form) form.reset();

      setFaceDescriptor(null);
      setPhotoUrl("");
      setCameraMessage("Employee saved successfully.");
      stopCamera();
    },

    onError: (error) => {
      setCameraMessage(
        error?.response?.data?.message ||
          error.message ||
          "Unable to create employee."
      );
    },
  });

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  }

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  async function loadFaceModels() {
    if (faceApiRef.current && modelsLoaded) {
      return faceApiRef.current;
    }

    setCameraMessage("Loading face detection models...");

    const faceapi = await import("face-api.js");

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);

    faceApiRef.current = faceapi;
    setModelsLoaded(true);

    return faceapi;
  }

  async function startCamera() {
    try {
      setLoadingCamera(true);
      setCameraMessage("");
      setFaceDescriptor(null);
      setPhotoUrl("");

      const faceapi = await loadFaceModels();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (!videoRef.current) {
        throw new Error("Camera preview is not available.");
      }

      videoRef.current.srcObject = stream;

      await new Promise((resolve, reject) => {
        const video = videoRef.current;

        if (video.readyState >= 2) {
          resolve();
          return;
        }

        video.onloadedmetadata = () => resolve();
        video.onerror = () =>
          reject(new Error("Unable to load camera preview."));
      });

      await videoRef.current.play();

      setCameraActive(true);
      setCameraMessage(
        "Camera ready. Ask the employee to look at the camera."
      );

      faceApiRef.current = faceapi;
    } catch (error) {
      stopCamera();

      setCameraMessage(
        error?.message ||
          "Unable to start the camera. Please allow camera permission."
      );
    } finally {
      setLoadingCamera(false);
    }
  }

  async function captureFace() {
    try {
      const faceapi = faceApiRef.current;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!faceapi || !video || !canvas || !cameraActive) {
        setCameraMessage("Start the camera before capturing the face.");
        return;
      }

      setCameraMessage("Detecting face...");

      const detection = await faceapi
        .detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: 0.5,
          })
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setFaceDescriptor(null);
        setPhotoUrl("");
        setCameraMessage(
          "No face detected. Keep the face clearly visible and try again."
        );
        return;
      }

      const width = video.videoWidth;
      const height = video.videoHeight;

      if (!width || !height) {
        setCameraMessage("Camera is not ready. Please try again.");
        return;
      }

      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");

      if (!context) {
        setCameraMessage("Unable to capture the camera image.");
        return;
      }

      context.drawImage(video, 0, 0, width, height);

      const capturedPhoto = canvas.toDataURL("image/jpeg", 0.85);
      const descriptor = Array.from(detection.descriptor);

      if (
        descriptor.length !== 128 ||
        !descriptor.every(Number.isFinite)
      ) {
        setCameraMessage("Face data is invalid. Please capture again.");
        return;
      }

      setPhotoUrl(capturedPhoto);
      setFaceDescriptor(descriptor);
      setCameraMessage(
        "Face captured successfully. You can add the employee."
      );

      stopCamera();
    } catch (error) {
      setCameraMessage(
        error?.message || "Face capture failed. Please try again."
      );
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!faceDescriptor || !photoUrl) {
      setCameraMessage("Please capture the employee's face before saving.");
      return;
    }

    const formData = new FormData(event.currentTarget);

    const employeeData = {
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      designation: formData.get("designation"),
      photo_url: photoUrl,
      face_descriptor: faceDescriptor,
    };

    mutation.mutate(employeeData);
  }

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition duration-200 hover:border-gray-300 focus:border-[#299c72] focus:bg-white focus:ring-4 focus:ring-[#299c72]/10";

  const labelClass =
    "mb-2 block text-sm font-semibold text-[#173f33]";

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#f3faf6] via-white to-[#e6f4ec] px-4 py-8 sm:py-12 flex items-center justify-center">

      {/* Background Decoration */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[#299c72]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#173f33]/10 blur-3xl" />

      <div className="relative w-full max-w-4xl">

        {/* Main Card */}
        <div className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-[0_25px_80px_rgba(23,63,51,0.12)]">

          {/* Top Green Header */}
          <div className="relative overflow-hidden bg-gradient-to-r from-[#173f33] to-[#236b50] px-6 py-7 sm:px-10 sm:py-9">

            <div className="absolute -right-12 -top-24 h-64 w-64 rounded-full border-[35px] border-white/5" />
            <div className="absolute -bottom-24 right-36 h-48 w-48 rounded-full bg-white/5" />

            <div className="relative">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#a8e5c6]">
                MATZ SOLUTIONS
              </p>

              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Add New Employee
              </h1>

              <p className="mt-2 max-w-lg text-sm leading-6 text-white/75">
                Create an employee account and securely register their face
                for attendance verification.
              </p>

              <div className="mt-5 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#8ce5b3]" />
                <span className="text-xs font-medium tracking-wide text-white/80">
                  EMPLOYEE REGISTRATION PORTAL
                </span>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-5 sm:p-8 lg:p-10">

            <form
              id="add-employee-form"
              onSubmit={handleSubmit}
              className="space-y-7"
            >

              {/* Employee Information */}
              <section>
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e9f6ee] text-[#21875f]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2m16-13a4 4 0 11-8 0 4 4 0 018 0zm2 13v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                      />
                    </svg>
                  </div>

                  <div>
                    <h2 className="font-bold text-[#173f33]">
                      Personal Information
                    </h2>
                    <p className="text-xs text-gray-500">
                      Enter the employee's account details
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">

                  <div>
                    <label className={labelClass}>
                      Employee Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="Enter employee name"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Employee Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="Enter employee email"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Password
                    </label>
                    <input
                      type="password"
                      name="password"
                      required
                      minLength={8}
                      placeholder="At least 8 characters"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Designation
                    </label>
                    <input
                      type="text"
                      name="designation"
                      placeholder="e.g. Frontend Developer"
                      className={inputClass}
                    />
                  </div>

                </div>
              </section>

              {/* Face Capture */}
              <section className="rounded-2xl border border-[#dcece2] bg-[#f7fbf8] p-4 sm:p-6">

                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e3f3e9] text-[#21875f]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-20 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 7h3l2-3h8l2 3h3v13H3V7z"
                      />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>

                  <div>
                    <h2 className="font-bold text-[#173f33]">
                      Employee Face Capture
                    </h2>
                    <p className="text-xs text-gray-500">
                      Live camera verification setup
                    </p>
                  </div>
                </div>

                <div className="mb-4 rounded-xl border border-dashed border-[#b9d9c5] bg-white px-4 py-3">
                  <p className="text-sm leading-6 text-gray-600">
                    Ask the employee to look directly at the camera. A live
                    face capture is required. No photo upload is needed.
                  </p>
                </div>

                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                 className={`mx-auto max-h-[380px] w-full max-w-lg aspect-[4/3] rounded-xl border border-gray-200 object-contain ${
                 cameraActive ? "block" : "hidden"
                }`}
                />

                {!cameraActive && photoUrl && (
                  <div className="flex flex-col items-center gap-3 rounded-xl border border-[#cce8d6] bg-white p-5">
                    <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-[#d8f0e1] shadow-md">
                      <img
                        src={photoUrl}
                        alt="Captured employee"
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <p className="text-sm font-semibold text-[#21875f]">
                      Face captured successfully
                    </p>
                  </div>
                )}

                <canvas ref={canvasRef} className="hidden" />

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

                  <button
                    type="button"
                    onClick={startCamera}
                    disabled={loadingCamera || mutation.isPending}
                    className="flex items-center justify-center gap-2 rounded-xl border border-[#cfe4d6] bg-white px-4 py-3 text-sm font-semibold text-[#173f33] transition hover:border-[#299c72] hover:bg-[#eff8f2] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loadingCamera ? "Starting Camera..." : cameraActive ? "Restart Camera" : "Open Camera"}
                  </button>

                  {cameraActive && (
                    <button
                      type="button"
                      onClick={captureFace}
                      className="flex items-center justify-center gap-2 rounded-xl bg-[#21875f] px-4 py-3 text-sm font-semibold text-white shadow-md shadow-[#21875f]/20 transition hover:bg-[#176b49] active:scale-[0.98]"
                    >
                      Capture Face
                    </button>
                  )}

                </div>

                {faceDescriptor && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#eaf7ee] px-4 py-3 text-sm font-medium text-[#21875f]">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#21875f] text-xs text-white">
                      ✓
                    </span>
                    Face captured and ready to save.
                  </div>
                )}

                {cameraMessage && (
                  <p className="mt-3 break-words text-sm leading-6 text-gray-700">
                    {cameraMessage}
                  </p>
                )}

              </section>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={mutation.isPending || !faceDescriptor || !photoUrl}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#21875f] to-[#299c72] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#21875f]/20 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#21875f]/25 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {mutation.isPending
                  ? "Creating Employee..."
                  : "Add Employee"}
              </button>

            </form>

            {/* Success Message */}
            {mutation.isSuccess && (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-800">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
                  ✓
                </span>
                <p className="pt-0.5 leading-5">
                  {mutation.data.message}
                </p>
              </div>
            )}

            {/* Error Message */}
            {mutation.isError && (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
                  !
                </span>
                <p className="pt-0.5 leading-5">
                  {mutation.error?.response?.data?.message ||
                    mutation.error.message ||
                    "Unable to create employee."}
                </p>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 bg-[#fbfdfb] px-6 py-4 text-center">
            <p className="text-xs font-medium tracking-wide text-gray-400">
              MATZ SOLUTIONS · EMPLOYEE MANAGEMENT SYSTEM
            </p>
          </div>

        </div>

      </div>
    </main>
  );
}

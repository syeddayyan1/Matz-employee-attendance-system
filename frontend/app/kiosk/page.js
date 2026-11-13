
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FaceLiveness } from "@solankivishal/face-liveness-web";
import { markKioskAttendance } from "@/api/client/employee";

const MODEL_URL =
  "https://justadudewhohacks.github.io/face-api.js/models";

const FACE_RETRY_MS = 300;
const RESULT_DISPLAY_MS = 2000;
const REQUIRED_LIVE_FRAMES = 5;

export default function KioskPage() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const faceApiRef = useRef(null);
  const livenessRef = useRef(null);
  const modelsPromiseRef = useRef(null);

  const loopTimerRef = useRef(null);
  const resultTimerRef = useRef(null);

  const mountedRef = useRef(false);
  const sessionRef = useRef(0);
  const cameraStartingRef = useRef(false);
  const loopRunningRef = useRef(false);
  const detectingRef = useRef(false);
  const attendanceBusyRef = useRef(false);

  const liveFramesRef = useRef(0);
  const detectLoopRef = useRef(null);

  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [livenessVerified, setLivenessVerified] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const [message, setMessage] = useState(
    "Starting face verification..."
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [resultType, setResultType] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const [resultAction, setResultAction] = useState("");
  const [resultEmployeeName, setResultEmployeeName] = useState("");

  // Stop camera safely
  const stopFaceCamera = useCallback(() => {
    // Invalidate any camera startup still in progress
    sessionRef.current += 1;

    cameraStartingRef.current = false;
    loopRunningRef.current = false;
    detectingRef.current = false;

    if (loopTimerRef.current) {
      window.clearTimeout(loopTimerRef.current);
      loopTimerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;
    }

    const video = videoRef.current;

    if (video) {
      video.pause();
      video.srcObject = null;
    }

    if (mountedRef.current) {
      setCameraReady(false);
    }
  }, []);

  // Load face recognition and liveness models once
  const loadModels = useCallback(async () => {
    if (faceApiRef.current && livenessRef.current) {
      return faceApiRef.current;
    }

    if (!modelsPromiseRef.current) {
      modelsPromiseRef.current = (async () => {
        const faceapi = await import("face-api.js");

        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);

        faceApiRef.current = faceapi;

        if (!livenessRef.current) {
          livenessRef.current = await FaceLiveness.create();
        }

        return faceapi;
      })().catch((err) => {
        modelsPromiseRef.current = null;
        throw err;
      });
    }

    return modelsPromiseRef.current;
  }, []);

  // Start camera automatically
  const startFaceCamera = useCallback(async () => {
    if (
      !mountedRef.current ||
      cameraStartingRef.current ||
      streamRef.current
    ) {
      return;
    }

    cameraStartingRef.current = true;

    const currentSession = ++sessionRef.current;

    const isCurrentSession = () => {
      return (
        mountedRef.current &&
        sessionRef.current === currentSession
      );
    };

    setLoading(true);
    setError("");
    setMessage("Loading face and liveness models...");

    try {
      const faceapi = await loadModels();

      if (!isCurrentSession()) return;

      setMessage("Opening camera...");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      // Stop an outdated camera request
      if (!isCurrentSession()) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const video = videoRef.current;

      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error("Face camera is unavailable.");
      }

      streamRef.current = stream;

      // Assign the camera stream only once
      video.srcObject = stream;

      // Wait for video metadata before playback
      if (video.readyState < 1) {
        await new Promise((resolve, reject) => {
          const handleLoaded = () => {
            cleanup();
            resolve();
          };

          const handleError = () => {
            cleanup();
            reject(new Error("Unable to load camera video."));
          };

          const cleanup = () => {
            video.removeEventListener("loadedmetadata", handleLoaded);
            video.removeEventListener("error", handleError);
          };

          video.addEventListener("loadedmetadata", handleLoaded, {
            once: true,
          });

          video.addEventListener("error", handleError, {
            once: true,
          });
        });
      }

      if (!isCurrentSession() || video.srcObject !== stream) {
        return;
      }

      // Play video once; ignore interruption caused by cleanup
      try {
        await video.play();
      } catch (playError) {
        if (
          playError?.name === "AbortError" &&
          !isCurrentSession()
        ) {
          return;
        }

        throw playError;
      }

      if (!isCurrentSession()) return;

      setCameraReady(true);
      setMessage("Look at the camera. Checking for a live face...");

      liveFramesRef.current = 0;
      loopRunningRef.current = true;

      // Face and liveness detection loop
      const detectFace = async () => {
        if (
          !loopRunningRef.current ||
          !isCurrentSession() ||
          detectingRef.current
        ) {
          return;
        }

        const currentVideo = videoRef.current;

        if (
          !currentVideo ||
          currentVideo.readyState < 2 ||
          !livenessRef.current ||
          !faceApiRef.current
        ) {
          loopTimerRef.current = window.setTimeout(
            detectFace,
            FACE_RETRY_MS
          );
          return;
        }

        detectingRef.current = true;

        try {
          // Check liveness
          const faces = await livenessRef.current.detect(currentVideo);

          if (!loopRunningRef.current || !isCurrentSession()) {
            return;
          }

          const liveFace = faces?.[0];

          if (!liveFace || !liveFace.isLive) {
            liveFramesRef.current = 0;

            setFaceDescriptor(null);
            setLivenessVerified(false);

            setMessage(
              "Live face not verified. Look directly at the camera."
            );

            return;
          }

          liveFramesRef.current += 1;

          if (liveFramesRef.current < REQUIRED_LIVE_FRAMES) {
            setFaceDescriptor(null);
            setLivenessVerified(false);

            setMessage(
              `Checking live face... ${liveFramesRef.current}/${REQUIRED_LIVE_FRAMES}`
            );

            return;
          }

          // Generate face descriptor
          const result = await faceapi
            .detectSingleFace(
              currentVideo,
              new faceapi.TinyFaceDetectorOptions({
                inputSize: 320,
                scoreThreshold: 0.45,
              })
            )
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (!loopRunningRef.current || !isCurrentSession()) {
            return;
          }

          if (!result) {
            setFaceDescriptor(null);
            setLivenessVerified(false);
            setMessage("Face not detected. Look at the camera.");
            return;
          }

          const descriptor = Array.from(result.descriptor);

          if (
            descriptor.length !== 128 ||
            !descriptor.every(Number.isFinite)
          ) {
            setFaceDescriptor(null);
            setLivenessVerified(false);
            setMessage("Unable to verify face. Please try again.");
            return;
          }

          // Face verification completed
          loopRunningRef.current = false;

          if (loopTimerRef.current) {
            window.clearTimeout(loopTimerRef.current);
            loopTimerRef.current = null;
          }

          setFaceDescriptor(descriptor);
          setLivenessVerified(true);
          setError("");
          setMessage("Live face check passed. Select IN or OUT.");
        } catch (err) {
          console.error("Face/liveness detection:", err);

          if (isCurrentSession()) {
            setMessage(
              "Face verification could not complete. Retrying..."
            );
          }
        } finally {
          detectingRef.current = false;

          if (
            loopRunningRef.current &&
            isCurrentSession()
          ) {
            loopTimerRef.current = window.setTimeout(
              detectFace,
              FACE_RETRY_MS
            );
          }
        }
      };

      detectLoopRef.current = detectFace;

      loopTimerRef.current = window.setTimeout(detectFace, 100);
    } catch (err) {
      console.error("Camera/model error:", err);

      if (isCurrentSession()) {
        stopFaceCamera();

        setError(
          err?.message ||
            "Unable to start face verification. Check camera permissions and model availability."
        );

        setMessage("Camera could not be started.");
      }
    } finally {
      if (isCurrentSession()) {
        cameraStartingRef.current = false;
        setLoading(false);
      }
    }
  }, [loadModels, stopFaceCamera]);

  // Camera starts automatically when kiosk opens
  useEffect(() => {
    mountedRef.current = true;

    startFaceCamera();

    return () => {
      mountedRef.current = false;

      if (resultTimerRef.current) {
        window.clearTimeout(resultTimerRef.current);
        resultTimerRef.current = null;
      }

      stopFaceCamera();
    };
  }, [startFaceCamera, stopFaceCamera]);

  // Show attendance result
  const showResult = useCallback(
    (type, action, text, employeeName = "") => {
      if (!mountedRef.current) return;

      stopFaceCamera();

      setResultType(type);
      setResultAction(action);
      setResultMessage(text);
      setResultEmployeeName(employeeName);

      setFaceDescriptor(null);
      setLivenessVerified(false);

      setError("");
      setMessage("");
      setLoading(false);

      if (resultTimerRef.current) {
        window.clearTimeout(resultTimerRef.current);
      }

      resultTimerRef.current = window.setTimeout(() => {
        if (mountedRef.current) {
          window.location.reload();
        }
      }, RESULT_DISPLAY_MS);
    },
    [stopFaceCamera]
  );

  // Mark DAY IN / DAY OUT attendance
  const handleAttendance = async (action) => {
    if (attendanceBusyRef.current) return;

    if (!faceDescriptor || !livenessVerified) {
      setError(
        "Complete live face verification before marking attendance."
      );
      return;
    }

    if (!["IN", "OUT"].includes(action)) {
      setError("Invalid attendance action.");
      return;
    }

    attendanceBusyRef.current = true;

    setLoading(true);
    setError("");
    setMessage(`Verifying identity and recording ${action}...`);

    try {
      const result = await markKioskAttendance({
        faceDescriptor,
        action,
        livenessVerified,
      });

      if (!mountedRef.current) return;

      const employeeName =
        result?.employeeName ||
        result?.employee?.name ||
        result?.name ||
        "";

      showResult(
        "success",
        action,
        result?.message ||
          `${action} attendance marked successfully.`,
        employeeName
      );
    } catch (err) {
      if (!mountedRef.current) return;

      const serverMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Unable to record attendance.";

      const lowerMessage = serverMessage.toLowerCase();

      if (
        lowerMessage.includes("already") ||
        lowerMessage.includes("duplicate")
      ) {
        showResult("duplicate", action, serverMessage);
        return;
      }

      setError(
        lowerMessage.includes("face")
          ? "Face does not match any registered employee."
          : serverMessage
      );

      setMessage("Please try the face verification again.");

      setFaceDescriptor(null);
      setLivenessVerified(false);

      liveFramesRef.current = 0;
      loopRunningRef.current = true;

      if (detectLoopRef.current) {
        loopTimerRef.current = window.setTimeout(
          detectLoopRef.current,
          FACE_RETRY_MS
        );
      }
    } finally {
      attendanceBusyRef.current = false;

      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Restart kiosk for next employee
  const resetKiosk = () => {
    if (attendanceBusyRef.current) return;

    stopFaceCamera();
    window.location.reload();
  };

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-[#f3f8f4] flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-xl">

        {/* Brand Header */}
        <div className="text-center mb-3">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#173f33] text-white shadow-md mb-1">
            <span className="text-xl font-black">M</span>
          </div>

          <h1 className="text-lg sm:text-xl font-extrabold tracking-wide text-[#173f33]">
            MATZ SOLUTIONS
          </h1>

          <p className="text-xs text-gray-500">
            Attendance Management System
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

          {/* Card Header */}
          <div className="bg-gradient-to-r from-[#173f33] to-[#236b50] px-4 py-8 text-center">
            <h2 className="text-2xl font-bold text-white">
              Attendance Management System
            </h2>

            <p className="text-green-100 text-sm mt-1">
              Verify your identity to mark attendance
            </p>
          </div>

          <div className="p-3 sm:p-5">

            {resultType ? (
              /* Result Screen */
              <div
                className={`rounded-xl border p-5 text-center ${
                  resultType === "success"
                    ? "border-green-200 bg-green-50"
                    : "border-amber-200 bg-amber-50"
                }`}
                role="status"
                aria-live="polite"
              >
                <div
                  className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 ${
                    resultType === "success"
                      ? "bg-green-100"
                      : "bg-amber-100"
                  }`}
                >
                  <svg
                    className={`w-7 h-7 ${
                      resultType === "success"
                        ? "text-green-700"
                        : "text-amber-700"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {resultType === "success" ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M5 12l4 4L19 6"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v4m0 4h.01M5 19h14a2 2 0 001.7-3L13.7 4a2 2 0 00-3.4 0L3.3 16A2 2 0 005 19z"
                      />
                    )}
                  </svg>
                </div>

                <h2
                  className={`text-xl font-bold ${
                    resultType === "success"
                      ? "text-green-800"
                      : "text-amber-800"
                  }`}
                >
                  {resultType === "success"
                    ? `${resultAction} Attendance Successful!`
                    : "Attendance Already Marked!"}
                </h2>

                {resultType === "success" && resultEmployeeName && (
                  <p className="mt-2 text-lg font-bold text-[#173f33]">
                    Welcome, {resultEmployeeName}!
                  </p>
                )}

                <p className="mt-2 text-sm text-gray-700">
                  {resultMessage}
                </p>

                {resultType === "success" && (
                  <p className="mt-1 text-sm font-medium text-green-800">
                    Your attendance has been marked successfully.
                  </p>
                )}

                <p className="mt-3 text-xs text-gray-500">
                  Refreshing kiosk in 2 seconds...
                </p>
              </div>
            ) : (
              <>
                {/* Face Verification Heading */}
                <div className="text-center mb-3">
                  <h3 className="text-xl font-bold text-gray-800">
                    Face Verification
                  </h3>

                  <p className="text-xs text-gray-500 mt-1">
                    Look directly at the camera.
                  </p>
                </div>

                {/* Face Camera */}
                <div
                  className="relative mx-auto overflow-hidden rounded-xl bg-gray-900 border-2 border-[#edf5ef]"
                  style={{
                    height: "clamp(180px, 38dvh, 320px)",
                    maxWidth: "420px",
                  }}
                >
                  <video
                    ref={videoRef}
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />

                  {!cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                      <p className="text-white text-sm font-medium">
                        {loading ? "Starting camera..." : "Camera unavailable"}
                      </p>
                    </div>
                  )}

                  {faceDescriptor && livenessVerified && (
                    <div className="absolute top-2 right-2 bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow">
                      Verified
                    </div>
                  )}
                </div>

                {/* Status */}
                <div
                  className={`mt-3 rounded-lg border p-2 text-center text-xs sm:text-sm font-medium ${
                    error
                      ? "border-red-200 bg-red-50 text-red-700"
                      : faceDescriptor && livenessVerified
                        ? "border-green-200 bg-green-50 text-green-800"
                        : "border-gray-200 bg-gray-50 text-gray-700"
                  }`}
                  role={error ? "alert" : "status"}
                  aria-live="polite"
                >
                  {loading
                    ? "Please wait..."
                    : error
                      ? error
                      : faceDescriptor && livenessVerified
                        ? "Live face verification passed. Select IN or OUT."
                        : message || "Looking for a live face..."}
                </div>

                {/* Attendance Buttons */}
                <div className="mt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleAttendance("IN")}
                      disabled={
                        !faceDescriptor ||
                        !livenessVerified ||
                        loading
                      }
                      className="bg-[#173f33] text-white py-3 rounded-xl font-bold text-sm shadow-md hover:bg-[#236b50] active:scale-[0.98] transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {loading ? "Please wait..." : "DAY IN"}
                    </button>

                    <button
                      onClick={() => handleAttendance("OUT")}
                      disabled={
                        !faceDescriptor ||
                        !livenessVerified ||
                        loading
                      }
                      className="bg-[#236b50] text-white py-3 rounded-xl font-bold text-sm shadow-md hover:bg-[#173f33] active:scale-[0.98] transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {loading ? "Please wait..." : "DAY OUT"}
                    </button>
                  </div>
                </div>

                {/* Next Employee */}
                <button
                  onClick={resetKiosk}
                  disabled={loading}
                  className="mt-2 w-full border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Scan Next Employee
                </button>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-gray-400 mt-2">
          © {new Date().getFullYear()} MATZ SOLUTIONS. All rights reserved.
        </p>
      </div>
    </main>
  );
}


"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { FaceLiveness } from "@solankivishal/face-liveness-web";
import { markKioskAttendance } from "@/api/client/employee";

const MODEL_URL =
  "https://justadudewhohacks.github.io/face-api.js/models";

const FACE_RETRY_MS = 300;
const RESULT_DISPLAY_MS = 2000;
const REQUIRED_LIVE_FRAMES = 8;

export default function KioskPage() {
  const scannerRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const faceApiRef = useRef(null);
  const livenessRef = useRef(null);
  const loopTimerRef = useRef(null);
  const resultTimerRef = useRef(null);

  const mountedRef = useRef(false);
  const scanningRef = useRef(false);
  const loopRunningRef = useRef(false);
  const detectingRef = useRef(false);
  const attendanceBusyRef = useRef(false);
  const qrTokenRef = useRef("");
  const liveFramesRef = useRef(0);
  const detectLoopRef = useRef(null);

  const [qrToken, setQrToken] = useState("");
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [livenessVerified, setLivenessVerified] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultType, setResultType] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const [resultAction, setResultAction] = useState("");

  const stopFaceCamera = useCallback(() => {
    loopRunningRef.current = false;
    detectingRef.current = false;

    if (loopTimerRef.current) {
      window.clearTimeout(loopTimerRef.current);
      loopTimerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    if (mountedRef.current) {
      setCameraReady(false);
    }
  }, []);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;

    scannerRef.current = null;

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
    } catch (err) {
      console.warn("QR scanner stop:", err?.message);
    }

    try {
      scanner.clear();
    } catch (err) {
      console.warn("QR scanner clear:", err?.message);
    }
  }, []);

  const loadModels = useCallback(async () => {
    if (!faceApiRef.current) {
      const faceapi = await import("face-api.js");

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);

      faceApiRef.current = faceapi;
    }

    if (!livenessRef.current) {
      livenessRef.current = await FaceLiveness.create();
    }

    return faceApiRef.current;
  }, []);

  const startScanner = useCallback(async () => {
    if (
      !mountedRef.current ||
      scanningRef.current ||
      scannerRef.current ||
      qrTokenRef.current
    ) {
      return;
    }

    const reader = document.getElementById("kiosk-qr-reader");
    if (!reader) return;

    scanningRef.current = true;

    const scanner = new Html5Qrcode("kiosk-qr-reader");
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 230, height: 230 },
          aspectRatio: 1,
        },
        async (decodedText) => {
          if (!mountedRef.current || qrTokenRef.current) return;

          let token = decodedText.trim();

          try {
            const url = new URL(decodedText.trim());
            token =
              url.searchParams.get("qrToken") ||
              url.searchParams.get("token") ||
              decodedText.trim();
          } catch {
            // QR contains a plain token.
          }

          if (!token) {
            setError("Invalid employee QR code.");
            return;
          }

          qrTokenRef.current = token;
          setQrToken(token);
          setError("");
          setMessage("QR scanned. Loading face verification...");
          setFaceDescriptor(null);
          setLivenessVerified(false);
          liveFramesRef.current = 0;

          await stopScanner();
        }
      );
    } catch (err) {
      console.error("QR camera:", err);

      if (mountedRef.current) {
        setError(
          "Unable to start QR camera. Allow camera access and use localhost or HTTPS."
        );
      }

      if (scannerRef.current === scanner) {
        scannerRef.current = null;
      }

      try {
        scanner.clear();
      } catch {}
    } finally {
      scanningRef.current = false;
    }
  }, [stopScanner]);

  const startFaceCamera = useCallback(async () => {
    if (
      !mountedRef.current ||
      !qrTokenRef.current ||
      streamRef.current
    ) {
      return;
    }

    setLoading(true);
    setError("");
    setMessage("Loading face and liveness models...");

    try {
      const faceapi = await loadModels();

      if (!mountedRef.current || !qrTokenRef.current) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      if (!mountedRef.current || !qrTokenRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) throw new Error("Face camera is unavailable.");

      video.srcObject = stream;
      await video.play();

      if (!mountedRef.current) return;

      setCameraReady(true);
      setMessage("Look at the camera. Checking for a live face...");
      liveFramesRef.current = 0;
      loopRunningRef.current = true;

      const detectFace = async () => {
        if (
          !loopRunningRef.current ||
          !mountedRef.current ||
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
          const faces = await livenessRef.current.detect(currentVideo);
          const liveFace = faces?.[0];

          if (!loopRunningRef.current || !mountedRef.current) return;

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

          if (!loopRunningRef.current || !mountedRef.current) return;

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

          if (mountedRef.current) {
            setMessage(
              "Face verification could not complete. Retrying..."
            );
          }
        } finally {
          detectingRef.current = false;

          if (loopRunningRef.current && mountedRef.current) {
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
      stopFaceCamera();

      if (mountedRef.current) {
        setError(
          err?.message ||
            "Unable to start face verification. Check camera permissions and model availability."
        );
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [loadModels, stopFaceCamera]);

  useEffect(() => {
    mountedRef.current = true;
    startScanner();

    return () => {
      mountedRef.current = false;
      loopRunningRef.current = false;

      if (loopTimerRef.current) {
        window.clearTimeout(loopTimerRef.current);
      }

      if (resultTimerRef.current) {
        window.clearTimeout(resultTimerRef.current);
      }

      const scanner = scannerRef.current;
      scannerRef.current = null;

      if (scanner) {
        void (async () => {
          try {
            if (scanner.isScanning) await scanner.stop();
          } catch {}

          try {
            scanner.clear();
          } catch {}
        })();
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (livenessRef.current) {
        void livenessRef.current.dispose?.();
        livenessRef.current = null;
      }
    };
  }, [startScanner]);

  useEffect(() => {
    if (qrToken && mountedRef.current && !cameraReady && !loading) {
      startFaceCamera();
    }
  }, [qrToken, cameraReady, loading, startFaceCamera]);

  const showResult = useCallback(
    (type, action, text) => {
      if (!mountedRef.current) return;

      stopFaceCamera();

      setResultType(type);
      setResultAction(action);
      setResultMessage(text);
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

  const handleAttendance = async (action) => {
    if (attendanceBusyRef.current) return;

    if (!qrToken || !faceDescriptor || !livenessVerified) {
      setError("Complete live face verification before marking attendance.");
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
        qrToken,
        faceDescriptor,
        action,
        livenessVerified,
      });

      if (!mountedRef.current) return;

      showResult(
        "success",
        action,
        result?.message || `${action} attendance recorded successfully.`
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
          ? "Face does not match this employee."
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
        <div className="bg-linear-to-r from-[#173f33] to-[#236b50] px-4 py-8 text-center">

          <h2 className="text-2xl font-bold text-white">
            Attendance Management System 
          </h2>

          <p className="text-green-100 text-md mt-1">
            Scan your ID and verify your identity
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

              <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 ${
                resultType === "success"
                  ? "bg-green-100"
                  : "bg-amber-100"
              }`}>

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

              <h2 className={`text-xl font-bold ${
                resultType === "success"
                  ? "text-green-800"
                  : "text-amber-800"
              }`}>
                {resultType === "success"
                  ? `${resultAction} Attendance Successful!`
                  : "Attendance Already Marked!"}
              </h2>

              <p className="mt-2 text-sm text-gray-700">
                {resultMessage}
              </p>

              <p className="mt-3 text-xs text-gray-500">
                Refreshing kiosk in 2 seconds...
              </p>

            </div>

          ) : (

            <>

              {/* QR Scanner */}
              {!qrToken && (

                <div className="text-center">

                  <div className="mb-3">

                    <h3 className="text-xl font-bold text-gray-800">
                      Scan Employee ID QR
                    </h3>

                    <p className="text-xs text-gray-500 mt-1">
                      Hold your employee ID card in front of the scanner.
                    </p>

                  </div>

                  <div className="mx-auto max-w-[300px] bg-[#f8faf8] border border-gray-200 rounded-xl p-2 overflow-hidden">

                    <div
                      id="kiosk-qr-reader"
                      className="w-full overflow-hidden rounded-lg"
                    />

                  </div>

                </div>

              )}

              {/* Face Verification */}
              {qrToken && (

                <>

                  <div className="flex items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 p-2 mb-3">

                    <svg
                      className="w-4 h-4 text-green-700"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>

                    <span className="text-sm font-semibold text-green-800">
                      Employee QR Scanned
                    </span>

                  </div>

                  <div className="text-center mb-2">

                    <h3 className="text-base font-bold text-gray-800">
                      Face Verification
                    </h3>

                    <p className="text-xs text-gray-500 mt-1">
                      Look directly at the camera.
                    </p>

                  </div>

                  {/* Compact Face Camera */}
                  <div
                    className="relative mx-auto overflow-hidden rounded-xl bg-gray-900 border-2 border-[#edf5ef]"
                    style={{
                      height: "clamp(145px, 32dvh, 300px)",
                      maxWidth: "420px"
                    }}
                  >

                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />

                    {!cameraReady && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                        <p className="text-white text-sm font-medium">
                          Starting camera...
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
                        disabled={!faceDescriptor || !livenessVerified || loading}
                        className="bg-[#173f33] text-white py-3 rounded-xl font-bold text-sm shadow-md hover:bg-[#236b50] active:scale-[0.98] transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {loading ? "Please wait..." : "DAY IN"}
                      </button>

                      <button
                        onClick={() => handleAttendance("OUT")}
                        disabled={!faceDescriptor || !livenessVerified || loading}
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

            </>

          )}

          {/* QR Messages */}
          {message && !qrToken && !resultType && (
            <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-2 text-center text-xs text-gray-900">
              {message}
            </div>
          )}

          {error && !qrToken && !resultType && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-center text-xs text-red-700">
              {error}
            </div>
          )}

        </div>

      </div>

      {/* Footer */}
      <p className="text-center text-[10px] text-gray-400 mt-2">
        © {new Date().getFullYear()} MATZ SOLUTIONS. All rights reserved.
      </p>

    </div>

    {/* Scanner Size Control */}
    <style jsx global>{`
      #kiosk-qr-reader {
        width: 100% !important;
      }

      #kiosk-qr-reader video {
        width: 100% !important;
        max-height: 220px !important;
        object-fit: cover !important;
      }

      #kiosk-qr-reader canvas {
        max-width: 100% !important;
      }

      #kiosk-qr-reader img[alt="Info icon"] {
        display: none !important;
      }
    `}</style>

  </main>
);

}

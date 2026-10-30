"use client";

import Link from "next/link";

export default function Login() {
  return (
    <div className="min-h-screen bg-[#f3f8f4] flex items-center justify-center px-4 py-10">

      <div className="w-full max-w-md">

        {/* Brand Header */}
        <div className="text-center mb-7">

          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#173f33] text-white shadow-lg mb-4">
            <span className="text-2xl font-black">M</span>
          </div>

          <h1 className="text-2xl font-extrabold tracking-wide text-[#173f33]">
            MATZ SOLUTIONS
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Attendance Management System
          </p>

        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">

          {/* Card Header */}
          <div className="bg-linear-to-r from-[#173f33] to-[#236b50] px-8 py-8 text-center">

            <div className="w-14 h-14 mx-auto rounded-full bg-white/15 flex items-center justify-center mb-4">

              <svg
                className="w-7 h-7 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>

            </div>

            <h2 className="text-2xl font-bold text-white">
              Attendance Type
            </h2>

            <p className="text-green-100 text-sm mt-2">
              Select your attendance option
            </p>

          </div>

          {/* Card Content */}
          <div className="p-8">

            <div className="text-center mb-6">

              <h3 className="text-lg font-bold text-gray-800">
                Welcome, Employee!
              </h3>

              <p className="text-sm text-gray-500 mt-1">
                Choose an option to continue
              </p>

            </div>

            {/* Attendance Record */}
            <Link
              href="/record"
              className="flex items-center justify-center gap-3 w-full bg-[#173f33] text-white py-4 rounded-xl
              font-bold shadow-md
              hover:bg-[#236b50] hover:shadow-lg
              active:scale-[0.98]
              transition-all duration-200"
            >

              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>

              Check Attendance Record

            </Link>

          </div>

        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-7">
          © {new Date().getFullYear()} MATZ SOLUTIONS. All rights reserved.
        </p>

      </div>

    </div>
  );
}
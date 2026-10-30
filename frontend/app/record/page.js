
"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRecord } from "@/api/client/employee";

export default function Record() {
  const [token, setToken] = useState(null);

  useEffect(() => {
    setToken(localStorage.getItem("token"));
  }, []);

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["record"],
    queryFn: () => getRecord(token),
    enabled: !!token,
  });

  if (isPending) {
    return (
      <div className="min-h-screen bg-[#f3f8f4] flex items-center justify-center">
        <p className="text-[#173f33] font-semibold text-lg">
          Loading attendance records...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[#f3f8f4] flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
          <p className="text-red-600 font-semibold">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f8f4] px-4 py-10">

      <div className="max-w-5xl mx-auto">

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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>

            </div>

            <h2 className="text-2xl font-bold text-white">
              Attendance Record
            </h2>

            <p className="text-green-100 text-sm mt-2">
              View your complete attendance history
            </p>

          </div>

          {/* Table Section */}
          <div className="p-5 sm:p-8">

            <div className="mb-5">
              <h3 className="text-lg font-bold text-gray-800">
                Attendance History
              </h3>

              <p className="text-sm text-gray-500 mt-1">
                Your daily check-in and check-out details
              </p>
            </div>

            {/* Responsive Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200">

              <table className="w-full min-w-[550px]">

                <thead className="bg-[#edf5ef] border-b border-gray-200">
                  <tr>

                    <th className="px-6 py-4 text-left text-sm font-bold text-[#173f33]">
                      Date
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-bold text-[#173f33]">
                      Day In
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-bold text-[#173f33]">
                      Day Out
                    </th>

                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">

                  {data?.map((record) => (
                    <tr
                      key={record.id}
                      className="hover:bg-[#f6faf7] transition-colors duration-200"
                    >

                      {/* Date */}
                      <td className="px-6 py-4 text-sm text-gray-800 font-semibold">
                        {String(record.date).slice(0, 10)}
                      </td>

                      {/* Day In */}
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {record.time}
                      </td>

                      {/* Day Out */}
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {record.logout_time || (
                          <span className="text-gray-400">
                            Not marked
                          </span>
                        )}
                      </td>

                    </tr>
                  ))}

                </tbody>

              </table>

              {/* No Records */}
              {(!data || data.length === 0) && (
                <div className="py-12 text-center">

                  <div className="w-12 h-12 mx-auto rounded-full bg-[#edf5ef] flex items-center justify-center mb-3">

                    <svg
                      className="w-6 h-6 text-[#236b50]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                        d="M8 7h8m-8 4h8m-8 4h5m-9 4h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>

                  </div>

                  <p className="text-gray-600 font-semibold">
                    No attendance records found.
                  </p>

                  <p className="text-sm text-gray-400 mt-1">
                    Your attendance history will appear here.
                  </p>

                </div>
              )}

            </div>

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

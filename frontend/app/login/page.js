
"use client";

import { useMutation } from "@tanstack/react-query";
import { loginEmployee } from "@/api/client/employee";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: loginEmployee,

    onSuccess: (data) => {
      console.log(data);

      localStorage.setItem("token", data.token);
      console.log("Login successful");

      router.push("/select");
    },

    onError: (error) => {
      console.log(
        error.response?.data?.message || error.message
      );
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);

    const employeeData = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    mutation.mutate(employeeData);
  };

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
        {/* Login Card */}
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
                  d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2m12-13a4 4 0 11-8 0 4 4 0 018 0zm4 13v-2a4 4 0 00-3-3.87M17 4.13a4 4 0 010 7.75"
                />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-white">
              Employee Login
            </h2>

            <p className="text-green-100 text-sm mt-2">
              Login to your employee account
            </p>

          </div>

          {/* Form */}
          <div className="p-8">

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>

                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3.5
                  outline-none transition-all duration-200
                  focus:border-[#236b50] focus:ring-4 focus:ring-[#236b50]/10
                  text-gray-700 placeholder:text-gray-400"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>

                <input
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3.5
                  outline-none transition-all duration-200
                  focus:border-[#236b50] focus:ring-4 focus:ring-[#236b50]/10
                  text-gray-700 placeholder:text-gray-400"
                />
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={mutation.isPending}
                className="w-full bg-[#173f33] text-white py-3.5 rounded-xl
                font-bold shadow-md
                hover:bg-[#236b50] hover:shadow-lg
                active:scale-[0.98]
                transition-all duration-200
                disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {mutation.isPending
                  ? "Logging in..."
                  : "Sign In"}
              </button>

            </form>

            {/* Success Message */}
            {mutation.isSuccess && (
              <div className="mt-5 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
                {mutation.data.message}
              </div>
            )}

            {/* Error Message */}
            {mutation.isError && (
              <div className="mt-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {mutation.error.response?.data?.message ||
                  mutation.error.message}
              </div>
            )}

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

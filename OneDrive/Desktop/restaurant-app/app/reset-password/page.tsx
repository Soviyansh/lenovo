"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const checkRecoverySession = async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        setMessage(
          "This password reset link is invalid or has expired. Please request a new one."
        );
      }

      setCheckingSession(false);
    };

    checkRecoverySession();
  }, []);

  const handleResetPassword = async () => {
    setMessage("");

    if (!password || !confirmPassword) {
      setMessage("Please enter your new password.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage(
      "Password updated successfully! Redirecting you to login..."
    );

    setTimeout(() => {
      window.location.href = "/login";
    }, 2000);

    setLoading(false);
  };

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0f0d0b] px-4 text-white">
        <div className="text-center">
          <div className="text-3xl">🔐</div>
          <p className="mt-3 text-white/50">
            Verifying reset link...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f0d0b] px-4 py-8 text-white">
      <div className="mx-auto flex min-h-[90vh] max-w-md items-center justify-center">
        <div className="w-full rounded-3xl border border-white/10 bg-[#171411] p-6 shadow-2xl sm:p-8">
          <div className="text-center">
            <h1 className="text-3xl font-black">
              YASH <span className="text-orange-500">SAINI</span>
            </h1>

            <p className="mt-1 text-xs text-white/40">
              Fresh • Fast • Delicious
            </p>

            <h2 className="mt-8 text-3xl font-black">
              Reset Password
            </h2>

            <p className="mt-2 text-sm text-white/45">
              Enter your new password below.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-white/70">
                New Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/25 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white/70">
                Confirm New Password
              </label>

              <input
                type="password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleResetPassword();
                  }
                }}
                placeholder="Re-enter your password"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/25 focus:border-orange-500"
              />
            </div>

            {message && (
              <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 text-sm text-orange-300">
                {message}
              </div>
            )}

            <button
              onClick={handleResetPassword}
              disabled={loading}
              className="w-full rounded-xl bg-orange-500 px-5 py-3.5 font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </div>

          <a
            href="/login"
            className="mt-6 block text-center text-sm font-bold text-orange-500 transition hover:text-orange-400"
          >
            ← Back to Login
          </a>

          <a
            href="mailto:gopusharmaas5678@gmail.com?subject=Customer%20Support%20-%20Yash%20Saini%20Restaurant"
            className="mt-4 block text-center text-sm font-bold text-white/40 transition hover:text-white/70"
          >
            💬 Customer Support
          </a>
        </div>
      </div>
    </main>
  );
}
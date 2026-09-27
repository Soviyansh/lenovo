"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">("error");

  const showError = (text: string) => {
    setMessageType("error");
    setMessage(text);
  };

  const showSuccess = (text: string) => {
    setMessageType("success");
    setMessage(text);
  };

  const handleLogin = async () => {
    setMessage("");

    if (!email.trim() || !password) {
      showError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      // IMPORTANT:
      // Clear any previous customer/delivery/admin session
      // before starting a new admin login.
      await supabase.auth.signOut({ scope: "local" });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error || !data.user) {
        console.error("Login error:", error);
        showError("Invalid email or password.");
        return;
      }

      // IMPORTANT:
      // A valid Supabase account does NOT automatically mean
      // that the account is an admin.
      const { data: adminUser, error: adminError } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (adminError) {
        console.error("Admin verification error:", adminError);

        await supabase.auth.signOut({ scope: "local" });

        showError("Unable to verify admin account. Please try again.");
        return;
      }

      if (!adminUser) {
        // This account is a valid Supabase user,
        // but it is NOT registered as an admin.
        await supabase.auth.signOut({ scope: "local" });

        showError(
          "This account is not an admin account. Please use the correct admin email."
        );

        return;
      }

      // Verified admin
      window.location.replace("/admin");
    } catch (error) {
      console.error("Unexpected login error:", error);

      await supabase.auth.signOut({ scope: "local" });

      showError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setMessage("");

    if (!email.trim()) {
      showError("Please enter your admin email first.");
      return;
    }

    setForgotLoading(true);

    try {
      const redirectUrl =
        `${window.location.origin}/admin/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: redirectUrl,
        }
      );

      if (error) {
        console.error("Forgot password error:", error);
        showError("Unable to send reset email. Please try again.");
        return;
      }

      showSuccess(
        "Password reset link has been sent to your email. Please check your inbox."
      );
    } catch (error) {
      console.error("Forgot password error:", error);
      showError("Something went wrong. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0f0d0b] px-4 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
        <div className="w-full rounded-3xl border border-white/10 bg-[#171310] p-7 md:p-8">

          <div className="text-center">
            <p className="font-semibold text-orange-400">
              YASH SAINI RESTAURANT
            </p>

            <h1 className="mt-3 text-3xl font-black">
              Admin Login
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              Sign in to manage restaurant orders.
            </p>
          </div>

          <div className="mt-8 space-y-5">

            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-300">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter admin email"
                autoComplete="email"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none placeholder:text-gray-600 focus:border-orange-500"
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-300">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleLogin();
                  }
                }}
                placeholder="Enter admin password"
                autoComplete="current-password"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none placeholder:text-gray-600 focus:border-orange-500"
              />

              {/* Forgot Password */}
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={forgotLoading || loading}
                  className="text-sm font-semibold text-orange-400 transition hover:text-orange-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {forgotLoading
                    ? "Sending..."
                    : "Forgot Password?"}
                </button>
              </div>
            </div>

            {/* Message */}
            {message && (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  messageType === "success"
                    ? "border-green-500/20 bg-green-500/10 text-green-300"
                    : "border-red-500/20 bg-red-500/10 text-red-300"
                }`}
              >
                {message}
              </div>
            )}

            {/* Login Button */}
            <button
              type="button"
              onClick={handleLogin}
              disabled={loading || forgotLoading}
              className="w-full rounded-xl bg-orange-500 px-5 py-3 font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </div>

          {/* Back */}
          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
            className="mt-6 w-full text-center text-sm text-gray-500 transition hover:text-white"
          >
            ← Back to Restaurant
          </button>

        </div>
      </div>
    </main>
  );
}
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function DeliveryLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">(
    "error"
  );

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
      // Clear any previous customer/admin/delivery session
      // before starting a new delivery login.
      await supabase.auth.signOut({ scope: "local" });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error("Delivery login error:", error);
        showError("Invalid email or password.");
        return;
      }

      if (!data.user) {
        showError("Unable to verify your account.");
        return;
      }

      // Verify that this Auth account belongs to a delivery boy.
      // delivery_boys.id must match the authenticated user's UID.
      const { data: deliveryBoy, error: profileError } = await supabase
        .from("delivery_boys")
        .select("id, full_name, is_active")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Delivery profile error:", profileError);

        await supabase.auth.signOut({ scope: "local" });

        showError(
          "Unable to verify delivery account. Please try again."
        );
        return;
      }

      // Auth user exists but is not registered as a delivery boy.
      if (!deliveryBoy) {
        await supabase.auth.signOut({ scope: "local" });

        showError(
          "This account is not registered as a delivery boy."
        );
        return;
      }

      // Delivery account exists but is inactive.
      if (!deliveryBoy.is_active) {
        await supabase.auth.signOut({ scope: "local" });

        showError(
          "Your delivery account is currently inactive. Please contact the restaurant."
        );
        return;
      }

      // Delivery boy successfully verified.
      window.location.replace("/delivery");
    } catch (error) {
      console.error("Unexpected delivery login error:", error);

      await supabase.auth.signOut({ scope: "local" });

      showError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setMessage("");

    if (!email.trim()) {
      showError("Please enter your delivery email first.");
      return;
    }

    setForgotLoading(true);

    try {
      const redirectUrl =
        `${window.location.origin}/delivery/reset-password`;

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
    <main className="min-h-screen bg-[#0f0d0b] px-4 py-8 text-white">
      <div className="mx-auto flex min-h-[90vh] max-w-md items-center justify-center">
        <div className="w-full rounded-3xl border border-white/10 bg-[#171411] p-6 shadow-2xl sm:p-8">

          {/* Brand */}
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/10 text-4xl">
              🛵
            </div>

            <h1 className="mt-5 text-3xl font-black">
              YASH <span className="text-orange-500">SAINI</span>
            </h1>

            <p className="mt-1 text-xs font-medium tracking-wider text-white/40">
              RESTAURANT
            </p>
          </div>

          {/* Heading */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-400">
              DELIVERY PARTNER
            </div>

            <h2 className="mt-4 text-3xl font-black">
              Welcome Back
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/45">
              Login to manage your assigned deliveries.
            </p>
          </div>

          {/* Login Form */}
          <div className="mt-8 space-y-5">

            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-white/70">
                Email Address
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30">
                  ✉️
                </span>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleLogin();
                    }
                  }}
                  placeholder="delivery@example.com"
                  autoComplete="email"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-4 text-white outline-none transition placeholder:text-white/20 focus:border-orange-500 focus:bg-white/[0.07]"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-white/70">
                Password
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30">
                  🔒
                </span>

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleLogin();
                    }
                  }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-12 text-white outline-none transition placeholder:text-white/20 focus:border-orange-500 focus:bg-white/[0.07]"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-white/40 transition hover:text-white"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>

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
                className={`rounded-xl border px-4 py-3 text-sm leading-5 ${
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
              className="w-full rounded-xl bg-orange-500 px-5 py-3.5 font-black text-black shadow-lg shadow-orange-500/10 transition hover:bg-orange-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Login to Delivery Panel"}
            </button>
          </div>

          {/* Security Info */}
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-white/5 bg-black/20 p-4">
            <span className="text-lg">
              🔐
            </span>

            <div>
              <p className="text-xs font-bold text-white/70">
                Secure Delivery Access
              </p>

              <p className="mt-1 text-xs leading-5 text-white/35">
                Only registered and active delivery partners can
                access the delivery panel.
              </p>
            </div>
          </div>

          {/* Back */}
          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
            className="mt-7 w-full text-center text-sm font-semibold text-white/35 transition hover:text-white"
          >
            ← Back to Restaurant
          </button>

        </div>
      </div>
    </main>
  );
}
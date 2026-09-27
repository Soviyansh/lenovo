"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleAuth = async () => {
    setMessage("");

    if (!email.trim() || !password.trim()) {
      setMessage("Please enter email and password.");
      return;
    }

    if (isSignup && !name.trim()) {
      setMessage("Please enter your name.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    if (isSignup) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim(),
          },
        },
      });

      if (error) {
        setMessage(error.message);
      } else if (data.session) {
        window.location.href = "/";
      } else {
        setMessage(
          "Account created! Please check your email to confirm your account."
        );
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      // ----------------------------------------------------
      // DELIVERY BOY ROLE CHECK
      // ----------------------------------------------------

      if (data.user) {
        const { data: deliveryBoy, error: deliveryCheckError } =
          await supabase
            .from("delivery_boys")
            .select("id, full_name, is_active")
            .eq("id", data.user.id)
            .maybeSingle();

        if (deliveryCheckError) {
          console.error(
            "Delivery role check error:",
            deliveryCheckError
          );

          await supabase.auth.signOut();

          setMessage(
            "Unable to verify your account role. Please try again."
          );
          setLoading(false);
          return;
        }

        // This account belongs to a delivery boy.
        if (deliveryBoy) {
          await supabase.auth.signOut();

          setMessage(
            "This is a Delivery Boy account. Please login from the Delivery Boy login page."
          );

          setLoading(false);
          return;
        }
      }

      // Normal customer
      window.location.href = "/";
    }

    setLoading(false);
  };

  const handleForgotPassword = async () => {
    setMessage("");

    if (!email.trim()) {
      setMessage("Please enter your email first.");
      return;
    }

    setResetLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        "Password reset link has been sent to your email. Please check your inbox."
      );
    }

    setResetLoading(false);
  };

  const openCustomerSupport = () => {
    const supportEmail = "gopusharmaas5678@gmail.com";

    const subject = encodeURIComponent(
      "Customer Support - Yash Saini Restaurant"
    );

    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&to=${supportEmail}&su=${subject}`,
      "_blank"
    );
  };

  return (
    <main className="min-h-screen bg-[#0f0d0b] px-4 py-8 text-white">
      <div className="mx-auto flex min-h-[90vh] max-w-md items-center justify-center">
        <div className="w-full rounded-3xl border border-white/10 bg-[#171411] p-6 shadow-2xl sm:p-8">

          <a href="/" className="block text-center">
            <h1 className="text-3xl font-black">
              YASH <span className="text-orange-500">SAINI</span>
            </h1>

            <p className="mt-1 text-xs text-white/40">
              Fresh • Fast • Delicious
            </p>
          </a>

          <div className="mt-8 text-center">
            <h2 className="text-3xl font-black">
              {isSignup ? "Create Account" : "Welcome Back"}
            </h2>

            <p className="mt-2 text-sm text-white/45">
              {isSignup
                ? "Create your account to manage your orders."
                : "Login to view your profile and orders."}
            </p>
          </div>

          <div className="mt-8 space-y-4">

            {isSignup && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-white/70">
                  Full Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/25 focus:border-orange-500"
                />
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-semibold text-white/70">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/25 focus:border-orange-500"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-semibold text-white/70">
                  Password
                </label>

                {!isSignup && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={resetLoading}
                    className="text-xs font-bold text-orange-500 transition hover:text-orange-400 disabled:opacity-50"
                  >
                    {resetLoading
                      ? "Sending..."
                      : "Forgot Password?"}
                  </button>
                )}
              </div>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAuth();
                  }
                }}
                placeholder="Minimum 6 characters"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/25 focus:border-orange-500"
              />
            </div>

            {message && (
              <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 text-sm text-orange-300">
                {message}
              </div>
            )}

            <button
              onClick={handleAuth}
              disabled={loading}
              className="w-full rounded-xl bg-orange-500 px-5 py-3.5 font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Please wait..."
                : isSignup
                ? "Create Account"
                : "Login"}
            </button>
          </div>

          <div className="mt-7 text-center">
            <p className="text-sm text-white/40">
              {isSignup
                ? "Already have an account?"
                : "Don't have an account?"}
            </p>

            <button
              onClick={() => {
                setIsSignup(!isSignup);
                setMessage("");
              }}
              className="mt-2 font-bold text-orange-500 hover:text-orange-400"
            >
              {isSignup
                ? "Login instead"
                : "Create an account"}
            </button>
          </div>

          <button
            type="button"
            onClick={openCustomerSupport}
            className="mt-6 block w-full text-center text-sm font-bold text-orange-500 transition hover:text-orange-400"
          >
            💬 Customer Support
          </button>
        </div>
      </div>
    </main>
  );
}
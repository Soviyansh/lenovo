"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function TrackOrderPopup() {
  const pathname = usePathname();
  const router = useRouter();

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (pathname !== "/") {
      setVisible(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setVisible(true);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  if (pathname !== "/" || !visible) {
    return null;
  }

  const handleTrackOrder = () => {
    setVisible(false);
    router.push("/order-tracking");
  };

  const handleClose = () => {
    setVisible(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-24 sm:items-center sm:pb-0">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close track order popup"
        onClick={handleClose}
        className="absolute inset-0 cursor-default bg-black/45 backdrop-blur-[3px]"
      />

      {/* Popup */}
      <div className="relative w-full max-w-sm animate-[trackPopupIn_0.45s_cubic-bezier(.16,1,.3,1)]">
        {/* Orange glow */}
        <div className="pointer-events-none absolute -inset-5 rounded-[35px] bg-orange-500/15 blur-3xl" />

        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#171310]/95 shadow-[0_25px_80px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
          {/* Top shine */}
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/70 to-transparent" />

          {/* Decorative glow */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-orange-500/10 blur-3xl" />

          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg text-white/55 transition-all duration-200 hover:border-orange-500/30 hover:bg-orange-500/10 hover:text-white active:scale-90"
          >
            ×
          </button>

          <div className="relative p-6 sm:p-7">
            {/* Icon */}
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-400/20 bg-gradient-to-br from-orange-400/20 via-orange-500/10 to-transparent shadow-[0_10px_30px_rgba(249,115,22,0.15)]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-8 w-8 text-orange-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 7h14M5 12h10M5 17h6"
                />
                <circle cx="18" cy="16" r="3" />
                <path
                  strokeLinecap="round"
                  d="M18 14.5v1.7l1 0.6"
                />
              </svg>
            </div>

            <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-400">
              YASH SAINI RESTAURANT
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Track your order
            </h2>

            <p className="mt-2 max-w-xs text-sm leading-6 text-white/50">
              Check your latest order status and see where your food is.
            </p>

            {/* Button */}
            <button
              type="button"
              onClick={handleTrackOrder}
              className="group mt-6 flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-4 font-black text-white shadow-[0_12px_30px_rgba(249,115,22,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(249,115,22,0.3)] active:translate-y-0 active:scale-[0.98]"
            >
              <span>Track Order</span>

              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="mt-3 w-full py-2 text-xs font-semibold text-white/35 transition hover:text-white/60"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes trackPopupIn {
          from {
            opacity: 0;
            transform: translateY(35px) scale(0.94);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
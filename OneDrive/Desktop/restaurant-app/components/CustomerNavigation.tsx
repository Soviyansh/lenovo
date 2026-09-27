"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className={`h-[21px] w-[21px] transition-all duration-300 ${
        active ? "scale-110" : ""
      }`}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m3.5 10.5 8.5-7 8.5 7"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5.5 9.5v10h13v-10"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.5 19.5v-5h5v5"
      />
    </svg>
  );
}

function MenuIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className={`h-[21px] w-[21px] transition-all duration-300 ${
        active ? "scale-110" : ""
      }`}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 7h16"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 12h16"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 17h16"
      />
      <circle cx="7" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="17" cy="17" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function OrdersIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={`h-[21px] w-[21px] transition-all duration-300 ${
        active ? "scale-110" : ""
      }`}
    >
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="3"
      />
      <path
        strokeLinecap="round"
        d="M8 9h8M8 13h5M8 17h3"
      />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={`h-[21px] w-[21px] transition-all duration-300 ${
        active ? "scale-110" : ""
      }`}
    >
      <circle cx="12" cy="8" r="3.5" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5.5 20c.8-3.6 3-5.5 6.5-5.5s5.7 1.9 6.5 5.5"
      />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-[17px] w-[17px]"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 12H5"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m11 18-6-6 6-6"
      />
    </svg>
  );
}

type NavItemProps = {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
};

function NavItem({
  href,
  label,
  active,
  children,
}: NavItemProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="group relative flex min-w-0 flex-1 items-center justify-center"
    >
      <div
        className={`relative flex w-full max-w-[82px] flex-col items-center justify-center rounded-2xl py-2 transition-all duration-300 ease-out ${
          active
            ? "-translate-y-2"
            : "translate-y-0 group-active:scale-90"
        }`}
      >
        {/* Active glow */}
        {active && (
          <div className="absolute inset-x-2 -bottom-1 h-10 rounded-full bg-orange-500/25 blur-xl" />
        )}

        {/* Icon bubble */}
        <div
          className={`relative flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-300 ${
            active
              ? "border border-orange-400/50 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-700 text-white shadow-[0_8px_25px_rgba(249,115,22,0.38)]"
              : "border border-white/[0.06] bg-white/[0.035] text-white/45 group-hover:bg-white/[0.07] group-hover:text-white/80"
          }`}
        >
          {/* 3D highlight */}
          {active && (
            <span className="pointer-events-none absolute inset-[1px] rounded-[14px] bg-gradient-to-b from-white/20 to-transparent" />
          )}

          <span className="relative z-10">{children}</span>
        </div>

        {/* Label */}
        <span
          className={`relative mt-1.5 text-[10px] font-bold tracking-wide transition-all duration-300 ${
            active
              ? "text-orange-400"
              : "text-white/40 group-hover:text-white/70"
          }`}
        >
          {label}
        </span>

        {/* Active dot */}
        {active && (
          <span className="absolute -bottom-[7px] h-1 w-1 rounded-full bg-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.9)]" />
        )}
      </div>
    </Link>
  );
}

export default function CustomerNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  // Never show customer navigation inside admin or delivery panels.
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/delivery")
  ) {
    return null;
  }

  const isHome = pathname === "/";
  const isMenu = pathname.startsWith("/menu");
  const isOrders = pathname.startsWith("/order-tracking");
  const isProfile = pathname.startsWith("/profile");

  const handleBack = () => {
    if (
      typeof window !== "undefined" &&
      window.history.length > 1
    ) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <>
      {/* =====================================================
          PREMIUM BACK BUTTON
      ====================================================== */}
      {!isHome && (
        <div className="fixed left-3 top-3 z-[80] sm:left-5 sm:top-5 md:left-7 md:top-7">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Go back"
            className="group flex items-center gap-2 rounded-full border border-white/10 bg-[#15120f]/90 px-3.5 py-2.5 text-sm font-bold text-white shadow-[0_10px_35px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-400 active:scale-90"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-all duration-300 group-hover:border-orange-500/30 group-hover:bg-orange-500/10">
              <ArrowLeftIcon />
            </span>

            <span className="hidden sm:inline">
              Back
            </span>
          </button>
        </div>
      )}

      {/* =====================================================
          MOBILE BOTTOM NAVIGATION
      ====================================================== */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] md:hidden">
        <div className="pointer-events-auto px-3 pb-[max(10px,env(safe-area-inset-bottom))]">
          <div className="relative mx-auto max-w-md">
            {/* Outer glow */}
            <div className="pointer-events-none absolute -inset-2 rounded-[30px] bg-orange-500/[0.04] blur-2xl" />

            {/* Navigation shell */}
            <div className="relative rounded-[26px] border border-white/[0.09] bg-[#11100f]/95 px-1.5 pt-2 shadow-[0_-12px_45px_rgba(0,0,0,0.45),0_10px_35px_rgba(0,0,0,0.25)] backdrop-blur-2xl">
              {/* Top glass highlight */}
              <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              <nav
                aria-label="Customer navigation"
                className="flex items-end justify-around"
              >
                <NavItem
                  href="/"
                  label="Home"
                  active={isHome}
                >
                  <HomeIcon active={isHome} />
                </NavItem>

                <NavItem
                  href="/menu"
                  label="Menu"
                  active={isMenu}
                >
                  <MenuIcon active={isMenu} />
                </NavItem>

                <NavItem
                  href="/order-tracking"
                  label="Orders"
                  active={isOrders}
                >
                  <OrdersIcon active={isOrders} />
                </NavItem>

                <NavItem
                  href="/profile"
                  label="Profile"
                  active={isProfile}
                >
                  <ProfileIcon active={isProfile} />
                </NavItem>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom navigation spacing */}
      <div
        className="h-[96px] md:hidden"
        aria-hidden="true"
      />
    </>
  );
}
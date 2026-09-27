"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type UserInfo = {
  name: string;
  email: string;
};

type Order = {
  id: number;
  order_id: string;
  total: number;
  status: string;
};

type SavedAddress = {
  id: number;
  label: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
};

type FavouriteItem = {
  id: number;
  menu_item_id: number;
  menu_item: {
    id: number;
    name: string;
    price: number;
    emoji: string;
    category: string;
  };
};

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <circle
        cx="12"
        cy="8"
        r="3.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M5.5 20c.8-3.6 3-5.5 6.5-5.5s5.7 1.9 6.5 5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path
        d="m4 7 8-4 8 4v10l-8 4-8-4V7Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="m4 7 8 4 8-4M12 11v10"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <circle
        cx="12"
        cy="12"
        r="8.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M12 7v5l3 2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path
        d="M4 6.5A2.5 2.5 0 0 1 6.5 4H19v15H6.5A2.5 2.5 0 0 1 4 16.5v-10Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M4 7h15M15 12h4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="15" cy="12" r="0.8" fill="currentColor" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path
        d="M19 10.2c0 5-7 10.3-7 10.3S5 15.2 5 10.2a7 7 0 1 1 14 0Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle
        cx="12"
        cy="10"
        r="2.4"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M20.8 8.9c0 5.3-8.8 10.1-8.8 10.1S3.2 14.2 3.2 8.9A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.7Z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <circle
        cx="12"
        cy="12"
        r="3"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M19 13.5a7.5 7.5 0 0 0 0-3l1.5-1.1-1.8-3.1-1.8.7a7.6 7.6 0 0 0-2.6-1.5L14 3.5h-4l-.3 2a7.6 7.6 0 0 0-2.6 1.5l-1.8-.7-1.8 3.1L5 10.5a7.5 7.5 0 0 0 0 3l-1.5 1.1 1.8 3.1 1.8-.7a7.6 7.6 0 0 0 2.6 1.5l.3 2h4l.3-2a7.6 7.6 0 0 0 2.6-1.5l1.8.7 1.8-3.1L19 13.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M5 12h13M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 11v5M14 11v5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [favourites, setFavourites] = useState<FavouriteItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const [showAddressForm, setShowAddressForm] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [deletingAddress, setDeletingAddress] = useState<number | null>(
    null
  );

  const [addressLabel, setAddressLabel] = useState("Home");
  const [addressText, setAddressText] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const [deletingFavourite, setDeletingFavourite] = useState<number | null>(
    null
  );

  const [showSettings, setShowSettings] = useState(false);
  const [settingsName, setSettingsName] = useState("");
  const [settingsEmail, setSettingsEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");

  const loadAddresses = async (userId: string) => {
    const { data, error } = await supabase
      .from("saved_addresses")
      .select("id, label, address, latitude, longitude")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Address fetch error:", error);
      return;
    }

    setAddresses(data || []);
  };

  const loadFavourites = async (userId: string) => {
    const { data, error } = await supabase
      .from("favourite_items")
      .select(
        `
          id,
          menu_item_id,
          menu_items (
            id,
            name,
            price,
            emoji,
            category
          )
        `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Favourite fetch error:", error);
      return;
    }

    const formattedFavourites: FavouriteItem[] = (data || [])
      .filter((item) => item.menu_items)
      .map((item) => {
        const menuItem = Array.isArray(item.menu_items)
          ? item.menu_items[0]
          : item.menu_items;

        return {
          id: Number(item.id),
          menu_item_id: Number(item.menu_item_id),
          menu_item: {
            id: Number(menuItem.id),
            name: menuItem.name,
            price: Number(menuItem.price),
            emoji: menuItem.emoji,
            category: menuItem.category,
          },
        };
      });

    setFavourites(formattedFavourites);
  };

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        window.location.href = "/login";
        return;
      }

      const profileName =
        currentUser.user_metadata?.full_name ||
        currentUser.email?.split("@")[0] ||
        "Customer";

      const profileEmail = currentUser.email || "";

      setUser({
        name: profileName,
        email: profileEmail,
      });

      setSettingsName(profileName);
      setSettingsEmail(profileEmail);

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("id, order_id, total, status")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (orderError) {
        console.error("Orders fetch error:", orderError);
      }

      setOrders(orderData || []);

      await loadAddresses(currentUser.id);
      await loadFavourites(currentUser.id);

      setLoading(false);
    };

    void loadProfile();
  }, []);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Location is not supported by your browser.");
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setLocationLoading(false);
        alert("📍 Location added successfully!");
      },
      (error) => {
        console.error(error);
        setLocationLoading(false);
        alert("Unable to get your location. Please allow location permission.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const saveAddress = async () => {
    if (!user) return;

    if (!addressText.trim()) {
      alert("Please enter your delivery address.");
      return;
    }

    setSavingAddress(true);

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      alert("Please login again.");
      setSavingAddress(false);
      return;
    }

    const { error } = await supabase.from("saved_addresses").insert({
      user_id: currentUser.id,
      label: addressLabel,
      address: addressText.trim(),
      latitude,
      longitude,
    });

    if (error) {
      console.error("Save address error:", error);
      alert("Could not save address. Please try again.");
      setSavingAddress(false);
      return;
    }

    await loadAddresses(currentUser.id);

    setAddressLabel("Home");
    setAddressText("");
    setLatitude(null);
    setLongitude(null);
    setShowAddressForm(false);
    setSavingAddress(false);

    alert("✅ Address saved successfully!");
  };

  const deleteAddress = async (addressId: number) => {
    if (!window.confirm("Are you sure you want to delete this address?")) {
      return;
    }

    setDeletingAddress(addressId);

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      setDeletingAddress(null);
      return;
    }

    const { error } = await supabase
      .from("saved_addresses")
      .delete()
      .eq("id", addressId)
      .eq("user_id", currentUser.id);

    if (error) {
      console.error("Delete address error:", error);
      alert("Could not delete address.");
      setDeletingAddress(null);
      return;
    }

    setAddresses((current) =>
      current.filter((address) => address.id !== addressId)
    );

    setDeletingAddress(null);
  };

  const deleteFavourite = async (
    favouriteId: number,
    menuItemId: number
  ) => {
    if (!window.confirm("Remove this item from favourites?")) {
      return;
    }

    setDeletingFavourite(favouriteId);

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      setDeletingFavourite(null);
      return;
    }

    const { error } = await supabase
      .from("favourite_items")
      .delete()
      .eq("id", favouriteId)
      .eq("user_id", currentUser.id)
      .eq("menu_item_id", menuItemId);

    if (error) {
      console.error("Delete favourite error:", error);
      alert("Could not remove favourite.");
      setDeletingFavourite(null);
      return;
    }

    setFavourites((current) =>
      current.filter((item) => item.id !== favouriteId)
    );

    setDeletingFavourite(null);
  };

  const saveSettings = async () => {
    if (!settingsName.trim()) {
      setSettingsMessage("Please enter your name.");
      return;
    }

    if (!settingsEmail.trim()) {
      setSettingsMessage("Please enter your email.");
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setSettingsMessage("New password must be at least 6 characters.");
      return;
    }

    setSavingSettings(true);
    setSettingsMessage("");

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      setSettingsMessage("Please login again.");
      setSavingSettings(false);
      return;
    }

    const { error: profileError } = await supabase.auth.updateUser({
      email: settingsEmail.trim(),
      data: {
        full_name: settingsName.trim(),
      },
      ...(newPassword ? { password: newPassword } : {}),
    });

    if (profileError) {
      console.error("Account settings error:", profileError);
      setSettingsMessage(profileError.message);
      setSavingSettings(false);
      return;
    }

    setUser({
      name: settingsName.trim(),
      email: settingsEmail.trim(),
    });

    setNewPassword("");
    setSettingsMessage(
      "✅ Settings saved. If you changed your email, check your inbox for confirmation."
    );
    setSavingSettings(false);
  };

  const logout = async () => {
    setLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error(error);
      setLoggingOut(false);
      return;
    }

    window.location.href = "/";
  };

  const totalSpent = orders.reduce(
    (total, order) => total + Number(order.total || 0),
    0
  );

  const activeOrders = orders.filter(
    (order) =>
      order.status !== "delivered" && order.status !== "cancelled"
  ).length;

  const deliveredOrders = orders.filter(
    (order) => order.status === "delivered"
  ).length;

  if (loading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#090806] text-white">
        <div className="absolute left-[-100px] top-[15%] h-56 w-56 animate-pulse rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-[10%] right-[-100px] h-56 w-56 animate-pulse rounded-full bg-orange-400/10 blur-3xl" />

        <div className="relative z-10 text-center">
          <div className="mx-auto flex h-20 w-20 animate-pulse items-center justify-center rounded-3xl border border-orange-500/20 bg-orange-500/10 text-4xl shadow-[0_0_50px_rgba(249,115,22,0.15)]">
            🍜
          </div>

          <p className="mt-5 text-sm font-semibold text-white/50">
            Preparing your profile...
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#090806] pb-24 text-white">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-150px] top-[10%] h-72 w-72 animate-pulse rounded-full bg-orange-500/[0.07] blur-[100px]" />
        <div className="absolute bottom-[12%] right-[-160px] h-72 w-72 animate-pulse rounded-full bg-orange-400/[0.05] blur-[100px]" />

        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
            maskImage:
              "linear-gradient(to bottom, black, transparent 70%)",
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.06] bg-[#090806]/75 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 md:px-8">
          <a href="/" className="group">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-orange-400/80">
              YASH SAINI
            </p>

            <h1 className="mt-0.5 text-lg font-black tracking-tight sm:text-xl">
              RESTAURANT
            </h1>
          </a>

          <div className="hidden items-center gap-3 sm:flex">
            <a
              href="/my-orders"
              className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-bold text-white/60 transition duration-300 hover:-translate-y-0.5 hover:border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-400"
            >
              My Orders
            </a>

            <a
              href="/menu"
              className="rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-orange-500/15 transition duration-300 hover:-translate-y-0.5 hover:shadow-orange-500/30"
            >
              Browse Menu
            </a>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-10 pt-7 sm:px-6 sm:pt-10 md:px-8">
        {/* Intro */}
        <div className="mb-6 sm:mb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-400 sm:text-xs">
            Your space
          </p>

          <h2 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
            My Profile
          </h2>

          <p className="mt-2 text-sm text-white/40 sm:text-base">
            Everything about your YASH SAINI experience.
          </p>
        </div>

        {/* Profile hero */}
        <div className="group relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-gradient-to-br from-[#1d1711] via-[#14110e] to-[#0f0d0b] p-5 shadow-[0_25px_80px_rgba(0,0,0,0.4)] transition duration-500 hover:border-orange-500/20 sm:p-7 md:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border border-orange-500/10 transition duration-700 group-hover:scale-110" />
          <div className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full border border-orange-500/[0.07]" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4 sm:gap-6">
              <div className="relative shrink-0">
                <div className="absolute -inset-2 animate-pulse rounded-full bg-orange-500/20 blur-xl" />

                <div className="relative flex h-[76px] w-[76px] items-center justify-center rounded-full border-2 border-orange-400/70 bg-gradient-to-br from-orange-500/20 to-[#24180d] text-orange-400 shadow-[0_0_35px_rgba(249,115,22,0.2)] transition duration-500 group-hover:scale-105 sm:h-24 sm:w-24">
                  <UserIcon />

                  <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#17120e] bg-orange-500 text-[11px] font-black text-black shadow-lg">
                    ✓
                  </div>
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-xl font-black sm:text-2xl md:text-3xl">
                    {user.name}
                  </h3>

                  <span className="rounded-full border border-orange-400/20 bg-orange-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-orange-300">
                    Foodie
                  </span>
                </div>

                <p className="mt-1 truncate text-sm text-white/40">
                  {user.email}
                </p>

                <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-green-400">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.7)]" />
                  Account Active
                </div>
              </div>
            </div>

            <div className="hidden text-right sm:block">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
                Member
              </p>

              <p className="mt-1 text-lg font-black text-orange-400">
                YSR Foodie
              </p>
            </div>
          </div>

          <div className="relative mt-6 rounded-2xl border border-orange-500/10 bg-orange-500/[0.035] px-4 py-3.5">
            <p className="text-sm font-semibold text-white/65">
              “Good food brings good mood.”
              <span className="ml-2 text-orange-400">♥</span>
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-2.5 sm:mt-5 sm:gap-4">
          <div className="group rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3.5 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-orange-500/25 hover:shadow-[0_15px_40px_rgba(0,0,0,0.25)] sm:rounded-3xl sm:p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 sm:h-11 sm:w-11 sm:rounded-2xl">
              <PackageIcon />
            </div>

            <p className="mt-4 text-xl font-black tracking-tight sm:text-3xl">
              {orders.length}
            </p>

            <p className="mt-1 text-[10px] font-semibold text-white/35 sm:text-xs">
              Total Orders
            </p>
          </div>

          <div className="group rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3.5 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-blue-500/25 hover:shadow-[0_15px_40px_rgba(0,0,0,0.25)] sm:rounded-3xl sm:p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 sm:h-11 sm:w-11 sm:rounded-2xl">
              <ClockIcon />
            </div>

            <p className="mt-4 text-xl font-black tracking-tight sm:text-3xl">
              {activeOrders}
            </p>

            <p className="mt-1 text-[10px] font-semibold text-white/35 sm:text-xs">
              Active Orders
            </p>
          </div>

          <div className="group min-w-0 rounded-2xl border border-orange-500/15 bg-gradient-to-br from-orange-500/[0.08] to-white/[0.025] p-3.5 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-orange-500/30 hover:shadow-[0_15px_40px_rgba(249,115,22,0.12)] sm:rounded-3xl sm:p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 sm:h-11 sm:w-11 sm:rounded-2xl">
              <WalletIcon />
            </div>

            <p className="mt-4 truncate text-lg font-black tracking-tight sm:text-3xl">
              ₹{totalSpent.toLocaleString("en-IN")}
            </p>

            <p className="mt-1 text-[10px] font-semibold text-white/35 sm:text-xs">
              Total Spent
            </p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <a
            href="/my-orders"
            className="group relative overflow-hidden rounded-3xl border border-orange-500/15 bg-gradient-to-br from-orange-500/[0.11] to-white/[0.025] p-5 transition duration-300 hover:-translate-y-1 hover:border-orange-500/30"
          >
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-orange-500/10 blur-3xl" />

            <div className="relative flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-400">
                <PackageIcon />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-black">My Orders</p>

                <p className="mt-1 text-xs text-white/40">
                  {deliveredOrders} delivered • {activeOrders} active
                </p>
              </div>

              <ArrowIcon />
            </div>
          </a>

          <a
            href="/menu"
            className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5 transition duration-300 hover:-translate-y-1 hover:border-orange-500/25"
          >
            <div className="relative flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500/10 text-2xl">
                🍜
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-black">Explore Menu</p>

                <p className="mt-1 text-xs text-white/40">
                  Discover something delicious
                </p>
              </div>

              <ArrowIcon />
            </div>
          </a>
        </div>

        {/* Saved addresses */}
        <section className="mt-6 rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-400">
                <LocationIcon />
              </div>

              <div>
                <h3 className="font-black sm:text-lg">
                  Saved Addresses
                </h3>

                <p className="text-xs text-white/35">
                  Faster checkout with your saved locations
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAddressForm((current) => !current)}
              className="flex items-center justify-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-2.5 text-xs font-black text-orange-400 transition duration-300 hover:bg-orange-500 hover:text-black active:scale-95"
            >
              <PlusIcon />
              {showAddressForm ? "Close" : "Add Address"}
            </button>
          </div>

          {showAddressForm && (
            <div className="mt-5 rounded-2xl border border-white/[0.08] bg-black/20 p-4 sm:p-5">
              <p className="text-sm font-black">Add New Address</p>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {["Home", "Work", "Other"].map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setAddressLabel(label)}
                    className={`rounded-xl border px-2 py-3 text-xs font-bold transition ${
                      addressLabel === label
                        ? "border-orange-500/50 bg-orange-500/10 text-orange-400"
                        : "border-white/10 bg-white/[0.025] text-white/45 hover:bg-white/[0.05]"
                    }`}
                  >
                    {label === "Home"
                      ? "⌂ Home"
                      : label === "Work"
                        ? "▣ Work"
                        : "• Other"}
                  </button>
                ))}
              </div>

              <textarea
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
                placeholder="Enter your complete delivery address..."
                rows={3}
                className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500/40"
              />

              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={useMyLocation}
                  disabled={locationLoading}
                  className="rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-2.5 text-xs font-bold text-orange-400 transition hover:bg-orange-500/20 disabled:opacity-50"
                >
                  {locationLoading
                    ? "Getting location..."
                    : "⌖ Use My Location"}
                </button>

                {latitude !== null && longitude !== null && (
                  <span className="text-xs font-bold text-green-400">
                    ✓ GPS attached
                  </span>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddressForm(false);
                    setAddressText("");
                    setLatitude(null);
                    setLongitude(null);
                    setAddressLabel("Home");
                  }}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-white/45 hover:bg-white/5"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveAddress}
                  disabled={savingAddress}
                  className="rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-black text-black transition hover:bg-orange-400 disabled:opacity-50"
                >
                  {savingAddress ? "Saving..." : "Save Address"}
                </button>
              </div>
            </div>
          )}

          <div className="mt-5 space-y-3">
            {addresses.length === 0 && !showAddressForm ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-5 py-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.035] text-orange-400">
                  <LocationIcon />
                </div>

                <p className="mt-3 text-sm font-bold text-white/55">
                  No saved addresses
                </p>

                <p className="mt-1 text-xs text-white/25">
                  Add one for a faster checkout.
                </p>
              </div>
            ) : (
              addresses.map((savedAddress) => (
                <div
                  key={savedAddress.id}
                  className="group rounded-2xl border border-white/[0.07] bg-black/20 p-4 transition duration-300 hover:border-orange-500/20"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                      <LocationIcon />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-black">
                          {savedAddress.label}
                        </p>

                        {savedAddress.label === "Home" && (
                          <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-green-400">
                            Default
                          </span>
                        )}
                      </div>

                      <p className="mt-1 break-words text-xs leading-5 text-white/40">
                        {savedAddress.address}
                      </p>

                      {savedAddress.latitude !== null &&
                        savedAddress.longitude !== null && (
                          <p className="mt-2 text-[10px] font-bold text-green-400">
                            ✓ GPS location saved
                          </p>
                        )}
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteAddress(savedAddress.id)}
                      disabled={deletingAddress === savedAddress.id}
                      className="shrink-0 rounded-xl p-2 text-red-400/60 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
                      aria-label="Delete address"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Favourites */}
        <section className="mt-5 rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
                <HeartIcon />
              </div>

              <div>
                <h3 className="font-black sm:text-lg">
                  Favourite Food
                </h3>

                <p className="text-xs text-white/35">
                  Your saved favourites
                </p>
              </div>
            </div>

            <a
              href="/menu"
              className="rounded-xl border border-orange-500/20 bg-orange-500/10 px-3 py-2 text-[10px] font-black text-orange-400 transition hover:bg-orange-500 hover:text-black sm:px-4 sm:text-xs"
            >
              Browse Menu
            </a>
          </div>

          {favourites.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-white/10 px-5 py-8 text-center">
              <div className="text-3xl text-white/20">♡</div>

              <p className="mt-3 text-sm font-bold text-white/50">
                Nothing saved yet
              </p>

              <p className="mt-1 text-xs text-white/25">
                Tap the heart on food items to save them here.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {favourites.map((favourite) => (
                <div
                  key={favourite.id}
                  className="group rounded-2xl border border-white/[0.07] bg-black/20 p-3.5 transition duration-300 hover:-translate-y-0.5 hover:border-orange-500/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.035] text-3xl">
                      {favourite.menu_item.emoji}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-black uppercase tracking-wider text-orange-400">
                        {favourite.menu_item.category}
                      </p>

                      <p className="mt-1 truncate text-sm font-black">
                        {favourite.menu_item.name}
                      </p>

                      <p className="mt-1 text-xs font-bold text-white/45">
                        ₹{favourite.menu_item.price}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        deleteFavourite(
                          favourite.id,
                          favourite.menu_item_id
                        )
                      }
                      disabled={deletingFavourite === favourite.id}
                      className="shrink-0 rounded-xl p-2 text-red-400 transition hover:bg-red-500/10 disabled:opacity-40"
                      aria-label="Remove favourite"
                    >
                      <HeartIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Settings */}
        <section className="mt-5 rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-7">
          <button
            type="button"
            onClick={() => {
              setShowSettings((current) => !current);
              setSettingsMessage("");
            }}
            className="flex w-full items-center justify-between gap-4 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                <SettingsIcon />
              </div>

              <div>
                <h3 className="font-black sm:text-lg">
                  Account Settings
                </h3>

                <p className="text-xs text-white/35">
                  Name, email & password
                </p>
              </div>
            </div>

            <span className="text-xl text-white/30">
              {showSettings ? "⌃" : "⌄"}
            </span>
          </button>

          {showSettings && (
            <div className="mt-5 rounded-2xl border border-white/[0.07] bg-black/20 p-4 sm:p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold text-white/50">
                    Full Name
                  </label>

                  <input
                    type="text"
                    value={settingsName}
                    onChange={(e) => setSettingsName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-white/50">
                    Email Address
                  </label>

                  <input
                    type="email"
                    value={settingsEmail}
                    onChange={(e) => setSettingsEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500/40"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-xs font-bold text-white/50">
                  New Password
                </label>

                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave empty to keep current password"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none transition focus:border-orange-500/40"
                />

                <p className="mt-2 text-[10px] text-white/25">
                  Minimum 6 characters.
                </p>
              </div>

              {settingsMessage && (
                <div
                  className={`mt-4 rounded-xl border px-4 py-3 text-xs font-semibold ${
                    settingsMessage.startsWith("✅")
                      ? "border-green-500/20 bg-green-500/10 text-green-400"
                      : "border-red-500/20 bg-red-500/10 text-red-400"
                  }`}
                >
                  {settingsMessage}
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={saveSettings}
                  disabled={savingSettings}
                  className="rounded-xl bg-orange-500 px-5 py-3 text-xs font-black text-black transition hover:bg-orange-400 disabled:opacity-50"
                >
                  {savingSettings ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Logout */}
        <section className="mt-5 overflow-hidden rounded-[28px] border border-red-500/10 bg-gradient-to-br from-red-500/[0.07] to-transparent p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black">
                Ready to leave?
              </p>

              <p className="mt-1 text-xs text-white/35">
                You can safely sign in again anytime.
              </p>
            </div>

            <button
              type="button"
              onClick={logout}
              disabled={loggingOut}
              className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-3 text-xs font-black text-red-400 transition hover:bg-red-500/10 active:scale-95 disabled:opacity-50"
            >
              {loggingOut ? "Signing out..." : "Sign Out"}
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}
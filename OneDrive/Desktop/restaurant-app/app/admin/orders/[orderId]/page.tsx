"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type OrderItem = {
  name: string;
  price: number;
  quantity?: number;
  qty?: number;
  emoji?: string;
};

type Order = {
  id: number;
  order_id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  customer_lat: number | null;
  customer_lng: number | null;
  distance_km: number | null;
  subtotal: number;
  delivery_charge: number;
  total: number;
  status: string;
  items: OrderItem[] | string;
  created_at: string;
};

const statuses = [
  "pending",
  "preparing",
  "ready",
  "out for delivery",
  "delivered",
  "cancelled",
];

const progressStatuses = [
  "pending",
  "preparing",
  "ready",
  "out for delivery",
  "delivered",
];

function parseItems(items: OrderItem[] | string): OrderItem[] {
  if (Array.isArray(items)) {
    return items;
  }

  try {
    const parsed = JSON.parse(items);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getQuantity(item: OrderItem) {
  return item.quantity ?? item.qty ?? 1;
}

function formatDate(date: string) {
  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusClass(status: string) {
  if (status === "pending") {
    return "border-yellow-500/20 bg-yellow-500/10 text-yellow-300";
  }

  if (status === "preparing") {
    return "border-orange-500/20 bg-orange-500/10 text-orange-300";
  }

  if (status === "ready") {
    return "border-blue-500/20 bg-blue-500/10 text-blue-300";
  }

  if (status === "out for delivery") {
    return "border-purple-500/20 bg-purple-500/10 text-purple-300";
  }

  if (status === "delivered") {
    return "border-green-500/20 bg-green-500/10 text-green-300";
  }

  if (status === "cancelled") {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }

  return "border-white/10 bg-white/5 text-white";
}

function displayStatus(status: string) {
  if (status === "pending") return "Order Placed";

  return status
    .split(" ")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

export default function AdminOrderDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const orderId = decodeURIComponent(
    String(params?.orderId || "")
  );

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  const fetchOrder = async () => {
    if (!orderId) return;

    const { data, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();

    if (orderError) {
      console.error("Order fetch error:", orderError);
      setError("Unable to load this order.");
      setLoading(false);
      return;
    }

    if (!data) {
      setError("Order not found.");
      setLoading(false);
      return;
    }

    setOrder(data as Order);
    setLoading(false);
  };

  useEffect(() => {
    const checkAdminAccess = async () => {
      setAuthChecking(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.location.replace("/admin/login");
        return;
      }

      const { data: adminUser, error: adminError } =
        await supabase
          .from("admin_users")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

      if (adminError || !adminUser) {
        console.error(
          "Admin access denied:",
          adminError
        );

        await supabase.auth.signOut({
          scope: "local",
        });

        window.location.replace("/admin/login");
        return;
      }

      setAuthChecking(false);
      await fetchOrder();
    };

    checkAdminAccess();
  }, [orderId]);

  useEffect(() => {
    if (!orderId || authChecking) return;

    const channel = supabase
      .channel(`admin-order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          setOrder(payload.new as Order);
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      fetchOrder();
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [orderId, authChecking]);

  const updateStatus = async (newStatus: string) => {
    if (!order) return;

    setUpdating(true);
    setError("");

    const { data, error: updateError } = await supabase
      .from("orders")
      .update({
        status: newStatus,
      })
      .eq("order_id", order.order_id)
      .select()
      .single();

    if (updateError) {
      console.error(
        "Status update error:",
        updateError
      );

      setError(
        "Failed to update status. Please try again."
      );

      setUpdating(false);
      return;
    }

    setOrder(data as Order);
    setUpdating(false);
  };

  if (authChecking || loading) {
    return (
      <main className="min-h-screen bg-[#0f0d0b] text-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">🍽️</div>

          <p className="text-white/60">
            Loading order...
          </p>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-[#0f0d0b] text-white px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <button
            onClick={() => router.push("/admin")}
            className="mb-6 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/70 transition hover:bg-white/10"
          >
            ← Back to Admin
          </button>

          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center">
            <div className="mb-4 text-5xl">
              ❌
            </div>

            <h1 className="mb-2 text-2xl font-black">
              Order Not Found
            </h1>

            <p className="text-white/60">
              {error || "This order could not be found."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const items = parseItems(order.items);
  const isCancelled =
    order.status === "cancelled";

  const currentStep =
    progressStatuses.indexOf(order.status);

  return (
    <main className="min-h-screen bg-[#0f0d0b] px-4 py-6 text-white md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <button
              onClick={() => router.push("/admin")}
              className="mb-4 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/70 transition hover:bg-white/10"
            >
              ← Back to Admin
            </button>

            <h1 className="text-3xl font-black md:text-4xl">
              Full Order Details
            </h1>

            <p className="mt-1 text-white/50">
              Complete information for {order.order_id}
            </p>
          </div>

          <div
            className={`self-start rounded-2xl border px-5 py-3 text-sm font-black uppercase md:self-center ${statusClass(
              order.status
            )}`}
          >
            {order.status}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-red-300">
            {error}
          </div>
        )}

        {/* ORDER INFO */}
        <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

            <div>
              <p className="text-xs uppercase tracking-widest text-white/40">
                Order ID
              </p>

              <p className="mt-1 text-2xl font-black text-orange-300">
                {order.order_id}
              </p>

              <p className="mt-2 text-sm text-white/50">
                Placed on {formatDate(order.created_at)}
              </p>
            </div>

            <div className="w-full md:w-72">
              <label className="mb-2 block text-xs uppercase tracking-widest text-white/40">
                Update Order Status
              </label>

              <select
                value={order.status}
                disabled={updating}
                onChange={(e) =>
                  updateStatus(e.target.value)
                }
                className="w-full rounded-xl border border-white/10 bg-[#171311] px-4 py-3 font-bold text-white outline-none transition focus:border-orange-500/50 disabled:opacity-50"
              >
                {statuses.map((status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status.toUpperCase()}
                  </option>
                ))}
              </select>

              {updating && (
                <p className="mt-2 text-xs text-orange-300">
                  Updating status...
                </p>
              )}
            </div>
          </div>
        </section>

        {/* PROGRESS */}
        {!isCancelled && (
          <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="mb-6 text-xl font-black">
              Order Progress
            </h2>

            <div className="grid gap-3 md:grid-cols-5">
              {progressStatuses.map(
                (status, index) => {
                  const completed =
                    currentStep >= index &&
                    currentStep !== -1;

                  const active =
                    order.status === status;

                  return (
                    <div
                      key={status}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <div
                        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full border font-black ${
                          completed
                            ? "border-orange-500/40 bg-orange-500/20 text-orange-300"
                            : "border-white/10 bg-white/5 text-white/30"
                        }`}
                      >
                        {completed
                          ? "✓"
                          : index + 1}
                      </div>

                      <p
                        className={`text-sm font-black ${
                          active
                            ? "text-orange-300"
                            : completed
                            ? "text-white"
                            : "text-white/30"
                        }`}
                      >
                        {displayStatus(status)}
                      </p>

                      {active && (
                        <p className="mt-1 text-xs text-orange-300/60">
                          Current status
                        </p>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          </section>
        )}

        {/* CANCELLED */}
        {isCancelled && (
          <section className="mb-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
            <div className="flex items-center gap-4">
              <div className="text-4xl">
                ❌
              </div>

              <div>
                <h2 className="text-xl font-black text-red-300">
                  Order Cancelled
                </h2>

                <p className="mt-1 text-sm text-white/60">
                  This order has been cancelled.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* CUSTOMER + DELIVERY */}
        <div className="mb-6 grid gap-6 lg:grid-cols-2">

          {/* CUSTOMER */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="mb-5 text-xl font-black">
              👤 Customer Details
            </h2>

            <div className="space-y-5">

              <div>
                <p className="text-xs uppercase tracking-widest text-white/40">
                  Customer Name
                </p>

                <p className="mt-1 text-lg font-bold">
                  {order.customer_name}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-widest text-white/40">
                  Phone Number
                </p>

                <a
                  href={`tel:${order.customer_phone}`}
                  className="mt-1 inline-block font-bold text-orange-300 transition hover:text-orange-200"
                >
                  📞 {order.customer_phone}
                </a>
              </div>

            </div>
          </section>

          {/* DELIVERY */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="mb-5 text-xl font-black">
              📍 Delivery Details
            </h2>

            <div className="space-y-5">

              <div>
                <p className="text-xs uppercase tracking-widest text-white/40">
                  Delivery Address
                </p>

                <p className="mt-1 leading-relaxed font-bold">
                  {order.delivery_address}
                </p>
              </div>

              {order.distance_km !== null && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/40">
                    Distance
                  </p>

                  <p className="mt-1 font-bold">
                    {Number(
                      order.distance_km
                    ).toFixed(2)}{" "}
                    km
                  </p>
                </div>
              )}

              {order.customer_lat !== null &&
                order.customer_lng !== null && (
                  <a
                    href={`https://www.google.com/maps?q=${order.customer_lat},${order.customer_lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-xl bg-orange-500 px-5 py-3 font-black text-black transition hover:bg-orange-400"
                  >
                    📍 Open Customer Location
                  </a>
                )}

            </div>
          </section>
        </div>

        {/* ITEMS */}
        <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="mb-5 text-xl font-black">
            🍜 Ordered Items
          </h2>

          {items.length === 0 ? (
            <p className="text-white/50">
              No item details available.
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => {
                const quantity =
                  getQuantity(item);

                const price =
                  Number(item.price) || 0;

                return (
                  <div
                    key={`${item.name}-${index}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 text-2xl">
                        {item.emoji || "🍽️"}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-black">
                          {item.name}
                        </p>

                        <p className="text-sm text-white/50">
                          ₹{price} × {quantity}
                        </p>
                      </div>

                    </div>

                    <p className="shrink-0 text-lg font-black">
                      ₹{price * quantity}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* BILL */}
        <section className="mb-6 rounded-3xl border border-orange-500/20 bg-orange-500/[0.05] p-6">
          <h2 className="mb-5 text-xl font-black">
            💰 Payment Summary
          </h2>

          <div className="ml-auto max-w-md space-y-3">

            <div className="flex justify-between text-white/60">
              <span>Subtotal</span>

              <span className="font-bold text-white">
                ₹{Number(
                  order.subtotal
                ).toFixed(0)}
              </span>
            </div>

            <div className="flex justify-between text-white/60">
              <span>Delivery Charge</span>

              <span className="font-bold text-white">
                ₹{Number(
                  order.delivery_charge
                ).toFixed(0)}
              </span>
            </div>

            <div className="flex justify-between border-t border-white/10 pt-4">
              <span className="text-lg font-black">
                Total
              </span>

              <span className="text-2xl font-black text-orange-300">
                ₹{Number(
                  order.total
                ).toFixed(0)}
              </span>
            </div>

          </div>
        </section>

        {/* ACTIONS */}
        <div className="flex flex-col gap-3 sm:flex-row">

          <button
            onClick={() => router.push("/admin")}
            className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-black text-white transition hover:bg-white/10"
          >
            ← Back to All Orders
          </button>

          {order.customer_phone && (
            <a
              href={`tel:${order.customer_phone}`}
              className="rounded-xl bg-orange-500 px-6 py-3 text-center font-black text-black transition hover:bg-orange-400"
            >
              📞 Call Customer
            </a>
          )}

        </div>

      </div>
    </main>
  );
}
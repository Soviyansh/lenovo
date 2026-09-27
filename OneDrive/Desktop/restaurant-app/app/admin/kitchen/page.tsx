"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type OrderItem = {
  name: string;
  price: number;
  quantity: number;
  emoji?: string;
};

type Order = {
  id: string;
  order_id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  distance_km: number | null;
  subtotal: number;
  delivery_charge: number;
  total: number;
  status: string;
  payment_method: string | null;
  order_type?: "asap" | "scheduled" | string | null;
  scheduled_for?: string | null;
  items: OrderItem[];
  created_at: string;
};

const columns = [
  {
    key: "pending",
    title: "New Orders",
    icon: "🔔",
    description: "Confirm and start",
  },
  {
    key: "preparing",
    title: "Preparing",
    icon: "🍳",
    description: "In the kitchen",
  },
  {
    key: "ready",
    title: "Ready",
    icon: "📦",
    description: "Waiting for pickup",
  },
  {
    key: "out for delivery",
    title: "Out for Delivery",
    icon: "🛵",
    description: "On the way",
  },
] as const;

const nextStatus: Record<string, string> = {
  pending: "preparing",
  preparing: "ready",
  ready: "out for delivery",
  "out for delivery": "delivered",
};

const statusLabel: Record<string, string> = {
  pending: "Start Preparing",
  preparing: "Mark Ready",
  ready: "Send for Delivery",
  "out for delivery": "Mark Delivered",
};

export default function KitchenCommandCenter() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [live, setLive] = useState(false);
  const [error, setError] = useState("");

  const fetchOrders = async () => {
    const { data, error: fetchError } = await supabase
      .from("orders")
      .select(
        "id, order_id, customer_name, customer_phone, delivery_address, distance_km, subtotal, delivery_charge, total, status, payment_method, order_type, scheduled_for, items, created_at"
      )
      .order("created_at", { ascending: true });

    if (fetchError) {
      console.error("Kitchen orders error:", fetchError);
      setError("Unable to load orders. Please refresh.");
      return;
    }

    setOrders((data || []) as Order[]);
    setError("");
  };

  useEffect(() => {
    let mounted = true;

    const checkAdmin = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: adminUser, error: adminError } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (adminError || !adminUser) {
        window.location.href = "/";
        return;
      }

      if (!mounted) return;

      setIsAdmin(true);
      setAuthChecking(false);
      await fetchOrders();
      setLoading(false);
    };

    checkAdmin();

    const channel = supabase
      .channel("kitchen-live-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          setLive(true);

          if (payload.eventType === "INSERT") {
            setOrders((current) => [
              ...current,
              payload.new as Order,
            ]);
          } else if (payload.eventType === "UPDATE") {
            setOrders((current) =>
              current.map((order) =>
                order.id === payload.new.id
                  ? (payload.new as Order)
                  : order
              )
            );
          } else if (payload.eventType === "DELETE") {
            setOrders((current) =>
              current.filter((order) => order.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
      });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const activeOrders = useMemo(
    () =>
      orders
        .filter((order) =>
          columns.some((column) => column.key === order.status?.toLowerCase())
        )
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime()
        ),
    [orders]
  );

  const isScheduledOrder = (order: Order) =>
    order.order_type === "scheduled" && !!order.scheduled_for;

  const isScheduleReady = (order: Order) => {
    if (!isScheduledOrder(order)) return true;
    return new Date(order.scheduled_for as string).getTime() <= Date.now();
  };

  const formatScheduledTime = (value: string) =>
    new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const updateStatus = async (order: Order) => {
    const current = order.status.toLowerCase();
    const newStatus = nextStatus[current];

    if (!newStatus) return;

    if (!isScheduleReady(order)) {
      setError(
        `Order ${order.order_id} is scheduled for ${formatScheduledTime(
          order.scheduled_for as string
        )}. It will become active at that time.`
      );
      return;
    }

    setUpdatingId(order.id);
    setError("");

    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", order.id);

    if (updateError) {
      console.error("Kitchen status update error:", updateError);
      setError(`Could not update ${order.order_id}.`);
    } else {
      setOrders((currentOrders) =>
        currentOrders.map((item) =>
          item.id === order.id
            ? { ...item, status: newStatus }
            : item
        )
      );
    }

    setUpdatingId(null);
  };

  const openWhatsApp = (order: Order) => {
    const digits = order.customer_phone.replace(/\D/g, "");
    const phone = digits.startsWith("91") ? digits : `91${digits}`;

    const message = [
      `Hello ${order.customer_name},`,
      "",
      `Your order ${order.order_id} is now ${order.status}.`,
      `Total: ₹${order.total}`,
      "",
      "YASH SAINI RESTAURANT",
    ].join("\n");

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  if (authChecking || !isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0f0d0b] text-white">
        <div className="text-center">
          <div className="text-5xl">👨‍🍳</div>
          <p className="mt-4 text-white/50">Opening Kitchen Command Center...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f0d0b] px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <a
              href="/admin"
              className="text-sm font-bold text-orange-400 transition hover:text-orange-300"
            >
              ← Back to Admin Dashboard
            </a>

            <div className="mt-3 flex items-center gap-3">
              <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-3 text-2xl">
                👨‍🍳
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-400">
                  YASH SAINI RESTAURANT
                </p>
                <h1 className="text-3xl font-black md:text-4xl">
                  Kitchen Command Center
                </h1>
              </div>
            </div>

            <p className="mt-3 text-sm text-white/45">
              Live order flow for the kitchen and delivery team.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm">
              <span
                className={`mr-2 inline-block h-2 w-2 rounded-full ${
                  live ? "bg-green-400" : "bg-red-400"
                }`}
              />
              {live ? "Live" : "Connecting..."}
            </div>

            <button
              type="button"
              onClick={() => {
                setLoading(true);
                fetchOrders().finally(() => setLoading(false));
              }}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold transition hover:bg-white/10"
            >
              🔄 Refresh
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {columns.map((column) => {
            const count = activeOrders.filter(
              (order) => order.status.toLowerCase() === column.key
            ).length;

            return (
              <div
                key={column.key}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl">{column.icon}</span>
                  <span className="text-2xl font-black text-orange-400">
                    {count}
                  </span>
                </div>
                <p className="mt-2 text-sm font-bold">{column.title}</p>
                <p className="mt-1 text-xs text-white/35">{column.description}</p>
              </div>
            );
          })}
        </div>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-12 text-center text-white/50">
            Loading live orders...
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-4">
            {columns.map((column) => {
              const columnOrders = activeOrders.filter(
                (order) => order.status.toLowerCase() === column.key
              );

              return (
                <section
                  key={column.key}
                  className="min-h-[420px] rounded-3xl border border-white/10 bg-white/[0.025] p-3"
                >
                  <div className="mb-3 flex items-center justify-between rounded-2xl bg-white/[0.04] p-4">
                    <div>
                      <h2 className="font-black">
                        {column.icon} {column.title}
                      </h2>
                      <p className="mt-1 text-xs text-white/35">
                        {column.description}
                      </p>
                    </div>
                    <span className="rounded-full bg-orange-500/15 px-3 py-1 text-sm font-black text-orange-300">
                      {columnOrders.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {columnOrders.map((order) => {
                      const ageMinutes = Math.max(
                        0,
                        Math.floor(
                          (Date.now() -
                            new Date(order.created_at).getTime()) /
                            60000
                        )
                      );

                      return (
                        <article
                          key={order.id}
                          className="rounded-2xl border border-white/10 bg-[#14110f] p-4 shadow-lg shadow-black/10"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-lg font-black text-orange-400">
                                #{order.order_id}
                              </p>
                              <p className="mt-1 text-sm font-bold">
                                {order.customer_name}
                              </p>

                              {isScheduledOrder(order) && (
                                <div
                                  className={`mt-2 inline-flex rounded-lg px-2.5 py-1 text-xs font-bold ${
                                    isScheduleReady(order)
                                      ? "bg-green-500/10 text-green-300"
                                      : "bg-orange-500/10 text-orange-300"
                                  }`}
                                >
                                  {isScheduleReady(order)
                                    ? "🟢 Ready to start"
                                    : "🕐 Scheduled"}{" "}
                                  ·{" "}
                                  {formatScheduledTime(
                                    order.scheduled_for as string
                                  )}
                                </div>
                              )}
                            </div>

                            <span className="rounded-lg bg-white/5 px-2 py-1 text-xs font-bold text-white/50">
                              {isScheduledOrder(order)
                                ? isScheduleReady(order)
                                  ? "Ready"
                                  : "Waiting"
                                : ageMinutes < 1
                                ? "Just now"
                                : `${ageMinutes}m ago`}
                            </span>
                          </div>

                          <div className="mt-4 rounded-xl bg-black/20 p-3">
                            <div className="space-y-2">
                              {order.items?.map((item, index) => (
                                <div
                                  key={`${order.id}-${index}`}
                                  className="flex items-start justify-between gap-3 text-sm"
                                >
                                  <span className="font-semibold">
                                    <span className="mr-2 text-orange-400">
                                      {item.quantity}×
                                    </span>
                                    {item.emoji ? `${item.emoji} ` : ""}
                                    {item.name}
                                  </span>
                                  <span className="shrink-0 text-white/45">
                                    ₹{item.price * item.quantity}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="mt-3 space-y-1 text-xs text-white/40">
                            <p className="truncate">
                              📍 {order.delivery_address}
                            </p>
                            <p>
                              💳{" "}
                              {order.payment_method === "online"
                                ? "Paid Online"
                                : "Cash on Delivery"}{" "}
                              · ₹{order.total}
                            </p>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              disabled={
                                updatingId === order.id ||
                                !isScheduleReady(order)
                              }
                              onClick={() => updateStatus(order)}
                              className="rounded-xl bg-orange-500 px-3 py-2.5 text-xs font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {updatingId === order.id
                                ? "Updating..."
                                : !isScheduleReady(order)
                                ? "🕐 Waiting for Schedule"
                                : statusLabel[order.status.toLowerCase()]}
                            </button>

                            <button
                              type="button"
                              onClick={() => openWhatsApp(order)}
                              className="rounded-xl bg-emerald-500/10 px-3 py-2.5 text-xs font-black text-emerald-300 transition hover:bg-emerald-500/20"
                            >
                              💬 WhatsApp
                            </button>
                          </div>
                        </article>
                      );
                    })}

                    {columnOrders.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                        <p className="text-2xl opacity-40">{column.icon}</p>
                        <p className="mt-2 text-sm font-semibold text-white/30">
                          No orders here
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

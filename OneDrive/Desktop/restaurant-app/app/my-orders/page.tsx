"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Notification = {
  id: number;
  order_id: string | null;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

type Order = {
  id: number;
  order_id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  subtotal: number;
  delivery_charge: number;
  total: number;
  status: string;
  items: unknown;
  created_at: string;
  payment_method: string | null;
  razorpay_payment_id: string | null;
  refund_status: string | null;
  order_type?: "asap" | "scheduled" | string | null;
  scheduled_for?: string | null;
};

const statuses = [
  "pending",
  "preparing",
  "ready",
  "out for delivery",
  "delivered",
];

function formatStatus(status: string) {
  return status
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getItems(items: unknown): {
  name: string;
  quantity: number;
  price: number;
}[] {
  if (!Array.isArray(items)) return [];

  return items.map((item: any) => ({
    name: item?.name ?? "Item",
    quantity: Number(item?.quantity ?? 1),
    price: Number(item?.price ?? 0),
  }));
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [clearingNotifications, setClearingNotifications] = useState(false);

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.location.href = "/login";
        return;
      }

      const { data, error: ordersError } = await supabase
        .from("orders")
        .select(
          "id, order_id, customer_name, customer_phone, delivery_address, subtotal, delivery_charge, total, status, items, created_at, payment_method, razorpay_payment_id, refund_status, order_type, scheduled_for"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (ordersError) {
        console.error("My orders error:", ordersError);
        setError("Unable to load your orders. Please try again.");
        setOrders([]);
      } else {
        setOrders((data as Order[]) || []);
      }

      setLoading(false);
    };

    const loadNotifications = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error: notificationError } = await supabase
        .from("notifications")
        .select("id, order_id, title, message, type, is_read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (notificationError) {
        console.error("Notifications error:", notificationError);
      } else {
        setNotifications((data as Notification[]) || []);
      }

      setNotificationsLoading(false);
    };

    loadOrders();
    loadNotifications();

    let notificationChannel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      notificationChannel = supabase
        .channel(`customer-notifications-${user.id}-${Date.now()}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            setNotifications((current) => [
              newNotification,
              ...current.filter((item) => item.id !== newNotification.id),
            ]);
          }
        )
        .subscribe();
    });

    return () => {
      if (notificationChannel) {
        supabase.removeChannel(notificationChannel);
      }
    };
  }, []);

  const markNotificationRead = async (notification: Notification) => {
    if (notification.is_read) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notification.id);

    if (!error) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, is_read: true }
            : item
        )
      );
    }
  };

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  const visibleNotifications = showAllNotifications
    ? notifications
    : notifications.slice(0, 3);

  const clearNotifications = async () => {
    const confirmed = window.confirm(
      "Delete all notifications from your account?"
    );

    if (!confirmed) return;

    setClearingNotifications(true);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setClearingNotifications(false);
      return;
    }

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      console.error("Clear notifications error:", error);
      setError("Unable to clear notifications. Please try again.");
    } else {
      setNotifications([]);
      setShowAllNotifications(false);
    }

    setClearingNotifications(false);
  };

  const activeOrders = orders.filter((order) => {
    const status = order.status.trim().toLowerCase();
    return status !== "delivered" && status !== "cancelled";
  });

  const previousOrders = orders.filter((order) => {
    const status = order.status.trim().toLowerCase();
    return status === "delivered" || status === "cancelled";
  });

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

  const renderOrderCard = (order: Order) => {
    const orderItems = getItems(order.items);
    const currentIndex = statuses.indexOf(order.status.trim().toLowerCase());
    const normalizedStatus = order.status.trim().toLowerCase();
    const isPending = normalizedStatus === "pending";
    const isCancelled = normalizedStatus === "cancelled";
    const isDelivered = normalizedStatus === "delivered";

    return (
      <div
        key={order.id}
        className="rounded-3xl border border-white/10 bg-[#171411] p-5 sm:p-7"
      >
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-orange-500">
              Order ID
            </p>
            <h3 className="mt-1 text-xl font-black">{order.order_id}</h3>
            <p className="mt-1 text-xs text-white/35">
              {new Date(order.created_at).toLocaleString("en-IN")}
            </p>

            {isScheduledOrder(order) && (
              <div
                className={`mt-2 inline-flex rounded-lg px-3 py-1.5 text-xs font-bold ${
                  isScheduleReady(order)
                    ? "bg-green-500/10 text-green-300"
                    : "bg-orange-500/10 text-orange-300"
                }`}
              >
                {isScheduleReady(order) ? "🟢 Ready to start" : "🕐 Scheduled"}{" "}
                · {formatScheduledTime(order.scheduled_for as string)}
              </div>
            )}
          </div>

          <div
            className={`rounded-full px-4 py-2 text-sm font-bold ${
              isCancelled
                ? "bg-red-500/10 text-red-400"
                : isDelivered
                ? "bg-green-500/10 text-green-400"
                : "bg-orange-500/10 text-orange-400"
            }`}
          >
            {formatStatus(order.status)}
          </div>
        </div>

        {isScheduledOrder(order) && (
          <div
            className={`mt-5 rounded-2xl border p-4 ${
              isScheduleReady(order)
                ? "border-green-500/20 bg-green-500/5"
                : "border-orange-500/20 bg-orange-500/5"
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-widest text-white/40">
              Order Timing
            </p>
            <p className="mt-1 text-base font-black">
              🕐 Scheduled for {formatScheduledTime(order.scheduled_for as string)}
            </p>
            <p className="mt-1 text-xs text-white/45">
              {isScheduleReady(order)
                ? "Your scheduled time has arrived. The restaurant can now start preparing your order."
                : "Your order is confirmed and will become active at the scheduled time."}
            </p>
          </div>
        )}

        <div className="mt-5">
          <p className="mb-3 text-sm font-bold text-white/70">Items</p>
          <div className="space-y-2">
            {orderItems.length > 0 ? (
              orderItems.map((item, index) => (
                <div
                  key={`${item.name}-${index}`}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 text-sm"
                >
                  <span className="text-white/70">
                    {item.name} × {item.quantity}
                  </span>
                  <span className="font-bold">
                    ₹{item.price * item.quantity}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-white/40">Order items unavailable.</p>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-white/5 p-4">
          <p className="text-sm text-white/40">Delivery Address</p>
          <p className="mt-1 text-sm text-white/70">
            {order.delivery_address}
          </p>
        </div>

        <div className="mt-5 space-y-2 border-t border-white/10 pt-5 text-sm">
          <div className="flex justify-between text-white/50">
            <span>Subtotal</span>
            <span>₹{order.subtotal}</span>
          </div>

          <div className="flex justify-between text-white/50">
            <span>Delivery</span>
            <span>
              {order.delivery_charge === 0
                ? "FREE"
                : `₹${order.delivery_charge}`}
            </span>
          </div>

          <div className="flex justify-between text-lg font-black">
            <span>Total</span>
            <span className="text-orange-500">₹{order.total}</span>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-white/40">Payment</p>
              <p className="mt-1 text-sm font-bold">
                {order.payment_method?.toLowerCase() === "online"
                  ? "💳 Paid Online"
                  : "💵 Cash on Delivery"}
              </p>
            </div>

            {order.payment_method?.toLowerCase() === "online" && (
              <span className="rounded-full bg-green-500/10 px-3 py-1 text-[10px] font-bold text-green-300">
                {order.razorpay_payment_id ? "PAID" : "ONLINE"}
              </span>
            )}
          </div>

          {isCancelled &&
            order.payment_method?.toLowerCase() === "online" && (
              <div className="mt-3 border-t border-white/10 pt-3">
                {order.refund_status?.toLowerCase() === "processed" ? (
                  <>
                    <p className="text-sm font-bold text-green-300">
                      💸 Payment Refunded
                    </p>
                    <p className="mt-1 text-xs text-white/40">
                      Your online payment has been refunded through Razorpay.
                    </p>
                  </>
                ) : order.refund_status?.toLowerCase() === "failed" ? (
                  <>
                    <p className="text-sm font-bold text-red-300">
                      ⚠️ Refund Failed
                    </p>
                    <p className="mt-1 text-xs text-white/40">
                      Please contact the restaurant for help with your refund.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-yellow-300">
                      ⏳ Refund Processing
                    </p>
                    <p className="mt-1 text-xs text-white/40">
                      Your online payment is being processed for refund through Razorpay.
                    </p>
                  </>
                )}
              </div>
            )}
        </div>

        {!isCancelled && !isDelivered && (
          <div className="mt-6">
            <div className="mb-3 flex justify-between text-xs text-white/40">
              <span>Order Placed</span>
              <span>Delivered</span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-orange-500 transition-all"
                style={{
                  width:
                    currentIndex >= 0
                      ? `${((currentIndex + 1) / statuses.length) * 100}%`
                      : "20%",
                }}
              />
            </div>
          </div>
        )}

        {!isCancelled && !isDelivered && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href="/order-tracking"
              onClick={() => {
                localStorage.setItem("last-order-id", order.order_id);
              }}
              className="block w-full rounded-xl bg-orange-500 px-5 py-3 text-center font-bold text-black transition hover:bg-orange-400"
            >
              Track This Order →
            </a>

            {isPending && (
              <button
                type="button"
                onClick={() => cancelOrder(order)}
                disabled={cancellingOrderId === order.id}
                className="w-full rounded-xl border border-red-500/30 bg-red-500/5 px-5 py-3 font-bold text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cancellingOrderId === order.id
                  ? "Cancelling..."
                  : "Cancel Order"}
              </button>
            )}
          </div>
        )}

        {isDelivered && (
          <div className="mt-6 rounded-2xl border border-green-500/20 bg-green-500/5 p-4 text-center">
            <p className="text-sm font-semibold text-green-300">
              🎉 Order delivered successfully.
            </p>
          </div>
        )}

        {isCancelled && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-center">
            <p className="text-sm font-semibold text-red-300">
              ❌ This order has been cancelled.
            </p>
          </div>
        )}
      </div>
    );
  };

  const cancelOrder = async (order: Order) => {
    const normalizedStatus = order.status.trim().toLowerCase();

    if (normalizedStatus !== "pending") {
      alert("This order can no longer be cancelled.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to cancel order ${order.order_id}?`
    );

    if (!confirmed) return;

    setCancellingOrderId(order.id);
    setError("");

    const { data, error: cancelError } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", order.id)
      .eq("status", "pending")
      .select("*")
      .single();

    if (cancelError) {
      console.error("Cancel order error:", cancelError);
      setError(
        "Unable to cancel this order. It may already be processing."
      );
    } else if (data) {
      setOrders((currentOrders) =>
        currentOrders.map((currentOrder) =>
          currentOrder.id === order.id
            ? { ...currentOrder, status: "cancelled" }
            : currentOrder
        )
      );
    }

    setCancellingOrderId(null);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0f0d0b] text-white">
        <div className="text-center">
          <div className="text-5xl">📦</div>
          <p className="mt-4 text-sm text-white/50">
            Loading your orders...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f0d0b] text-white">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0f0d0b]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <a href="/" className="block">
            <h1 className="text-xl font-black tracking-tight sm:text-2xl">
              YASH <span className="text-orange-500">SAINI</span>
            </h1>
            <p className="text-[10px] text-white/50 sm:text-xs">
              Fresh • Fast • Delicious
            </p>
          </a>

          <div className="flex items-center gap-2">
            <a
              href="/menu"
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-orange-500/30 hover:text-orange-500"
            >
              🍜 Menu
            </a>

            <a
              href="/profile"
              className="rounded-full bg-orange-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-orange-400"
            >
              👤 Profile
            </a>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-5xl px-4 py-10 md:px-8 md:py-16">
        <div className="mb-10">
          <p className="text-sm font-bold uppercase tracking-widest text-orange-500">
            Account
          </p>

          <h2 className="mt-2 text-4xl font-black sm:text-5xl">
            My Orders
          </h2>

          <p className="mt-3 text-white/50">
            View all your current and previous orders.
          </p>
        </div>

        {/* NOTIFICATIONS */}
        <section className="mb-8 rounded-3xl border border-white/10 bg-[#171411] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-orange-500">
                Notifications
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-black">🔔 Updates</h3>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-black text-white">
                    {unreadCount} New
                  </span>
                )}
              </div>
            </div>

            {notifications.length > 0 && (
              <button
                type="button"
                onClick={clearNotifications}
                disabled={clearingNotifications}
                className="shrink-0 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-[11px] font-bold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
              >
                {clearingNotifications ? "Clearing..." : "Clear"}
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-white/10 p-4 text-center text-sm text-white/40">
              No notifications yet.
            </div>
          ) : (
            <>
              <div className="mt-4 space-y-2">
                {visibleNotifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => markNotificationRead(notification)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                      notification.is_read
                        ? "border-white/10 bg-white/[0.03]"
                        : "border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="shrink-0 text-lg">
                        {notification.type === "cancelled"
                          ? "❌"
                          : notification.type === "refund"
                          ? "💸"
                          : "🔔"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-bold">
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-white/50">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-[10px] text-white/25">
                          {new Date(notification.created_at).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {notifications.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllNotifications((value) => !value)}
                  className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  {showAllNotifications
                    ? "▲ Show fewer notifications"
                    : `▼ View all ${notifications.length} notifications`}
                </button>
              )}
            </>
          )}
        </section>

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-300">
            {error}
          </div>
        )}

        {!error && orders.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-[#171411] p-10 text-center">
            <div className="text-6xl">🛒</div>

            <h3 className="mt-5 text-2xl font-black">
              No orders yet
            </h3>

            <p className="mt-2 text-white/45">
              Your orders will appear here after you place your first order.
            </p>

            <a
              href="/menu"
              className="mt-6 inline-block rounded-xl bg-orange-500 px-6 py-3 font-bold text-black transition hover:bg-orange-400"
            >
              Browse Menu →
            </a>
          </div>
        )}

        {orders.length > 0 && (
          <div className="space-y-10">
            {activeOrders.length > 0 && (
              <section>
                <div className="mb-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-orange-500">
                    Live
                  </p>
                  <h3 className="mt-1 text-2xl font-black">Active Orders</h3>
                  <p className="mt-1 text-sm text-white/40">
                    Orders that are active, being prepared, delivered, or waiting for their scheduled time.
                  </p>
                </div>

                <div className="space-y-5">
                  {activeOrders.map(renderOrderCard)}
                </div>
              </section>
            )}

            {previousOrders.length > 0 && (
              <section>
                <div className="mb-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-white/40">
                    History
                  </p>
                  <h3 className="mt-1 text-2xl font-black">Previous Orders</h3>
                  <p className="mt-1 text-sm text-white/40">
                    Delivered and cancelled orders from your history.
                  </p>
                </div>

                <div className="space-y-5">
                  {previousOrders.map(renderOrderCard)}
                </div>
              </section>
            )}
          </div>
        )}

      </section>

      <footer className="border-t border-white/10 bg-[#0b0908] px-4 py-6 text-center text-xs text-white/30">
        © {new Date().getFullYear()} YASH SAINI RESTAURANT. All rights reserved.
      </footer>
    </main>
  );
}

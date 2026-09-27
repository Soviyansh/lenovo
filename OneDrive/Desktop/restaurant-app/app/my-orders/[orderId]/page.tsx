"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type OrderItem = {
  name: string;
  price: number;
  quantity: number;
  emoji?: string;
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
  payment_method?: "cod" | "online" | string | null;
  razorpay_payment_id?: string | null;
  razorpay_refund_id?: string | null;
  refund_status?: string | null;
};

const STATUS_STEPS = [
  {
    status: "pending",
    title: "Order Placed",
    emoji: "📝",
    description: "Your order has been received.",
  },
  {
    status: "preparing",
    title: "Preparing",
    emoji: "👨‍🍳",
    description: "Our kitchen is preparing your food.",
  },
  {
    status: "ready",
    title: "Ready",
    emoji: "🍽️",
    description: "Your order is ready.",
  },
  {
    status: "out for delivery",
    title: "Out for Delivery",
    emoji: "🛵",
    description: "Your food is on the way.",
  },
  {
    status: "delivered",
    title: "Delivered",
    emoji: "🎉",
    description: "Enjoy your meal!",
  },
];

function getOrderItems(items: unknown): OrderItem[] {
  if (!Array.isArray(items)) return [];

  return items.map((item: any) => ({
    name: item?.name ?? "Item",
    price: Number(item?.price ?? 0),
    quantity: Number(item?.quantity ?? 1),
    emoji: item?.emoji ?? "🍽️",
  }));
}

function formatStatus(status: string) {
  return status
    .trim()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function OrderDetailsPage() {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [liveConnected, setLiveConnected] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadOrder = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (userError || !user) {
        window.location.href = "/login";
        return;
      }

      const pathParts = window.location.pathname.split("/");
      const orderId = decodeURIComponent(pathParts[pathParts.length - 1] || "");

      if (!orderId) {
        setErrorMessage("Order ID is missing.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_id, customer_name, customer_phone, delivery_address, subtotal, delivery_charge, total, status, items, created_at, payment_method, razorpay_payment_id, razorpay_refund_id, refund_status"
        )
        .eq("order_id", orderId)
        .eq("user_id", user.id)
        .single();

      if (!mounted) return;

      if (error || !data) {
        console.error("Order details error:", error);
        setErrorMessage(
          "We couldn't find this order in your account."
        );
        setLoading(false);
        return;
      }

      setOrder(data as Order);
      setLoading(false);

      const channel = supabase
        .channel(`order-details-${orderId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "orders",
            filter: `order_id=eq.${orderId}`,
          },
          (payload) => {
            if (!mounted) return;

            const updated = payload.new as Order;

            if (updated.order_id === orderId) {
              setOrder((current) => {
                if (!current) return current;
                return {
                  ...current,
                  status: updated.status,
                  payment_method: updated.payment_method,
                  razorpay_payment_id: updated.razorpay_payment_id,
                  razorpay_refund_id: updated.razorpay_refund_id,
                  refund_status: updated.refund_status,
                };
              });
            }
          }
        )
        .subscribe((status) => {
          if (!mounted) return;
          setLiveConnected(status === "SUBSCRIBED");
        });

      const pollingInterval = window.setInterval(async () => {
        if (!mounted) return;

        const { data: latestData, error: latestError } = await supabase
          .from("orders")
          .select(
            "id, order_id, customer_name, customer_phone, delivery_address, subtotal, delivery_charge, total, status, items, created_at, payment_method, razorpay_payment_id, razorpay_refund_id, refund_status"
          )
          .eq("order_id", orderId)
          .eq("user_id", user.id)
          .single();

        if (!mounted || latestError || !latestData) return;

        setOrder(latestData as Order);
      }, 5000);

      return () => {
        window.clearInterval(pollingInterval);
        supabase.removeChannel(channel);
      };
    };

    let cleanup: (() => void) | undefined;

    loadOrder().then((fn) => {
      cleanup = fn;
    });

    return () => {
      mounted = false;
      cleanup?.();
    };
  }, []);

  const formatDate = (date: string) =>
    new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0f0d0b] text-white">
        <div className="text-center">
          <div className="text-5xl">📦</div>
          <p className="mt-4 text-white/50">Loading order details...</p>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0f0d0b] px-4 text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#171310] p-8 text-center">
          <div className="text-5xl">📦</div>
          <h1 className="mt-5 text-2xl font-black">Order Not Found</h1>
          <p className="mt-3 text-white/50">
            {errorMessage || "This order could not be found."}
          </p>

          <a
            href="/my-orders"
            className="mt-6 inline-block rounded-xl bg-orange-500 px-6 py-3 font-bold text-black"
          >
            Back to My Orders
          </a>
        </div>
      </main>
    );
  }

  const normalizedStatus = order.status.trim().toLowerCase();
  const isCancelled = normalizedStatus === "cancelled";
  const isDelivered = normalizedStatus === "delivered";
  const isOnlinePayment = order.payment_method === "online";
  const refundStatus = String(order.refund_status || "").trim().toLowerCase();
  const hasRefund = Boolean(order.razorpay_refund_id || refundStatus);
  const currentStepIndex = STATUS_STEPS.findIndex(
    (step) => step.status === normalizedStatus
  );
  const orderItems = getOrderItems(order.items);

  return (
    <main className="min-h-screen bg-[#0f0d0b] text-white">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0f0d0b]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <a href="/" className="block">
            <h1 className="text-xl font-black sm:text-2xl">
              YASH <span className="text-orange-500">SAINI</span>
            </h1>
            <p className="text-[10px] text-white/50 sm:text-xs">
              Fresh • Fast • Delicious
            </p>
          </a>

          <div className="flex gap-2">
            <a
              href="/my-orders"
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white/80 hover:border-orange-500/30"
            >
              ← My Orders
            </a>
            <a
              href="/menu"
              className="hidden rounded-full bg-orange-500 px-4 py-2 text-sm font-bold text-black sm:block"
            >
              🍜 Menu
            </a>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-4xl px-4 py-10 md:px-8 md:py-14">
        <div className="mb-8 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-orange-500">
            Order Details
          </p>
          <h2 className="mt-2 text-3xl font-black sm:text-4xl">
            #{order.order_id}
          </h2>
          <p className="mt-2 text-sm text-white/40">
            Placed on {formatDate(order.created_at)}
          </p>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-white/40">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                liveConnected ? "bg-green-500" : "bg-white/20"
              }`}
            />
            {liveConnected ? "Live status connected" : "Latest status shown"}
          </div>
        </div>

        {isCancelled ? (
          <div className="mb-8 rounded-3xl border border-red-500/30 bg-red-500/10 p-7 text-center">
            <div className="text-5xl">❌</div>
            <h3 className="mt-4 text-2xl font-black text-red-300">
              Order Cancelled
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-red-200/60">
              This order has been cancelled and will not be prepared or
              delivered.
            </p>
          </div>
        ) : (
          <div className="mb-8 rounded-3xl border border-orange-500/20 bg-orange-500/10 p-7">
            <div className="flex flex-col items-center text-center sm:flex-row sm:text-left">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-500 text-3xl text-black">
                {STATUS_STEPS[currentStepIndex]?.emoji || "📦"}
              </div>

              <div className="mt-4 sm:ml-5 sm:mt-0">
                <p className="text-xs font-bold uppercase tracking-widest text-orange-400">
                  Current Status
                </p>
                <h3 className="mt-1 text-2xl font-black">
                  {STATUS_STEPS[currentStepIndex]?.title ||
                    formatStatus(order.status)}
                </h3>
                <p className="mt-1 text-sm text-white/50">
                  {STATUS_STEPS[currentStepIndex]?.description ||
                    "Your order is being processed."}
                </p>
              </div>
            </div>

            <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-orange-500 transition-all"
                style={{
                  width:
                    currentStepIndex >= 0
                      ? `${((currentStepIndex + 1) / STATUS_STEPS.length) * 100}%`
                      : "20%",
                }}
              />
            </div>
          </div>
        )}

        {isOnlinePayment && !isCancelled && (
          <div className="mb-8 rounded-3xl border border-blue-500/20 bg-blue-500/10 p-6">
            <div className="flex items-start gap-4">
              <div className="text-3xl">💳</div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-300/80">
                  Online Payment
                </p>
                <h3 className="mt-1 text-xl font-black text-blue-200">
                  Paid Online • ₹{Number(order.total).toFixed(0)}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/55">
                  If this order is cancelled, your online payment will be
                  eligible for a refund. Any refund will be processed through
                  Razorpay.
                </p>
              </div>
            </div>
          </div>
        )}

        {isCancelled && isOnlinePayment && (
          <div
            className={`mb-8 rounded-3xl border p-7 ${
              refundStatus === "processed"
                ? "border-green-500/30 bg-green-500/10"
                : refundStatus === "failed"
                ? "border-red-500/30 bg-red-500/10"
                : "border-orange-500/30 bg-orange-500/10"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="text-4xl">
                {refundStatus === "processed"
                  ? "💸"
                  : refundStatus === "failed"
                  ? "⚠️"
                  : "⏳"}
              </div>

              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-white/40">
                  Online Payment Refund
                </p>

                <h3
                  className={`mt-1 text-2xl font-black ${
                    refundStatus === "processed"
                      ? "text-green-300"
                      : refundStatus === "failed"
                      ? "text-red-300"
                      : "text-orange-300"
                  }`}
                >
                  {refundStatus === "processed"
                    ? "Payment Refunded"
                    : refundStatus === "failed"
                    ? "Refund Failed"
                    : hasRefund
                    ? "Refund Processing"
                    : "Refund Pending"}
                </h3>

                <p className="mt-2 text-sm leading-6 text-white/55">
                  {refundStatus === "processed"
                    ? `₹${Number(order.total).toFixed(0)} refund has been processed by Razorpay. The amount will be credited according to your payment provider's processing time.`
                    : refundStatus === "failed"
                    ? "The refund could not be completed. Please contact the restaurant for assistance."
                    : hasRefund
                    ? `Your ₹${Number(order.total).toFixed(0)} online payment refund is being processed.`
                    : "Your online payment is eligible for a refund. The refund will be processed by the restaurant."}
                </p>

                {order.razorpay_refund_id && (
                  <p className="mt-3 break-all text-xs text-white/30">
                    Refund ID: {order.razorpay_refund_id}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="rounded-3xl border border-white/10 bg-[#171310] p-6 md:p-8">
          <h3 className="text-xl font-black">Items</h3>

          <div className="mt-5 space-y-3">
            {orderItems.length > 0 ? (
              orderItems.map((item, index) => (
                <div
                  key={`${item.name}-${index}`}
                  className="flex items-center justify-between gap-4 rounded-2xl bg-white/5 p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.emoji}</span>
                    <div>
                      <p className="font-bold">{item.name}</p>
                      <p className="text-sm text-white/40">
                        ₹{item.price} × {item.quantity}
                      </p>
                    </div>
                  </div>

                  <p className="font-black">
                    ₹{(item.price * item.quantity).toFixed(0)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-white/40">
                Order items unavailable.
              </p>
            )}
          </div>

          <div className="mt-6 border-t border-white/10 pt-5">
            <div className="flex justify-between text-sm text-white/50">
              <span>Subtotal</span>
              <span>₹{Number(order.subtotal).toFixed(0)}</span>
            </div>

            <div className="mt-2 flex justify-between text-sm text-white/50">
              <span>Delivery</span>
              <span>
                {Number(order.delivery_charge) === 0
                  ? "FREE"
                  : `₹${Number(order.delivery_charge).toFixed(0)}`}
              </span>
            </div>

            <div className="mt-4 flex justify-between text-xl font-black">
              <span>Total</span>
              <span className="text-orange-500">
                ₹{Number(order.total).toFixed(0)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-white/10 bg-[#171310] p-6 md:p-8">
          <h3 className="text-xl font-black">Delivery Details</h3>

          <div className="mt-5 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/30">
                Customer
              </p>
              <p className="mt-1 font-semibold">{order.customer_name}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-widest text-white/30">
                Phone
              </p>
              <p className="mt-1 font-semibold">{order.customer_phone}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-widest text-white/30">
                Address
              </p>
              <p className="mt-1 leading-6 text-white/70">
                {order.delivery_address}
              </p>
            </div>
          </div>
        </div>

        {!isCancelled && !isDelivered && (
          <a
            href="/order-tracking"
            onClick={() =>
              localStorage.setItem("last-order-id", order.order_id)
            }
            className="mt-6 block w-full rounded-2xl bg-orange-500 px-6 py-4 text-center font-black text-black transition hover:bg-orange-400"
          >
            🛵 Track This Order →
          </a>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <a
            href="/my-orders"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-center font-bold hover:bg-white/10"
          >
            ← Back to My Orders
          </a>

          <a
            href="/menu"
            className="w-full rounded-2xl border border-orange-500/20 bg-orange-500/10 px-6 py-4 text-center font-bold text-orange-400 hover:bg-orange-500/20"
          >
            🍜 Order More Food
          </a>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#0b0908] px-4 py-6 text-center text-xs text-white/30">
        © {new Date().getFullYear()} YASH SAINI RESTAURANT. All rights reserved.
      </footer>
    </main>
  );
}

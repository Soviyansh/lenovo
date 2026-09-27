"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type OrderItem = {
  name: string;
  price: number;
  quantity: number;
  emoji?: string;
};

type Order = {
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
  razorpay_payment_id: string | null;
  razorpay_refund_id: string | null;
  refund_status: string | null;
  items: OrderItem[];
  created_at: string;
};

export default function PrintOrderPage() {
  const params = useParams();
  const orderId = String(params.orderId || "");

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrder() {
      if (!orderId) return;

      const { data, error } = await supabase
        .from("orders")
        .select(
          "order_id, customer_name, customer_phone, delivery_address, distance_km, subtotal, delivery_charge, total, status, payment_method, razorpay_payment_id, razorpay_refund_id, refund_status, items, created_at"
        )
        .eq("order_id", orderId)
        .maybeSingle();

      if (error) {
        console.error("Receipt order error:", error);
        setOrder(null);
      } else {
        setOrder(data as Order);
      }

      setLoading(false);
    }

    loadOrder();
  }, [orderId]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0f0d0b] text-white">
        <div className="text-center">
          <p className="text-5xl">🧾</p>
          <p className="mt-4 text-lg font-bold">Loading receipt...</p>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0f0d0b] px-6 text-white">
        <div className="text-center">
          <p className="text-5xl">🧾</p>
          <h1 className="mt-4 text-2xl font-black">
            Receipt not found
          </h1>
          <p className="mt-2 text-white/50">
            The requested order could not be loaded.
          </p>
        </div>
      </main>
    );
  }

  const createdAt = new Date(order.created_at);

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 print:bg-white print:p-0">
      <div className="mx-auto max-w-2xl">

        <div className="mb-4 flex items-center justify-between print:hidden">
          <a
            href="/admin"
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white"
          >
            ← Admin
          </a>

          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-black"
          >
            🖨️ Print Receipt
          </button>
        </div>

        <article className="rounded-2xl bg-white p-6 shadow-sm print:rounded-none print:p-0 print:shadow-none sm:p-8">

          <header className="border-b border-dashed border-gray-300 pb-6 text-center">
            <p className="text-2xl font-black tracking-tight">
              YASH SAINI RESTAURANT
            </p>

            <p className="mt-1 text-sm text-gray-500">
              B.B. Nagar, Bulandshahr, Uttar Pradesh
            </p>

            <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-orange-600">
              Order Receipt
            </p>
          </header>

          <section className="grid gap-4 border-b border-gray-200 py-6 sm:grid-cols-2">

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Order ID
              </p>
              <p className="mt-1 font-black">
                {order.order_id}
              </p>
            </div>

            <div className="sm:text-right">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Date & Time
              </p>

              <p className="mt-1 font-semibold">
                {createdAt.toLocaleString("en-IN")}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Customer
              </p>

              <p className="mt-1 font-semibold">
                {order.customer_name}
              </p>

              <p className="text-sm text-gray-500">
                {order.customer_phone}
              </p>
            </div>

            <div className="sm:text-right">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Status
              </p>

              <p className="mt-1 font-bold capitalize">
                {order.status}
              </p>
            </div>

          </section>

          <section className="border-b border-gray-200 py-6">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Delivery Address
            </p>

            <p className="mt-1 font-semibold">
              {order.delivery_address}
            </p>

            {order.distance_km !== null && (
              <p className="mt-1 text-sm text-gray-500">
                Delivery distance:{" "}
                {Number(order.distance_km).toFixed(2)} km
              </p>
            )}
          </section>

          <section className="border-b border-gray-200 py-6">

            <div className="mb-3 grid grid-cols-[1fr_auto_auto] gap-3 text-xs font-bold uppercase tracking-wider text-gray-400">
              <span>Item</span>
              <span>Qty</span>
              <span>Amount</span>
            </div>

            <div className="space-y-3">

              {order.items?.map((item, index) => (
                <div
                  key={`${order.order_id}-${index}`}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-3"
                >

                  <div>
                    <p className="font-semibold">
                      {item.emoji ? `${item.emoji} ` : ""}
                      {item.name}
                    </p>

                    <p className="text-xs text-gray-500">
                      ₹{Number(item.price).toFixed(0)} each
                    </p>
                  </div>

                  <span className="text-sm font-semibold">
                    {item.quantity}
                  </span>

                  <span className="font-bold">
                    ₹
                    {(
                      Number(item.price) *
                      Number(item.quantity)
                    ).toFixed(0)}
                  </span>

                </div>
              ))}

            </div>
          </section>

          <section className="border-b border-gray-200 py-6">

            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>
                ₹{Number(order.subtotal).toFixed(0)}
              </span>
            </div>

            <div className="mt-2 flex justify-between text-sm text-gray-600">
              <span>Delivery</span>
              <span>
                ₹{Number(order.delivery_charge).toFixed(0)}
              </span>
            </div>

            <div className="mt-4 flex justify-between text-xl font-black">
              <span>Total</span>
              <span>
                ₹{Number(order.total).toFixed(0)}
              </span>
            </div>

          </section>

          <section className="py-6">

            <div className="flex justify-between text-sm">
              <span className="font-bold">
                Payment
              </span>

              <span className="font-semibold uppercase">
                {order.payment_method === "online"
                  ? "Paid Online"
                  : "Cash on Delivery"}
              </span>
            </div>

            {order.razorpay_payment_id && (
              <p className="mt-2 break-all text-xs text-gray-500">
                Payment ID: {order.razorpay_payment_id}
              </p>
            )}

            {order.refund_status && (
              <p className="mt-2 text-sm font-bold">
                Refund: {order.refund_status}
              </p>
            )}

            {order.razorpay_refund_id && (
              <p className="mt-1 break-all text-xs text-gray-500">
                Refund ID: {order.razorpay_refund_id}
              </p>
            )}

          </section>

          <footer className="border-t border-dashed border-gray-300 pt-6 text-center text-xs text-gray-500">
            Thank you for ordering from YASH SAINI RESTAURANT ❤️
          </footer>

        </article>
      </div>
    </main>
  );
}
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Order = {
  id: number;
  order_id: string;
  user_id: string | null;
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
  items: unknown;
  created_at: string;
};

const terminalStatuses = ["delivered", "cancelled"];

function formatDate(date: string) {
  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusClass(status: string) {
  switch (status) {
    case "pending":
      return "border-yellow-500/20 bg-yellow-500/10 text-yellow-300";
    case "preparing":
      return "border-orange-500/20 bg-orange-500/10 text-orange-300";
    case "ready":
      return "border-blue-500/20 bg-blue-500/10 text-blue-300";
    case "out for delivery":
      return "border-purple-500/20 bg-purple-500/10 text-purple-300";
    case "delivered":
      return "border-green-500/20 bg-green-500/10 text-green-300";
    case "cancelled":
      return "border-red-500/20 bg-red-500/10 text-red-300";
    default:
      return "border-white/10 bg-white/5 text-white";
  }
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

export default function AdminCustomerDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const customerId = decodeURIComponent(
    String(params?.customerId || "")
  );

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [error, setError] = useState("");

  const fetchCustomerOrders = async () => {
    if (!customerId) return;

    const { data, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", customerId)
      .order("created_at", {
        ascending: false,
      });

    if (ordersError) {
      console.error(
        "Customer orders error:",
        ordersError
      );
      setError("Unable to load customer orders.");
      setLoading(false);
      return;
    }

    setOrders((data || []) as Order[]);
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
      await fetchCustomerOrders();
    };

    checkAdminAccess();
  }, [customerId]);

  useEffect(() => {
    if (!customerId || authChecking) return;

    const channel = supabase
      .channel(`admin-customer-${customerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${customerId}`,
        },
        () => {
          fetchCustomerOrders();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${customerId}`,
        },
        (payload) => {
          const updatedOrder = payload.new as Order;

          setOrders((current) => {
            const exists = current.some(
              (order) => order.id === updatedOrder.id
            );

            if (!exists) {
              return [updatedOrder, ...current];
            }

            return current
              .map((order) =>
                order.id === updatedOrder.id
                  ? updatedOrder
                  : order
              )
              .sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
              );
          });
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      fetchCustomerOrders();
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [customerId, authChecking]);

  const customer = orders[0];

  const stats = useMemo(() => {
    const totalSpent = orders.reduce(
      (sum, order) =>
        sum + (Number(order.total) || 0),
      0
    );

    const delivered = orders.filter(
      (order) => order.status === "delivered"
    ).length;

    const cancelled = orders.filter(
      (order) => order.status === "cancelled"
    ).length;

    const active = orders.filter(
      (order) =>
        !terminalStatuses.includes(order.status)
    ).length;

    return {
      totalSpent,
      delivered,
      cancelled,
      active,
    };
  }, [orders]);

  if (authChecking || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0f0d0b] px-4 text-white">
        <div className="text-center">
          <div className="mb-4 text-5xl">
            👤
          </div>

          <p className="text-white/60">
            Loading customer...
          </p>
        </div>
      </main>
    );
  }

  if (!customer) {
    return (
      <main className="min-h-screen bg-[#0f0d0b] px-4 py-10 text-white">
        <div className="mx-auto max-w-4xl">
          <button
            onClick={() =>
              router.push("/admin/customers")
            }
            className="mb-6 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/70 transition hover:bg-white/10"
          >
            ← Back to Customers
          </button>

          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center">
            <div className="mb-4 text-5xl">
              ❌
            </div>

            <h1 className="mb-2 text-2xl font-black">
              Customer Not Found
            </h1>

            <p className="text-white/60">
              {error ||
                "No orders were found for this customer."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f0d0b] px-4 py-6 text-white md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-8">
          <button
            onClick={() =>
              router.push("/admin/customers")
            }
            className="mb-5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/70 transition hover:bg-white/10"
          >
            ← Back to Customers
          </button>

          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-3xl">
                👤
              </div>

              <div>
                <p className="mb-1 text-sm font-bold uppercase tracking-widest text-orange-300">
                  Customer Profile
                </p>

                <h1 className="text-3xl font-black md:text-4xl">
                  {customer.customer_name ||
                    "Customer"}
                </h1>

                <a
                  href={`tel:${customer.customer_phone}`}
                  className="mt-1 block text-sm text-orange-300 hover:text-orange-200"
                >
                  📞 {customer.customer_phone}
                </a>
              </div>
            </div>

            <a
              href={`tel:${customer.customer_phone}`}
              className="rounded-xl bg-orange-500 px-6 py-3 text-center font-black text-black transition hover:bg-orange-400"
            >
              📞 Call Customer
            </a>
          </div>
        </div>

        {/* STATS */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm text-white/50">
              Total Orders
            </p>

            <p className="mt-2 text-3xl font-black text-orange-300">
              {orders.length}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm text-white/50">
              Total Spent
            </p>

            <p className="mt-2 text-3xl font-black text-green-300">
              ₹{stats.totalSpent.toFixed(0)}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm text-white/50">
              Delivered
            </p>

            <p className="mt-2 text-3xl font-black text-blue-300">
              {stats.delivered}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm text-white/50">
              Active Orders
            </p>

            <p className="mt-2 text-3xl font-black text-purple-300">
              {stats.active}
            </p>
          </div>

        </div>

        {/* CUSTOMER INFO */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2">

          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="mb-5 text-xl font-black">
              👤 Customer Information
            </h2>

            <div className="space-y-5">

              <div>
                <p className="text-xs uppercase tracking-widest text-white/40">
                  Name
                </p>

                <p className="mt-1 font-bold">
                  {customer.customer_name}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-widest text-white/40">
                  Phone
                </p>

                <a
                  href={`tel:${customer.customer_phone}`}
                  className="mt-1 block font-bold text-orange-300"
                >
                  {customer.customer_phone}
                </a>
              </div>

              <div>
                <p className="text-xs uppercase tracking-widest text-white/40">
                  Customer ID
                </p>

                <p className="mt-1 break-all font-mono text-xs text-white/50">
                  {customer.user_id}
                </p>
              </div>

            </div>
          </section>

          {/* LATEST ADDRESS */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="mb-5 text-xl font-black">
              📍 Latest Delivery
            </h2>

            <div>
              <p className="text-xs uppercase tracking-widest text-white/40">
                Address
              </p>

              <p className="mt-2 leading-relaxed font-bold">
                {customer.delivery_address ||
                  "No address available"}
              </p>
            </div>

            {customer.distance_km !== null && (
              <div className="mt-5">
                <p className="text-xs uppercase tracking-widest text-white/40">
                  Distance
                </p>

                <p className="mt-1 font-bold">
                  {Number(
                    customer.distance_km
                  ).toFixed(2)}{" "}
                  km
                </p>
              </div>
            )}

            {customer.customer_lat !== null &&
              customer.customer_lng !== null && (
                <a
                  href={`https://www.google.com/maps?q=${customer.customer_lat},${customer.customer_lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex rounded-xl bg-orange-500 px-5 py-3 font-black text-black transition hover:bg-orange-400"
                >
                  📍 Open Location
                </a>
              )}
          </section>

        </div>

        {/* ORDER HISTORY */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black">
                📦 Complete Order History
              </h2>

              <p className="mt-1 text-sm text-white/40">
                {orders.length} total order
                {orders.length === 1 ? "" : "s"}
              </p>
            </div>

            <button
              onClick={fetchCustomerOrders}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/70 transition hover:bg-white/10"
            >
              🔄 Refresh
            </button>
          </div>

          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl border border-white/10 bg-black/20 p-5"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                  <div>
                    <p className="text-xs uppercase tracking-widest text-white/40">
                      Order ID
                    </p>

                    <p className="mt-1 text-lg font-black text-orange-300">
                      {order.order_id}
                    </p>

                    <p className="mt-2 text-sm text-white/40">
                      {formatDate(order.created_at)}
                    </p>
                  </div>

                  <div
                    className={`self-start rounded-xl border px-4 py-2 text-xs font-black uppercase ${statusClass(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-white/40">
                        Subtotal
                      </p>

                      <p className="mt-1 font-bold">
                        ₹
                        {Number(
                          order.subtotal
                        ).toFixed(0)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-white/40">
                        Delivery
                      </p>

                      <p className="mt-1 font-bold">
                        ₹
                        {Number(
                          order.delivery_charge
                        ).toFixed(0)}
                      </p>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-xs text-white/40">
                        Total
                      </p>

                      <p className="mt-1 font-black text-green-300">
                        ₹
                        {Number(
                          order.total
                        ).toFixed(0)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      router.push(
                        `/admin/orders/${encodeURIComponent(
                          order.order_id
                        )}`
                      )
                    }
                    className="rounded-xl border border-orange-500/20 bg-orange-500/10 px-5 py-3 text-sm font-black text-orange-300 transition hover:bg-orange-500/20"
                  >
                    View Full Order →
                  </button>

                </div>

                <div className="mt-5 border-t border-white/10 pt-4">
                  <p className="text-xs text-white/40">
                    Delivery Address
                  </p>

                  <p className="mt-1 text-sm font-bold text-white/80">
                    {order.delivery_address}
                  </p>
                </div>

                {order.status === "delivered" && (
                  <div className="mt-4 text-xs font-bold text-green-300">
                    ✅ Successfully delivered
                  </div>
                )}

                {order.status === "cancelled" && (
                  <div className="mt-4 text-xs font-bold text-red-300">
                    ❌ Order cancelled
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* FOOTER ACTIONS */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() =>
              router.push("/admin/customers")
            }
            className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-black text-white transition hover:bg-white/10"
          >
            ← All Customers
          </button>

          <button
            onClick={() => router.push("/admin")}
            className="rounded-xl bg-orange-500 px-6 py-3 font-black text-black transition hover:bg-orange-400"
          >
            Go to Admin Dashboard
          </button>
        </div>

      </div>
    </main>
  );
}
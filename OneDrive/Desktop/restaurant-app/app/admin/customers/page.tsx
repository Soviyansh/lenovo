"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Order = {
  id: number;
  order_id: string;
  user_id: string | null;
  customer_name: string;
  customer_phone: string;
  subtotal: number;
  delivery_charge: number;
  total: number;
  status: string;
  created_at: string;
};

type Customer = {
  user_id: string;
  name: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  latestOrder: string;
  latestOrderId: string;
};

export default function AdminCustomersPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const checkAdmin = async () => {
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
        await supabase.auth.signOut({
          scope: "local",
        });

        window.location.replace("/admin/login");
        return;
      }

      setAuthChecking(false);
      fetchCustomers();
    };

    checkAdmin();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    setError("");

    const { data, error: ordersError } = await supabase
      .from("orders")
      .select(
        "id, order_id, user_id, customer_name, customer_phone, subtotal, delivery_charge, total, status, created_at"
      )
      .not("user_id", "is", null)
      .order("created_at", {
        ascending: false,
      });

    if (ordersError) {
      console.error("Customers fetch error:", ordersError);
      setError("Unable to load customers.");
      setLoading(false);
      return;
    }

    const orders = (data || []) as Order[];

    const customerMap = new Map<string, Customer>();

    orders.forEach((order) => {
      if (!order.user_id) return;

      const existing = customerMap.get(order.user_id);

      const total = Number(order.total) || 0;

      if (!existing) {
        customerMap.set(order.user_id, {
          user_id: order.user_id,
          name: order.customer_name || "Customer",
          phone: order.customer_phone || "No phone",
          totalOrders: 1,
          totalSpent: total,
          latestOrder: order.created_at,
          latestOrderId: order.order_id,
        });
      } else {
        existing.totalOrders += 1;
        existing.totalSpent += total;

        if (
          new Date(order.created_at).getTime() >
          new Date(existing.latestOrder).getTime()
        ) {
          existing.latestOrder = order.created_at;
          existing.latestOrderId = order.order_id;
          existing.name =
            order.customer_name || existing.name;
          existing.phone =
            order.customer_phone || existing.phone;
        }
      }
    });

    setCustomers(
      Array.from(customerMap.values()).sort(
        (a, b) =>
          new Date(b.latestOrder).getTime() -
          new Date(a.latestOrder).getTime()
      )
    );

    setLoading(false);
  };

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return customers;

    return customers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(query) ||
        customer.phone.toLowerCase().includes(query) ||
        customer.latestOrderId
          .toLowerCase()
          .includes(query)
      );
    });
  }, [customers, search]);

  const totalRevenue = customers.reduce(
    (sum, customer) => sum + customer.totalSpent,
    0
  );

  const totalOrders = customers.reduce(
    (sum, customer) => sum + customer.totalOrders,
    0
  );

  if (authChecking || loading) {
    return (
      <main className="min-h-screen bg-[#0f0d0b] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">👥</div>

          <p className="text-white/60">
            Loading customers...
          </p>
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
            onClick={() => router.push("/admin")}
            className="mb-5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/70 transition hover:bg-white/10"
          >
            ← Back to Admin
          </button>

          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-sm font-bold uppercase tracking-widest text-orange-300">
                Admin Panel
              </p>

              <h1 className="text-3xl font-black md:text-4xl">
                Customer Management
              </h1>

              <p className="mt-2 text-white/50">
                View your customers and their order history.
              </p>
            </div>

            <button
              onClick={fetchCustomers}
              className="self-start rounded-xl bg-orange-500 px-5 py-3 font-black text-black transition hover:bg-orange-400"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm text-white/50">
              Total Customers
            </p>

            <p className="mt-2 text-3xl font-black text-orange-300">
              {customers.length}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm text-white/50">
              Total Orders
            </p>

            <p className="mt-2 text-3xl font-black text-blue-300">
              {totalOrders}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm text-white/50">
              Total Customer Spending
            </p>

            <p className="mt-2 text-3xl font-black text-green-300">
              ₹{totalRevenue.toFixed(0)}
            </p>
          </div>

        </div>

        {/* SEARCH */}
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search customer name, phone or order ID..."
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-white outline-none placeholder:text-white/30 focus:border-orange-500/50"
          />
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-red-300">
            {error}
          </div>
        )}

        {/* CUSTOMER LIST */}
        {filteredCustomers.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <div className="mb-4 text-5xl">
              👥
            </div>

            <h2 className="text-xl font-black">
              No Customers Found
            </h2>

            <p className="mt-2 text-white/50">
              {search
                ? "Try a different search."
                : "Customers will appear here after orders are placed."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.user_id}
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-orange-500/20 md:p-6"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                  {/* CUSTOMER */}
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-500/10 text-2xl">
                      👤
                    </div>

                    <div>
                      <h2 className="text-lg font-black">
                        {customer.name}
                      </h2>

                      <a
                        href={`tel:${customer.phone}`}
                        className="mt-1 block text-sm text-orange-300 hover:text-orange-200"
                      >
                        📞 {customer.phone}
                      </a>
                    </div>
                  </div>

                  {/* STATS */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">

                    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                      <p className="text-xs text-white/40">
                        Orders
                      </p>

                      <p className="mt-1 font-black">
                        {customer.totalOrders}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                      <p className="text-xs text-white/40">
                        Spent
                      </p>

                      <p className="mt-1 font-black text-green-300">
                        ₹{customer.totalSpent.toFixed(0)}
                      </p>
                    </div>

                    <div className="col-span-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 sm:col-span-1">
                      <p className="text-xs text-white/40">
                        Latest Order
                      </p>

                      <p className="mt-1 text-sm font-black">
                        {customer.latestOrderId}
                      </p>
                    </div>

                  </div>

                  {/* ACTIONS */}
                  <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">

                    <a
                      href={`tel:${customer.phone}`}
                      className="rounded-xl bg-orange-500 px-5 py-3 text-center text-sm font-black text-black transition hover:bg-orange-400"
                    >
                      📞 Call
                    </a>

                    <button
                      onClick={() =>
                        router.push(
                          `/admin/customers/${encodeURIComponent(
                            customer.user_id
                          )}`
                        )
                      }
                      className="rounded-xl border border-orange-500/20 bg-orange-500/10 px-5 py-3 text-sm font-black text-orange-300 transition hover:bg-orange-500/20"
                    >
                      👤 View Profile →
                    </button>

                    <button
                      onClick={() =>
                        router.push(
                          `/admin/orders/${encodeURIComponent(
                            customer.latestOrderId
                          )}`
                        )
                      }
                      className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
                    >
                      View Latest Order →
                    </button>

                  </div>

                </div>

                {/* DATE */}
                <div className="mt-5 border-t border-white/10 pt-4 text-xs text-white/40">
                  Latest order placed{" "}
                  {new Date(
                    customer.latestOrder
                  ).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type DeliveryBoy = {
  id: string;
  full_name: string;
  phone: string | null;
  vehicle_type: string | null;
  vehicle_number: string | null;
  is_active: boolean;
  is_available: boolean;
  current_lat: number | null;
  current_lng: number | null;
  last_location_at: string | null;
  created_at: string;
  updated_at: string;
};

type Order = {
  id: number;
  order_id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  distance_km: number | null;
  subtotal: number;
  delivery_charge: number;
  total: number;
  status: string;
  delivery_boy_id: string | null;
  delivery_assigned_at: string | null;
  delivery_accepted_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  cod_collected_amount: number;
  cod_collected_at: string | null;
  delivery_issue: string | null;
  created_at: string;
};

const ORDER_SELECT = `
  id,
  order_id,
  customer_name,
  customer_phone,
  delivery_address,
  distance_km,
  subtotal,
  delivery_charge,
  total,
  status,
  delivery_boy_id,
  delivery_assigned_at,
  delivery_accepted_at,
  picked_up_at,
  delivered_at,
  cod_collected_amount,
  cod_collected_at,
  delivery_issue,
  created_at
`;

export default function DeliveryAdminPage() {
  const [deliveryBoys, setDeliveryBoys] = useState<DeliveryBoy[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "all" | "available" | "busy" | "inactive"
  >("all");

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const loadData = async () => {
    try {
      setLoading(true);
      clearMessages();

      const [boysResult, ordersResult] = await Promise.all([
        supabase
          .from("delivery_boys")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("orders")
          .select(ORDER_SELECT)
          .not("status", "eq", "cancelled")
          .order("created_at", { ascending: false }),
      ]);

      if (boysResult.error) {
        throw new Error(boysResult.error.message);
      }

      if (ordersResult.error) {
        throw new Error(ordersResult.error.message);
      }

      setDeliveryBoys((boysResult.data || []) as DeliveryBoy[]);
      setOrders((ordersResult.data || []) as Order[]);
    } catch (err) {
      console.error("Delivery dashboard error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load delivery dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const ordersChannel = supabase
      .channel("admin-delivery-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    const boysChannel = supabase
      .channel("admin-delivery-boys")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "delivery_boys",
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(boysChannel);
    };
  }, []);

  const assignedOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        order.delivery_boy_id &&
        ["ready", "out for delivery"].includes(order.status.toLowerCase())
    );
  }, [orders]);

  const pendingDeliveryOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        !order.delivery_boy_id &&
        ["ready", "out for delivery"].includes(order.status.toLowerCase())
    );
  }, [orders]);

  const deliveredToday = useMemo(() => {
    const today = new Date().toDateString();

    return orders.filter(
      (order) =>
        order.status.toLowerCase() === "delivered" &&
        order.delivered_at &&
        new Date(order.delivered_at).toDateString() === today
    ).length;
  }, [orders]);

  const codCollectedToday = useMemo(() => {
    const today = new Date().toDateString();

    return orders
      .filter(
        (order) =>
          order.cod_collected_at &&
          new Date(order.cod_collected_at).toDateString() === today
      )
      .reduce(
        (sum, order) => sum + Number(order.cod_collected_amount || 0),
        0
      );
  }, [orders]);

  const availableCount = deliveryBoys.filter(
    (boy) => boy.is_active && boy.is_available
  ).length;

  const busyCount = deliveryBoys.filter(
    (boy) =>
      boy.is_active &&
      assignedOrders.some((order) => order.delivery_boy_id === boy.id)
  ).length;

  const filteredBoys = useMemo(() => {
    const query = search.trim().toLowerCase();

    return deliveryBoys.filter((boy) => {
      const matchesSearch =
        !query ||
        boy.full_name.toLowerCase().includes(query) ||
        (boy.phone || "").toLowerCase().includes(query) ||
        (boy.vehicle_number || "").toLowerCase().includes(query);

      const isBusy = assignedOrders.some(
        (order) => order.delivery_boy_id === boy.id
      );

      let matchesFilter = true;

      if (filter === "available") {
        matchesFilter = boy.is_active && boy.is_available && !isBusy;
      }

      if (filter === "busy") {
        matchesFilter = boy.is_active && isBusy;
      }

      if (filter === "inactive") {
        matchesFilter = !boy.is_active;
      }

      return matchesSearch && matchesFilter;
    });
  }, [deliveryBoys, assignedOrders, search, filter]);

  const getBoyOrder = (boyId: string) => {
    return assignedOrders.find((order) => order.delivery_boy_id === boyId);
  };

  const toggleActive = async (boy: DeliveryBoy) => {
    try {
      setActionLoading(`active-${boy.id}`);
      clearMessages();

      const { error } = await supabase
        .from("delivery_boys")
        .update({
          is_active: !boy.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", boy.id);

      if (error) throw error;

      setSuccess(
        `${boy.full_name} is now ${!boy.is_active ? "active" : "inactive"}.`
      );

      await loadData();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Unable to update delivery boy."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const toggleAvailability = async (boy: DeliveryBoy) => {
    try {
      if (!boy.is_active) {
        setError("Activate the delivery boy first.");
        return;
      }

      const currentOrder = getBoyOrder(boy.id);

      if (currentOrder && boy.is_available) {
        setError("This delivery boy has an active delivery.");
        return;
      }

      setActionLoading(`availability-${boy.id}`);
      clearMessages();

      const { error } = await supabase
        .from("delivery_boys")
        .update({
          is_available: !boy.is_available,
          updated_at: new Date().toISOString(),
        })
        .eq("id", boy.id);

      if (error) throw error;

      setSuccess(
        `${boy.full_name} is now ${
          !boy.is_available ? "available" : "unavailable"
        }.`
      );

      await loadData();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Unable to update availability."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const assignOrder = async (boy: DeliveryBoy) => {
    if (!selectedOrder) return;

    try {
      setActionLoading(`assign-${selectedOrder.order_id}`);
      clearMessages();

      if (!boy.is_active) {
        throw new Error("This delivery boy is inactive.");
      }

      const existingOrder = getBoyOrder(boy.id);

      if (existingOrder && existingOrder.order_id !== selectedOrder.order_id) {
        throw new Error(
          "This delivery boy already has an active delivery."
        );
      }

      const now = new Date().toISOString();

      const { error: orderError } = await supabase
        .from("orders")
        .update({
          delivery_boy_id: boy.id,
          delivery_assigned_at: now,
        })
        .eq("order_id", selectedOrder.order_id);

      if (orderError) throw orderError;

      const { error: historyError } = await supabase
        .from("delivery_order_history")
        .insert({
          order_id: selectedOrder.order_id,
          delivery_boy_id: boy.id,
          status: "assigned",
          note: `Order assigned to ${boy.full_name} by admin.`,
        });

      if (historyError) {
        console.error("History insert error:", historyError);
      }

      const { error: boyError } = await supabase
        .from("delivery_boys")
        .update({
          is_available: false,
          updated_at: now,
        })
        .eq("id", boy.id);

      if (boyError) throw boyError;

      setSuccess(
        `Order #${selectedOrder.order_id} assigned to ${boy.full_name}.`
      );

      setShowAssignModal(false);
      setSelectedOrder(null);

      await loadData();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Unable to assign order."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const unassignOrder = async (order: Order) => {
    if (!order.delivery_boy_id) return;

    const boy = deliveryBoys.find(
      (deliveryBoy) => deliveryBoy.id === order.delivery_boy_id
    );

    try {
      setActionLoading(`unassign-${order.order_id}`);
      clearMessages();

      const now = new Date().toISOString();

      const { error } = await supabase
        .from("orders")
        .update({
          delivery_boy_id: null,
          delivery_assigned_at: null,
          delivery_accepted_at: null,
          picked_up_at: null,
        })
        .eq("order_id", order.order_id);

      if (error) throw error;

      if (boy) {
        await supabase
          .from("delivery_boys")
          .update({
            is_available: true,
            updated_at: now,
          })
          .eq("id", boy.id);

        await supabase.from("delivery_order_history").insert({
          order_id: order.order_id,
          delivery_boy_id: boy.id,
          status: "unassigned",
          note: `Order unassigned by admin.`,
        });
      }

      setSuccess(`Order #${order.order_id} has been unassigned.`);

      await loadData();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Unable to unassign order."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const openAssignModal = (order: Order) => {
    clearMessages();
    setSelectedOrder(order);
    setShowAssignModal(true);
  };

  const formatTime = (date: string | null) => {
    if (!date) return "—";

    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusBadge = (status: string) => {
    const normalized = status.toLowerCase();

    if (normalized === "out for delivery") {
      return "bg-orange-500/15 text-orange-300 border-orange-500/30";
    }

    if (normalized === "ready") {
      return "bg-blue-500/15 text-blue-300 border-blue-500/30";
    }

    if (normalized === "delivered") {
      return "bg-green-500/15 text-green-300 border-green-500/30";
    }

    return "bg-white/5 text-gray-300 border-white/10";
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#09090b] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-orange-500" />
          <p className="text-gray-400">Loading delivery dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-orange-400">
              YASH SAINI RESTAURANT
            </p>

            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Delivery Management
            </h1>

            <p className="mt-1 text-sm text-gray-400">
              Manage delivery boys and active deliveries.
            </p>
          </div>

          <button
            onClick={loadData}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10"
          >
            ↻ Refresh
          </button>
        </div>

        {/* MESSAGES */}
        {error && (
          <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-300">
            ✅ {success}
          </div>
        )}

        {/* STATS */}
        <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard
            icon="🛵"
            title="Total Boys"
            value={deliveryBoys.length}
          />

          <StatCard
            icon="🟢"
            title="Available"
            value={availableCount}
          />

          <StatCard
            icon="📦"
            title="Active Orders"
            value={assignedOrders.length}
          />

          <StatCard
            icon="⏳"
            title="Unassigned"
            value={pendingDeliveryOrders.length}
          />

          <StatCard
            icon="✅"
            title="Delivered Today"
            value={deliveredToday}
          />

          <StatCard
            icon="💰"
            title="COD Today"
            value={`₹${codCollectedToday.toFixed(0)}`}
          />

          <StatCard
            icon="🔴"
            title="Busy"
            value={busyCount}
          />
        </div>

        {/* ACTIVE DELIVERY ORDERS */}
        <section className="mb-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">Delivery Orders</h2>
              <p className="text-sm text-gray-500">
                Ready and active orders requiring delivery.
              </p>
            </div>
          </div>

          {orders.filter((order) =>
            ["ready", "out for delivery"].includes(order.status.toLowerCase())
          ).length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
              <div className="mb-3 text-4xl">📦</div>
              <p className="font-semibold">No active delivery orders</p>
              <p className="mt-1 text-sm text-gray-500">
                Orders will appear here when they are ready for delivery.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {orders
                .filter((order) =>
                  ["ready", "out for delivery"].includes(
                    order.status.toLowerCase()
                  )
                )
                .map((order) => {
                  const boy = deliveryBoys.find(
                    (item) => item.id === order.delivery_boy_id
                  );

                  return (
                    <div
                      key={order.order_id}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-orange-500/20"
                    >
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-bold">
                            #{order.order_id}
                          </p>

                          <p className="text-xs text-gray-500">
                            {formatTime(order.created_at)}
                          </p>
                        </div>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusBadge(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </div>

                      <div className="space-y-2.5 text-sm">
                        <div>
                          <span className="text-gray-500">Customer: </span>
                          <span className="font-medium">
                            {order.customer_name}
                          </span>
                        </div>

                        <div>
                          <span className="text-gray-500">Phone: </span>
                          <span>{order.customer_phone}</span>
                        </div>

                        <div>
                          <span className="text-gray-500">Address: </span>
                          <span className="text-gray-300">
                            {order.delivery_address}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-4 pt-1">
                          <span>
                            📍{" "}
                            {order.distance_km !== null
                              ? `${Number(order.distance_km).toFixed(1)} km`
                              : "Distance N/A"}
                          </span>

                          <span>
                            💰 ₹{Number(order.total || 0).toFixed(0)}
                          </span>
                        </div>
                      </div>

                      <div className="my-4 border-t border-white/10" />

                      {boy ? (
                        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-xs text-gray-500">
                                Assigned Delivery Boy
                              </p>

                              <p className="font-bold text-orange-300">
                                {boy.full_name}
                              </p>

                              <p className="text-xs text-gray-400">
                                {boy.phone || "No phone"}{" "}
                                {boy.vehicle_number
                                  ? `• ${boy.vehicle_number}`
                                  : ""}
                              </p>
                            </div>

                            <button
                              onClick={() => openAssignModal(order)}
                              className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs font-bold text-orange-300 hover:bg-orange-500/20"
                            >
                              Reassign
                            </button>
                          </div>

                          <button
                            onClick={() => unassignOrder(order)}
                            disabled={
                              actionLoading === `unassign-${order.order_id}`
                            }
                            className="mt-3 w-full rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                          >
                            {actionLoading === `unassign-${order.order_id}`
                              ? "Unassigning..."
                              : "Unassign Order"}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => openAssignModal(order)}
                          className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-black text-black transition hover:bg-orange-400"
                        >
                          🛵 Assign Delivery Boy
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </section>

        {/* DELIVERY BOYS */}
        <section>
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-bold">Delivery Boys</h2>
              <p className="text-sm text-gray-500">
                Manage availability and delivery status.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, vehicle..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none placeholder:text-gray-600 focus:border-orange-500/40 sm:w-64"
              />

              <select
                value={filter}
                onChange={(e) =>
                  setFilter(
                    e.target.value as
                      | "all"
                      | "available"
                      | "busy"
                      | "inactive"
                  )
                }
                className="rounded-xl border border-white/10 bg-[#111113] px-4 py-2.5 text-sm outline-none focus:border-orange-500/40"
              >
                <option value="all">All</option>
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {filteredBoys.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
              <div className="mb-3 text-4xl">🛵</div>
              <p className="font-semibold">No delivery boys found</p>
              <p className="mt-1 text-sm text-gray-500">
                Try changing your search or filter.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredBoys.map((boy) => {
                const activeOrder = getBoyOrder(boy.id);
                const isBusy = Boolean(activeOrder);

                return (
                  <div
                    key={boy.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-2xl">
                          🛵
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate font-bold">
                            {boy.full_name}
                          </h3>

                          <p className="truncate text-xs text-gray-500">
                            {boy.phone || "No phone"}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                          !boy.is_active
                            ? "border-gray-500/20 bg-gray-500/10 text-gray-400"
                            : isBusy
                            ? "border-orange-500/20 bg-orange-500/10 text-orange-300"
                            : boy.is_available
                            ? "border-green-500/20 bg-green-500/10 text-green-300"
                            : "border-yellow-500/20 bg-yellow-500/10 text-yellow-300"
                        }`}
                      >
                        {!boy.is_active
                          ? "INACTIVE"
                          : isBusy
                          ? "BUSY"
                          : boy.is_available
                          ? "AVAILABLE"
                          : "UNAVAILABLE"}
                      </span>
                    </div>

                    <div className="space-y-2 rounded-xl border border-white/5 bg-black/20 p-3 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">Vehicle</span>
                        <span className="text-right">
                          {boy.vehicle_type || "—"}
                        </span>
                      </div>

                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">Number</span>
                        <span>{boy.vehicle_number || "—"}</span>
                      </div>

                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">Last Location</span>
                        <span className="text-right text-xs">
                          {boy.last_location_at
                            ? formatTime(boy.last_location_at)
                            : "Not available"}
                        </span>
                      </div>
                    </div>

                    {activeOrder && (
                      <div className="mt-3 rounded-xl border border-orange-500/20 bg-orange-500/5 p-3">
                        <p className="text-[11px] uppercase tracking-wider text-gray-500">
                          Current Order
                        </p>

                        <p className="mt-1 font-bold text-orange-300">
                          #{activeOrder.order_id}
                        </p>

                        <p className="truncate text-xs text-gray-400">
                          {activeOrder.customer_name}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {activeOrder.status}
                        </p>
                      </div>
                    )}

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => toggleActive(boy)}
                        disabled={actionLoading === `active-${boy.id}`}
                        className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition disabled:opacity-50 ${
                          boy.is_active
                            ? "border-red-500/20 bg-red-500/5 text-red-300 hover:bg-red-500/10"
                            : "border-green-500/20 bg-green-500/5 text-green-300 hover:bg-green-500/10"
                        }`}
                      >
                        {actionLoading === `active-${boy.id}`
                          ? "..."
                          : boy.is_active
                          ? "Deactivate"
                          : "Activate"}
                      </button>

                      <button
                        onClick={() => toggleAvailability(boy)}
                        disabled={
                          actionLoading === `availability-${boy.id}` ||
                          !boy.is_active ||
                          isBusy
                        }
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-bold text-gray-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {actionLoading === `availability-${boy.id}`
                          ? "..."
                          : boy.is_available
                          ? "Set Unavailable"
                          : "Set Available"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ASSIGN MODAL */}
      {showAssignModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#111113] p-5 shadow-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-orange-400">
                  Delivery Assignment
                </p>

                <h2 className="mt-1 text-xl font-black">
                  Order #{selectedOrder.order_id}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Select a delivery boy.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedOrder(null);
                }}
                className="rounded-lg bg-white/5 px-3 py-2 text-gray-400 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
              <p>
                <span className="text-gray-500">Customer:</span>{" "}
                {selectedOrder.customer_name}
              </p>

              <p className="mt-2">
                <span className="text-gray-500">Address:</span>{" "}
                {selectedOrder.delivery_address}
              </p>

              <p className="mt-2">
                <span className="text-gray-500">Total:</span> ₹
                {Number(selectedOrder.total || 0).toFixed(0)}
              </p>
            </div>

            <div className="space-y-3">
              {deliveryBoys
                .filter((boy) => {
                  if (!boy.is_active) return false;

                  const activeOrder = getBoyOrder(boy.id);

                  return !activeOrder || activeOrder.order_id === selectedOrder.order_id;
                })
                .map((boy) => {
                  const activeOrder = getBoyOrder(boy.id);

                  return (
                    <button
                      key={boy.id}
                      onClick={() => assignOrder(boy)}
                      disabled={actionLoading === `assign-${selectedOrder.order_id}`}
                      className="flex w-full items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-orange-500/30 hover:bg-orange-500/5 disabled:opacity-50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-xl">
                          🛵
                        </div>

                        <div className="min-w-0">
                          <p className="font-bold">{boy.full_name}</p>

                          <p className="truncate text-xs text-gray-500">
                            {boy.phone || "No phone"}{" "}
                            {boy.vehicle_number
                              ? `• ${boy.vehicle_number}`
                              : ""}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        {activeOrder ? (
                          <span className="text-xs font-bold text-orange-300">
                            Current order
                          </span>
                        ) : boy.is_available ? (
                          <span className="text-xs font-bold text-green-300">
                            ● Available
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-yellow-300">
                            ● Unavailable
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>

            {deliveryBoys.filter((boy) => boy.is_active).length === 0 && (
              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-center text-sm text-yellow-300">
                No active delivery boys available.
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function StatCard({
  icon,
  title,
  value,
}: {
  icon: string;
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 text-xl">{icon}</div>

      <p className="text-xs font-medium text-gray-500">{title}</p>

      <p className="mt-1 text-xl font-black sm:text-2xl">{value}</p>
    </div>
  );
}
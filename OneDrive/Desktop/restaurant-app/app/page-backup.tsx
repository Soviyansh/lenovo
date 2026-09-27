"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type OrderItem = {
  name: string;
  price: number;
  quantity: number;
  emoji: string;
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
  items: OrderItem[];
  created_at: string;
};

type BestSellingItem = {
  name: string;
  emoji: string;
  quantity: number;
  sales: number;
};

type MenuItem = {
  id: number;
  name: string;
  price: number;
  emoji: string;
  category: string;
  available: boolean;
  created_at: string;
  updated_at: string;
};

type RestaurantSettings = {
  id: number;
  is_open: boolean;
};

const STATUS_OPTIONS = [
  "pending",
  "preparing",
  "ready",
  "out for delivery",
  "delivered",
  "cancelled",
];

const STATUS_FILTERS = [
  "all",
  "pending",
  "preparing",
  "ready",
  "out for delivery",
  "delivered",
  "cancelled",
];

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [updatingOrderId, setUpdatingOrderId] =
    useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [newOrderAlert, setNewOrderAlert] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  // Menu Management
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState("");

  const [showMenuForm, setShowMenuForm] = useState(false);
  const [editingMenuId, setEditingMenuId] =
    useState<number | null>(null);

  const [menuName, setMenuName] = useState("");
  const [menuPrice, setMenuPrice] = useState("");
  const [menuEmoji, setMenuEmoji] = useState("🍽️");
  const [menuCategory, setMenuCategory] = useState("Chinese");
  const [menuAvailable, setMenuAvailable] = useState(true);

  const [menuSaving, setMenuSaving] = useState(false);
  const [deletingMenuId, setDeletingMenuId] =
    useState<number | null>(null);

  // Restaurant Open / Closed
  const [restaurantSettings, setRestaurantSettings] =
    useState<RestaurantSettings | null>(null);
  const [restaurantStatusLoading, setRestaurantStatusLoading] =
    useState(true);
  const [restaurantStatusSaving, setRestaurantStatusSaving] =
    useState(false);
  const [restaurantStatusError, setRestaurantStatusError] =
    useState("");

  const menuCategories = [
    "Chinese",
    "Noodles",
    "Momos",
    "Rice",
    "Main Course",
    "Burgers",
    "Pizza",
    "Snacks",
    "Drinks",
    "Combos",
    "Desserts",
  ];

  useEffect(() => {
    const checkAdminLogin = async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        window.location.href = "/admin/login";
        return;
      }

      setAuthChecking(false);
    };

    checkAdminLogin();
  }, []);

  const fetchRestaurantSettings = async () => {
    setRestaurantStatusLoading(true);
    setRestaurantStatusError("");

    const { data, error } = await supabase
      .from("restaurant_settings")
      .select("id, is_open")
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Restaurant settings fetch error:", error);
      setRestaurantStatusError(
        "Unable to load restaurant open/closed status."
      );
      setRestaurantSettings(null);
    } else if (!data) {
      setRestaurantStatusError(
        "Restaurant settings are not configured yet."
      );
      setRestaurantSettings(null);
    } else {
      setRestaurantSettings(data as RestaurantSettings);
    }

    setRestaurantStatusLoading(false);
  };

  const toggleRestaurantStatus = async () => {
    if (!restaurantSettings) {
      return;
    }

    const nextStatus = !restaurantSettings.is_open;

    setRestaurantStatusSaving(true);
    setRestaurantStatusError("");

    const { data, error } = await supabase
      .from("restaurant_settings")
      .update({
        is_open: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", restaurantSettings.id)
      .select("id, is_open")
      .single();

    if (error) {
      console.error("Restaurant status update error:", error);
      setRestaurantStatusError(
        "Unable to change restaurant status. Please try again."
      );
      setRestaurantStatusSaving(false);
      return;
    }

    setRestaurantSettings(data as RestaurantSettings);
    setRestaurantStatusSaving(false);
  };

  const fetchOrders = async () => {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Orders fetch error:", error);
      setErrorMessage("Unable to load orders.");
      setOrders([]);
    } else {
      setOrders((data || []) as Order[]);
    }

    setLoading(false);
  };

  const fetchMenuItems = async () => {
    setMenuLoading(true);
    setMenuError("");

    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Menu fetch error:", error);
      setMenuError("Unable to load menu items.");
      setMenuItems([]);
    } else {
      setMenuItems((data || []) as MenuItem[]);
    }

    setMenuLoading(false);
  };

  useEffect(() => {
    if (!authChecking) {
      fetchOrders();
      fetchMenuItems();
      fetchRestaurantSettings();
    }
  }, [authChecking]);

  // Realtime order updates + new order notifications
  useEffect(() => {
    if (authChecking) return;

    const channel = supabase
      .channel("admin-orders-live")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          const newOrder = payload.new as Order;

          setOrders((currentOrders) => {
            const alreadyExists = currentOrders.some(
              (order) => order.id === newOrder.id
            );

            if (alreadyExists) {
              return currentOrders;
            }

            return [newOrder, ...currentOrders];
          });

          setNewOrderAlert(true);

          setTimeout(() => {
            setNewOrderAlert(false);
          }, 6000);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          const updatedOrder = payload.new as Order;

          setOrders((currentOrders) =>
            currentOrders.map((order) =>
              order.id === updatedOrder.id
                ? { ...order, ...updatedOrder }
                : order
            )
          );
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeConnected(true);
        } else {
          setRealtimeConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authChecking]);

  const updateOrderStatus = async (
    orderId: number,
    newStatus: string
  ) => {
    const currentOrder = orders.find((order) => order.id === orderId);

    // Cancelled orders are final and cannot be moved back to another status.
    if (currentOrder?.status?.trim().toLowerCase() === "cancelled") {
      return;
    }

    setUpdatingOrderId(orderId);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("orders")
      .update({
        status: newStatus,
      })
      .eq("id", orderId)
      .select("*")
      .single();

    if (error) {
      console.error("Status update error:", error);
      setErrorMessage("Unable to update order status.");
      setUpdatingOrderId(null);
      return;
    }

    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId
          ? (data as Order)
          : order
      )
    );

    setUpdatingOrderId(null);
  };

  const handleLogout = async () => {
    setLoading(true);

    const { error } = await supabase.auth.signOut({
      scope: "local",
    });

    if (error) {
      console.error("Logout error:", error);
      setLoading(false);
      setErrorMessage("Unable to logout. Please try again.");
      return;
    }

    window.location.replace("/admin/login");
  };

  const isToday = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();

    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const totalOrders = orders.length;

  const pendingOrders = orders.filter(
    (order) => order.status === "pending"
  ).length;

  const preparingOrders = orders.filter(
    (order) => order.status === "preparing"
  ).length;

  const activeOrders = orders.filter(
    (order) => order.status?.trim().toLowerCase() !== "cancelled"
  );

  const cancelledOrders = orders.filter(
    (order) => order.status?.trim().toLowerCase() === "cancelled"
  ).length;

  const revenue = activeOrders.reduce(
    (total, order) => total + Number(order.total),
    0
  );

  // Today's analytics
  const todayOrders = orders.filter((order) =>
    isToday(order.created_at)
  );

  const todaySales = todayOrders
    .filter((order) => order.status?.trim().toLowerCase() !== "cancelled")
    .reduce(
      (total, order) => total + Number(order.total),
      0
    );

  const todayDelivered = todayOrders.filter(
    (order) => order.status === "delivered"
  ).length;

  const todayPending = todayOrders.filter(
    (order) => order.status === "pending"
  ).length;

  // Best-selling items
  const bestSellingMap = new Map<
    string,
    BestSellingItem
  >();

  activeOrders.forEach((order) => {
    if (!order.items || !Array.isArray(order.items)) {
      return;
    }

    order.items.forEach((item) => {
      const name = item.name?.trim();

      if (!name) return;

      const quantity = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;

      const existing = bestSellingMap.get(name);

      if (existing) {
        existing.quantity += quantity;
        existing.sales += price * quantity;
      } else {
        bestSellingMap.set(name, {
          name,
          emoji: item.emoji || "🍽️",
          quantity,
          sales: price * quantity,
        });
      }
    });
  });

  const bestSellingItems = Array.from(
    bestSellingMap.values()
  )
    .sort((a, b) => {
      if (b.quantity !== a.quantity) {
        return b.quantity - a.quantity;
      }

      return b.sales - a.sales;
    })
    .slice(0, 5);

  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      statusFilter === "all" ||
      order.status === statusFilter;

    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return matchesStatus;
    }

    const matchesSearch =
      order.order_id
        .toLowerCase()
        .includes(query) ||
      order.customer_name
        .toLowerCase()
        .includes(query) ||
      order.customer_phone
        .toLowerCase()
        .includes(query) ||
      order.delivery_address
        .toLowerCase()
        .includes(query);

    return matchesStatus && matchesSearch;
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const formatStatus = (status: string) => {
    return status
      .split(" ")
      .map(
        (word) =>
          word.charAt(0).toUpperCase() +
          word.slice(1)
      )
      .join(" ");
  };

  const openDeliveryLocation = (
    lat: number | null,
    lng: number | null
  ) => {
    if (lat === null || lng === null) {
      return;
    }

    const googleMapsUrl =
      `https://www.google.com/maps/dir/?api=1` +
      `&destination=${lat},${lng}`;

    window.open(
      googleMapsUrl,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // -----------------------------
  // MENU MANAGEMENT
  // -----------------------------

  const resetMenuForm = () => {
    setEditingMenuId(null);
    setMenuName("");
    setMenuPrice("");
    setMenuEmoji("🍽️");
    setMenuCategory("Chinese");
    setMenuAvailable(true);
  };

  const openAddMenuForm = () => {
    resetMenuForm();
    setShowMenuForm(true);
    setMenuError("");
  };

  const openEditMenuForm = (item: MenuItem) => {
    setEditingMenuId(item.id);
    setMenuName(item.name);
    setMenuPrice(String(item.price));
    setMenuEmoji(item.emoji);
    setMenuCategory(item.category);
    setMenuAvailable(item.available);
    setShowMenuForm(true);
    setMenuError("");
  };

  const closeMenuForm = () => {
    setShowMenuForm(false);
    resetMenuForm();
  };

  const saveMenuItem = async () => {
    setMenuError("");

    if (!menuName.trim()) {
      setMenuError("Please enter food name.");
      return;
    }

    const price = Number(menuPrice);

    if (!menuPrice || Number.isNaN(price) || price < 0) {
      setMenuError("Please enter a valid price.");
      return;
    }

    if (!menuCategory.trim()) {
      setMenuError("Please select a category.");
      return;
    }

    setMenuSaving(true);

    if (editingMenuId !== null) {
      const { data, error } = await supabase
        .from("menu_items")
        .update({
          name: menuName.trim(),
          price,
          emoji: menuEmoji.trim() || "🍽️",
          category: menuCategory,
          available: menuAvailable,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingMenuId)
        .select("*")
        .single();

      if (error) {
        console.error("Menu update error:", error);
        setMenuError(
          "Unable to update food item. Please try again."
        );
        setMenuSaving(false);
        return;
      }

      setMenuItems((currentItems) =>
        currentItems.map((item) =>
          item.id === editingMenuId
            ? (data as MenuItem)
            : item
        )
      );
    } else {
      const { data, error } = await supabase
        .from("menu_items")
        .insert({
          name: menuName.trim(),
          price,
          emoji: menuEmoji.trim() || "🍽️",
          category: menuCategory,
          available: menuAvailable,
        })
        .select("*")
        .single();

      if (error) {
        console.error("Menu insert error:", error);
        setMenuError(
          "Unable to add food item. Please try again."
        );
        setMenuSaving(false);
        return;
      }

      setMenuItems((currentItems) => [
        ...currentItems,
        data as MenuItem,
      ]);
    }

    setMenuSaving(false);
    closeMenuForm();
  };

  const toggleMenuAvailability = async (
    item: MenuItem
  ) => {
    setMenuError("");

    const { data, error } = await supabase
      .from("menu_items")
      .update({
        available: !item.available,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .select("*")
      .single();

    if (error) {
      console.error(
        "Menu availability update error:",
        error
      );
      setMenuError(
        "Unable to change food availability."
      );
      return;
    }

    setMenuItems((currentItems) =>
      currentItems.map((currentItem) =>
        currentItem.id === item.id
          ? (data as MenuItem)
          : currentItem
      )
    );
  };

  const deleteMenuItem = async (item: MenuItem) => {
    const confirmed = window.confirm(
      `Delete "${item.name}" from the menu?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingMenuId(item.id);
    setMenuError("");

    const { error } = await supabase
      .from("menu_items")
      .delete()
      .eq("id", item.id);

    if (error) {
      console.error("Menu delete error:", error);
      setMenuError(
        "Unable to delete food item. Please try again."
      );
      setDeletingMenuId(null);
      return;
    }

    setMenuItems((currentItems) =>
      currentItems.filter(
        (currentItem) => currentItem.id !== item.id
      )
    );

    setDeletingMenuId(null);
  };

  if (authChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0f0d0b] text-white">
        <div className="text-center">
          <div className="mb-4 text-5xl">🔐</div>

          <p className="text-gray-400">
            Checking admin access...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f0d0b] px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold text-orange-400">
              YASH SAINI RESTAURANT
            </p>

            <h1 className="mt-2 text-3xl font-bold md:text-4xl">
              Admin Dashboard
            </h1>

            <p className="mt-2 text-gray-400">
              Manage your restaurant orders from one place.
            </p>

            <div className="mt-3 flex items-center gap-2 text-sm">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  realtimeConnected
                    ? "bg-green-400"
                    : "bg-red-400"
                }`}
              />

              <span className="text-gray-400">
                {realtimeConnected
                  ? "Live updates connected"
                  : "Live updates disconnected"}
              </span>
            </div>

            {/* Restaurant Open / Closed Status */}
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-300">
                    Restaurant Status
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {restaurantSettings?.is_open
                      ? "Customers can place new orders."
                      : "Customers cannot place new orders."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={toggleRestaurantStatus}
                  disabled={
                    restaurantStatusLoading ||
                    restaurantStatusSaving ||
                    !restaurantSettings
                  }
                  className={`rounded-xl px-5 py-3 font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    restaurantSettings?.is_open
                      ? "bg-green-500/10 text-green-300 hover:bg-green-500/20"
                      : "bg-red-500/10 text-red-300 hover:bg-red-500/20"
                  }`}
                >
                  {restaurantStatusLoading
                    ? "Loading..."
                    : restaurantStatusSaving
                    ? "Saving..."
                    : restaurantSettings?.is_open
                    ? "🟢 Open — Click to Close"
                    : "🔴 Closed — Click to Open"}
                </button>
              </div>

              {restaurantStatusError && (
                <p className="mt-3 text-sm text-red-300">
                  {restaurantStatusError}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                fetchOrders();
                fetchMenuItems();
                fetchRestaurantSettings();
              }}
              disabled={loading || menuLoading}
              className="rounded-xl bg-orange-500 px-5 py-3 font-bold text-black transition hover:bg-orange-400 disabled:opacity-50"
            >
              {loading || menuLoading
                ? "Refreshing..."
                : "↻ Refresh"}
            </button>

            <button
              onClick={handleLogout}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-bold transition hover:bg-white/10"
            >
              Logout
            </button>
          </div>
        </div>

        {/* New Order Alert */}
        {newOrderAlert && (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-green-500/30 bg-green-500/10 px-5 py-4">
            <div>
              <p className="font-bold text-green-300">
                🔔 New Order Received!
              </p>

              <p className="mt-1 text-sm text-green-200/70">
                A new customer order has just arrived.
              </p>
            </div>

            <button
              onClick={() => setNewOrderAlert(false)}
              className="text-green-300 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Overall Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">

          <div className="rounded-2xl border border-white/10 bg-[#171310] p-5">
            <p className="text-sm text-gray-400">
              Total Orders
            </p>

            <p className="mt-2 text-3xl font-bold">
              {totalOrders}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#171310] p-5">
            <p className="text-sm text-gray-400">
              Pending
            </p>

            <p className="mt-2 text-3xl font-bold">
              {pendingOrders}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#171310] p-5">
            <p className="text-sm text-gray-400">
              Preparing
            </p>

            <p className="mt-2 text-3xl font-bold">
              {preparingOrders}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#171310] p-5">
            <p className="text-sm text-gray-400">
              Total Revenue
            </p>

            <p className="mt-2 text-3xl font-bold">
              ₹{revenue.toFixed(0)}
            </p>
          </div>

        </div>

        {/* Today's Business */}
        <section className="mb-8 rounded-3xl border border-white/10 bg-[#171310] p-6">

          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-orange-400">
              Business Today
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Today&apos;s Business
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              Quick overview of today&apos;s restaurant performance.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm text-gray-400">
                Today&apos;s Orders
              </p>

              <p className="mt-2 text-3xl font-black">
                {todayOrders.length}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm text-gray-400">
                Today&apos;s Sales
              </p>

              <p className="mt-2 text-3xl font-black text-orange-400">
                ₹{todaySales.toFixed(0)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm text-gray-400">
                Delivered Today
              </p>

              <p className="mt-2 text-3xl font-black">
                {todayDelivered}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm text-gray-400">
                Pending Today
              </p>

              <p className="mt-2 text-3xl font-black">
                {todayPending}
              </p>
            </div>

          </div>
        </section>

        {/* Best Selling Items */}
        <section className="mb-8 rounded-3xl border border-white/10 bg-[#171310] p-6">

          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-orange-400">
              Food Performance
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              🏆 Best-Selling Items
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              Top 5 items based on total quantity sold across recorded orders.
            </p>
          </div>

          {bestSellingItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
              <div className="text-5xl">🍽️</div>

              <p className="mt-4 font-semibold">
                No food sales data yet
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Best-selling items will appear after orders are placed.
              </p>
            </div>
          ) : (
            <div className="space-y-3">

              {bestSellingItems.map((item, index) => (
                <div
                  key={item.name}
                  className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                >

                  <div className="flex items-center gap-4">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500/10 font-black text-orange-400">
                      {index === 0
                        ? "🥇"
                        : index === 1
                        ? "🥈"
                        : index === 2
                        ? "🥉"
                        : `#${index + 1}`}
                    </div>

                    <div className="text-3xl">
                      {item.emoji}
                    </div>

                    <div>
                      <p className="font-bold">
                        {item.name}
                      </p>

                      <p className="mt-1 text-sm text-gray-400">
                        {item.quantity}{" "}
                        {item.quantity === 1
                          ? "item"
                          : "items"}{" "}
                        sold
                      </p>
                    </div>

                  </div>

                  <div className="sm:text-right">
                    <p className="text-lg font-black text-orange-400">
                      ₹{item.sales.toFixed(0)}
                    </p>

                    <p className="text-xs text-gray-500">
                      Item sales
                    </p>
                  </div>

                </div>
              ))}

            </div>
          )}
        </section>

        {/* MENU MANAGEMENT */}
        <section className="mb-8 rounded-3xl border border-white/10 bg-[#171310] p-6">

          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-orange-400">
                Restaurant Menu
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                🍜 Menu Management
              </h2>

              <p className="mt-1 text-sm text-gray-400">
                Add, edit, remove and control food availability.
              </p>
            </div>

            <button
              onClick={openAddMenuForm}
              className="rounded-xl bg-orange-500 px-5 py-3 font-bold text-black transition hover:bg-orange-400"
            >
              + Add Food
            </button>

          </div>

          {/* Menu Form */}
          {showMenuForm && (
            <div className="mb-6 rounded-2xl border border-orange-500/20 bg-black/20 p-5">

              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">
                    {editingMenuId !== null
                      ? "✏️ Edit Food"
                      : "➕ Add New Food"}
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    Enter the food details below.
                  </p>
                </div>

                <button
                  onClick={closeMenuForm}
                  className="rounded-lg px-3 py-2 text-gray-400 hover:bg-white/10 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-300">
                    Food Name
                  </label>

                  <input
                    type="text"
                    value={menuName}
                    onChange={(e) =>
                      setMenuName(e.target.value)
                    }
                    placeholder="e.g. Chicken Hakka Noodles"
                    className="w-full rounded-xl border border-white/10 bg-[#211c18] px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-300">
                    Price
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={menuPrice}
                    onChange={(e) =>
                      setMenuPrice(e.target.value)
                    }
                    placeholder="189"
                    className="w-full rounded-xl border border-white/10 bg-[#211c18] px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-300">
                    Emoji
                  </label>

                  <input
                    type="text"
                    value={menuEmoji}
                    onChange={(e) =>
                      setMenuEmoji(e.target.value)
                    }
                    placeholder="🍜"
                    className="w-full rounded-xl border border-white/10 bg-[#211c18] px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-300">
                    Category
                  </label>

                  <select
                    value={menuCategory}
                    onChange={(e) =>
                      setMenuCategory(e.target.value)
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#211c18] px-4 py-3 text-white outline-none focus:border-orange-500"
                  >
                    {menuCategories.map((category) => (
                      <option
                        key={category}
                        value={category}
                        className="bg-[#211c18]"
                      >
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <input
                  type="checkbox"
                  checked={menuAvailable}
                  onChange={(e) =>
                    setMenuAvailable(e.target.checked)
                  }
                  className="h-4 w-4 accent-orange-500"
                />

                <span>
                  <span className="block font-semibold">
                    Food Available
                  </span>

                  <span className="text-xs text-gray-500">
                    Customers can see this item when enabled.
                  </span>
                </span>
              </label>

              {menuError && (
                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {menuError}
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-3">

                <button
                  onClick={saveMenuItem}
                  disabled={menuSaving}
                  className="rounded-xl bg-orange-500 px-5 py-3 font-bold text-black transition hover:bg-orange-400 disabled:opacity-50"
                >
                  {menuSaving
                    ? "Saving..."
                    : editingMenuId !== null
                    ? "Save Changes"
                    : "Add Food"}
                </button>

                <button
                  onClick={closeMenuForm}
                  disabled={menuSaving}
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-bold text-gray-300 transition hover:bg-white/10"
                >
                  Cancel
                </button>

              </div>

            </div>
          )}

          {/* Menu Error */}
          {menuError && !showMenuForm && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
              {menuError}
            </div>
          )}

          {/* Menu List */}
          {menuLoading ? (
            <div className="py-12 text-center text-gray-400">
              Loading menu...
            </div>
          ) : menuItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">

              <div className="mb-4 text-5xl">
                🍽️
              </div>

              <h3 className="text-xl font-bold">
                No menu items yet
              </h3>

              <p className="mt-2 text-gray-400">
                Click &quot;+ Add Food&quot; to create your first menu item.
              </p>

            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">

              {menuItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-5"
                >

                  <div className="flex items-start justify-between gap-4">

                    <div className="flex min-w-0 items-center gap-4">

                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-3xl">
                        {item.emoji}
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate font-bold">
                          {item.name}
                        </h3>

                        <p className="mt-1 text-sm text-gray-500">
                          {item.category}
                        </p>

                        <p className="mt-1 font-black text-orange-400">
                          ₹{Number(item.price).toFixed(0)}
                        </p>
                      </div>

                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                        item.available
                          ? "bg-green-500/10 text-green-300"
                          : "bg-red-500/10 text-red-300"
                      }`}
                    >
                      {item.available
                        ? "Available"
                        : "Unavailable"}
                    </span>

                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2">

                    <button
                      onClick={() =>
                        openEditMenuForm(item)
                      }
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold transition hover:bg-white/10"
                    >
                      ✏️ Edit
                    </button>

                    <button
                      onClick={() =>
                        toggleMenuAvailability(item)
                      }
                      className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                        item.available
                          ? "bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20"
                          : "bg-green-500/10 text-green-300 hover:bg-green-500/20"
                      }`}
                    >
                      {item.available
                        ? "🔴 Hide"
                        : "🟢 Show"}
                    </button>

                    <button
                      onClick={() =>
                        deleteMenuItem(item)
                      }
                      disabled={
                        deletingMenuId === item.id
                      }
                      className="rounded-xl bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                    >
                      {deletingMenuId === item.id
                        ? "..."
                        : "🗑️ Delete"}
                    </button>

                  </div>

                </div>
              ))}

            </div>
          )}

        </section>

        {/* Error */}
        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
            {errorMessage}
          </div>
        )}

        {/* Orders */}
        <section className="rounded-3xl border border-white/10 bg-[#171310] p-6">

          <div className="mb-6">
            <h2 className="text-2xl font-bold">
              Recent Orders
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              Search, filter and manage customer orders.
            </p>
          </div>

          {/* Search + Filters */}
          <div className="mb-6 space-y-4">

            <input
              type="text"
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(e.target.value)
              }
              placeholder="Search order ID, customer, phone or address..."
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-white outline-none placeholder:text-gray-600 focus:border-orange-500"
            />

            <div className="flex flex-wrap gap-2">

              {STATUS_FILTERS.map((status) => (
                <button
                  key={status}
                  onClick={() =>
                    setStatusFilter(status)
                  }
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    statusFilter === status
                      ? "bg-orange-500 text-black"
                      : "border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  {status === "all"
                    ? "All"
                    : formatStatus(status)}
                </button>
              ))}

            </div>

            {(searchQuery ||
              statusFilter !== "all") && (
              <p className="text-sm text-gray-500">
                Showing {filteredOrders.length} of{" "}
                {orders.length} orders
              </p>
            )}

          </div>

          {loading ? (
            <div className="py-12 text-center text-gray-400">
              Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">

              <div className="mb-4 text-5xl">
                📦
              </div>

              <h3 className="text-xl font-bold">
                No orders yet
              </h3>

              <p className="mt-2 text-gray-400">
                Customer orders will appear here.
              </p>

            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">

              <div className="mb-4 text-5xl">
                🔎
              </div>

              <h3 className="text-xl font-bold">
                No matching orders
              </h3>

              <p className="mt-2 text-gray-400">
                Try changing your search or status filter.
              </p>

            </div>
          ) : (
            <div className="space-y-4">

              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-5"
                >

                  {/* Order Header */}
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                    <div>
                      <p className="font-bold text-orange-400">
                        {order.order_id}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {formatDate(order.created_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">

                      <span className="hidden text-sm text-gray-500 sm:inline">
                        Status
                      </span>

                      <select
                        value={order.status}
                        onChange={(e) =>
                          updateOrderStatus(
                            order.id,
                            e.target.value
                          )
                        }
                        disabled={
                          updatingOrderId === order.id ||
                          order.status?.trim().toLowerCase() === "cancelled"
                        }
                        className="rounded-xl border border-white/10 bg-[#211c18] px-4 py-2 font-semibold text-white outline-none focus:border-orange-500 disabled:opacity-50"
                      >
                        {STATUS_OPTIONS.map(
                          (status) => (
                            <option
                              key={status}
                              value={status}
                              className="bg-[#211c18]"
                            >
                              {formatStatus(status)}
                            </option>
                          )
                        )}
                      </select>

                      {order.status?.trim().toLowerCase() === "cancelled" && (
                        <span className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300">
                          Final
                        </span>
                      )}

                    </div>

                  </div>

                  <div className="my-4 border-t border-white/10" />

                  {order.status?.trim().toLowerCase() === "cancelled" && (
                    <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
                      ❌ This order was cancelled by the customer. It is not included in sales/revenue analytics.
                    </div>
                  )}

                  {/* Customer + Address */}
                  <div className="grid gap-4 md:grid-cols-2">

                    <div>
                      <p className="text-sm text-gray-500">
                        Customer
                      </p>

                      <p className="mt-1 font-semibold">
                        {order.customer_name}
                      </p>

                      <a
                        href={`tel:${order.customer_phone}`}
                        className="mt-1 inline-block text-gray-400 transition hover:text-orange-400"
                      >
                        {order.customer_phone}
                      </a>

                      <div className="mt-3">
                        <a
                          href={`tel:${order.customer_phone}`}
                          className="inline-flex rounded-xl bg-green-500/10 px-4 py-2 text-sm font-bold text-green-300 transition hover:bg-green-500/20"
                        >
                          📞 Call Customer
                        </a>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">
                        Delivery Address
                      </p>

                      <p className="mt-1 font-semibold">
                        {order.delivery_address}
                      </p>

                      {order.distance_km !== null && (
                        <p className="mt-1 text-sm text-gray-400">
                          📍{" "}
                          {Number(
                            order.distance_km
                          ).toFixed(2)}{" "}
                          km
                        </p>
                      )}

                      {order.customer_lat !== null &&
                        order.customer_lng !== null && (
                          <button
                            type="button"
                            onClick={() =>
                              openDeliveryLocation(
                                order.customer_lat,
                                order.customer_lng
                              )
                            }
                            className="mt-3 rounded-xl bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-300 transition hover:bg-orange-500/20"
                          >
                            📍 Open Location
                          </button>
                        )}
                    </div>

                  </div>

                  {/* Items */}
                  <div className="mt-5">

                    <p className="mb-2 text-sm text-gray-500">
                      Ordered Items
                    </p>

                    <div className="space-y-2">

                      {order.items?.map(
                        (item, index) => (
                          <div
                            key={`${order.id}-${index}`}
                            className="flex items-center justify-between gap-3"
                          >

                            <div className="flex items-center gap-2">

                              <span>
                                {item.emoji}
                              </span>

                              <span>
                                {item.name} ×{" "}
                                {item.quantity}
                              </span>

                            </div>

                            <span className="text-gray-400">
                              ₹
                              {Number(
                                item.price
                              ) *
                                Number(
                                  item.quantity
                                )}
                            </span>

                          </div>
                        )
                      )}

                    </div>

                  </div>

                  {/* Total */}
                  <div className="mt-5 border-t border-white/10 pt-4">

                    <div className="flex justify-between text-sm text-gray-400">
                      <span>Subtotal</span>

                      <span>
                        ₹
                        {Number(
                          order.subtotal
                        ).toFixed(0)}
                      </span>
                    </div>

                    <div className="mt-2 flex justify-between text-sm text-gray-400">
                      <span>Delivery</span>

                      <span>
                        {Number(
                          order.delivery_charge
                        ) === 0
                          ? "FREE"
                          : `₹${Number(
                              order.delivery_charge
                            ).toFixed(0)}`}
                      </span>
                    </div>

                    <div className="mt-3 flex justify-between text-xl font-bold">

                      <span>Total</span>

                      <span className="text-orange-400">
                        ₹
                        {Number(
                          order.total
                        ).toFixed(0)}
                      </span>

                    </div>

                  </div>

                </div>
              ))}

            </div>
          )}

        </section>

      </div>
    </main>
  );
}
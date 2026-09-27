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
  user_id: string | null;
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
  payment_method?: "cod" | "online" | string | null;
  razorpay_payment_id?: string | null;
  razorpay_refund_id?: string | null;
  refund_status?: string | null;
  order_type?: "asap" | "scheduled" | string | null;
  scheduled_for?: string | null;
  items: OrderItem[];
  created_at: string;
  delivery_boy_id?: string | null;
  delivery_assigned_at?: string | null;
  picked_up_at?: string | null;
  delivery_arrived_at?: string | null;
  delivered_at?: string | null;
  cod_collected_amount?: number | null;
  cod_collected_at?: string | null;
};

type BestSellingItem = {
  name: string;
  emoji: string;
  quantity: number;
  sales: number;
  image?: string;
};

type MenuItem = {
  id: number;
  image?: string;
  name: string;
  price: number;
  emoji: string;
  category: string;
  available: boolean;
  created_at: string;
  updated_at: string;
};


type Coupon = {
  id: number;
  code: string;
  title: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  minimum_order_amount: number;
  maximum_discount_amount: number | null;
  usage_limit: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type RestaurantSettings = {
  id: number;
  is_open: boolean;
};

type CustomerSummary = {
  key: string;
  userId: string | null;
  name: string;
  phone: string;
  orders: Order[];
  totalSpent: number;
  lastOrderAt: string;
};

type AdminReview = {
  id: string;
  order_id: number;
  user_id: string;
  rating: number;
  review_text: string | null;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  customer_name: string;
  customer_phone: string;
  display_order_id: string;
  order_total: number;
};

const STATUS_OPTIONS = [
  "pending",
  "preparing",
  "ready",
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

const FOOD_IMAGES: Record<string, string> = {
  "Veg Momos": "/images/veg-momos.jpg",
  "Paneer Momos": "/images/paneer-momos.webp",
  "Chilli Potato": "/images/chilli-potato.jpg",
  "Veg Noodles": "/images/veg-noodles.webp",
  "Hakka Noodles": "/images/hakka-noodles.webp",
  "Fried Rice": "/images/fried-rice.jpg",
  "Paneer Fried Rice": "/images/paneer-fried-rice.jpg",
  "Chilli Paneer": "/images/chilli-paneer.jpg",
  "Veg Burger": "/images/veg-burger.jpeg",
  "Paneer Burger": "/images/paneer-burger.webp",
  "Veg Pizza": "/images/veg-pizza.jpg",
  "Paneer Pizza": "/images/paneer-pizza.jpg",
  "French Fries": "/images/french-fries.jpg",
  "Cold Drink": "/images/cold-drink.webp",
  "Veg Thali": "/images/veg-thali.jpg",
  "Paneer Thali": "/images/paneer-thali.jpg",
  "Veg Combo": "/images/veg-combo.jpg",
  "Gulab Jamun": "/images/gulab-jamun.jpg",
};

const getFoodImage = (name: string) =>
  FOOD_IMAGES[name.trim()] ?? null;

function playAdminNotificationSound() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;

    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    oscillator.frequency.setValueAtTime(
      1174,
      context.currentTime + 0.12
    );

    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.14,
      context.currentTime + 0.02
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime + 0.38
    );

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.38);

    window.setTimeout(() => {
      void context.close();
    }, 500);
  } catch {
    // Browser audio can be blocked until a user gesture.
  }
}

async function showAdminBrowserNotification(
  title: string,
  body: string
) {
  try {
    if (!("Notification" in window)) return;

    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }

    if (Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
      });
    }
  } catch {
    // Ignore browser notification restrictions.
  }
}

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [updatingOrderId, setUpdatingOrderId] =
    useState<number | null>(null);
  const [refundingOrderId, setRefundingOrderId] =
    useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orderDateFilter, setOrderDateFilter] = useState("today");

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

  // Delivery management
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
  };

  const [deliveryBoys, setDeliveryBoys] = useState<DeliveryBoy[]>([]);
  const [deliveryBoysLoading, setDeliveryBoysLoading] = useState(true);
  const [assigningOrderId, setAssigningOrderId] = useState<number | null>(null);
  const [deliveryError, setDeliveryError] = useState("");
  const [editingDeliveryBoy, setEditingDeliveryBoy] = useState<DeliveryBoy | null>(null);
  const [deliveryBoyName, setDeliveryBoyName] = useState("");
  const [deliveryBoyPhone, setDeliveryBoyPhone] = useState("");
  const [deliveryBoyVehicleType, setDeliveryBoyVehicleType] = useState("");
  const [deliveryBoyVehicleNumber, setDeliveryBoyVehicleNumber] = useState("");
  const [deliveryBoySaving, setDeliveryBoySaving] = useState(false);


  // Coupons & Offers
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponLoading, setCouponLoading] = useState(true);
  const [couponError, setCouponError] = useState("");
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState<number | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponTitle, setCouponTitle] = useState("");
  const [couponDescription, setCouponDescription] = useState("");
  const [couponDiscountType, setCouponDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [couponDiscountValue, setCouponDiscountValue] = useState("");
  const [couponMinimumOrder, setCouponMinimumOrder] = useState("0");
  const [couponMaximumDiscount, setCouponMaximumDiscount] = useState("");
  const [couponUsageLimit, setCouponUsageLimit] = useState("");
  const [couponStartsAt, setCouponStartsAt] = useState("");
  const [couponExpiresAt, setCouponExpiresAt] = useState("");
  const [couponActive, setCouponActive] = useState(true);
  const [couponSaving, setCouponSaving] = useState(false);
  const [deletingCouponId, setDeletingCouponId] = useState<number | null>(null);

  // Customer Management
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null);

  // Reviews Management
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState("");
  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [updatingReviewId, setUpdatingReviewId] = useState<string | null>(null);

  // Delivery Reports
  const [deliveryReportPeriod, setDeliveryReportPeriod] = useState("today");
  const [deliveryReportSearch, setDeliveryReportSearch] = useState("");

  // Delivery Partner Settlement
  const [settlementPeriod, setSettlementPeriod] = useState("today");
  const [settlementSearch, setSettlementSearch] = useState("");

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
      try {
        // Get the currently authenticated Supabase user.
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        // No valid authenticated user.
        if (userError || !user) {
          await supabase.auth.signOut({ scope: "local" });
          window.location.replace("/admin/login");
          return;
        }

        // IMPORTANT:
        // A valid Supabase session does NOT automatically mean
        // that the user is an admin.
        //
        // The user's Auth UID must exist in public.admin_users.
        const { data: adminUser, error: adminError } = await supabase
          .from("admin_users")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (adminError) {
          console.error("Admin access verification error:", adminError);

          await supabase.auth.signOut({ scope: "local" });
          window.location.replace("/admin/login");
          return;
        }

        // Authenticated user, but not an admin.
        if (!adminUser) {
          await supabase.auth.signOut({ scope: "local" });
          window.location.replace("/admin/login");
          return;
        }

        // Verified admin.
        setAuthChecking(false);
      } catch (error) {
        console.error("Admin auth check error:", error);

        await supabase.auth.signOut({ scope: "local" });
        window.location.replace("/admin/login");
      }
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

  const createRefundNotification = async (
    order: Order,
    refundStatus: string
  ) => {
    if (!order.user_id) {
      return;
    }

    const normalizedStatus = String(refundStatus).toLowerCase();

    let title = "Refund Update";
    let message = `Refund status for your order ${order.order_id}: ${refundStatus}.`;
    let type = "info";

    if (normalizedStatus === "processed") {
      // Razorpay has completed the refund. Remove the temporary
      // "Refund Processing" notification before creating the final one.
      const { error: cleanupError } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", order.user_id)
        .eq("order_id", order.order_id)
        .eq("type", "refund")
        .eq("title", "Refund Processing");

      if (cleanupError) {
        console.error(
          "Refund processing notification cleanup error:",
          cleanupError
        );
      }

      title = "Payment Refunded";
      message = `Your refund of ₹${Number(order.total).toFixed(0)} for order ${order.order_id} has been processed successfully through Razorpay.`;
      type = "refund";
    } else if (normalizedStatus === "pending") {
      title = "Refund Processing";
      message = `Your refund of ₹${Number(order.total).toFixed(0)} for order ${order.order_id} is being processed through Razorpay.`;
      type = "refund";
    } else if (normalizedStatus === "failed") {
      title = "Refund Failed";
      message = `We could not complete the refund for order ${order.order_id}. Please contact YASH SAINI RESTAURANT for assistance.`;
      type = "refund";
    }

    // Do not create the same refund notification more than once.
    const { data: existingNotification, error: existingError } =
      await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", order.user_id)
        .eq("order_id", order.order_id)
        .eq("type", type)
        .eq("title", title)
        .limit(1)
        .maybeSingle();

    if (existingError) {
      console.error("Refund notification lookup error:", existingError);
    }

    if (existingNotification) {
      return;
    }

    const { error } = await supabase.from("notifications").insert({
      user_id: order.user_id,
      order_id: order.order_id,
      title,
      message,
      type,
    });

    if (error) {
      console.error("Refund notification error:", error);
    }
  };

  const syncRefundStatuses = async (orderList: Order[]) => {
    const refundableOrders = orderList.filter(
      (order) =>
        order.payment_method === "online" &&
        order.status === "cancelled" &&
        order.razorpay_payment_id &&
        order.razorpay_refund_id &&
        order.refund_status &&
        order.refund_status !== "processed" &&
        order.refund_status !== "failed"
    );

    if (refundableOrders.length === 0) {
      return orderList;
    }

    const syncedOrders = await Promise.all(
      refundableOrders.map(async (order) => {
        try {
          const response = await fetch("/api/razorpay/refund/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              payment_id: order.razorpay_payment_id,
              refund_id: order.razorpay_refund_id,
            }),
            cache: "no-store",
          });

          const data = await response.json();

          if (!response.ok || !data.success || !data.status) {
            console.error("Refund status sync error:", data);
            return order;
          }

          const nextStatus = String(data.status);

          if (nextStatus === order.refund_status) {
            return order;
          }

          const { data: updatedOrder, error } = await supabase
            .from("orders")
            .update({
              refund_status: nextStatus,
            })
            .eq("id", order.id)
            .select("*")
            .single();

          if (error) {
            console.error("Refund status database update error:", error);
            return order;
          }

          await createRefundNotification(
            updatedOrder as Order,
            nextStatus
          );

          return updatedOrder as Order;
        } catch (error) {
          console.error("Refund status sync request error:", error);
          return order;
        }
      })
    );

    const syncedMap = new Map(
      syncedOrders.map((order) => [order.id, order])
    );

    return orderList.map((order) => syncedMap.get(order.id) || order);
  };

  const fetchDeliveryBoys = async () => {
    setDeliveryBoysLoading(true);
    setDeliveryError("");

    const { data, error } = await supabase
      .from("delivery_boys")
      .select("id, full_name, phone, vehicle_type, vehicle_number, is_active, is_available, current_lat, current_lng, last_location_at")
      .order("full_name", { ascending: true });

    if (error) {
      console.error("Delivery boys fetch error:", error);
      setDeliveryError("Unable to load delivery partners.");
      setDeliveryBoys([]);
    } else {
      setDeliveryBoys((data || []) as DeliveryBoy[]);
    }

    setDeliveryBoysLoading(false);
  };

  const openDeliveryBoyEditor = (boy: DeliveryBoy) => {
    setEditingDeliveryBoy(boy);
    setDeliveryBoyName(boy.full_name || "");
    setDeliveryBoyPhone(boy.phone || "");
    setDeliveryBoyVehicleType(boy.vehicle_type || "");
    setDeliveryBoyVehicleNumber(boy.vehicle_number || "");
    setDeliveryError("");
  };

  const closeDeliveryBoyEditor = () => {
    if (deliveryBoySaving) return;
    setEditingDeliveryBoy(null);
    setDeliveryBoyName("");
    setDeliveryBoyPhone("");
    setDeliveryBoyVehicleType("");
    setDeliveryBoyVehicleNumber("");
  };

  const saveDeliveryBoyProfile = async () => {
    if (!editingDeliveryBoy) return;

    const name = deliveryBoyName.trim();
    const phone = deliveryBoyPhone.trim();
    const vehicleType = deliveryBoyVehicleType.trim();
    const vehicleNumber = deliveryBoyVehicleNumber.trim();

    if (!name) {
      setDeliveryError("Delivery partner name is required.");
      return;
    }

    setDeliveryBoySaving(true);
    setDeliveryError("");

    const { data, error } = await supabase
      .from("delivery_boys")
      .update({
        full_name: name,
        phone: phone || null,
        vehicle_type: vehicleType || null,
        vehicle_number: vehicleNumber || null,
      })
      .eq("id", editingDeliveryBoy.id)
      .select("id, full_name, phone, vehicle_type, vehicle_number, is_active, is_available, current_lat, current_lng, last_location_at")
      .single();

    if (error) {
      console.error("Delivery partner profile update error:", error);
      setDeliveryError(error.message || "Unable to update delivery partner.");
    } else {
      setDeliveryBoys((current) =>
        current.map((boy) => boy.id === editingDeliveryBoy.id ? (data as DeliveryBoy) : boy)
      );
      closeDeliveryBoyEditor();
    }

    setDeliveryBoySaving(false);
  };

  const toggleDeliveryBoyActive = async (boy: DeliveryBoy) => {
    const nextActive = !boy.is_active;

    if (!nextActive && boy.is_available) {
      const activeOrder = getActiveDeliveryOrder(boy.id);
      if (activeOrder) {
        setDeliveryError("This partner has an active delivery. They cannot be deactivated until it is completed.");
        return;
      }
    }

    setDeliveryError("");
    const { data, error } = await supabase
      .from("delivery_boys")
      .update({
        is_active: nextActive,
        ...(nextActive ? {} : { is_available: false }),
      })
      .eq("id", boy.id)
      .select("id, full_name, phone, vehicle_type, vehicle_number, is_active, is_available, current_lat, current_lng, last_location_at")
      .single();

    if (error) {
      console.error("Delivery partner status update error:", error);
      setDeliveryError(error.message || "Unable to update partner status.");
      return;
    }

    setDeliveryBoys((current) =>
      current.map((item) => item.id === boy.id ? (data as DeliveryBoy) : item)
    );
  };

  const assignDeliveryBoy = async (
    order: Order,
    deliveryBoyId: string | null
  ) => {
    if (order.status !== "ready") {
      setDeliveryError(
        "A delivery partner can only be assigned when the order is Ready."
      );
      return;
    }

    if (!deliveryBoyId) {
      setDeliveryError("Please select a delivery partner.");
      return;
    }

    const selectedBoy = deliveryBoys.find(
      (boy) => boy.id === deliveryBoyId
    );

    if (!selectedBoy || !selectedBoy.is_active) {
      setDeliveryError("This delivery partner is not active.");
      return;
    }

    if (!selectedBoy.is_available) {
      setDeliveryError(
        "This delivery partner is currently unavailable."
      );
      return;
    }

    setAssigningOrderId(order.id);
    setDeliveryError("");
    setErrorMessage("");

    const { data, error } = await supabase
      .from("orders")
      .update({
        delivery_boy_id: deliveryBoyId,
        delivery_assigned_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .eq("status", "ready")
      .select("*")
      .single();

    if (error) {
      console.error("Delivery assignment error:", error);
      setDeliveryError(
        "Unable to assign this delivery partner."
      );
      setAssigningOrderId(null);
      return;
    }

    setOrders((currentOrders) =>
      currentOrders.map((currentOrder) =>
        currentOrder.id === order.id
          ? (data as Order)
          : currentOrder
      )
    );

    await fetchDeliveryBoys();
    setAssigningOrderId(null);
  };

  const fetchReviews = async () => {
    setReviewsLoading(true);
    setReviewsError("");

    const { data: reviewData, error: reviewError } = await supabase
      .from("reviews")
      .select("id, order_id, user_id, rating, review_text, is_visible, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (reviewError) {
      console.error("Reviews fetch error:", reviewError);
      setReviewsError("Unable to load customer reviews.");
      setReviews([]);
      setReviewsLoading(false);
      return;
    }

    const rawReviews = (reviewData || []) as Array<{
      id: string;
      order_id: number;
      user_id: string;
      rating: number;
      review_text: string | null;
      is_visible: boolean;
      created_at: string;
      updated_at: string;
    }>;

    if (rawReviews.length === 0) {
      setReviews([]);
      setReviewsLoading(false);
      return;
    }

    const orderIds = rawReviews.map((review) => review.order_id);
    const { data: reviewOrders, error: orderError } = await supabase
      .from("orders")
      .select("id, order_id, customer_name, customer_phone, total")
      .in("id", orderIds);

    if (orderError) {
      console.error("Review order details error:", orderError);
      setReviewsError("Reviews loaded, but order details could not be loaded.");
    }

    const orderMap = new Map<number, {
      order_id: string;
      customer_name: string;
      customer_phone: string;
      total: number;
    }>();

    for (const order of reviewOrders || []) {
      orderMap.set(Number(order.id), {
        order_id: String(order.order_id),
        customer_name: order.customer_name || "Customer",
        customer_phone: order.customer_phone || "Phone not available",
        total: Number(order.total || 0),
      });
    }

    setReviews(
      rawReviews.map((review) => {
        const order = orderMap.get(Number(review.order_id));

        return {
          ...review,
          customer_name: order?.customer_name || "Customer",
          customer_phone: order?.customer_phone || "Phone not available",
          display_order_id: order?.order_id || String(review.order_id),
          order_total: order?.total || 0,
        };
      })
    );

    setReviewsLoading(false);
  };

  const toggleReviewVisibility = async (review: AdminReview) => {
    setUpdatingReviewId(review.id);
    setReviewsError("");

    const { data, error } = await supabase
      .from("reviews")
      .update({ is_visible: !review.is_visible })
      .eq("id", review.id)
      .select("id, is_visible")
      .single();

    if (error) {
      console.error("Review moderation error:", error);
      setReviewsError("Unable to update review visibility.");
    } else {
      setReviews((current) =>
        current.map((item) =>
          item.id === review.id
            ? { ...item, is_visible: Boolean(data.is_visible) }
            : item
        )
      );
    }

    setUpdatingReviewId(null);
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
      const loadedOrders = (data || []) as Order[];
      setOrders(loadedOrders);

      const syncedOrders = await syncRefundStatuses(loadedOrders);
      setOrders(syncedOrders);
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
      setMenuItems(
        (data || []).map((item: any) => ({
          ...item,
          image: getFoodImage(item.name),
        })) as MenuItem[]
      );
    }

    setMenuLoading(false);
  };


  const fetchCoupons = async () => {
    setCouponLoading(true);
    setCouponError("");

    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Coupons fetch error:", error);
      setCouponError("Unable to load coupons and offers.");
      setCoupons([]);
    } else {
      setCoupons((data || []) as Coupon[]);
    }

    setCouponLoading(false);
  };

  useEffect(() => {
    if (!authChecking) {
      fetchOrders();
      fetchMenuItems();
      fetchRestaurantSettings();
      fetchCoupons();
      fetchDeliveryBoys();
      fetchReviews();
    }
  }, [authChecking]);

  // Realtime review updates
  useEffect(() => {
    if (authChecking) return;

    const channel = supabase
      .channel("admin-reviews-live")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "reviews",
        },
        () => {
          void fetchReviews();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "reviews",
        },
        () => {
          void fetchReviews();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
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
          playAdminNotificationSound();

          void showAdminBrowserNotification(
            "New order received",
            `Order #${newOrder.order_id} has just been placed.`
          );

          window.setTimeout(() => {
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

    const deliveryChannel = supabase
      .channel("admin-delivery-boys-live")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "delivery_boys" },
        (payload) => {
          const updatedBoy = payload.new as DeliveryBoy;
          setDeliveryBoys((current) =>
            current.map((boy) =>
              boy.id === updatedBoy.id ? { ...boy, ...updatedBoy } : boy
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(deliveryChannel);
    };
  }, [authChecking]);

  const refundOnlineOrder = async (order: Order) => {
    if (order.payment_method !== "online") return;

    const refundStatus = String(order.refund_status || "").toLowerCase();

    // Safety guard: never send another refund request while an existing
    // refund is pending or has already been processed.
    if (refundStatus === "pending") {
      setErrorMessage(
        `Refund for order ${order.order_id} is already being processed.`
      );
      return;
    }

    if (refundStatus === "processed") {
      setErrorMessage(
        `Refund for order ${order.order_id} has already been processed.`
      );
      return;
    }

    if (order.status !== "cancelled") {
      setErrorMessage(
        "An online refund can only be started after the order is cancelled."
      );
      return;
    }

    if (!order.razorpay_payment_id) {
      setErrorMessage("Refund cannot be started because the payment ID is missing.");
      return;
    }

    const confirmed = window.confirm(
      `Refund online payment for order ${order.order_id}?\n\nAmount: ₹${Number(order.total).toFixed(0)}\n\nThis will send a refund request to Razorpay.`
    );

    if (!confirmed) return;

    setRefundingOrderId(order.id);
    setErrorMessage("");

    try {
      const response = await fetch("/api/razorpay/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_id: order.razorpay_payment_id,
          amount: Number(order.total),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error("Refund error:", data);
        setErrorMessage(data.error || "Unable to process refund.");
        return;
      }

      const { data: updatedOrder, error } = await supabase
        .from("orders")
        .update({
          razorpay_refund_id: data.refund_id,
          refund_status: data.status || "processed",
        })
        .eq("id", order.id)
        .select("*")
        .single();

      if (error) {
        console.error("Refund database update error:", error);
        setErrorMessage("Refund was requested successfully, but its details could not be saved in the order.");
        return;
      }

      const savedOrder = updatedOrder as Order;

      setOrders((currentOrders) =>
        currentOrders.map((currentOrder) =>
          currentOrder.id === order.id ? savedOrder : currentOrder
        )
      );

      await createRefundNotification(
        savedOrder,
        String(data.status || "processed")
      );

      // Razorpay can return a temporary pending state even when the refund
      // becomes processed shortly afterwards. Re-check once after a short
      // delay so the admin panel reflects the latest Razorpay status.
      if (String(data.status || "").toLowerCase() !== "processed") {
        window.setTimeout(() => {
          fetchOrders();
        }, 2000);
      }
    } catch (error) {
      console.error("Refund request error:", error);
      setErrorMessage("Unable to process refund. Please try again.");
    } finally {
      setRefundingOrderId(null);
    }
  };

  const createOrderStatusNotification = async (
    order: Order,
    newStatus: string
  ) => {
    if (!order.user_id) {
      return true;
    }

    const status = newStatus.toLowerCase();

    let title = "";
    let message = "";
    let type = "info";

    if (status === "pending") {
      title = "Order Received";
      message = `Your order ${order.order_id} has been received and is waiting for confirmation.`;
      type = "order";
    } else if (status === "preparing") {
      title = "Order Being Prepared";
      message = `Your order ${order.order_id} is now being prepared by the restaurant.`;
      type = "preparing";
    } else if (status === "ready") {
      title = "Order Ready";
      message = `Your order ${order.order_id} is ready and will be delivered soon.`;
      type = "ready";
    } else if (status === "out for delivery") {
      title = "Out for Delivery";
      message = `Your order ${order.order_id} is out for delivery. Please keep your phone available.`;
      type = "delivery";
    } else if (status === "delivered") {
      title = "Order Delivered";
      message = `Your order ${order.order_id} has been delivered. Thank you for ordering from YASH SAINI RESTAURANT!`;
      type = "delivered";
    } else {
      return true;
    }

    const { error } = await supabase.from("notifications").insert({
      user_id: order.user_id,
      order_id: order.order_id,
      title,
      message,
      type,
    });

    if (error) {
      console.error("Order status notification error:", error);
      return false;
    }

    return true;
  };

  const updateOrderStatus = async (
    orderId: number,
    newStatus: string
  ) => {
    const currentOrder = orders.find((order) => order.id === orderId);

    if (!currentOrder) {
      return;
    }

    const currentStatus = currentOrder.status.toLowerCase();
    const nextStatus = newStatus.toLowerCase();

    if (nextStatus === "delivered") {
      setErrorMessage(
        "Delivered status is completed by the delivery partner after OTP verification. Admin cannot mark an order as Delivered."
      );
      return;
    }

    // Delivered and cancelled are terminal states. Prevent accidental
    // changes back to another status from the admin panel.
    if (
      (currentStatus === "delivered" || currentStatus === "cancelled") &&
      currentStatus !== nextStatus
    ) {
      setErrorMessage(
        `Order ${currentOrder.order_id} is already ${currentStatus} and cannot be moved to another status.`
      );
      return;
    }

    if (
      newStatus !== "cancelled" &&
      isScheduledOrder(currentOrder) &&
      !isScheduledTimeReached(currentOrder)
    ) {
      setErrorMessage(
        `This order is scheduled for ${formatScheduledTime(
          currentOrder.scheduled_for
        )}. It cannot be moved forward before the scheduled time.`
      );
      return;
    }

    if (newStatus === "cancelled" && currentOrder.status !== "cancelled") {
      const confirmed = window.confirm(
        `Cancel order ${currentOrder.order_id}?\\n\\nThe customer will receive a cancellation notification.`
      );

      if (!confirmed) {
        return;
      }
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

    const updatedOrder = data as Order;

    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId
          ? updatedOrder
          : order
      )
    );

    if (
      currentOrder.status !== newStatus &&
      updatedOrder.user_id
    ) {
      if (newStatus === "cancelled") {
        const { error: notificationError } = await supabase
          .from("notifications")
          .insert({
            user_id: updatedOrder.user_id,
            order_id: updatedOrder.order_id,
            title: "Order Cancelled",
            message: `Your order ${updatedOrder.order_id} has been cancelled by the restaurant. Sorry for the inconvenience.`,
            type: "cancelled",
          });

        if (notificationError) {
          console.error(
            "Customer notification error:",
            notificationError
          );
          setErrorMessage(
            "Order cancelled, but the customer notification could not be created."
          );
        }
      } else {
        const notificationCreated =
          await createOrderStatusNotification(
            updatedOrder,
            newStatus
          );

        if (!notificationCreated) {
          setErrorMessage(
            "Order status updated, but the customer notification could not be created."
          );
        }
      }
    }

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

  const revenue = orders.reduce(
    (total, order) => total + Number(order.total),
    0
  );

  // Today's analytics
  const todayOrders = orders.filter((order) =>
    isToday(order.created_at)
  );

  const todaySales = todayOrders.reduce(
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

  orders.forEach((order) => {
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
          image: getFoodImage(name) || undefined,
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

  const getOrderDateStart = (filter: string) => {
    if (filter === "all") return null;

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    if (filter === "3days") {
      start.setDate(start.getDate() - 2);
    } else if (filter === "7days") {
      start.setDate(start.getDate() - 6);
    } else if (filter === "1month") {
      start.setDate(start.getDate() - 29);
    }

    return start.getTime();
  };

  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      statusFilter === "all" ||
      order.status === statusFilter;

    const orderDateStart = getOrderDateStart(orderDateFilter);
    const orderTime = new Date(order.created_at).getTime();
    const matchesDate =
      orderDateStart === null ||
      (Number.isFinite(orderTime) && orderTime >= orderDateStart);

    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return matchesStatus && matchesDate;
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

    return matchesStatus && matchesDate && matchesSearch;
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const formatScheduledTime = (date: string | null | undefined) => {
    if (!date) return "";
    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const isScheduledOrder = (order: Order) =>
    order.order_type === "scheduled" && Boolean(order.scheduled_for);

  const isScheduledTimeReached = (order: Order) => {
    if (!isScheduledOrder(order) || !order.scheduled_for) return true;
    return new Date(order.scheduled_for).getTime() <= Date.now();
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

  const openWhatsApp = (order: Order) => {
    const rawPhone = String(order.customer_phone || "").trim();

    if (!rawPhone) {
      return;
    }

    const digits = rawPhone.replace(/\D/g, "");
    let whatsappPhone = digits;

    if (whatsappPhone.length === 10) {
      whatsappPhone = `91${whatsappPhone}`;
    } else if (
      whatsappPhone.length === 11 &&
      whatsappPhone.startsWith("0")
    ) {
      whatsappPhone = `91${whatsappPhone.slice(1)}`;
    } else if (
      whatsappPhone.length === 12 &&
      whatsappPhone.startsWith("91")
    ) {
      // Already in India country-code format.
    }

    if (whatsappPhone.length < 12) {
      window.alert("Please check the customer's phone number.");
      return;
    }

    const paymentLabel =
      order.payment_method === "online"
        ? "Paid Online"
        : "Cash on Delivery";

    const statusLabel = formatStatus(order.status);

    const message = [
      `Hello ${order.customer_name},`,
      ``,
      `This is YASH SAINI RESTAURANT regarding your order ${order.order_id}.`,
      ``,
      `Order Status: ${statusLabel}`,
      `Payment: ${paymentLabel}`,
      `Total: ₹${Number(order.total).toFixed(0)}`,
      ...(isScheduledOrder(order)
        ? [`Scheduled For: ${formatScheduledTime(order.scheduled_for)}`]
        : []),
      `Delivery Address: ${order.delivery_address}`,
      ``,
      `Thank you for ordering from YASH SAINI RESTAURANT!`,
    ].join("\n");

    const whatsappUrl =
      `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;

    window.open(
      whatsappUrl,
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


  // -----------------------------
  // COUPONS & OFFERS MANAGEMENT
  // -----------------------------

  const resetCouponForm = () => {
    setEditingCouponId(null);
    setCouponCode("");
    setCouponTitle("");
    setCouponDescription("");
    setCouponDiscountType("percentage");
    setCouponDiscountValue("");
    setCouponMinimumOrder("0");
    setCouponMaximumDiscount("");
    setCouponUsageLimit("");
    setCouponStartsAt("");
    setCouponExpiresAt("");
    setCouponActive(true);
  };

  const openAddCouponForm = () => {
    resetCouponForm();
    setCouponError("");
    setShowCouponForm(true);
  };

  const openEditCouponForm = (coupon: Coupon) => {
    setEditingCouponId(coupon.id);
    setCouponCode(coupon.code);
    setCouponTitle(coupon.title);
    setCouponDescription(coupon.description || "");
    setCouponDiscountType(coupon.discount_type);
    setCouponDiscountValue(String(coupon.discount_value));
    setCouponMinimumOrder(String(coupon.minimum_order_amount));
    setCouponMaximumDiscount(
      coupon.maximum_discount_amount === null
        ? ""
        : String(coupon.maximum_discount_amount)
    );
    setCouponUsageLimit(
      coupon.usage_limit === null ? "" : String(coupon.usage_limit)
    );
    setCouponStartsAt(
      coupon.starts_at ? new Date(coupon.starts_at).toISOString().slice(0, 16) : ""
    );
    setCouponExpiresAt(
      coupon.expires_at ? new Date(coupon.expires_at).toISOString().slice(0, 16) : ""
    );
    setCouponActive(coupon.is_active);
    setCouponError("");
    setShowCouponForm(true);
  };

  const closeCouponForm = () => {
    setShowCouponForm(false);
    resetCouponForm();
  };

  const saveCoupon = async () => {
    setCouponError("");

    const code = couponCode.trim().toUpperCase();
    const title = couponTitle.trim();
    const discountValue = Number(couponDiscountValue);
    const minimumOrder = Number(couponMinimumOrder || 0);
    const maximumDiscount =
      couponMaximumDiscount.trim() === "" ? null : Number(couponMaximumDiscount);
    const usageLimit =
      couponUsageLimit.trim() === "" ? null : Number(couponUsageLimit);

    if (!code) {
      setCouponError("Please enter a coupon code.");
      return;
    }

    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) {
      setCouponError("Coupon code should be 3–30 characters using letters, numbers, _ or -.");
      return;
    }

    if (!title) {
      setCouponError("Please enter an offer title.");
      return;
    }

    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      setCouponError("Please enter a valid discount value.");
      return;
    }

    if (couponDiscountType === "percentage" && discountValue > 100) {
      setCouponError("Percentage discount cannot be more than 100%.");
      return;
    }

    if (!Number.isFinite(minimumOrder) || minimumOrder < 0) {
      setCouponError("Please enter a valid minimum order amount.");
      return;
    }

    if (
      maximumDiscount !== null &&
      (!Number.isFinite(maximumDiscount) || maximumDiscount <= 0)
    ) {
      setCouponError("Maximum discount must be greater than zero.");
      return;
    }

    if (
      usageLimit !== null &&
      (!Number.isInteger(usageLimit) || usageLimit <= 0)
    ) {
      setCouponError("Usage limit must be a positive whole number.");
      return;
    }

    if (couponStartsAt && couponExpiresAt) {
      const startTime = new Date(couponStartsAt).getTime();
      const expiryTime = new Date(couponExpiresAt).getTime();

      if (
        !Number.isFinite(startTime) ||
        !Number.isFinite(expiryTime) ||
        expiryTime <= startTime
      ) {
        setCouponError("Expiry date must be after the start date.");
        return;
      }
    }

    setCouponSaving(true);

    const payload = {
      code,
      title,
      description: couponDescription.trim() || null,
      discount_type: couponDiscountType,
      discount_value: discountValue,
      minimum_order_amount: minimumOrder,
      maximum_discount_amount: maximumDiscount,
      usage_limit: usageLimit,
      starts_at: couponStartsAt
        ? new Date(couponStartsAt).toISOString()
        : null,
      expires_at: couponExpiresAt
        ? new Date(couponExpiresAt).toISOString()
        : null,
      is_active: couponActive,
      updated_at: new Date().toISOString(),
    };

    if (editingCouponId !== null) {
      const { data, error } = await supabase
        .from("coupons")
        .update(payload)
        .eq("id", editingCouponId)
        .select("*")
        .single();

      if (error) {
        console.error("Coupon update error:", error);
        setCouponError(
          error.code === "23505"
            ? "This coupon code already exists."
            : "Unable to update coupon. Please try again."
        );
        setCouponSaving(false);
        return;
      }

      setCoupons((currentCoupons) =>
        currentCoupons.map((coupon) =>
          coupon.id === editingCouponId ? (data as Coupon) : coupon
        )
      );
    } else {
      const { data, error } = await supabase
        .from("coupons")
        .insert({
          ...payload,
          used_count: 0,
        })
        .select("*")
        .single();

      if (error) {
        console.error("Coupon insert error:", error);
        setCouponError(
          error.code === "23505"
            ? "This coupon code already exists."
            : "Unable to create coupon. Please try again."
        );
        setCouponSaving(false);
        return;
      }

      setCoupons((currentCoupons) => [data as Coupon, ...currentCoupons]);
    }

    setCouponSaving(false);
    closeCouponForm();
  };

  const toggleCouponStatus = async (coupon: Coupon) => {
    setCouponError("");

    const { data, error } = await supabase
      .from("coupons")
      .update({
        is_active: !coupon.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", coupon.id)
      .select("*")
      .single();

    if (error) {
      console.error("Coupon status update error:", error);
      setCouponError("Unable to change coupon status.");
      return;
    }

    setCoupons((currentCoupons) =>
      currentCoupons.map((currentCoupon) =>
        currentCoupon.id === coupon.id ? (data as Coupon) : currentCoupon
      )
    );
  };

  const deleteCoupon = async (coupon: Coupon) => {
    const confirmed = window.confirm(
      `Delete coupon "${coupon.code}"?\n\nThis will remove the coupon from your offers list.`
    );

    if (!confirmed) return;

    setDeletingCouponId(coupon.id);
    setCouponError("");

    const { error } = await supabase
      .from("coupons")
      .delete()
      .eq("id", coupon.id);

    if (error) {
      console.error("Coupon delete error:", error);
      setCouponError("Unable to delete coupon. Please try again.");
      setDeletingCouponId(null);
      return;
    }

    setCoupons((currentCoupons) =>
      currentCoupons.filter((currentCoupon) => currentCoupon.id !== coupon.id)
    );
    setDeletingCouponId(null);
  };

  const formatCouponDiscount = (coupon: Coupon) =>
    coupon.discount_type === "percentage"
      ? `${Number(coupon.discount_value).toFixed(0)}% OFF`
      : `₹${Number(coupon.discount_value).toFixed(0)} OFF`;

  const formatCouponDate = (date: string | null) => {
    if (!date) return "No limit";
    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const customerDirectory: CustomerSummary[] = Object.values(
    orders.reduce<Record<string, CustomerSummary>>((groups, order) => {
      const key = order.user_id || `guest:${order.customer_phone || order.customer_name}`;
      const existing = groups[key];

      if (existing) {
        existing.orders.push(order);
        existing.totalSpent += Number(order.total || 0);
        if (new Date(order.created_at).getTime() > new Date(existing.lastOrderAt).getTime()) {
          existing.lastOrderAt = order.created_at;
          existing.name = order.customer_name || existing.name;
          existing.phone = order.customer_phone || existing.phone;
        }
      } else {
        groups[key] = {
          key,
          userId: order.user_id || null,
          name: order.customer_name || "Customer",
          phone: order.customer_phone || "Phone not available",
          orders: [order],
          totalSpent: Number(order.total || 0),
          lastOrderAt: order.created_at,
        };
      }

      return groups;
    }, {})
  )
    .map((customer) => ({
      ...customer,
      orders: [...customer.orders].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    }))
    .sort((a, b) => new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime());

  const filteredCustomers = customerDirectory.filter((customer) => {
    const query = customerSearch.trim().toLowerCase();
    if (!query) return true;

    return (
      customer.name.toLowerCase().includes(query) ||
      customer.phone.toLowerCase().includes(query) ||
      (customer.userId || "").toLowerCase().includes(query)
    );
  });

  const repeatCustomersCount = customerDirectory.filter(
    (customer) => customer.orders.length > 1
  ).length;

  const filteredReviews = reviews.filter((review) => {
    const query = reviewSearch.trim().toLowerCase();
    const matchesSearch =
      !query ||
      review.customer_name.toLowerCase().includes(query) ||
      review.customer_phone.toLowerCase().includes(query) ||
      review.display_order_id.toLowerCase().includes(query) ||
      (review.review_text || "").toLowerCase().includes(query);

    const matchesRating =
      reviewFilter === "all" || Number(review.rating) === Number(reviewFilter);

    return matchesSearch && matchesRating;
  });

  const reviewAverage =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length
      : 0;

  const reviewVisibleCount = reviews.filter((review) => review.is_visible).length;

  const reviewRatingCounts = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((review) => Number(review.rating) === rating).length,
  }));

  const getDeliveryReportStart = (period: string) => {
    if (period === "all") return null;

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    if (period === "week") {
      start.setDate(start.getDate() - 6);
    } else if (period === "month") {
      start.setDate(start.getDate() - 29);
    }

    return start.getTime();
  };

  const deliveryReportOrders = orders.filter((order) => {
    if (order.status !== "delivered") return false;

    const start = getDeliveryReportStart(deliveryReportPeriod);
    const created = new Date(order.created_at).getTime();
    const matchesPeriod = start === null || (Number.isFinite(created) && created >= start);

    const query = deliveryReportSearch.trim().toLowerCase();
    if (!query) return matchesPeriod;

    const partner = deliveryBoys.find((boy) => boy.id === order.delivery_boy_id);
    return (
      matchesPeriod &&
      (order.order_id.toLowerCase().includes(query) ||
        order.customer_name.toLowerCase().includes(query) ||
        order.customer_phone.toLowerCase().includes(query) ||
        (partner?.full_name || "").toLowerCase().includes(query))
    );
  });

  const reportOrderValue = deliveryReportOrders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  );
  const reportCod = deliveryReportOrders.reduce(
    (sum, order) =>
      sum + Number(order.cod_collected_amount ?? (order.payment_method === "cod" ? order.total : 0) ?? 0),
    0
  );
  const reportDistance = deliveryReportOrders.reduce(
    (sum, order) => sum + Number(order.distance_km || 0),
    0
  );
  const reportDeliveryTimes = deliveryReportOrders
    .map((order) => {
      const deliveredAt = order.delivered_at ? new Date(order.delivered_at).getTime() : NaN;
      const createdAt = new Date(order.created_at).getTime();
      return Number.isFinite(deliveredAt) && Number.isFinite(createdAt) && deliveredAt >= createdAt
        ? (deliveredAt - createdAt) / 60000
        : null;
    })
    .filter((value): value is number => value !== null && value >= 0);
  const reportAverageMinutes = reportDeliveryTimes.length
    ? reportDeliveryTimes.reduce((sum, value) => sum + value, 0) / reportDeliveryTimes.length
    : 0;

  const reportPartnerMap = new Map<string, { name: string; deliveries: number; value: number; cod: number; distance: number }>();
  deliveryReportOrders.forEach((order) => {
    const partner = deliveryBoys.find((boy) => boy.id === order.delivery_boy_id);
    const key = order.delivery_boy_id || "unassigned";
    const current = reportPartnerMap.get(key) || {
      name: partner?.full_name || "Unknown / Unassigned",
      deliveries: 0,
      value: 0,
      cod: 0,
      distance: 0,
    };
    current.deliveries += 1;
    current.value += Number(order.total || 0);
    current.cod += Number(order.cod_collected_amount ?? (order.payment_method === "cod" ? order.total : 0) ?? 0);
    current.distance += Number(order.distance_km || 0);
    reportPartnerMap.set(key, current);
  });
  const reportPartners = Array.from(reportPartnerMap.values()).sort((a, b) => b.deliveries - a.deliveries);

  const getSettlementStart = (period: string) => {
    if (period === "all") return null;

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    if (period === "week") start.setDate(start.getDate() - 6);
    if (period === "month") start.setDate(start.getDate() - 29);
    return start.getTime();
  };

  const settlementOrders = orders.filter((order) => {
    if (order.status !== "delivered" || !order.delivery_boy_id) return false;
    const start = getSettlementStart(settlementPeriod);
    const created = new Date(order.created_at).getTime();
    const matchesPeriod = start === null || (Number.isFinite(created) && created >= start);
    if (!matchesPeriod) return false;
    const query = settlementSearch.trim().toLowerCase();
    if (!query) return true;
    const partner = deliveryBoys.find((boy) => boy.id === order.delivery_boy_id);
    return (
      order.order_id.toLowerCase().includes(query) ||
      order.customer_name.toLowerCase().includes(query) ||
      (partner?.full_name || "").toLowerCase().includes(query)
    );
  });

  const settlementRows = deliveryBoys
    .map((boy) => {
      const partnerOrders = settlementOrders.filter((order) => order.delivery_boy_id === boy.id);
      const orderValue = partnerOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
      const codCollected = partnerOrders.reduce(
        (sum, order) => sum + Number(order.cod_collected_amount ?? (order.payment_method === "cod" ? order.total : 0)),
        0
      );
      const onlineValue = partnerOrders.reduce(
        (sum, order) => sum + (order.payment_method === "online" ? Number(order.total || 0) : 0),
        0
      );
      const distance = partnerOrders.reduce((sum, order) => sum + Number(order.distance_km || 0), 0);
      return { boy, deliveries: partnerOrders.length, orderValue, codCollected, onlineValue, distance };
    })
    .filter((row) => {
      if (!settlementSearch.trim()) return row.deliveries > 0;
      return row.deliveries > 0;
    })
    .sort((a, b) => b.codCollected - a.codCollected);

  const settlementTotalDeliveries = settlementRows.reduce((sum, row) => sum + row.deliveries, 0);
  const settlementTotalValue = settlementRows.reduce((sum, row) => sum + row.orderValue, 0);
  const settlementTotalCod = settlementRows.reduce((sum, row) => sum + row.codCollected, 0);
  const settlementTotalOnline = settlementRows.reduce((sum, row) => sum + row.onlineValue, 0);

  const activeDeliveryBoys = deliveryBoys.filter((boy) => boy.is_active);
  const onlineDeliveryBoys = activeDeliveryBoys.filter((boy) => boy.is_available);
  const deliveryBoysWithLocation = activeDeliveryBoys.filter(
    (boy) => boy.current_lat !== null && boy.current_lng !== null
  );

  const getActiveDeliveryOrder = (deliveryBoyId: string) => {
    return (
      orders
        .filter(
          (order) =>
            order.delivery_boy_id === deliveryBoyId &&
            order.status !== "delivered" &&
            order.status !== "cancelled"
        )
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        )[0] || null
    );
  };

  const formatLocationTime = (date: string | null) => {
    if (!date) return "Location not received yet";
    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const openDeliveryBoyLocation = (boy: DeliveryBoy) => {
    if (boy.current_lat === null || boy.current_lng === null) return;
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${boy.current_lat},${boy.current_lng}`,
      "_blank",
      "noopener,noreferrer"
    );
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
    <main className="min-h-screen overflow-x-hidden bg-[#0f0d0b] px-3 py-5 text-white sm:px-4 sm:py-6 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-[1600px] min-w-0">

        {/* Header */}
        <div className="mb-6 flex min-w-0 flex-col gap-5 sm:mb-8 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-semibold text-orange-400">
              YASH SAINI RESTAURANT
            </p>

            <h1 className="mt-2 text-2xl font-bold sm:text-3xl md:text-4xl">
              Admin Dashboard
            </h1>

            <p className="mt-2 text-gray-400">
              Manage your restaurant orders from one place.
            </p>

            <a
              href="/admin/kitchen"
              className="mt-4 inline-flex max-w-full items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-2.5 text-sm font-bold text-orange-300 transition hover:border-orange-500/40 hover:bg-orange-500/20"
            >
              👨‍🍳 Open Kitchen Command Center →
            </a>

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
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                  className={`w-full rounded-xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-5 ${
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

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:gap-3">
            <button
              onClick={() => {
                fetchOrders();
                fetchMenuItems();
                fetchRestaurantSettings();
                fetchCoupons();
              }}
              disabled={loading || menuLoading}
              className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-50 sm:w-auto sm:px-5"
            >
              {loading || menuLoading
                ? "Refreshing..."
                : "↻ Refresh"}
            </button>

            <button
              onClick={handleLogout}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold transition hover:bg-white/10 sm:w-auto sm:px-5"
            >
              Logout
            </button>
          </div>
        </div>

        {/* New Order Alert */}
        {newOrderAlert && (
          <div className="mb-6 flex min-w-0 items-start justify-between gap-3 rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-4 sm:px-5">
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
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:mb-8 lg:grid-cols-5">

          <div className="min-w-0 rounded-2xl border border-white/10 bg-[#171310] p-4 sm:p-5">
            <p className="text-sm text-gray-400">
              Total Orders
            </p>

            <p className="mt-2 text-2xl font-bold sm:text-3xl">
              {totalOrders}
            </p>
          </div>

          <div className="min-w-0 rounded-2xl border border-white/10 bg-[#171310] p-4 sm:p-5">
            <p className="text-sm text-gray-400">
              Pending
            </p>

            <p className="mt-2 text-2xl font-bold sm:text-3xl">
              {pendingOrders}
            </p>
          </div>

          <div className="min-w-0 rounded-2xl border border-white/10 bg-[#171310] p-4 sm:p-5">
            <p className="text-sm text-gray-400">
              Preparing
            </p>

            <p className="mt-2 text-2xl font-bold sm:text-3xl">
              {preparingOrders}
            </p>
          </div>

          <div className="min-w-0 rounded-2xl border border-white/10 bg-[#171310] p-4 sm:p-5">
            <p className="text-sm text-gray-400">
              Scheduled
            </p>

            <p className="mt-2 text-2xl font-bold sm:text-3xl">
              {orders.filter(
                (order) =>
                  isScheduledOrder(order) &&
                  order.status !== "cancelled" &&
                  order.status !== "delivered"
              ).length}
            </p>
          </div>

          <div className="min-w-0 rounded-2xl border border-white/10 bg-[#171310] p-4 sm:p-5">
            <p className="text-sm text-gray-400">
              Total Revenue
            </p>

            <p className="mt-2 text-2xl font-bold sm:text-3xl">
              ₹{revenue.toFixed(0)}
            </p>
          </div>

        </div>

        {/* Today's Business */}
        <section className="mb-6 rounded-3xl border border-white/10 bg-[#171310] p-4 sm:p-6 lg:mb-8">

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

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">

            <div className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
              <p className="text-sm text-gray-400">
                Today&apos;s Orders
              </p>

              <p className="mt-2 text-2xl font-black sm:text-3xl">
                {todayOrders.length}
              </p>
            </div>

            <div className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
              <p className="text-sm text-gray-400">
                Today&apos;s Sales
              </p>

              <p className="mt-2 text-3xl font-black text-orange-400">
                ₹{todaySales.toFixed(0)}
              </p>
            </div>

            <div className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
              <p className="text-sm text-gray-400">
                Delivered Today
              </p>

              <p className="mt-2 text-2xl font-black sm:text-3xl">
                {todayDelivered}
              </p>
            </div>

            <div className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
              <p className="text-sm text-gray-400">
                Pending Today
              </p>

              <p className="mt-2 text-2xl font-black sm:text-3xl">
                {todayPending}
              </p>
            </div>

          </div>
        </section>

        {/* Best Selling Items */}
        <section className="mb-6 rounded-3xl border border-white/10 bg-[#171310] p-4 sm:p-6 lg:mb-8">

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

                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/5">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-3xl">{item.emoji}</span>
                      )}
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


        {/* COUPONS & OFFERS */}
        <section className="mb-6 rounded-3xl border border-white/10 bg-[#171310] p-4 sm:p-6 lg:mb-8">
          <div className="mb-6 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-orange-400">
                Promotions
              </p>
              <h2 className="mt-2 text-2xl font-bold">🎟️ Coupons & Offers</h2>
              <p className="mt-1 text-sm text-gray-400">
                Create discount coupons and promotional offers for customers.
              </p>
            </div>

            <button
              type="button"
              onClick={openAddCouponForm}
              className="rounded-xl bg-orange-500 px-5 py-3 font-bold text-black transition hover:bg-orange-400"
            >
              + Create Coupon
            </button>
          </div>

          {showCouponForm && (
            <div className="mb-6 rounded-2xl border border-orange-500/20 bg-black/20 p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold">
                    {editingCouponId !== null
                      ? "✏️ Edit Coupon / Offer"
                      : "➕ Create Coupon / Offer"}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Set the discount rules and validity for customers.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeCouponForm}
                  className="rounded-lg px-3 py-2 text-gray-400 hover:bg-white/10 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="grid min-w-0 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-300">
                    Coupon Code
                  </label>
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="e.g. WELCOME50"
                    maxLength={30}
                    className="w-full rounded-xl border border-white/10 bg-[#211c18] px-4 py-3 uppercase text-white outline-none placeholder:text-gray-600 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-300">
                    Offer Title
                  </label>
                  <input
                    type="text"
                    value={couponTitle}
                    onChange={(e) => setCouponTitle(e.target.value)}
                    placeholder="e.g. Welcome Offer"
                    className="w-full rounded-xl border border-white/10 bg-[#211c18] px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-orange-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-gray-300">
                    Offer Description
                  </label>
                  <input
                    type="text"
                    value={couponDescription}
                    onChange={(e) => setCouponDescription(e.target.value)}
                    placeholder="e.g. Get 20% off on your first order"
                    className="w-full rounded-xl border border-white/10 bg-[#211c18] px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-300">
                    Discount Type
                  </label>
                  <select
                    value={couponDiscountType}
                    onChange={(e) =>
                      setCouponDiscountType(
                        e.target.value as "percentage" | "fixed"
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#211c18] px-4 py-3 text-white outline-none focus:border-orange-500"
                  >
                    <option value="percentage" className="bg-[#211c18]">
                      Percentage (%)
                    </option>
                    <option value="fixed" className="bg-[#211c18]">
                      Fixed Amount (₹)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-300">
                    Discount Value
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={couponDiscountValue}
                    onChange={(e) => setCouponDiscountValue(e.target.value)}
                    placeholder={couponDiscountType === "percentage" ? "20" : "50"}
                    className="w-full rounded-xl border border-white/10 bg-[#211c18] px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-300">
                    Minimum Order (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={couponMinimumOrder}
                    onChange={(e) => setCouponMinimumOrder(e.target.value)}
                    placeholder="199"
                    className="w-full rounded-xl border border-white/10 bg-[#211c18] px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-300">
                    Maximum Discount (₹) — Optional
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={couponMaximumDiscount}
                    onChange={(e) => setCouponMaximumDiscount(e.target.value)}
                    placeholder="100"
                    className="w-full rounded-xl border border-white/10 bg-[#211c18] px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-300">
                    Usage Limit — Optional
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={couponUsageLimit}
                    onChange={(e) => setCouponUsageLimit(e.target.value)}
                    placeholder="100"
                    className="w-full rounded-xl border border-white/10 bg-[#211c18] px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-300">
                    Starts At — Optional
                  </label>
                  <input
                    type="datetime-local"
                    value={couponStartsAt}
                    onChange={(e) => setCouponStartsAt(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#211c18] px-4 py-3 text-white outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-300">
                    Expires At — Optional
                  </label>
                  <input
                    type="datetime-local"
                    value={couponExpiresAt}
                    onChange={(e) => setCouponExpiresAt(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#211c18] px-4 py-3 text-white outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <input
                  type="checkbox"
                  checked={couponActive}
                  onChange={(e) => setCouponActive(e.target.checked)}
                  className="h-4 w-4 accent-orange-500"
                />
                <span>
                  <span className="block font-semibold">Offer Active</span>
                  <span className="text-xs text-gray-500">
                    Customers can use this coupon when enabled.
                  </span>
                </span>
              </label>

              {couponError && (
                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {couponError}
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={saveCoupon}
                  disabled={couponSaving}
                  className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-50 sm:w-auto sm:px-5"
                >
                  {couponSaving
                    ? "Saving..."
                    : editingCouponId !== null
                    ? "Save Changes"
                    : "Create Coupon"}
                </button>

                <button
                  type="button"
                  onClick={closeCouponForm}
                  disabled={couponSaving}
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-bold text-gray-300 transition hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {couponError && !showCouponForm && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
              {couponError}
            </div>
          )}

          {couponLoading ? (
            <div className="py-12 text-center text-gray-400">
              Loading coupons...
            </div>
          ) : coupons.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
              <div className="mb-4 text-5xl">🎟️</div>
              <p className="font-semibold">No coupons or offers yet</p>
              <p className="mt-1 text-sm text-gray-500">
                Create your first discount offer using the button above.
              </p>
            </div>
          ) : (
            <div className="grid min-w-0 gap-4 xl:grid-cols-2">
              {coupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5"
                >
                  <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-1 font-black tracking-wider text-orange-300">
                          {coupon.code}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            coupon.is_active
                              ? "bg-green-500/10 text-green-300"
                              : "bg-red-500/10 text-red-300"
                          }`}
                        >
                          {coupon.is_active ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </div>

                      <h3 className="mt-3 text-lg font-bold">{coupon.title}</h3>

                      {coupon.description && (
                        <p className="mt-1 break-words text-sm text-gray-400">
                          {coupon.description}
                        </p>
                      )}

                      <p className="mt-3 text-2xl font-black text-orange-400">
                        {formatCouponDiscount(coupon)}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleCouponStatus(coupon)}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-gray-200 transition hover:bg-white/10"
                      >
                        {coupon.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditCouponForm(coupon)}
                        className="rounded-xl bg-orange-500/10 px-3 py-2 text-xs font-bold text-orange-300 transition hover:bg-orange-500/20"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCoupon(coupon)}
                        disabled={deletingCouponId === coupon.id}
                        className="rounded-xl bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                      >
                        {deletingCouponId === coupon.id ? "Deleting..." : "🗑️ Delete"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-gray-500">Min Order</p>
                      <p className="mt-1 font-bold">₹{Number(coupon.minimum_order_amount).toFixed(0)}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-gray-500">Max Discount</p>
                      <p className="mt-1 font-bold">
                        {coupon.maximum_discount_amount === null
                          ? "No limit"
                          : `₹${Number(coupon.maximum_discount_amount).toFixed(0)}`}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-gray-500">Usage</p>
                      <p className="mt-1 font-bold">
                        {coupon.used_count}
                        {coupon.usage_limit !== null ? ` / ${coupon.usage_limit}` : " / ∞"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-gray-500">Expiry</p>
                      <p className="mt-1 break-words font-bold">
                        {formatCouponDate(coupon.expires_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* MENU MANAGEMENT */}
        <section className="mb-6 rounded-3xl border border-white/10 bg-[#171310] p-4 sm:p-6 lg:mb-8">

          <div className="mb-6 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

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

              <div className="grid min-w-0 gap-4 md:grid-cols-2">

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
                  className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-50 sm:w-auto sm:px-5"
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
            <div className="grid min-w-0 gap-4 md:grid-cols-2">

              {menuItems.map((item) => (
                <div
                  key={item.id}
                  className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5"
                >

                  <div className="flex items-start justify-between gap-4">

                    <div className="flex min-w-0 items-center gap-3 sm:gap-4">

                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/5">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-3xl">{item.emoji}</span>
                        )}
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

                  <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">

                    <button
                      onClick={() =>
                        openEditMenuForm(item)
                      }
                      className="min-w-0 rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-xs font-semibold transition hover:bg-white/10 sm:px-3 sm:text-sm"
                    >
                      ✏️ Edit
                    </button>

                    <button
                      onClick={() =>
                        toggleMenuAvailability(item)
                      }
                      className={`min-w-0 rounded-xl px-2 py-2 text-xs font-semibold transition sm:px-3 sm:text-sm ${
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
                      className="min-w-0 rounded-xl bg-red-500/10 px-2 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50 sm:px-3 sm:text-sm"
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

        {/* Delivery Management */}
        <section className="mb-8 rounded-3xl border border-white/10 bg-white/[0.03] p-4 shadow-2xl shadow-black/10 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
                Delivery Command Center
              </p>
              <h2 className="mt-2 text-2xl font-bold">Delivery Management</h2>
              <p className="mt-1 text-sm text-gray-400">
                Manage partner profiles, availability and the latest GPS heartbeat.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void fetchDeliveryBoys()}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
            >
              ↻ Refresh Partners
            </button>
          </div>

          {deliveryError && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {deliveryError}
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Active Partners</p>
              <p className="mt-2 text-2xl font-black">{activeDeliveryBoys.length}</p>
            </div>
            <div className="rounded-2xl border border-green-500/15 bg-green-500/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-green-300/70">Online / Available</p>
              <p className="mt-2 text-2xl font-black text-green-300">{onlineDeliveryBoys.length}</p>
            </div>
            <div className="rounded-2xl border border-blue-500/15 bg-blue-500/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-300/70">GPS Connected</p>
              <p className="mt-2 text-2xl font-black text-blue-300">{deliveryBoysWithLocation.length}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {deliveryBoys.map((boy) => (
              <div key={`manage-${boy.id}`} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{boy.full_name}</p>
                    <p className="mt-1 truncate text-xs text-gray-500">{boy.phone || "Phone not added"}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${boy.is_active ? "bg-green-500/10 text-green-300" : "bg-red-500/10 text-red-300"}`}>
                    {boy.is_active ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                    <p className="text-gray-500">Vehicle</p>
                    <p className="mt-1 truncate font-bold">{boy.vehicle_type || "—"}</p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                    <p className="text-gray-500">Number</p>
                    <p className="mt-1 truncate font-bold">{boy.vehicle_number || "—"}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => openDeliveryBoyEditor(boy)} className="rounded-xl border border-orange-500/20 bg-orange-500/10 px-3 py-2.5 text-xs font-bold text-orange-300 transition hover:bg-orange-500/20">
                    ✏️ Edit Profile
                  </button>
                  <button type="button" onClick={() => void toggleDeliveryBoyActive(boy)} className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition ${boy.is_active ? "border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20" : "border-green-500/20 bg-green-500/10 text-green-300 hover:bg-green-500/20"}`}>
                    {boy.is_active ? "⏸ Deactivate" : "▶ Activate"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {deliveryBoysLoading ? (
              <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-gray-400">
                Loading delivery partners...
              </div>
            ) : activeDeliveryBoys.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-white/10 p-8 text-center text-gray-400">
                No active delivery partners found.
              </div>
            ) : (
              activeDeliveryBoys.map((boy) => (
                <div key={boy.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold">{boy.full_name}</p>
                      <p className="mt-1 text-xs text-gray-500">{boy.phone || "Phone not added"}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${boy.is_available ? "bg-green-500/10 text-green-300" : "bg-gray-500/10 text-gray-400"}`}>
                      {boy.is_available ? "ONLINE" : "OFFLINE"}
                    </span>
                  </div>

                  {(() => {
                    const activeOrder = getActiveDeliveryOrder(boy.id);

                    return (
                      <>
                        <div className="mt-4 rounded-xl border border-orange-500/15 bg-orange-500/5 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-black uppercase tracking-wider text-orange-300">
                              Current Delivery
                            </p>
                            {activeOrder && (
                              <span className="rounded-full bg-orange-500/10 px-2 py-1 text-[10px] font-black text-orange-300">
                                {formatStatus(activeOrder.status)}
                              </span>
                            )}
                          </div>

                          {activeOrder ? (
                            <div className="mt-2 min-w-0">
                              <p className="truncate font-bold text-white">
                                #{activeOrder.order_id}
                              </p>
                              <p className="mt-1 truncate text-xs text-gray-400">
                                👤 {activeOrder.customer_name}
                              </p>
                              <p className="mt-1 truncate text-xs text-gray-500">
                                📍 {activeOrder.delivery_address}
                              </p>
                            </div>
                          ) : (
                            <p className="mt-2 text-xs font-semibold text-gray-500">
                              No active delivery assigned
                            </p>
                          )}
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                            <p className="text-gray-500">GPS</p>
                            <p className={`mt-1 font-bold ${
                              boy.current_lat !== null && boy.current_lng !== null
                                ? "text-blue-300"
                                : "text-gray-400"
                            }`}>
                              {boy.current_lat !== null && boy.current_lng !== null
                                ? "● Live"
                                : "Waiting"}
                            </p>
                          </div>
                          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                            <p className="text-gray-500">Last update</p>
                            <p className="mt-1 truncate font-bold">
                              {boy.last_location_at
                                ? formatLocationTime(boy.last_location_at)
                                : "—"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => openDeliveryBoyLocation(boy)}
                            disabled={
                              boy.current_lat === null ||
                              boy.current_lng === null
                            }
                            className="rounded-xl border border-orange-500/20 bg-orange-500/10 px-3 py-2.5 text-sm font-bold text-orange-300 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            📍 Track Live
                          </button>

                          {activeOrder ? (
                            <button
                              type="button"
                              onClick={() =>
                                openDeliveryLocation(
                                  activeOrder.customer_lat,
                                  activeOrder.customer_lng
                                )
                              }
                              disabled={
                                activeOrder.customer_lat === null ||
                                activeOrder.customer_lng === null
                              }
                              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              🗺️ Customer
                            </button>
                          ) : (
                            <div className="flex items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 text-center text-[11px] font-semibold text-gray-600">
                              No active order
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              ))
            )}
          </div>
        </section>


        {/* Delivery Reports */}
        <section className="mb-8 rounded-3xl border border-white/10 bg-[#171310] p-4 shadow-2xl shadow-black/10 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">Delivery Analytics</p>
              <h2 className="mt-2 text-2xl font-bold">Delivery Reports</h2>
              <p className="mt-1 text-sm text-gray-400">Completed deliveries calculated from your actual order data.</p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
              <input
                value={deliveryReportSearch}
                onChange={(event) => setDeliveryReportSearch(event.target.value)}
                placeholder="Search order, customer or partner..."
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-blue-500/40 sm:w-72"
              />
              <select
                value={deliveryReportPeriod}
                onChange={(event) => setDeliveryReportPeriod(event.target.value)}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500/40"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              ["Deliveries", deliveryReportOrders.length.toString(), "text-blue-300"],
              ["Order Value", `₹${reportOrderValue.toFixed(0)}`, "text-white"],
              ["COD Collected", `₹${reportCod.toFixed(0)}`, "text-green-300"],
              ["Distance", `${reportDistance.toFixed(1)} km`, "text-orange-300"],
              ["Avg Time", reportAverageMinutes ? `${Math.round(reportAverageMinutes)} min` : "—", "text-purple-300"],
            ].map(([label, value, color]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-white/30">{label}</p>
                <p className={`mt-2 text-2xl font-black ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-white/30">Partner Performance</p>
                  <p className="mt-1 text-sm text-white/45">Deliveries, value, COD and distance by partner.</p>
                </div>
                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-300">{reportPartners.length} partners</span>
              </div>
              {reportPartners.length === 0 ? (
                <p className="mt-6 text-center text-sm text-gray-600">No completed deliveries for this period.</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {reportPartners.map((partner) => (
                    <div key={partner.name} className="flex flex-col gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-bold">🚚 {partner.name}</p>
                        <p className="mt-1 text-xs text-white/35">{partner.distance.toFixed(1)} km covered</p>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-right text-xs">
                        <div><p className="font-black text-blue-300">{partner.deliveries}</p><p className="text-white/30">orders</p></div>
                        <div><p className="font-black">₹{partner.value.toFixed(0)}</p><p className="text-white/30">value</p></div>
                        <div><p className="font-black text-green-300">₹{partner.cod.toFixed(0)}</p><p className="text-white/30">COD</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-black uppercase tracking-wider text-white/30">Completed Delivery Log</p>
              <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
                {deliveryReportOrders.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-600">No deliveries found.</p>
                ) : deliveryReportOrders.map((order) => {
                  const partner = deliveryBoys.find((boy) => boy.id === order.delivery_boy_id);
                  return (
                    <div key={order.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black">#{order.order_id}</p>
                          <p className="mt-1 truncate text-xs text-white/40">{order.customer_name} • {partner?.full_name || "Unknown partner"}</p>
                        </div>
                        <p className="shrink-0 font-black text-orange-300">₹{Number(order.total).toFixed(0)}</p>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold text-white/30">
                        <span>{Number(order.distance_km || 0).toFixed(1)} km</span>
                        <span>•</span>
                        <span>{order.payment_method === "cod" ? `COD ₹${Number(order.cod_collected_amount ?? order.total).toFixed(0)}` : "Online"}</span>
                        <span>•</span>
                        <span>{formatDate(order.delivered_at || order.created_at)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Delivery Partner Settlement */}
        <section className="mb-8 rounded-3xl border border-white/10 bg-[#171310] p-4 shadow-2xl shadow-black/10 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Partner Finance</p>
              <h2 className="mt-2 text-2xl font-bold">Delivery Partner Settlement</h2>
              <p className="mt-1 text-sm text-gray-400">Completed delivery and COD collection summary. No payout amount is assumed.</p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
              <input
                value={settlementSearch}
                onChange={(event) => setSettlementSearch(event.target.value)}
                placeholder="Search partner, order or customer..."
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-emerald-500/40 sm:w-72"
              />
              <select
                value={settlementPeriod}
                onChange={(event) => setSettlementPeriod(event.target.value)}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-500/40"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["Deliveries", settlementTotalDeliveries.toString(), "text-blue-300"],
              ["Order Value", `₹${settlementTotalValue.toFixed(0)}`, "text-white"],
              ["COD Collected", `₹${settlementTotalCod.toFixed(0)}`, "text-emerald-300"],
              ["Online Value", `₹${settlementTotalOnline.toFixed(0)}`, "text-purple-300"],
            ].map(([label, value, color]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-white/30">{label}</p>
                <p className={`mt-2 text-2xl font-black ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.03] text-[10px] font-black uppercase tracking-wider text-white/35">
                <tr>
                  <th className="px-4 py-3">Partner</th>
                  <th className="px-4 py-3">Deliveries</th>
                  <th className="px-4 py-3">Order Value</th>
                  <th className="px-4 py-3">COD Collected</th>
                  <th className="px-4 py-3">Online</th>
                  <th className="px-4 py-3">Distance</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {settlementRows.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-600">No completed delivery data for this period.</td></tr>
                ) : settlementRows.map((row) => (
                  <tr key={row.boy.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-4">
                      <p className="font-black text-white">🚚 {row.boy.full_name}</p>
                      <p className="mt-1 text-xs text-white/35">{row.boy.phone || "No phone"}</p>
                    </td>
                    <td className="px-4 py-4 font-black text-blue-300">{row.deliveries}</td>
                    <td className="px-4 py-4 font-bold">₹{row.orderValue.toFixed(0)}</td>
                    <td className="px-4 py-4 font-black text-emerald-300">₹{row.codCollected.toFixed(0)}</td>
                    <td className="px-4 py-4 font-bold text-purple-300">₹{row.onlineValue.toFixed(0)}</td>
                    <td className="px-4 py-4 text-white/60">{row.distance.toFixed(1)} km</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${row.boy.is_active ? "bg-green-500/10 text-green-300" : "bg-red-500/10 text-red-300"}`}>
                        {row.boy.is_active ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Reviews Management */}
        <section className="mb-8 rounded-3xl border border-white/10 bg-[#171310] p-4 shadow-2xl shadow-black/10 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-300">Customer Feedback</p>
              <h2 className="mt-2 text-2xl font-bold">Reviews & Ratings</h2>
              <p className="mt-1 text-sm text-gray-400">
                Monitor customer feedback and control which reviews are visible.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
              <input
                value={reviewSearch}
                onChange={(event) => setReviewSearch(event.target.value)}
                placeholder="Search customer, order or review..."
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-orange-500/40 sm:w-72"
              />
              <select
                value={reviewFilter}
                onChange={(event) => setReviewFilter(event.target.value)}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none focus:border-orange-500/40"
              >
                <option value="all">All ratings</option>
                <option value="5">5 stars</option>
                <option value="4">4 stars</option>
                <option value="3">3 stars</option>
                <option value="2">2 stars</option>
                <option value="1">1 star</option>
              </select>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-yellow-500/15 bg-yellow-500/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-yellow-300/70">Average Rating</p>
              <p className="mt-2 text-2xl font-black text-yellow-300">
                {reviewAverage.toFixed(1)} <span className="text-lg">★</span>
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Reviews</p>
              <p className="mt-2 text-2xl font-black">{reviews.length}</p>
            </div>
            <div className="rounded-2xl border border-green-500/15 bg-green-500/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-green-300/70">Visible</p>
              <p className="mt-2 text-2xl font-black text-green-300">{reviewVisibleCount}</p>
            </div>
            <div className="rounded-2xl border border-orange-500/15 bg-orange-500/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-orange-300/70">Showing</p>
              <p className="mt-2 text-2xl font-black text-orange-300">{filteredReviews.length}</p>
            </div>
          </div>

          {reviews.length > 0 && (
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="grid gap-3 sm:grid-cols-5">
                {reviewRatingCounts.map((item) => {
                  const percentage = reviews.length
                    ? Math.round((item.count / reviews.length) * 100)
                    : 0;
                  return (
                    <div key={item.rating}>
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span>{item.rating} ★</span>
                        <span className="text-white/40">{item.count}</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-yellow-400 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {reviewsError && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm font-semibold text-red-300">
              {reviewsError}
            </div>
          )}

          {reviewsLoading ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-sm text-gray-500">
              Loading reviews...
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-8 text-center text-gray-500">
              No reviews match your search or filter.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {filteredReviews.map((review) => (
                <div
                  key={review.id}
                  className={`rounded-2xl border p-4 transition ${
                    review.is_visible
                      ? "border-white/10 bg-black/20"
                      : "border-red-500/15 bg-red-500/[0.03]"
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-white">{review.customer_name}</span>
                        <span className="text-xs text-gray-500">📞 {review.customer_phone}</span>
                        <span className="rounded-full bg-orange-500/10 px-2.5 py-1 text-[10px] font-black text-orange-300">
                          #{review.display_order_id}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-lg tracking-wide text-yellow-300">
                          {"★".repeat(Number(review.rating))}{"☆".repeat(5 - Number(review.rating))}
                        </span>
                        <span className="text-xs font-bold text-white/30">
                          {formatDate(review.created_at)}
                        </span>
                      </div>

                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/65">
                        {review.review_text?.trim() || "No written comment."}
                      </p>

                      <p className="mt-3 text-xs font-semibold text-white/30">
                        Order value: ₹{review.order_total.toFixed(0)}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-black ${
                          review.is_visible
                            ? "bg-green-500/10 text-green-300"
                            : "bg-red-500/10 text-red-300"
                        }`}
                      >
                        {review.is_visible ? "Visible" : "Hidden"}
                      </span>
                      <button
                        type="button"
                        onClick={() => void toggleReviewVisibility(review)}
                        disabled={updatingReviewId === review.id}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/10 disabled:opacity-50"
                      >
                        {updatingReviewId === review.id
                          ? "Updating..."
                          : review.is_visible
                          ? "👁️ Hide"
                          : "👁️ Show"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Customer Management */}
        <section className="mb-8 rounded-3xl border border-white/10 bg-[#171310] p-4 shadow-2xl shadow-black/10 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">Customer Management</p>
              <h2 className="mt-2 text-2xl font-bold">Customer Directory</h2>
              <p className="mt-1 text-sm text-gray-400">
                Customer activity is grouped from existing orders. No auth data is modified here.
              </p>
            </div>
            <div className="w-full lg:max-w-sm">
              <input
                value={customerSearch}
                onChange={(event) => setCustomerSearch(event.target.value)}
                placeholder="Search name, phone or customer ID..."
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-orange-500/40"
              />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Customers</p>
              <p className="mt-2 text-2xl font-black">{customerDirectory.length}</p>
            </div>
            <div className="rounded-2xl border border-blue-500/15 bg-blue-500/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-300/70">Repeat Customers</p>
              <p className="mt-2 text-2xl font-black text-blue-300">{repeatCustomersCount}</p>
            </div>
            <div className="rounded-2xl border border-green-500/15 bg-green-500/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-green-300/70">Order Value</p>
              <p className="mt-2 text-2xl font-black text-green-300">
                ₹{customerDirectory.reduce((sum, customer) => sum + customer.totalSpent, 0).toFixed(0)}
              </p>
            </div>
            <div className="rounded-2xl border border-orange-500/15 bg-orange-500/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-orange-300/70">Showing</p>
              <p className="mt-2 text-2xl font-black text-orange-300">{filteredCustomers.length}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredCustomers.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-white/10 p-8 text-center text-gray-500">
                No customers match your search.
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <button
                  key={customer.key}
                  type="button"
                  onClick={() => setSelectedCustomer(customer)}
                  className="text-left rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-orange-500/30 hover:bg-white/[0.04]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-white">{customer.name}</p>
                      <p className="mt-1 truncate text-xs text-gray-500">📞 {customer.phone}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-orange-500/10 px-2.5 py-1 text-[10px] font-black text-orange-300">
                      {customer.orders.length} {customer.orders.length === 1 ? "ORDER" : "ORDERS"}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                      <p className="text-gray-500">Total spent</p>
                      <p className="mt-1 font-black text-green-300">₹{customer.totalSpent.toFixed(0)}</p>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                      <p className="text-gray-500">Last order</p>
                      <p className="mt-1 truncate font-bold text-white/80">{formatDate(customer.lastOrderAt)}</p>
                    </div>
                  </div>

                  <p className="mt-3 text-xs font-bold text-orange-300">View customer details →</p>
                </button>
              ))
            )}
          </div>
        </section>

        {selectedCustomer && (
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-t-3xl border border-white/10 bg-[#171310] shadow-2xl sm:rounded-3xl">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5 sm:p-6">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">Customer Details</p>
                  <h3 className="mt-2 truncate text-2xl font-black">{selectedCustomer.name}</h3>
                  <p className="mt-1 text-sm text-gray-400">📞 {selectedCustomer.phone}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  ✕
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-5 sm:p-6">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs text-gray-500">Orders</p>
                    <p className="mt-1 text-xl font-black">{selectedCustomer.orders.length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs text-gray-500">Total spent</p>
                    <p className="mt-1 text-xl font-black text-green-300">₹{selectedCustomer.totalSpent.toFixed(0)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs text-gray-500">Customer ID</p>
                    <p className="mt-1 truncate text-xs font-bold text-white/70">{selectedCustomer.userId || "Guest customer"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs text-gray-500">Last order</p>
                    <p className="mt-1 text-xs font-bold text-white/70">{formatDate(selectedCustomer.lastOrderAt)}</p>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-black uppercase tracking-wider text-white/60">Order History</h4>
                  <div className="mt-3 space-y-2">
                    {selectedCustomer.orders.map((order) => (
                      <div key={order.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-black">#{order.order_id}</p>
                            <p className="mt-1 text-xs text-gray-500">{formatDate(order.created_at)}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-white/60">{formatStatus(order.status)}</span>
                            <span className="font-black text-orange-400">₹{Number(order.total || 0).toFixed(0)}</span>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <a
                            href={`/order-tracking?orderId=${encodeURIComponent(order.order_id)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl bg-orange-500 px-3 py-2 text-center text-xs font-black text-black transition hover:bg-orange-400"
                          >
                            🔎 Open Order Tracking
                          </a>
                          <a
                            href={`tel:${order.customer_phone || selectedCustomer.phone}`}
                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-xs font-black text-white/80 transition hover:bg-white/10"
                          >
                            📞 Contact Customer
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Orders */}
        <section className="min-w-0 rounded-3xl border border-white/10 bg-[#171310] p-4 sm:p-6">

          <div className="mb-6">
            <h2 className="text-xl font-bold sm:text-2xl">
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
              className="w-full min-w-0 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-orange-500 sm:px-5 sm:py-4"
            />

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                Order Period
              </p>

              <div className="flex min-w-0 flex-wrap gap-2">
                {[
                  { value: "today", label: "Today" },
                  { value: "3days", label: "Last 3 Days" },
                  { value: "7days", label: "Last 7 Days" },
                  { value: "1month", label: "Last 1 Month" },
                  { value: "all", label: "All Time" },
                ].map((period) => (
                  <button
                    key={period.value}
                    type="button"
                    onClick={() => setOrderDateFilter(period.value)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      orderDateFilter === period.value
                        ? "bg-orange-500 text-black"
                        : "border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                Order Status
              </p>

              <div className="flex min-w-0 flex-wrap gap-2">
                {STATUS_FILTERS.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      statusFilter === status
                        ? "bg-orange-500 text-black"
                        : "border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    {status === "all" ? "All" : formatStatus(status)}
                  </button>
                ))}
              </div>
            </div>

            {(searchQuery ||
              statusFilter !== "all" ||
              orderDateFilter !== "today") && (
              <p className="text-sm text-gray-500">
                Showing {filteredOrders.length} matching orders from{" "}
                {orderDateFilter === "today"
                  ? "today"
                  : orderDateFilter === "3days"
                  ? "the last 3 days"
                  : orderDateFilter === "7days"
                  ? "the last 7 days"
                  : orderDateFilter === "1month"
                  ? "the last 1 month"
                  : "all time"}.
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
                  className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5"
                >

                  {/* Order Header */}
                  <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:justify-between">

                    <div>
                      <p className="font-bold text-orange-400">
                        {order.order_id}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {formatDate(order.created_at)}
                      </p>

                      {isScheduledOrder(order) && (
                        <div
                          className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
                            isScheduledTimeReached(order)
                              ? "bg-green-500/10 text-green-300"
                              : "bg-orange-500/10 text-orange-300"
                          }`}
                        >
                          {isScheduledTimeReached(order) ? "⚡ Ready to start" : "🕐 Scheduled"}
                          <span className="font-medium text-white/60">
                            {formatScheduledTime(order.scheduled_for)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex w-full min-w-0 flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">

                      <span className="hidden text-sm text-gray-500 sm:inline">
                        Status
                      </span>

                      {order.status === "delivered" ? (<div className="rounded-xl border border-green-500/20 bg-green-500/5 px-3 py-2 text-sm font-bold text-green-300">✓ Delivered by Delivery Partner</div>) : (<select
                        value={order.status}
                        onChange={(e) =>
                          updateOrderStatus(
                            order.id,
                            e.target.value
                          )
                        }
                        disabled={
                          updatingOrderId === order.id
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#211c18] px-3 py-2 text-sm font-semibold text-white outline-none focus:border-orange-500 disabled:opacity-50 sm:w-auto sm:px-4"
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
                      </select>)}

                    </div>

                  </div>

                  {order.status === "ready" && (
                    <div className="mb-4 rounded-2xl border border-orange-500/15 bg-orange-500/5 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wider text-orange-300">
                            Delivery Assignment
                          </p>
                          <p className="mt-1 text-sm text-white/50">
                            Assign an available delivery partner. Delivered
                            status is completed by the delivery partner.
                          </p>
                        </div>

                        <select
                          value={order.delivery_boy_id || ""}
                          disabled={
                            assigningOrderId === order.id ||
                            deliveryBoysLoading
                          }
                          onChange={(e) =>
                            void assignDeliveryBoy(
                              order,
                              e.target.value || null
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-[#0f0d0b] px-3 py-2.5 text-sm font-semibold text-white outline-none focus:border-orange-500/50 disabled:opacity-50 sm:w-64"
                        >
                          <option value="">
                            Select delivery partner
                          </option>
                          {deliveryBoys
                            .filter((boy) => boy.is_active)
                            .map((boy) => (
                              <option
                                key={boy.id}
                                value={boy.id}
                                disabled={!boy.is_available}
                              >
                                {boy.full_name}
                                {boy.is_available
                                  ? " • Online"
                                  : " • Offline"}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="my-4 border-t border-white/10" />

                  {/* Payment Method */}
                  <div className="mb-5 min-w-0 rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-gray-500">
                          Payment Method
                        </p>
                        <p className="mt-1 font-bold">
                          {order.payment_method === "online"
                            ? "💳 Online Payment"
                            : "💵 Cash on Delivery"}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          order.payment_method === "online"
                            ? "bg-green-500/10 text-green-300"
                            : "bg-yellow-500/10 text-yellow-300"
                        }`}
                      >
                        {order.payment_method === "online"
                          ? "PAID ONLINE"
                          : "COD"}
                      </span>
                    </div>
                  </div>

                  {order.payment_method === "online" &&
                    order.status === "cancelled" &&
                    order.razorpay_payment_id && (
                      <div className="mb-5 rounded-xl border border-orange-500/20 bg-orange-500/10 p-4">
                        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-bold text-orange-300">💸 Online Refund</p>
                            <p className="mt-1 text-xs text-gray-400">
                              {order.refund_status
                                ? `Refund status: ${formatStatus(order.refund_status)}`
                                : "Payment is eligible for a refund."}
                            </p>
                          </div>
                          <div className="flex min-w-0 flex-wrap gap-2">
                            {order.refund_status &&
                              order.refund_status !== "processed" &&
                              order.refund_status !== "failed" && (
                                <button
                                  type="button"
                                  onClick={() => fetchOrders()}
                                  disabled={loading}
                                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {loading ? "Checking..." : "🔄 Refresh Status"}
                                </button>
                              )}
                            {!order.refund_status && (
                              <button
                                type="button"
                                onClick={() => refundOnlineOrder(order)}
                                disabled={refundingOrderId === order.id}
                                className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {refundingOrderId === order.id
                                  ? "Processing Refund..."
                                  : `💸 Refund ₹${Number(order.total).toFixed(0)}`}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Customer + Address */}
                  <div className="grid min-w-0 gap-4 md:grid-cols-2">

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

                      <div className="mt-3 flex flex-wrap gap-2">
                        <a
                          href={`tel:${order.customer_phone}`}
                          className="inline-flex max-w-full rounded-xl bg-green-500/10 px-3 py-2 text-xs font-bold sm:px-4 sm:text-sm text-green-300 transition hover:bg-green-500/20"
                        >
                          📞 Call Customer
                        </a>

                        <button
                          type="button"
                          onClick={() => openWhatsApp(order)}
                          className="inline-flex max-w-full rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-bold sm:px-4 sm:text-sm text-emerald-300 transition hover:bg-emerald-500/20"
                        >
                          💬 WhatsApp
                        </button>

                        <a
                          href={`/admin/orders/${encodeURIComponent(order.order_id)}/print`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex max-w-full rounded-xl bg-white/5 px-3 py-2 text-xs font-bold sm:px-4 sm:text-sm text-gray-200 transition hover:bg-white/10"
                        >
                          🧾 Receipt
                        </a>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">
                        Delivery Address
                      </p>

                      <p className="mt-1 break-words font-semibold">
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
                            className="mt-3 inline-flex max-w-full rounded-xl bg-orange-500/10 px-3 py-2 text-xs font-bold sm:px-4 sm:text-sm text-orange-300 transition hover:bg-orange-500/20"
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
                            className="flex min-w-0 items-start justify-between gap-3"
                          >

                            <div className="flex min-w-0 items-center gap-2">

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

                    <div className="mt-3 flex min-w-0 justify-between gap-3 text-lg font-bold sm:text-xl">

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

        {editingDeliveryBoy && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#171310] p-5 shadow-2xl sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">Partner Profile</p>
                  <h3 className="mt-2 text-2xl font-black">Edit Delivery Partner</h3>
                  <p className="mt-1 text-sm text-gray-400">Update contact and vehicle details.</p>
                </div>
                <button type="button" onClick={closeDeliveryBoyEditor} disabled={deliveryBoySaving} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-gray-300 hover:bg-white/10 disabled:opacity-50">✕</button>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-300">Full Name</label>
                  <input value={deliveryBoyName} onChange={(e) => setDeliveryBoyName(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-orange-500/50" placeholder="Delivery partner name" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-300">Phone</label>
                  <input value={deliveryBoyPhone} onChange={(e) => setDeliveryBoyPhone(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-orange-500/50" placeholder="Phone number" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-300">Vehicle Type</label>
                    <input value={deliveryBoyVehicleType} onChange={(e) => setDeliveryBoyVehicleType(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-orange-500/50" placeholder="Bike / Scooter" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-300">Vehicle Number</label>
                    <input value={deliveryBoyVehicleNumber} onChange={(e) => setDeliveryBoyVehicleNumber(e.target.value.toUpperCase())} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-orange-500/50" placeholder="UP14 XX 1234" />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeDeliveryBoyEditor} disabled={deliveryBoySaving} className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-gray-300 hover:bg-white/10 disabled:opacity-50">Cancel</button>
                <button type="button" onClick={() => void saveDeliveryBoyProfile()} disabled={deliveryBoySaving} className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-black transition hover:bg-orange-400 disabled:opacity-50">
                  {deliveryBoySaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
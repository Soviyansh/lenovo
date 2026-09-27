"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Order = {
  id: number;
  order_id: string;
  customer_name: string;
  delivery_address: string;
  subtotal: number;
  delivery_charge: number;
  total: number;
  status: string;
  items: {
    name: string;
    price: number;
    quantity: number;
    emoji: string;
  }[];
  created_at: string;
  payment_method?: "cod" | "online" | string | null;
  razorpay_payment_id?: string | null;
  razorpay_refund_id?: string | null;
  refund_status?: string | null;
  order_type?: "asap" | "scheduled" | string | null;
  scheduled_for?: string | null;

  // Delivery flow
  user_id?: string | null;
  delivery_boy_id?: string | null;
  customer_lat?: number | null;
  customer_lng?: number | null;
  delivery_otp?: string | null;
  delivery_assigned_at?: string | null;
  delivery_accepted_at?: string | null;
  picked_up_at?: string | null;
  delivery_arrived_at?: string | null;
  delivered_at?: string | null;
};

type DeliveryPartnerLocation = {
  current_lat: number | null;
  current_lng: number | null;
  last_location_at: string | null;
};

type CustomerNotification = {
  id: string;
  user_id: string;
  order_id: string | null;
  title: string;
  message: string;
  type: string | null;
  is_read: boolean;
  created_at: string;
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
  }
];

export default function OrderTrackingPage() {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [liveConnected, setLiveConnected] = useState(false);
  const [notification, setNotification] = useState("");
  const [previousOrder, setPreviousOrder] = useState<Order | null>(null);
  const [deliveryLocation, setDeliveryLocation] = useState<DeliveryPartnerLocation | null>(null);
  const [deliveryLocationLoading, setDeliveryLocationLoading] = useState(false);
  const [deliveryLocationConnected, setDeliveryLocationConnected] = useState(false);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationUpdating, setNotificationUpdating] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewExists, setReviewExists] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");
  const [reorderMessage, setReorderMessage] = useState("");
  const [reorderLoading, setReorderLoading] = useState(false);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [orderHistoryLoading, setOrderHistoryLoading] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [cancelMessage, setCancelMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    let notificationChannel: ReturnType<typeof supabase.channel> | null = null;

    const loadNotifications = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!mounted || !userData.user) return;

      setNotificationsLoading(true);

      const { data, error } = await supabase
        .from("notifications")
        .select("id,user_id,order_id,title,message,type,is_read,created_at")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!mounted) return;

      if (error) {
        console.error("Customer notifications error:", error);
        setNotificationsLoading(false);
        return;
      }

      setNotifications((data as CustomerNotification[]) || []);
      setNotificationsLoading(false);

      notificationChannel = supabase
        .channel(`customer-notifications-${userData.user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userData.user.id}`,
          },
          (payload) => {
            if (!mounted) return;

            const incoming = payload.new as CustomerNotification;

            setNotifications((current) => {
              if (current.some((item) => item.id === incoming.id)) {
                return current;
              }
              return [incoming, ...current].slice(0, 50);
            });

            setNotificationOpen(true);

            try {
              if ("Notification" in window && Notification.permission === "granted") {
                new Notification(incoming.title || "YASH SAINI RESTAURANT", {
                  body: incoming.message,
                });
              }
            } catch {
              // Ignore browser notification restrictions.
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userData.user.id}`,
          },
          (payload) => {
            if (!mounted) return;

            const updated = payload.new as CustomerNotification;

            setNotifications((current) =>
              current.map((item) =>
                item.id === updated.id ? updated : item
              )
            );
          }
        )
        .subscribe();
    };

    loadNotifications();

    return () => {
      mounted = false;
      if (notificationChannel) {
        supabase.removeChannel(notificationChannel);
      }
    };
  }, []);

  const unreadNotificationCount = notifications.filter(
    (item) => !item.is_read
  ).length;

  const formatNotificationTime = (value: string) => {
    const date = new Date(value);
    const now = Date.now();
    const diff = Math.max(0, now - date.getTime());

    if (diff < 60 * 1000) return "Just now";
    if (diff < 60 * 60 * 1000) {
      return `${Math.floor(diff / (60 * 1000))}m ago`;
    }
    if (diff < 24 * 60 * 60 * 1000) {
      return `${Math.floor(diff / (60 * 60 * 1000))}h ago`;
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const markNotificationRead = async (id: string) => {
    setNotificationUpdating(true);

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (error) {
      console.error("Mark notification read error:", error);
      setNotificationUpdating(false);
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === id ? { ...item, is_read: true } : item
      )
    );

    setNotificationUpdating(false);
  };

  const handleNotificationClick = async (item: CustomerNotification) => {
    if (!item.is_read) {
      await markNotificationRead(item.id);
    }

    setNotificationOpen(false);

    if (item.order_id && item.order_id !== order?.order_id) {
      localStorage.setItem("last-order-id", item.order_id);
      window.location.reload();
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const markAllNotificationsRead = async () => {
    const unreadIds = notifications
      .filter((item) => !item.is_read)
      .map((item) => item.id);

    if (!unreadIds.length) return;

    setNotificationUpdating(true);

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds);

    if (error) {
      console.error("Mark all notifications read error:", error);
      setNotificationUpdating(false);
      return;
    }

    setNotifications((current) =>
      current.map((item) => ({ ...item, is_read: true }))
    );

    setNotificationUpdating(false);
  };

  const loadOrderReview = async (currentOrder: Order) => {
    if (!currentOrder.id || currentOrder.status !== "delivered") return;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    setReviewLoading(true);

    const { data, error } = await supabase
      .from("reviews")
      .select("id,rating,review_text,is_visible,created_at,updated_at")
      .eq("order_id", currentOrder.id)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (error) {
      console.error("Review load error:", error);
      setReviewLoading(false);
      return;
    }

    if (data) {
      setReviewExists(true);
      setReviewRating(Number(data.rating) || 0);
      setReviewText(String(data.review_text || ""));
    } else {
      setReviewExists(false);
      setReviewRating(0);
      setReviewText("");
    }

    setReviewLoading(false);
  };

  const submitOrderReview = async () => {
    if (!order?.id || order.status !== "delivered") return;

    if (reviewRating < 1 || reviewRating > 5) {
      setReviewMessage("Please select a rating from 1 to 5 stars.");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setReviewMessage("Please log in to submit your review.");
      return;
    }

    setReviewSubmitting(true);
    setReviewMessage("");

    const payload = {
      order_id: order.id,
      user_id: userData.user.id,
      rating: reviewRating,
      review_text: reviewText.trim() || null,
    };

    const result = reviewExists
      ? await supabase
          .from("reviews")
          .update({
            rating: payload.rating,
            review_text: payload.review_text,
          })
          .eq("order_id", order.id)
          .eq("user_id", userData.user.id)
      : await supabase.from("reviews").insert(payload);

    if (result.error) {
      console.error("Review submit error:", result.error);
      setReviewMessage("Unable to save your review. Please try again.");
      setReviewSubmitting(false);
      return;
    }

    setReviewExists(true);
    setReviewMessage(reviewExists ? "Your review has been updated." : "Thank you for rating your order!");
    setReviewSubmitting(false);
  };

  useEffect(() => {
    if (order?.status === "delivered") {
      void loadOrderReview(order);
    }
  }, [order?.id, order?.status]);

  const notificationIcon = (type?: string | null) => {
    const value = String(type || "").toLowerCase();

    if (value.includes("delivery")) return "🛵";
    if (value.includes("ready")) return "🍽️";
    if (value.includes("prepar")) return "👨‍🍳";
    if (value.includes("deliver")) return "✅";
    if (value.includes("cancel")) return "❌";
    return "🔔";
  };

  useEffect(() => {
    const orderId = localStorage.getItem("last-order-id");

    if (!orderId) {
      setErrorMessage("No recent order found.");
      setLoading(false);
      return;
    }

    let mounted = true;

    const showNotification = (message: string) => {
      if (!mounted) return;

      setNotification(message);

      window.setTimeout(() => {
        if (mounted) setNotification("");
      }, 5000);

      // Best-effort browser notification. In-app notification always works.
      try {
        if (
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          new Notification("YASH SAINI RESTAURANT", {
            body: message,
          });
        }
      } catch {
        // Ignore browser notification restrictions.
      }
    };

    const detectTransition = (
      previous: Order | null,
      latest: Order
    ) => {
      if (!previous) return;

      if (
        !previous.delivery_boy_id &&
        latest.delivery_boy_id
      ) {
        showNotification(
          "A delivery partner has been assigned to your order."
        );
        return;
      }

      if (
        previous.status !== "out for delivery" &&
        latest.status === "out for delivery"
      ) {
        showNotification(
          "Your order is out for delivery. Your delivery partner is on the way."
        );
        return;
      }

      if (
        !previous.delivery_arrived_at &&
        latest.delivery_arrived_at
      ) {
        showNotification(
          "Your delivery partner has arrived at your location. Please share the OTP now."
        );
        return;
      }

      if (
        previous.status !== "delivered" &&
        latest.status === "delivered"
      ) {
        showNotification(
          "Your order has been delivered. Enjoy your meal!"
        );
      }
    };

    const fetchOrder = async () => {
      const { data: userData } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!userData.user) {
        setErrorMessage("Please log in to track this order.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("order_id", orderId)
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        console.error("Order tracking error:", error);
        setErrorMessage("Unable to find your order.");
        setLoading(false);
        return;
      }

      if (!data) {
        setErrorMessage("Unable to find your order.");
        setLoading(false);
        return;
      }

      const latestOrder = data as Order;
      setOrder((current) => {
        detectTransition(current, latestOrder);
        setPreviousOrder(current);
        return latestOrder;
      });
      setLoading(false);
    };

    fetchOrder();

    const loadDeliveryLocation = async (deliveryBoyId: string) => {
      if (!mounted || !deliveryBoyId) return;

      setDeliveryLocationLoading(true);

      const { data, error } = await supabase
        .from("delivery_boys")
        .select("current_lat,current_lng,last_location_at")
        .eq("id", deliveryBoyId)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        console.error("Delivery location error:", error);
        setDeliveryLocationLoading(false);
        return;
      }

      setDeliveryLocation((data as DeliveryPartnerLocation | null) || null);
      setDeliveryLocationLoading(false);
    };

    // Load the delivery partner location after assignment.
    let deliveryLocationPoll: number | null = null;
    let deliveryLocationChannel: ReturnType<typeof supabase.channel> | null = null;
    let trackedDeliveryBoyId: string | null = null;

    const setupDeliveryLocationTracking = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!mounted || !userData.user) return;

      const { data: currentOrder } = await supabase
        .from("orders")
        .select("delivery_boy_id,status")
        .eq("order_id", orderId)
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (!mounted || !currentOrder?.delivery_boy_id) return;

      const deliveryBoyId = currentOrder.delivery_boy_id as string;

      if (trackedDeliveryBoyId === deliveryBoyId) return;

      trackedDeliveryBoyId = deliveryBoyId;
      await loadDeliveryLocation(deliveryBoyId);

      if (deliveryLocationChannel) {
        supabase.removeChannel(deliveryLocationChannel);
      }

      deliveryLocationChannel = supabase
        .channel(`delivery-location-${orderId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "delivery_boys",
            filter: `id=eq.${deliveryBoyId}`,
          },
          (payload) => {
            if (!mounted) return;

            const location = payload.new as DeliveryPartnerLocation;
            setDeliveryLocation({
              current_lat: location.current_lat,
              current_lng: location.current_lng,
              last_location_at: location.last_location_at,
            });
            setDeliveryLocationConnected(true);
          }
        )
        .subscribe((status) => {
          if (!mounted) return;
          setDeliveryLocationConnected(status === "SUBSCRIBED");
        });

      deliveryLocationPoll = window.setInterval(async () => {
        if (!mounted) return;

        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const { data: latestOrder } = await supabase
          .from("orders")
          .select("delivery_boy_id")
          .eq("order_id", orderId)
          .eq("user_id", userData.user.id)
          .maybeSingle();

        if (!mounted || !latestOrder?.delivery_boy_id) return;

        const latestDeliveryBoyId = latestOrder.delivery_boy_id as string;

        if (trackedDeliveryBoyId !== latestDeliveryBoyId) {
          await setupDeliveryLocationTracking();
          return;
        }

        await loadDeliveryLocation(latestDeliveryBoyId);
      }, 5000);
    };

    setupDeliveryLocationTracking();

    const channel = supabase
      .channel(`customer-order-${orderId}`)
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

          const updatedOrder = payload.new as Order;

          if (updatedOrder.order_id !== orderId) return;

          setOrder((currentOrder) => {
            detectTransition(currentOrder, updatedOrder);
            setPreviousOrder(currentOrder);
            return updatedOrder;
          });
        }
      )
      .subscribe((status) => {
        if (!mounted) return;

        setLiveConnected(status === "SUBSCRIBED");
      });

    const pollingInterval = window.setInterval(async () => {
      if (!mounted) return;

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("order_id", orderId)
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (error || !data) return;

      const latestOrder = data as Order;

      if (latestOrder.delivery_boy_id && trackedDeliveryBoyId !== latestOrder.delivery_boy_id) {
        await setupDeliveryLocationTracking();
      }

      setOrder((currentOrder) => {
        detectTransition(currentOrder, latestOrder);

        if (
          currentOrder &&
          JSON.stringify(currentOrder) ===
            JSON.stringify(latestOrder)
        ) {
          return currentOrder;
        }

        setPreviousOrder(currentOrder);
        return latestOrder;
      });
    }, 5000);

    return () => {
      mounted = false;
      window.clearInterval(pollingInterval);
      if (deliveryLocationPoll !== null) {
        window.clearInterval(deliveryLocationPoll);
      }
      supabase.removeChannel(channel);
      if (deliveryLocationChannel) {
        supabase.removeChannel(deliveryLocationChannel);
      }
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadOrderHistory = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!mounted || !userData.user) return;

      setOrderHistoryLoading(true);

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!mounted) return;

      if (error) {
        console.error("Order history error:", error);
        setOrderHistory([]);
      } else {
        setOrderHistory((data || []) as Order[]);
      }

      setOrderHistoryLoading(false);
    };

    void loadOrderHistory();

    return () => {
      mounted = false;
    };
  }, []);

  const openOrderFromHistory = (orderId: string) => {
    localStorage.setItem("last-order-id", orderId);
    window.location.href = "/order-tracking";
  };

  const currentStepIndex = order
    ? Math.max(
        0,
        STATUS_STEPS.findIndex(
          (step) => step.status === order.status
        )
      )
    : -1;

  const isCancelled = order?.status === "cancelled";
  const isDelivered = order?.status === "delivered";
  const hasDeliveryPartner = Boolean(order?.delivery_boy_id);
  const shouldShowOtp =
    Boolean(order?.delivery_otp) &&
    hasDeliveryPartner &&
    !isDelivered &&
    !isCancelled &&
    (order?.status === "ready" ||
      order?.status === "out for delivery");

  const deliveryOtp = String(order?.delivery_otp || "");
  const hasLiveDeliveryLocation =
    hasDeliveryPartner &&
    !isCancelled &&
    !isDelivered &&
    order?.status === "out for delivery";
  const hasValidDeliveryLocation =
    typeof deliveryLocation?.current_lat === "number" &&
    typeof deliveryLocation?.current_lng === "number";

  const deliveryMapUrl = hasValidDeliveryLocation
    ? `https://www.google.com/maps?q=${deliveryLocation?.current_lat},${deliveryLocation?.current_lng}&z=16&output=embed`
    : "";

  const deliveryLocationTime = deliveryLocation?.last_location_at
    ? new Date(deliveryLocation.last_location_at).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  const hasArrived = Boolean(order?.delivery_arrived_at);

  const arrivalTime = order?.delivery_arrived_at
    ? new Date(order.delivery_arrived_at).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const formatStatus = (status?: string | null) => {
    if (!status) return "Pending";

    return status
      .replace(/[-_]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const reorderItems = () => {
    if (!order?.items?.length || reorderLoading) return;

    try {
      setReorderLoading(true);
      setReorderMessage("");

      const existing = localStorage.getItem("restaurant-cart");
      let currentCart: Array<Record<string, unknown>> = [];

      if (existing) {
        try {
          const parsed = JSON.parse(existing);
          if (Array.isArray(parsed)) currentCart = parsed;
        } catch {
          currentCart = [];
        }
      }

      for (const item of order.items) {
        const existingItem = currentCart.find(
          (cartItem) => Number(cartItem.id) === Number((item as { id?: number }).id) || cartItem.name === item.name
        );

        if (existingItem) {
          const currentQuantity = Number(existingItem.quantity || 0);
          existingItem.quantity = currentQuantity + Number(item.quantity || 1);
        } else {
          currentCart.push({
            id: (item as { id?: number }).id ?? Date.now() + currentCart.length,
            name: item.name,
            price: item.price,
            emoji: item.emoji,
            category: (item as { category?: string }).category || "Popular",
            quantity: item.quantity,
            image: (item as { image?: string }).image,
          });
        }
      }

      localStorage.setItem("restaurant-cart", JSON.stringify(currentCart));
      setReorderMessage("Items added to your cart. Opening menu…");

      window.setTimeout(() => {
        window.location.href = "/menu";
      }, 500);
    } catch (err) {
      console.error("Reorder error:", err);
      setReorderMessage("Could not add these items to cart. Please try again.");
    } finally {
      setReorderLoading(false);
    }
  };

  const cancelPendingOrder = async () => {
    if (!order || order.status !== "pending" || cancellingOrder) return;

    const confirmed = window.confirm(
      `Cancel order #${order.order_id}?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setCancelMessage("Please log in to cancel your order.");
      return;
    }

    setCancellingOrder(true);
    setCancelMessage("");
    setErrorMessage("");

    const { data, error } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", order.id)
      .eq("user_id", userData.user.id)
      .eq("status", "pending")
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("Customer order cancellation error:", error);
      setCancelMessage(
        "Unable to cancel this order. It may already be preparing. Please refresh and try again."
      );
      setCancellingOrder(false);
      return;
    }

    if (!data) {
      setCancelMessage(
        "This order can no longer be cancelled because its status has changed."
      );
      setCancellingOrder(false);
      return;
    }

    const cancelledOrder = data as Order;
    setPreviousOrder(order);
    setOrder(cancelledOrder);
    setOrderHistory((current) =>
      current.map((item) =>
        item.id === cancelledOrder.id ? cancelledOrder : item
      )
    );
    setCancelMessage("Order cancelled successfully.");
    setCancellingOrder(false);
  };

  const printOrderReceipt = () => {
    if (!order) return;
    window.print();
  };

  const shareOrderTracking = async () => {
    if (!order) return;

    const trackingUrl = `${window.location.origin}/order-tracking?orderId=${encodeURIComponent(
      order.order_id
    )}`;
    const shareText = `Track my YASH SAINI RESTAURANT order ${order.order_id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Order ${order.order_id}`,
          text: shareText,
          url: trackingUrl,
        });
        setShareMessage("Tracking link shared.");
        return;
      }

      await navigator.clipboard.writeText(trackingUrl);
      setShareMessage("Tracking link copied.");
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") return;

      try {
        await navigator.clipboard.writeText(trackingUrl);
        setShareMessage("Tracking link copied.");
      } catch (clipboardError) {
        console.error("Share order error:", clipboardError);
        setShareMessage("Could not share the tracking link.");
      }
    }

    window.setTimeout(() => setShareMessage(""), 2500);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const isScheduledOrder = (currentOrder: Order) =>
    currentOrder.order_type === "scheduled" &&
    Boolean(currentOrder.scheduled_for);

  const isScheduleReady = (currentOrder: Order) => {
    if (!isScheduledOrder(currentOrder)) return true;

    return (
      new Date(currentOrder.scheduled_for as string).getTime() <=
      Date.now()
    );
  };

  const formatScheduledTime = (value: string) =>
    new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0f0d0b] text-white">
        <div className="text-center">

          <div className="mb-4 text-5xl">
            🛵
          </div>

          <p className="text-gray-400">
            Loading your order...
          </p>

        </div>
      </main>
    );
  }

  if (errorMessage || !order) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0f0d0b] px-4 text-white">

        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#171310] p-8 text-center">

          <div className="mb-4 text-5xl">
            📦
          </div>

          <h1 className="text-2xl font-bold">
            Order Not Found
          </h1>

          <p className="mt-3 text-gray-400">
            {errorMessage ||
              "We couldn't find your recent order."}
          </p>

          <button
            onClick={() => {
              window.location.href = "/";
            }}
            className="mt-6 rounded-xl bg-orange-500 px-6 py-3 font-bold text-black transition hover:bg-orange-400"
          >
            Back to Home
          </button>

        </div>

      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f0d0b] px-4 py-8 text-white">

      <div className="mx-auto max-w-4xl">

        {notification && (
          <div
            role="status"
            className="fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-orange-500/30 bg-[#1b1511]/95 px-5 py-4 shadow-2xl backdrop-blur"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-xl">🔔</div>
              <div>
                <p className="font-bold text-orange-300">
                  Order Update
                </p>
                <p className="mt-1 text-sm leading-5 text-white/75">
                  {notification}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8 text-center">

          <p className="font-semibold text-orange-400">
            YASH SAINI RESTAURANT
          </p>

          <h1 className="mt-2 text-3xl font-bold md:text-4xl">
            Track Your Order
          </h1>

          <p className="mt-2 text-gray-400">
            Order #{order.order_id}
          </p>

          <div className="relative mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => setNotificationOpen((current) => !current)}
              className="relative inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
              aria-label="Open notifications"
              aria-expanded={notificationOpen}
            >
              <span className="text-lg">🔔</span>
              Notifications
              {unreadNotificationCount > 0 && (
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-orange-500 px-1.5 text-xs font-black text-black">
                  {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                </span>
              )}
            </button>

            {notificationOpen && (
              <div className="absolute left-1/2 top-full z-40 mt-3 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 overflow-hidden rounded-3xl border border-white/10 bg-[#171310] text-left shadow-2xl shadow-black/50">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
                  <div>
                    <p className="font-black">Notifications</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {unreadNotificationCount
                        ? `${unreadNotificationCount} unread`
                        : "You're all caught up"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void markAllNotificationsRead()}
                    disabled={
                      notificationUpdating || unreadNotificationCount === 0
                    }
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {notificationUpdating ? "..." : "Mark all read"}
                  </button>
                </div>

                <div className="max-h-[420px] overflow-y-auto">
                  {notificationsLoading ? (
                    <div className="p-8 text-center text-sm text-gray-500">
                      Loading notifications...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="text-4xl">🔕</div>
                      <p className="mt-3 font-bold text-white">
                        No notifications yet
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Order updates will appear here automatically.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {notifications.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => void handleNotificationClick(item)}
                          className={`w-full p-4 text-left transition hover:bg-white/[0.04] ${
                            item.is_read ? "bg-transparent" : "bg-orange-500/[0.06]"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                item.is_read
                                  ? "bg-white/5"
                                  : "bg-orange-500/10"
                              }`}
                            >
                              {notificationIcon(item.type)}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <p
                                  className={`text-sm font-black ${
                                    item.is_read
                                      ? "text-white/80"
                                      : "text-orange-300"
                                  }`}
                                >
                                  {item.title}
                                </p>

                                {!item.is_read && (
                                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-orange-400" />
                                )}
                              </div>

                              <p className="mt-1 text-sm leading-5 text-white/55">
                                {item.message}
                              </p>

                              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/35">
                                <span>{formatNotificationTime(item.created_at)}</span>
                                {item.order_id && (
                                  <span className="rounded-full bg-white/5 px-2 py-0.5">
                                    #{item.order_id}
                                  </span>
                                )}
                                {item.order_id && item.order_id !== order?.order_id && (
                                  <span className="text-orange-300">Open order →</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-sm">

            <span
              className={`h-2.5 w-2.5 rounded-full ${
                liveConnected
                  ? "bg-green-500"
                  : "bg-gray-500"
              }`}
            />

            <span className="text-gray-400">
              {liveConnected
                ? "Live status updates connected"
                : "Checking latest order status..."}
            </span>

          </div>

        </div>

        {/* Cancelled Order */}
        {isCancelled ? (
          <div className="mb-8 rounded-3xl border border-red-500/30 bg-red-500/10 p-7 text-center md:p-10">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-500/15 text-5xl">
              ❌
            </div>

            <h2 className="mt-5 text-2xl font-black text-red-300 md:text-3xl">
              We&apos;re Very Sorry
            </h2>

            <p className="mt-3 text-lg font-semibold text-white">
              We could not accept your order.
            </p>

            <p className="mx-auto mt-3 max-w-2xl leading-7 text-gray-300">
              Your order <span className="font-bold text-red-300">#{order.order_id}</span> has been cancelled by the restaurant.
              We sincerely apologize for the inconvenience.
            </p>

            {order.payment_method === "online" && (
              <div
                className={`mx-auto mt-6 max-w-2xl rounded-2xl border p-5 text-left ${
                  String(order.refund_status || "").toLowerCase() === "processed"
                    ? "border-green-500/30 bg-green-500/10"
                    : String(order.refund_status || "").toLowerCase() === "failed"
                    ? "border-red-500/30 bg-red-500/10"
                    : "border-orange-500/30 bg-orange-500/10"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-3xl">
                    {String(order.refund_status || "").toLowerCase() === "processed"
                      ? "💸"
                      : String(order.refund_status || "").toLowerCase() === "failed"
                      ? "⚠️"
                      : "💳"}
                  </div>

                  <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/40">
                      Online Payment
                    </p>

                    <h3
                      className={`mt-1 text-xl font-black ${
                        String(order.refund_status || "").toLowerCase() === "processed"
                          ? "text-green-300"
                          : String(order.refund_status || "").toLowerCase() === "failed"
                          ? "text-red-300"
                          : "text-orange-300"
                      }`}
                    >
                      {String(order.refund_status || "").toLowerCase() === "processed"
                        ? "Payment Refunded"
                        : String(order.refund_status || "").toLowerCase() === "failed"
                        ? "Refund Failed"
                        : "Refund Will Be Processed"}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-gray-300">
                      {String(order.refund_status || "").toLowerCase() === "processed"
                        ? `Your ₹${Number(order.total).toFixed(0)} online payment refund has been processed through Razorpay. The amount will be credited according to your payment provider's processing time.`
                        : String(order.refund_status || "").toLowerCase() === "failed"
                        ? "We could not complete the online payment refund. Please contact YASH SAINI RESTAURANT for assistance."
                        : `You paid ₹${Number(order.total).toFixed(0)} online. Since this order was cancelled, your payment is eligible for a refund. The refund will be processed through Razorpay.`}
                    </p>

                    {order.refund_status && (
                      <p className="mt-3 text-xs font-semibold text-white/40">
                        Refund Status: {formatStatus(order.refund_status)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-red-500/20 bg-black/20 p-4 text-sm text-gray-400">
              If you have any questions, please contact YASH SAINI RESTAURANT.
            </div>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/";
              }}
              className="mt-6 rounded-xl bg-red-500 px-6 py-3 font-bold text-white transition hover:bg-red-400"
            >
              Back to Home
            </button>
          </div>
        ) : (
          <>
        {/* Current Status */}
        <div
          className={`mb-8 rounded-3xl border p-6 text-center ${
            isCancelled
              ? "hidden"
              : isScheduledOrder(order) && !isScheduleReady(order)
              ? "border-orange-500/20 bg-orange-500/10"
              : "border-orange-500/20 bg-orange-500/10"
          }`}
        >
          {isScheduledOrder(order) && !isScheduleReady(order) ? (
            <>
              <div className="text-5xl">🕐</div>

              <h2 className="mt-3 text-2xl font-bold text-orange-400">
                Order Scheduled
              </h2>

              <p className="mt-2 text-gray-300">
                Your order is confirmed and will be prepared at the scheduled
                time.
              </p>

              <div className="mx-auto mt-5 max-w-md rounded-2xl border border-orange-500/20 bg-black/20 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-white/40">
                  Scheduled For
                </p>
                <p className="mt-1 text-lg font-black text-orange-300">
                  📅 {formatScheduledTime(order.scheduled_for as string)}
                </p>
                <p className="mt-2 text-xs text-white/45">
                  Live preparation tracking will begin when your scheduled
                  time arrives.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="text-5xl">
                {isDelivered
                  ? "🎉"
                  : STATUS_STEPS[currentStepIndex]?.emoji || "📦"}
              </div>

              <h2 className="mt-3 text-2xl font-bold text-orange-400">
                {isDelivered
                  ? "Delivered"
                  : STATUS_STEPS[currentStepIndex]?.title || formatStatus(order.status)}
              </h2>

              <p className="mt-2 text-gray-300">
                {isDelivered
                  ? "Your order has been successfully delivered."
                  : STATUS_STEPS[currentStepIndex]?.description ||
                    "Your order is being processed."}
              </p>
            </>
          )}
        </div>

        {/* Delivery OTP */}
        {shouldShowOtp && (
          <div className="mb-8 overflow-hidden rounded-3xl border border-orange-500/30 bg-gradient-to-br from-orange-500/15 via-[#171310] to-[#171310] p-6 md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔐</span>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
                    Delivery Verification
                  </p>
                </div>

                <h2 className="mt-2 text-2xl font-black">
                  Your Delivery OTP
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-6 text-white/55">
                  Share this OTP with the delivery partner only when
                  your food has arrived at your location. Do not share
                  it over a call or before the partner reaches you.
                </p>
              </div>

              <div className="rounded-2xl border border-orange-500/25 bg-black/30 px-7 py-5 text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-white/35">
                  6-Digit OTP
                </p>
                <p className="mt-2 font-mono text-4xl font-black tracking-[0.3em] text-orange-300">
                  {deliveryOtp}
                </p>
              </div>
            </div>

            {order?.delivery_arrived_at ? (
              <div className="mt-5 rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm font-semibold text-green-300">
                ✓ Your delivery partner has marked that they have
                arrived. You can now safely share the OTP.
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-200/80">
                ⚠️ Keep this OTP private until the delivery partner
                reaches your location.
              </div>
            )}
          </div>
        )}

        {/* Delivery Partner Arrived */}
        {hasArrived && !isDelivered && !isCancelled && (
          <div className="mb-8 overflow-hidden rounded-3xl border border-green-500/30 bg-gradient-to-br from-green-500/15 via-[#171310] to-[#171310] shadow-2xl">
            <div className="p-6 md:p-8">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-green-500/15 text-3xl ring-1 ring-green-500/20">
                    🛵
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.8)]" />
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-green-300">Arrived at your location</p>
                    </div>
                    <h2 className="mt-2 text-2xl font-black md:text-3xl">Your delivery partner has arrived 🎉</h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-white/60">
                      Your food is ready for handover. Please meet the delivery partner and share your OTP only after you receive your order.
                    </p>
                  </div>
                </div>
                <div className="shrink-0 rounded-2xl border border-green-500/20 bg-green-500/5 px-5 py-4 text-center">
                  <p className="text-xs font-bold uppercase tracking-widest text-white/35">Arrived</p>
                  <p className="mt-1 text-lg font-black text-green-300">✓ {arrivalTime || "Now"}</p>
                </div>
              </div>

              {shouldShowOtp && (
                <div className="mt-6 rounded-2xl border border-orange-500/25 bg-orange-500/10 p-5">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🔐</span>
                    <div>
                      <p className="font-black text-orange-300">OTP is ready for handover</p>
                      <p className="mt-1 text-sm leading-6 text-white/55">
                        Share the 6-digit OTP shown above with the delivery partner only when you are receiving your order.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Live Delivery Tracking */}
        {hasLiveDeliveryLocation && (
          <div className="mb-8 overflow-hidden rounded-3xl border border-orange-500/20 bg-[#171310]">
            <div className="flex flex-col gap-4 border-b border-white/10 p-6 md:flex-row md:items-center md:justify-between md:p-7">
              <div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
                  </span>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-green-300">
                    Live Delivery Tracking
                  </p>
                </div>
                <h2 className="mt-2 text-2xl font-black">
                  Your delivery partner is on the way 🛵
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/50">
                  The map updates automatically as your delivery partner moves.
                </p>
              </div>

              <div className="rounded-2xl border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm">
                <p className="font-bold text-green-300">
                  {deliveryLocationConnected ? "● Live connected" : "● Updating location"}
                </p>
                {deliveryLocationTime && (
                  <p className="mt-1 text-xs text-white/40">
                    Last update: {deliveryLocationTime}
                  </p>
                )}
              </div>
            </div>

            <div className="relative bg-black/20">
              {hasValidDeliveryLocation ? (
                <div className="relative h-[320px] w-full md:h-[420px]">
                  <iframe
                    key={`${deliveryLocation?.current_lat}-${deliveryLocation?.current_lng}`}
                    title="Live delivery partner location"
                    src={deliveryMapUrl}
                    className="h-full w-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  <div className="pointer-events-none absolute left-4 top-4 rounded-2xl border border-white/10 bg-[#111]/90 px-4 py-3 shadow-xl backdrop-blur">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/40">
                      Delivery Partner
                    </p>
                    <p className="mt-1 font-black text-orange-300">
                      📍 Live Location
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex h-64 flex-col items-center justify-center px-6 text-center">
                  <div className="text-5xl">📡</div>
                  <h3 className="mt-4 text-lg font-black">Getting live location...</h3>
                  <p className="mt-2 max-w-md text-sm leading-6 text-white/45">
                    Your delivery partner is on the way. The live map will appear as soon as their GPS location is available.
                  </p>
                  {deliveryLocationLoading && (
                    <div className="mt-4 h-2 w-28 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-1/2 animate-pulse rounded-full bg-orange-500" />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 p-5 md:flex-row md:items-center md:justify-between">
              <p className="text-xs leading-5 text-white/40">
                Location is provided for delivery tracking only. Exact GPS updates may take a few seconds to refresh.
              </p>
              {hasValidDeliveryLocation && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${deliveryLocation?.current_lat},${deliveryLocation?.current_lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-center text-sm font-bold transition hover:bg-white/10"
                >
                  Open Live Location ↗
                </a>
              )}
            </div>
          </div>
        )}

        {/* Delivery Partner Status */}
        {hasDeliveryPartner && !isCancelled && !isDelivered && (
          <div className="mb-8 rounded-3xl border border-white/10 bg-[#171310] p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500/10 text-xl">
                🛵
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-white/35">
                  Delivery
                </p>
                <h2 className="mt-1 text-lg font-black">
                  Delivery partner assigned
                </h2>
                <p className="mt-1 text-sm leading-6 text-white/50">
                  Your delivery partner will complete the handover
                  using the secure delivery OTP.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Progress */}
        <div
          className={`mb-8 rounded-3xl border border-white/10 bg-[#171310] p-6 md:p-8 ${
            isCancelled ? "hidden" : ""
          }`}
        >
          <h2 className="mb-8 text-xl font-bold">
            Order Progress
          </h2>

          {isScheduledOrder(order) && !isScheduleReady(order) && (
            <div className="mb-6 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4">
              <p className="font-bold text-orange-300">
                ⏳ Waiting for scheduled time
              </p>
              <p className="mt-1 text-sm leading-6 text-white/50">
                The kitchen will start processing your order at{" "}
                <span className="font-semibold text-white/70">
                  {formatScheduledTime(order.scheduled_for as string)}
                </span>
                .
              </p>
            </div>
          )}

          <div className="space-y-7">

            {STATUS_STEPS.map((step, index) => {

              const completed =
                index <= currentStepIndex;

              const active =
                index === currentStepIndex;

              return (
                <div
                  key={step.status}
                  className="flex items-start gap-4"
                >

                  <div className="flex flex-col items-center">

                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full text-xl ${
                        completed
                          ? "bg-orange-500 text-black"
                          : "border border-white/10 bg-white/5 text-gray-500"
                      } ${
                        active
                          ? "ring-4 ring-orange-500/20"
                          : ""
                      }`}
                    >
                      {completed
                        ? "✓"
                        : step.emoji}
                    </div>

                    {index !==
                      STATUS_STEPS.length - 1 && (
                      <div
                        className={`mt-2 h-8 w-0.5 ${
                          index < currentStepIndex
                            ? "bg-orange-500"
                            : "bg-white/10"
                        }`}
                      />
                    )}

                  </div>

                  <div className="pt-1">

                    <p
                      className={`font-bold ${
                        active
                          ? "text-orange-400"
                          : completed
                          ? "text-white"
                          : "text-gray-500"
                      }`}
                    >
                      {step.title}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {step.description}
                    </p>

                  </div>

                </div>
              );
            })}

          </div>

        </div>

        {order.status === "pending" && !isCancelled && (
          <section className="mb-8 rounded-3xl border border-red-500/20 bg-red-500/[0.06] p-6 md:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-red-300/80">
                  Need to cancel?
                </p>
                <h2 className="mt-2 text-xl font-black text-white">
                  Cancel this order
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/50">
                  You can cancel while the order is still pending. Once the
                  restaurant starts preparing it, cancellation is no longer available here.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void cancelPendingOrder()}
                disabled={cancellingOrder}
                className="shrink-0 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 font-black text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cancellingOrder ? "Cancelling..." : "Cancel Order"}
              </button>
            </div>

            {cancelMessage && (
              <p className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${
                cancelMessage.toLowerCase().includes("successfully")
                  ? "border-green-500/20 bg-green-500/10 text-green-300"
                  : "border-red-500/20 bg-red-500/10 text-red-300"
              }`}>
                {cancelMessage}
              </p>
            )}
          </section>
        )}

        {order.payment_method === "online" && !isCancelled && (
          <div className="mb-8 rounded-3xl border border-blue-500/20 bg-blue-500/10 p-6">
            <div className="flex items-start gap-4">
              <div className="text-3xl">💳</div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-300/80">
                  Online Payment
                </p>
                <h2 className="mt-1 text-xl font-black text-blue-200">
                  Paid Online • ₹{Number(order.total).toFixed(0)}
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/55">
                  If this order is cancelled, your online payment will be
                  eligible for a refund. Any refund will be processed through
                  Razorpay.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOMER REVIEW */}
        {isDelivered && (
          <section className="mb-8 overflow-hidden rounded-3xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 via-[#171310] to-[#171310] p-6 md:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-300/80">
                  Your Experience
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  {reviewExists ? "Your Review" : "Rate Your Order"}
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/50">
                  {reviewExists
                    ? "You can update your rating or review anytime."
                    : "How was your experience with YASH SAINI RESTAURANT?"}
                </p>
              </div>
              <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-2 text-xs font-black text-green-300">
                ✓ Order Delivered
              </span>
            </div>

            {reviewLoading ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/45">
                Loading your review...
              </div>
            ) : (
              <>
                <div className="mt-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-white/35">
                    Your Rating
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                        onClick={() => setReviewRating(star)}
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-2xl transition ${
                          star <= reviewRating
                            ? "border-yellow-400/40 bg-yellow-400/15 text-yellow-300 scale-105"
                            : "border-white/10 bg-white/5 text-white/20 hover:border-yellow-400/20 hover:text-yellow-300/60"
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/35">
                    Review (optional)
                  </label>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value.slice(0, 500))}
                    placeholder="Tell us about your food and delivery experience..."
                    rows={4}
                    className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-yellow-400/30"
                  />
                  <p className="mt-2 text-right text-[11px] text-white/25">
                    {reviewText.length}/500
                  </p>
                </div>

                {reviewMessage && (
                  <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${reviewMessage.includes("Thank") || reviewMessage.includes("updated") ? "border-green-500/20 bg-green-500/5 text-green-300" : "border-red-500/20 bg-red-500/5 text-red-300"}`}>
                    {reviewMessage}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void submitOrderReview()}
                  disabled={reviewSubmitting || reviewRating === 0}
                  className="mt-5 w-full rounded-2xl bg-yellow-400 px-5 py-3.5 text-sm font-black text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                >
                  {reviewSubmitting ? "Saving..." : reviewExists ? "Update Review" : "Submit Review"}
                </button>
              </>
            )}
          </section>
        )}

        {/* Order Details */}
        <div className={`mb-8 rounded-3xl border border-white/10 bg-[#171310] p-6 md:p-8 ${isCancelled ? "hidden" : ""}`}>

          <h2 className="text-xl font-bold">
            Order Details
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Placed on {formatDate(order.created_at)}
          </p>

          {isScheduledOrder(order) && (
            <div className="mt-4 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-white/40">
                Order Timing
              </p>
              <p className="mt-1 font-black text-orange-300">
                🕐 Scheduled for{" "}
                {formatScheduledTime(order.scheduled_for as string)}
              </p>
              <p className="mt-1 text-xs text-white/45">
                {isScheduleReady(order)
                  ? "Your scheduled time has arrived and the order can now be prepared."
                  : "Your order is confirmed and waiting for the scheduled time."}
              </p>
            </div>
          )}

          <div className="my-6 border-t border-white/10" />

          {/* Customer */}
          <div>

            <p className="text-sm text-gray-500">
              Customer
            </p>

            <p className="mt-1 font-semibold">
              {order.customer_name}
            </p>

            <p className="mt-1 text-gray-400">
              {order.delivery_address}
            </p>

          </div>

          {/* Items */}
          <div className="mt-6">

            <p className="mb-3 text-sm text-gray-500">
              Items
            </p>

            <div className="space-y-3">

              {order.items?.map((item, index) => (

                <div
                  key={`${item.name}-${index}`}
                  className="flex items-center justify-between gap-4"
                >

                  <div className="flex items-center gap-3">

                    <span className="text-xl">
                      {item.emoji}
                    </span>

                    <span>
                      {item.name} × {item.quantity}
                    </span>

                  </div>

                  <span className="text-gray-400">
                    ₹
                    {(
                      item.price *
                      item.quantity
                    ).toFixed(0)}
                  </span>

                </div>

              ))}

            </div>

          </div>

          {isDelivered && order.items?.length > 0 && (
            <div className="mt-6 rounded-2xl border border-orange-500/15 bg-orange-500/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-orange-300">
                    Want the same order again?
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    Add all items from this order to your cart.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={reorderItems}
                  disabled={reorderLoading}
                  className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {reorderLoading ? "Adding…" : "🔁 Reorder"}
                </button>
              </div>
              {reorderMessage && (
                <p className={`mt-3 text-xs font-bold ${reorderMessage.includes("Opening") ? "text-green-300" : "text-red-300"}`}>
                  {reorderMessage}
                </p>
              )}
            </div>
          )}

          {/* Total */}
          <div className="mt-6 border-t border-white/10 pt-5">

            <div className="flex justify-between text-sm text-gray-400">

              <span>
                Subtotal
              </span>

              <span>
                ₹
                {Number(
                  order.subtotal
                ).toFixed(0)}
              </span>

            </div>

            <div className="mt-2 flex justify-between text-sm text-gray-400">

              <span>
                Delivery
              </span>

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

            <div className="mt-4 flex justify-between text-xl font-bold">

              <span>
                Total
              </span>

              <span className="text-orange-400">
                ₹
                {Number(
                  order.total
                ).toFixed(0)}
              </span>

            </div>

          </div>

        </div>

  
      <style jsx global>{`
        .print-only-receipt { display: none; }
        @media print {
          body { background: #fff !important; color: #111 !important; }
          body * { visibility: hidden !important; }
          .print-only-receipt, .print-only-receipt * { visibility: visible !important; }
          .print-only-receipt {
            display: block !important;
            position: absolute;
            inset: 0;
            width: 100%;
            padding: 28px;
            color: #111 !important;
            background: #fff !important;
            font-family: Arial, sans-serif;
          }
          .print-receipt-header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 14px; margin-bottom: 18px; }
          .print-receipt-header h1 { font-size: 24px; margin: 0 0 6px; }
          .print-receipt-header p, .print-receipt-meta p { margin: 3px 0; font-size: 12px; }
          .print-receipt-meta { border-bottom: 1px solid #aaa; padding-bottom: 12px; margin-bottom: 12px; }
          .print-receipt-row, .print-receipt-total > div { display: flex; justify-content: space-between; gap: 20px; padding: 7px 0; font-size: 13px; }
          .print-receipt-items { border-bottom: 1px solid #aaa; padding-bottom: 8px; }
          .print-receipt-total { margin-top: 10px; }
          .print-receipt-total .grand { border-top: 2px solid #111; margin-top: 5px; padding-top: 10px; font-size: 17px; font-weight: 800; }
          .print-receipt-thanks { text-align: center; margin-top: 28px; font-size: 12px; }
        }
      `}</style>
      <div className="print-only-receipt">
          <div className="print-receipt-header">
            <h1>YASH SAINI RESTAURANT</h1>
            <p>B.B. Nagar, Bulandshahr, Uttar Pradesh</p>
            <p>Order Receipt</p>
          </div>
          <div className="print-receipt-meta">
            <p><strong>Order:</strong> #{order.order_id}</p>
            <p><strong>Date:</strong> {formatDate(order.created_at)}</p>
            <p><strong>Customer:</strong> {order.customer_name}</p>
            <p><strong>Address:</strong> {order.delivery_address}</p>
            <p><strong>Payment:</strong> {formatStatus(order.payment_method)}</p>
            <p><strong>Status:</strong> {formatStatus(order.status)}</p>
          </div>
          <div className="print-receipt-items">
            {order.items?.map((item, index) => (
              <div key={`print-${item.name}-${index}`} className="print-receipt-row">
                <span>{item.name} × {item.quantity}</span>
                <span>₹{(Number(item.price) * Number(item.quantity)).toFixed(0)}</span>
              </div>
            ))}
          </div>
          <div className="print-receipt-total">
            <div><span>Subtotal</span><span>₹{Number(order.subtotal).toFixed(0)}</span></div>
            <div><span>Delivery</span><span>{Number(order.delivery_charge) === 0 ? "FREE" : `₹${Number(order.delivery_charge).toFixed(0)}`}</span></div>
            <div className="grand"><span>Total</span><span>₹{Number(order.total).toFixed(0)}</span></div>
          </div>
          <p className="print-receipt-thanks">Thank you for ordering from YASH SAINI RESTAURANT ❤️</p>
        </div>

        {/* Order History */}
        <section className="mb-8 rounded-3xl border border-white/10 bg-[#171310] p-5 shadow-xl shadow-black/10 sm:p-6 print:hidden">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
                Your Orders
              </p>
              <h2 className="mt-1 text-2xl font-black">Recent Order History</h2>
              <p className="mt-1 text-sm text-white/45">
                Quickly open any of your recent orders.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/menu";
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Order Again
            </button>
          </div>

          {orderHistoryLoading ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 p-5 text-center text-sm text-white/45">
              Loading your recent orders…
            </div>
          ) : orderHistory.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-5 text-center text-sm text-white/45">
              No previous orders found.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {orderHistory.map((historyOrder) => {
                const isCurrent = historyOrder.order_id === order.order_id;
                return (
                  <div
                    key={historyOrder.order_id}
                    className={`flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                      isCurrent
                        ? "border-orange-500/30 bg-orange-500/5"
                        : "border-white/10 bg-black/10"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black">#{historyOrder.order_id}</p>
                        {isCurrent && (
                          <span className="rounded-full bg-orange-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-orange-300">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-white/40">
                        {formatDate(historyOrder.created_at)} · {historyOrder.items?.length || 0} item{(historyOrder.items?.length || 0) === 1 ? "" : "s"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="text-left sm:text-right">
                        <p className="font-black">₹{Number(historyOrder.total || 0).toFixed(0)}</p>
                        <p
                          className={`mt-1 text-xs font-bold ${
                            historyOrder.status === "delivered"
                              ? "text-green-300"
                              : historyOrder.status === "cancelled"
                              ? "text-red-300"
                              : "text-orange-300"
                          }`}
                        >
                          {formatStatus(historyOrder.status)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => openOrderFromHistory(historyOrder.order_id)}
                        disabled={isCurrent}
                        className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold transition hover:bg-white/15 disabled:cursor-default disabled:opacity-40"
                      >
                        {isCurrent ? "Viewing" : "View Order"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Footer */}
        <div className={`pb-8 text-center ${isCancelled ? "hidden" : ""}`}>

          <p className="text-gray-500">
            Thank you for ordering from
          </p>

          <p className="mt-1 font-bold text-orange-400">
            YASH SAINI RESTAURANT ❤️
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 print:hidden">
            <button
              onClick={printOrderReceipt}
              className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-6 py-3 font-bold text-orange-300 transition hover:bg-orange-500/20"
            >
              🧾 Print / Save Receipt
            </button>

            <button
              onClick={() => void shareOrderTracking()}
              className="rounded-xl border border-green-500/30 bg-green-500/10 px-6 py-3 font-bold text-green-300 transition hover:bg-green-500/20"
            >
              🔗 Share Tracking
            </button>

            <button
              onClick={() => {
                window.location.href = "/menu";
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-bold transition hover:bg-white/10"
            >
              Order More Food
            </button>
          </div>

          {shareMessage && (
            <p className="mt-3 text-sm font-semibold text-green-300 print:hidden">
              {shareMessage}
            </p>
          )}

        </div>

          </>
        )}

      </div>

    </main>

  );
}
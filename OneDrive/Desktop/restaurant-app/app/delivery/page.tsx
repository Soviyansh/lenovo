"use client";

import { useEffect, useRef, useState } from "react";
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
};

type DeliveryOrder = {
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
  delivery_boy_id: string | null;
  delivery_assigned_at: string | null;
  delivery_accepted_at: string | null;
  picked_up_at: string | null;
  delivery_arrived_at: string | null;
  delivered_at: string | null;
  cod_collected_amount: number;
  cod_collected_at: string | null;
  delivery_issue: string | null;
  created_at: string;
};

type DeliveryHistoryOrder = {
  order_id: string;
  customer_phone: string | null;
  delivery_address: string | null;
  customer_lat: number | null;
  customer_lng: number | null;
  subtotal: number;
  delivery_charge: number;
  delivery_accepted_at: string | null;
  picked_up_at: string | null;
  delivery_arrived_at: string | null;
  items: unknown;
  customer_name: string;
  total: number;
  status: string;
  distance_km: number | null;
  delivered_at: string | null;
  cod_collected_amount: number;
  cod_collected_at: string | null;
  delivery_issue: string | null;
  delivery_assigned_at: string | null;
  created_at: string;
};

function formatTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

function downloadDeliveryHistoryCSV(orders: DeliveryHistoryOrder[], filter: string) {
  const headers = [
    "Order ID",
    "Customer",
    "Status",
    "Order Value",
    "COD Collected",
    "Distance (km)",
    "Assigned At",
    "Delivered At",
    "COD Collected At",
    "Delivery Issue",
  ];

  const rows = orders.map((item) => [
    item.order_id,
    item.customer_name,
    item.status || "Delivered",
    Number(item.total || 0).toFixed(0),
    Number(item.cod_collected_amount || 0).toFixed(0),
    item.distance_km !== null ? Number(item.distance_km).toFixed(1) : "",
    item.delivery_assigned_at ? new Date(item.delivery_assigned_at).toLocaleString("en-IN") : "",
    item.delivered_at ? new Date(item.delivered_at).toLocaleString("en-IN") : "",
    item.cod_collected_at ? new Date(item.cod_collected_at).toLocaleString("en-IN") : "",
    item.delivery_issue || "",
  ]);

  const csv = [
    headers.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `delivery-history-${filter}-${date}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapePrintHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function printDeliveryHistoryReport(orders: DeliveryHistoryOrder[], filter: string) {
  if (orders.length === 0) return;

  const totalValue = orders.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const totalCod = orders.reduce((sum, item) => sum + Number(item.cod_collected_amount || 0), 0);
  const totalDistance = orders.reduce((sum, item) => sum + Number(item.distance_km || 0), 0);

  const rows = orders.map((item) => `
    <tr>
      <td>#${escapePrintHtml(item.order_id)}</td>
      <td>${escapePrintHtml(item.customer_name || "—")}</td>
      <td>₹${Number(item.total || 0).toFixed(0)}</td>
      <td>₹${Number(item.cod_collected_amount || 0).toFixed(0)}</td>
      <td>${item.distance_km !== null ? `${Number(item.distance_km).toFixed(1)} km` : "—"}</td>
      <td>${escapePrintHtml(formatTime(item.delivered_at))}</td>
    </tr>`).join("");

  const reportWindow = window.open("", "_blank", "noopener,noreferrer,width=1100,height=750");
  if (!reportWindow) {
    alert("Please allow pop-ups to print the delivery report.");
    return;
  }

  reportWindow.document.write(`<!doctype html>
<html><head><title>Delivery Report - ${escapePrintHtml(filter)}</title>
<style>
body{font-family:Arial,sans-serif;padding:28px;color:#111}h1{margin:0 0 4px}p{color:#555}.cards{display:flex;gap:12px;margin:20px 0}.card{border:1px solid #ddd;padding:12px 18px;border-radius:8px}.label{font-size:11px;color:#666}.value{font-size:18px;font-weight:700;margin-top:4px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:9px;text-align:left;font-size:12px}th{background:#f3f3f3}@media print{body{padding:10px}.no-print{display:none}}
</style></head><body>
<h1>YASH SAINI RESTAURANT</h1>
<p>Delivery History Report • ${escapePrintHtml(filter === "week" ? "This Week" : filter === "today" ? "Today" : "All Time")} • Generated ${escapePrintHtml(new Date().toLocaleString("en-IN"))}</p>
<div class="cards">
<div class="card"><div class="label">DELIVERIES</div><div class="value">${orders.length}</div></div>
<div class="card"><div class="label">ORDER VALUE</div><div class="value">₹${totalValue.toFixed(0)}</div></div>
<div class="card"><div class="label">COD COLLECTED</div><div class="value">₹${totalCod.toFixed(0)}</div></div>
<div class="card"><div class="label">DISTANCE</div><div class="value">${totalDistance.toFixed(1)} km</div></div>
</div>
<table><thead><tr><th>Order ID</th><th>Customer</th><th>Order Value</th><th>COD</th><th>Distance</th><th>Delivered At</th></tr></thead><tbody>${rows}</tbody></table>
<button class="no-print" onclick="window.print()" style="margin-top:20px;padding:10px 16px;cursor:pointer">Print / Save as PDF</button>
</body></html>`);
  reportWindow.document.close();
  reportWindow.focus();
}

function openMaps(lat: number | null, lng: number | null, address: string) {
  const query =
    lat !== null && lng !== null
      ? `${lat},${lng}`
      : address;

  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`,
    "_blank",
    "noopener,noreferrer"
  );
}

function playNotificationSound() {
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
    oscillator.frequency.setValueAtTime(1046, context.currentTime + 0.12);

    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime + 0.35
    );

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.35);

    window.setTimeout(() => {
      void context.close();
    }, 500);
  } catch {
    // Browser may block audio until a user gesture. The visual notification
    // still works.
  }
}

async function showBrowserNotification(title: string, body: string) {
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
    // Ignore browser notification permission errors.
  }
}

export default function DeliveryPage() {
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [deliveryBoy, setDeliveryBoy] = useState<DeliveryBoy | null>(null);
  const [order, setOrder] = useState<DeliveryOrder | null>(null);

  const [completedOrders, setCompletedOrders] = useState<DeliveryHistoryOrder[]>([]);
  const [historyFilter, setHistoryFilter] = useState<"today" | "week" | "all" | "custom">("today");
  const [historySearch, setHistorySearch] = useState("");
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState<DeliveryHistoryOrder | null>(null);
  const [historySort, setHistorySort] = useState<"newest" | "oldest" | "highest" | "distance">("newest");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; user_id: string; title: string; message: string; type: string | null; is_read: boolean; created_at: string }>>([]);
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueType, setIssueType] = useState("Customer unavailable");
  const [issueNote, setIssueNote] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: "", phone: "", vehicle_type: "", vehicle_number: "" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [toast, setToast] = useState("");

  const [otp, setOtp] = useState("");
  const [codAmount, setCodAmount] = useState("");

  const previousOrderIdRef = useRef<string | null>(null);
  const firstLoadRef = useRef(true);
  const locationWatchIdRef = useRef<number | null>(null);
  const lastSentLocationRef = useRef<{ lat: number; lng: number; at: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "requesting" | "tracking" | "denied" | "error">("idle");
  const [locationMessage, setLocationMessage] = useState("GPS tracking is ready.");

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const notifyNewAssignment = async (nextOrder: DeliveryOrder) => {
    const amount = Number(nextOrder.total || 0).toFixed(0);
    const destination = nextOrder.delivery_address?.trim() || "Customer location";
    const message =
      `Order #${nextOrder.order_id} has been assigned to you. ` +
      `Customer: ${nextOrder.customer_name}. ` +
      `Amount: ₹${amount}. ` +
      `Destination: ${destination}. ` +
      `Verify the customer OTP to accept it.`;

    playNotificationSound();
    setToast(message);

    window.setTimeout(() => {
      setToast("");
    }, 10000);

    await showBrowserNotification("🚚 New delivery assigned", message);
  };

  const loadNotifications = async (userId: string) => {
    const { data, error: notificationError } = await supabase.from("notifications").select("id, user_id, title, message, type, is_read, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
    if (notificationError) { console.error("Delivery notifications error:", notificationError); return; }
    setNotifications((data || []) as typeof notifications);
  };

  const markNotificationRead = async (id: string) => {
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, is_read: true } : item));
    const { error: updateError } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    if (updateError) console.error("Notification read error:", updateError);
  };

  const markAllNotificationsRead = async () => {
    if (!deliveryBoy) return;
    setNotificationBusy(true);
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
    const { error: updateError } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", deliveryBoy.id).eq("is_read", false);
    if (updateError) console.error("Mark all notifications error:", updateError);
    setNotificationBusy(false);
  };

  const submitDeliveryIssue = async () => {
    if (!order) return;
    const note = issueNote.trim();
    if (!note) { setError("Please add a short note about the issue."); return; }
    try {
      setActionLoading(true); clearMessages();
      const { data, error: rpcError } = await supabase.rpc("report_delivery_issue", { p_order_id: order.order_id, p_issue: `${issueType}: ${note}`.slice(0, 500) });
      if (rpcError) throw rpcError;
      if (!data?.success) throw new Error(data?.message || "Unable to report the delivery issue.");
      setIssueOpen(false); setIssueNote(""); setSuccess("Delivery issue reported to the restaurant. ⚠️");
      await loadDeliveryData(false);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to report the delivery issue."); }
    finally { setActionLoading(false); }
  };

  const saveProfile = async () => {
    if (!deliveryBoy) return;
    if (!profileForm.full_name.trim()) { setError("Name cannot be empty."); return; }
    try {
      setProfileSaving(true); clearMessages();
      const { data, error: rpcError } = await supabase.rpc("update_delivery_profile", { p_full_name: profileForm.full_name.trim(), p_phone: profileForm.phone.trim() || null, p_vehicle_type: profileForm.vehicle_type.trim() || null, p_vehicle_number: profileForm.vehicle_number.trim() || null });
      if (rpcError) throw rpcError;
      if (!data?.success) throw new Error(data?.message || "Unable to update profile.");
      setProfileOpen(false); setSuccess("Profile updated successfully."); await loadDeliveryData(false);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to update profile."); }
    finally { setProfileSaving(false); }
  };

  const requestGpsAgain = () => {
    if (!("geolocation" in navigator)) { setLocationStatus("error"); setLocationMessage("This browser does not support GPS location."); return; }
    setLocationStatus("requesting"); setLocationMessage("Requesting GPS permission again…");
    navigator.geolocation.getCurrentPosition(
      () => setLocationMessage("GPS permission granted. Live tracking will reconnect."),
      () => { setLocationStatus("denied"); setLocationMessage("Enable location access in browser settings and try again."); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const loadDeliveryData = async (showAssignmentNotification = true) => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setAuthChecking(false);
        await supabase.auth.signOut({ scope: "local" });
        window.location.replace("/delivery/login");
        return;
      }

      const { data: boy, error: boyError } = await supabase
        .from("delivery_boys")
        .select(
          "id, full_name, phone, vehicle_type, vehicle_number, is_active, is_available, current_lat, current_lng, last_location_at"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (boyError) {
        console.error("Delivery profile error:", boyError);
        throw new Error("Unable to verify delivery account.");
      }

      if (!boy || !boy.is_active) {
        setAuthChecking(false);
        await supabase.auth.signOut({ scope: "local" });
        window.location.replace("/delivery/login");
        return;
      }

      setDeliveryBoy(boy as DeliveryBoy);
      setProfileForm({ full_name: boy.full_name || "", phone: boy.phone || "", vehicle_type: boy.vehicle_type || "", vehicle_number: boy.vehicle_number || "" });
      await loadNotifications(user.id);
      setAuthChecking(false);

      const { data: orders, error: orderError } = await supabase
        .from("orders")
        .select(
          `
          id,
          order_id,
          customer_name,
          customer_phone,
          delivery_address,
          customer_lat,
          customer_lng,
          distance_km,
          subtotal,
          delivery_charge,
          total,
          status,
          delivery_boy_id,
          delivery_assigned_at,
          delivery_accepted_at,
          picked_up_at,
          delivery_arrived_at,
          delivered_at,
          cod_collected_amount,
          cod_collected_at,
          delivery_issue,
          created_at
        `
        )
        .eq("delivery_boy_id", user.id)
        .in("status", ["ready", "out for delivery"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (orderError) {
        console.error("Delivery order error:", orderError);
        throw new Error("Unable to load assigned delivery.");
      }

      const nextOrder = (orders?.[0] || null) as DeliveryOrder | null;

      if (
        showAssignmentNotification &&
        !firstLoadRef.current &&
        nextOrder &&
        nextOrder.order_id !== previousOrderIdRef.current &&
        !nextOrder.delivery_accepted_at
      ) {
        await notifyNewAssignment(nextOrder);
      }

      previousOrderIdRef.current = nextOrder?.order_id || null;
      firstLoadRef.current = false;

      setOrder(nextOrder);

      const { data: historyData, error: historyError } = await supabase
        .from("orders")
        .select(
          "order_id, customer_name, customer_phone, delivery_address, customer_lat, customer_lng, subtotal, delivery_charge, total, status, distance_km, delivered_at, cod_collected_amount, cod_collected_at, delivery_issue, delivery_assigned_at, delivery_accepted_at, picked_up_at, delivery_arrived_at, items, created_at"
        )
        .eq("delivery_boy_id", user.id)
        .eq("status", "delivered")
        .order("delivered_at", { ascending: false })
        .limit(100);

      if (historyError) {
        console.error("Delivery history error:", historyError);
      } else {
        setCompletedOrders((historyData || []) as DeliveryHistoryOrder[]);
      }

      if (nextOrder?.cod_collected_amount) {
        setCodAmount(String(nextOrder.cod_collected_amount));
      } else {
        setCodAmount("");
      }
    } catch (err) {
      setAuthChecking(false);
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
    let mounted = true;

    const stopLocationTracking = () => {
      if (locationWatchIdRef.current !== null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(locationWatchIdRef.current);
        locationWatchIdRef.current = null;
      }
    };

    if (!deliveryBoy?.is_active || !deliveryBoy?.is_available) {
      stopLocationTracking();
      setLocationStatus("idle");
      setLocationMessage(
        deliveryBoy?.is_active
          ? "Go online to start live GPS tracking."
          : "GPS tracking is unavailable for this account."
      );
      return () => {
        mounted = false;
        stopLocationTracking();
      };
    }

    if (!("geolocation" in navigator)) {
      setLocationStatus("error");
      setLocationMessage("This browser does not support GPS location.");
      return () => {
        mounted = false;
        stopLocationTracking();
      };
    }

    setLocationStatus("requesting");
    setLocationMessage("Requesting GPS permission…");

    const sendLocation = async (position: GeolocationPosition) => {
      if (!mounted || !deliveryBoy) return;

      const lat = Number(position.coords.latitude.toFixed(7));
      const lng = Number(position.coords.longitude.toFixed(7));
      const now = Date.now();
      const previous = lastSentLocationRef.current;

      // Avoid unnecessary database writes when the device has barely moved.
      if (
        previous &&
        now - previous.at < 5000 &&
        Math.abs(previous.lat - lat) < 0.00005 &&
        Math.abs(previous.lng - lng) < 0.00005
      ) {
        return;
      }

      const { error: locationError } = await supabase
        .from("delivery_boys")
        .update({
          current_lat: lat,
          current_lng: lng,
          last_location_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", deliveryBoy.id);

      if (locationError) {
        console.error("Live location update error:", locationError);
        if (mounted) {
          setLocationStatus("error");
          setLocationMessage("GPS found, but location could not be saved.");
        }
        return;
      }

      lastSentLocationRef.current = { lat, lng, at: now };

      if (mounted) {
        setLocationStatus("tracking");
        setLocationMessage(
          `Live location active • ${lat.toFixed(5)}, ${lng.toFixed(5)}`
        );
        setDeliveryBoy((current) =>
          current
            ? {
                ...current,
                current_lat: lat,
                current_lng: lng,
                last_location_at: new Date().toISOString(),
              }
            : current
        );
      }
    };

    const handlePosition = (position: GeolocationPosition) => {
      void sendLocation(position);
    };

    const handlePositionError = (positionError: GeolocationPositionError) => {
      if (!mounted) return;

      console.error("GPS error:", positionError);

      if (positionError.code === positionError.PERMISSION_DENIED) {
        setLocationStatus("denied");
        setLocationMessage("Location permission denied. Enable GPS permission in browser settings.");
      } else {
        setLocationStatus("error");
        setLocationMessage("Unable to read GPS right now. Keep location services enabled and try again.");
      }
    };

    locationWatchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handlePositionError,
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );

    return () => {
      mounted = false;
      stopLocationTracking();
    };
  }, [deliveryBoy?.id, deliveryBoy?.is_active, deliveryBoy?.is_available]);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (!mounted) return;
      await loadDeliveryData(false);
    };

    void initialize();

    const ordersChannel = supabase
      .channel("delivery-orders-dashboard-v2")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          void loadDeliveryData(true);
        }
      )
      .subscribe();

    const boysChannel = supabase
      .channel("delivery-boy-dashboard-v2")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "delivery_boys",
        },
        () => {
          void loadDeliveryData(false);
        }
      )
      .subscribe();

    const refreshTimer = window.setInterval(() => {
      void loadDeliveryData(false);
    }, 5000);

    return () => {
      mounted = false;
      window.clearInterval(refreshTimer);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(boysChannel);
    };
  }, []);

  useEffect(() => {
    if (!deliveryBoy?.id) return;
    const channel = supabase.channel(`delivery-notifications-${deliveryBoy.id}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${deliveryBoy.id}` }, (payload) => {
      const incoming = payload.new as typeof notifications[number];
      setNotifications((current) => [incoming, ...current].slice(0, 50));
      playNotificationSound();
      void showBrowserNotification(incoming.title, incoming.message);
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [deliveryBoy?.id]);

  const toggleAvailability = async () => {
    if (!deliveryBoy) return;

    try {
      clearMessages();
      setActionLoading(true);

      const nextAvailable = !deliveryBoy.is_available;

      const { error: updateError } = await supabase
        .from("delivery_boys")
        .update({
          is_available: nextAvailable,
          updated_at: new Date().toISOString(),
        })
        .eq("id", deliveryBoy.id);

      if (updateError) throw updateError;

      setSuccess(
        nextAvailable
          ? "You are now online and available for new deliveries."
          : "You are now offline. You will not receive new assignments."
      );

      await loadDeliveryData(false);
    } catch (err) {
      console.error("Availability error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update availability."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const acceptOrder = async () => {
    if (!order || !deliveryBoy) return;

    clearMessages();

    if (otp.length !== 6) {
      setError("Enter the customer's 6-digit OTP.");
      return;
    }

    try {
      setActionLoading(true);

      const { data, error: rpcError } = await supabase.rpc(
        "accept_delivery_with_otp",
        {
          p_order_id: order.order_id,
          p_otp: otp,
        }
      );

      if (rpcError) throw rpcError;

      if (!data?.[0]?.success) {
        throw new Error(
          data?.[0]?.message || "Incorrect customer OTP."
        );
      }

      setOtp("");
      setSuccess(
        "OTP verified. Delivery accepted and marked Out for Delivery. 🚴"
      );

      await loadDeliveryData(false);
    } catch (err) {
      console.error("Accept delivery error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to accept this delivery."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const markPickedUp = async () => {
    if (!order || !deliveryBoy) return;

    try {
      clearMessages();
      setActionLoading(true);

      const { data, error: rpcError } = await supabase.rpc(
        "mark_delivery_picked_up",
        {
          p_order_id: order.order_id,
        }
      );

      if (rpcError) throw rpcError;

      if (!data?.[0]?.success) {
        throw new Error(
          data?.[0]?.message || "Unable to mark order as picked up."
        );
      }

      setSuccess("Order picked up. Navigate to the customer location.");
      await loadDeliveryData(false);
    } catch (err) {
      console.error("Pickup error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update pickup status."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const markArrived = async () => {
    if (!order || !deliveryBoy) return;

    try {
      clearMessages();
      setActionLoading(true);

      const { data, error: rpcError } = await supabase.rpc(
        "mark_delivery_arrived",
        {
          p_order_id: order.order_id,
        }
      );

      if (rpcError) throw rpcError;

      if (!data?.[0]?.success) {
        throw new Error(
          data?.[0]?.message || "Unable to mark arrival."
        );
      }

      setSuccess(
        "Customer notified: you have arrived at the delivery location. 📍"
      );

      await loadDeliveryData(false);
    } catch (err) {
      console.error("Arrival error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to mark arrival."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const markDelivered = async () => {
    if (!order || !deliveryBoy) return;

    clearMessages();

    const numericCodAmount = Number(codAmount || 0);

    if (numericCodAmount < 0) {
      setError("COD amount cannot be negative.");
      return;
    }

    if (!order.delivery_arrived_at) {
      setError("Tap “I am at the location” before completing delivery.");
      return;
    }

    try {
      setActionLoading(true);

      const { data, error: rpcError } = await supabase.rpc(
        "complete_delivery",
        {
          p_order_id: order.order_id,
          p_cod_amount: numericCodAmount,
        }
      );

      if (rpcError) throw rpcError;

      if (!data?.[0]?.success) {
        throw new Error(
          data?.[0]?.message || "Unable to complete delivery."
        );
      }

      setOtp("");
      setCodAmount("");
      setSuccess(
        "Delivery completed successfully. You are automatically back online and ready for the next assignment. 🎉"
      );

      await loadDeliveryData(false);
    } catch (err) {
      console.error("Complete delivery error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to complete delivery."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } finally {
      window.location.replace("/delivery/login");
    }
  };

  if (authChecking || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#08090b] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-11 w-11 animate-spin rounded-full border-2 border-white/10 border-t-orange-500" />
          <p className="text-sm font-semibold text-white/60">
            Loading delivery dashboard…
          </p>
        </div>
      </main>
    );
  }

  if (!deliveryBoy) {
    return null;
  }

  const isOnline = deliveryBoy.is_available;
  const accepted = Boolean(order?.delivery_accepted_at);
  const pickedUp = Boolean(order?.picked_up_at);
  const arrived = Boolean(order?.delivery_arrived_at);
  const completedSteps = [
    accepted,
    pickedUp,
    arrived,
    Boolean(order?.delivered_at),
  ].filter(Boolean).length;
  const progressPercent = Math.round((completedSteps / 4) * 100);
  const todayKey = new Date().toLocaleDateString("en-IN");
  const todaysOrders = completedOrders.filter(
    (item) =>
      item.delivered_at &&
      new Date(item.delivered_at).toLocaleDateString("en-IN") === todayKey
  );
  const todaysCod = todaysOrders.reduce(
    (sum, item) => sum + Number(item.cod_collected_amount || 0),
    0
  );
  const todaysRevenue = todaysOrders.reduce(
    (sum, item) => sum + Number(item.total || 0),
    0
  );

  const nowForHistory = new Date();
  const todayStartForHistory = new Date(nowForHistory);
  todayStartForHistory.setHours(0, 0, 0, 0);

  const weekStartForHistory = new Date(todayStartForHistory);
  const historyDay = weekStartForHistory.getDay();
  const daysSinceMonday = historyDay === 0 ? 6 : historyDay - 1;
  weekStartForHistory.setDate(
    weekStartForHistory.getDate() - daysSinceMonday
  );

  const historyQuery = historySearch.trim().toLowerCase();
  const customFromDate = customFrom ? new Date(`${customFrom}T00:00:00`) : null;
  const customToDate = customTo ? new Date(`${customTo}T23:59:59.999`) : null;

  const filteredHistory = completedOrders.filter((item) => {
    const deliveredAt = item.delivered_at ? new Date(item.delivered_at) : null;

    if (historyFilter === "today") {
      if (!deliveredAt || deliveredAt < todayStartForHistory) return false;
    }

    if (historyFilter === "week") {
      if (!deliveredAt || deliveredAt < weekStartForHistory) return false;
    }

    if (historyFilter === "custom") {
      if (!deliveredAt || !customFromDate || !customToDate || customFromDate > customToDate || deliveredAt < customFromDate || deliveredAt > customToDate) return false;
    }

    if (historyQuery) {
      const orderId = item.order_id.toLowerCase();
      const customerName = item.customer_name.toLowerCase();
      if (
        !orderId.includes(historyQuery) &&
        !customerName.includes(historyQuery)
      ) {
        return false;
      }
    }

    return true;
  });

  const sortedHistory = [...filteredHistory].sort((a, b) => {
    if (historySort === "highest") {
      return Number(b.total || 0) - Number(a.total || 0);
    }

    if (historySort === "distance") {
      return Number(b.distance_km || 0) - Number(a.distance_km || 0);
    }

    const aTime = a.delivered_at ? new Date(a.delivered_at).getTime() : 0;
    const bTime = b.delivered_at ? new Date(b.delivered_at).getTime() : 0;

    return historySort === "newest" ? bTime - aTime : aTime - bTime;
  });

  const filteredHistoryValue = filteredHistory.reduce(
    (sum, item) => sum + Number(item.total || 0),
    0
  );

  const filteredHistoryCod = filteredHistory.reduce(
    (sum, item) => sum + Number(item.cod_collected_amount || 0),
    0
  );

  const filteredHistoryDistance = filteredHistory.reduce(
    (sum, item) => sum + Number(item.distance_km || 0),
    0
  );

  const deliveryDurations = filteredHistory
    .map((item) => {
      if (!item.delivery_assigned_at || !item.delivered_at) return null;
      const start = new Date(item.delivery_assigned_at).getTime();
      const end = new Date(item.delivered_at).getTime();
      const minutes = (end - start) / 60000;
      return Number.isFinite(minutes) && minutes >= 0 ? minutes : null;
    })
    .filter((value): value is number => value !== null);

  const averageDeliveryMinutes =
    deliveryDurations.length > 0
      ? deliveryDurations.reduce((sum, value) => sum + value, 0) /
        deliveryDurations.length
      : 0;

  const formatDuration = (minutes: number) => {
    if (!minutes) return "—";
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  };

  return (
    <main className="min-h-screen bg-[#08090b] text-white">
      {/* TOP NAV */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#08090b]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-400">
              YASH SAINI RESTAURANT
            </p>
            <h1 className="mt-1 text-xl font-black sm:text-2xl">
              Delivery Partner
            </h1>
            <div className="mt-2 flex items-center gap-2 text-xs font-bold text-white/40">
              <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-green-400" : "bg-yellow-400"}`} />
              {isOnline ? "Available for assignments" : "Currently offline"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button type="button" onClick={() => setNotificationOpen((value) => !value)} className="relative rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm hover:bg-white/10">🔔{notifications.filter((item) => !item.is_read).length > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-500 px-1 text-[9px] font-black">{notifications.filter((item) => !item.is_read).length > 9 ? "9+" : notifications.filter((item) => !item.is_read).length}</span>}</button>
              {notificationOpen && <div className="absolute right-0 top-12 z-[70] w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-white/10 bg-[#111317] shadow-2xl"><div className="flex items-center justify-between border-b border-white/10 p-4"><p className="font-black">Notifications</p><button type="button" disabled={notificationBusy} onClick={() => void markAllNotificationsRead()} className="text-[10px] font-black text-orange-300">Mark all read</button></div><div className="max-h-80 overflow-y-auto">{notifications.length === 0 ? <p className="p-5 text-center text-xs text-white/35">No notifications yet.</p> : notifications.map((item) => <button type="button" key={item.id} onClick={() => void markNotificationRead(item.id)} className={`block w-full border-b border-white/5 p-4 text-left hover:bg-white/5 ${item.is_read ? "opacity-50" : ""}`}><p className="text-xs font-black">{item.title}</p><p className="mt-1 text-[11px] leading-5 text-white/45">{item.message}</p><p className="mt-1 text-[9px] text-white/20">{formatTime(item.created_at)}</p></button>)}</div></div>}
            </div>
            <button type="button" onClick={() => { setProfileForm({ full_name: deliveryBoy.full_name || "", phone: deliveryBoy.phone || "", vehicle_type: deliveryBoy.vehicle_type || "", vehicle_number: deliveryBoy.vehicle_number || "" }); setProfileOpen(true); }} className="rounded-xl border border-orange-500/20 bg-orange-500/10 px-3 py-2.5 text-sm font-black text-orange-300">✏️</button>
            <button type="button" onClick={handleLogout} className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-sm font-bold text-red-300 transition hover:bg-red-500/10">Logout</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-5 px-4 py-5 sm:px-6 sm:py-7">
        {/* TOAST */}
        {toast && order && (
          <div className="fixed inset-x-4 top-20 z-50 mx-auto w-auto max-w-md overflow-hidden rounded-3xl border border-orange-400/30 bg-[#15110e]/95 shadow-2xl shadow-black/50 backdrop-blur-xl sm:right-5 sm:left-auto sm:mx-0">
            <div className="border-b border-orange-400/10 bg-orange-500/[0.07] px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500/15 text-xl">
                  🚚
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-orange-300">
                      New Delivery Assigned
                    </p>
                    <button
                      type="button"
                      onClick={() => setToast("")}
                      className="rounded-lg px-2 py-1 text-xs font-black text-white/30 hover:bg-white/5 hover:text-white/60"
                      aria-label="Dismiss notification"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="mt-1 text-xs font-black text-white/80">
                    #{order.order_id} • {order.customer_name}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 px-4 py-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-[9px] font-black uppercase tracking-wider text-white/25">
                    Order Value
                  </p>
                  <p className="mt-1 text-sm font-black text-white/80">
                    ₹{Number(order.total || 0).toFixed(0)}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-[9px] font-black uppercase tracking-wider text-white/25">
                    Distance
                  </p>
                  <p className="mt-1 text-sm font-black text-white/80">
                    {order.distance_km !== null
                      ? `${Number(order.distance_km).toFixed(1)} km`
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                <p className="text-[9px] font-black uppercase tracking-wider text-white/25">
                  Destination
                </p>
                <p className="mt-1 text-xs leading-5 text-white/60">
                  {order.delivery_address}
                </p>
              </div>

              <p className="text-center text-[10px] font-bold text-white/30">
                Enter the customer's 6-digit OTP to accept this delivery.
              </p>
            </div>
          </div>
        )}

        {/* PROFILE / AVAILABILITY */}
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] shadow-2xl shadow-black/20">
          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-3xl">
                  🛵
                </div>

                <div>
                  <p className="text-lg font-black">
                    {deliveryBoy.full_name}
                  </p>
                  <p className="text-sm text-white/40">
                    {deliveryBoy.phone || "Phone not available"}
                    {deliveryBoy.vehicle_type
                      ? ` • ${deliveryBoy.vehicle_type}`
                      : ""}
                    {deliveryBoy.vehicle_number
                      ? ` • ${deliveryBoy.vehicle_number}`
                      : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full border px-3 py-2 text-xs font-black ${
                    isOnline
                      ? "border-green-500/20 bg-green-500/10 text-green-300"
                      : "border-yellow-500/20 bg-yellow-500/10 text-yellow-300"
                  }`}
                >
                  <span className="mr-1.5">●</span>
                  {isOnline ? "ONLINE" : "OFFLINE"}
                </span>

                <button
                  type="button"
                  onClick={toggleAvailability}
                  disabled={actionLoading || Boolean(order)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    isOnline
                      ? "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                      : "bg-orange-500 text-black hover:bg-orange-400"
                  }`}
                >
                  {actionLoading
                    ? "Updating…"
                    : isOnline
                    ? "Go Offline"
                    : "Go Online"}
                </button>
              </div>
            </div>

            {order && (
              <div className="mt-5 rounded-2xl border border-orange-500/15 bg-orange-500/5 p-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">⚡</span>
                  <div>
                    <p className="text-sm font-black text-orange-300">
                      Active delivery
                    </p>
                    <p className="mt-0.5 text-xs text-white/50">
                      Finish this delivery to automatically become available
                      for the next order.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-5">
              <div className="rounded-2xl bg-black/20 p-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-white/25">Status</p>
                <p className="mt-1 text-sm font-black text-white/80">
                  {order ? "On delivery" : isOnline ? "Available" : "Offline"}
                </p>
              </div>
              <div className="rounded-2xl bg-black/20 p-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-white/25">Progress</p>
                <p className="mt-1 text-sm font-black text-orange-300">
                  {order ? `${progressPercent}%` : "—"}
                </p>
              </div>
              <div className="rounded-2xl bg-black/20 p-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-white/25">Next</p>
                <p className="mt-1 truncate text-sm font-black text-white/80">
                  {!order ? "Assignment" : !accepted ? "OTP" : !pickedUp ? "Pickup" : !arrived ? "Arrival" : "Handover"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400/80">Profile</p><h2 className="mt-1 text-xl font-black">Delivery Partner Profile</h2><p className="mt-1 text-xs text-white/35">Manage your contact and vehicle information.</p></div><button type="button" onClick={() => { setProfileForm({ full_name: deliveryBoy.full_name || "", phone: deliveryBoy.phone || "", vehicle_type: deliveryBoy.vehicle_type || "", vehicle_number: deliveryBoy.vehicle_number || "" }); setProfileOpen(true); }} className="rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-2.5 text-xs font-black text-orange-300">Edit Profile</button></div></section>

        {/* LIVE GPS STATUS */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                locationStatus === "tracking"
                  ? "bg-green-500/10"
                  : locationStatus === "denied" || locationStatus === "error"
                  ? "bg-red-500/10"
                  : "bg-blue-500/10"
              }`}
            >
              <span className="text-xl">📍</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-black">Live GPS Location</p>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wider ${
                    locationStatus === "tracking"
                      ? "bg-green-500/10 text-green-300"
                      : locationStatus === "denied" || locationStatus === "error"
                      ? "bg-red-500/10 text-red-300"
                      : "bg-blue-500/10 text-blue-300"
                  }`}
                >
                  {locationStatus === "tracking"
                    ? "LIVE"
                    : locationStatus === "requesting"
                    ? "CONNECTING"
                    : locationStatus === "denied"
                    ? "PERMISSION OFF"
                    : locationStatus === "error"
                    ? "ERROR"
                    : "STANDBY"}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-white/40">
                {locationMessage}
              </p>
              {(locationStatus === "denied" || locationStatus === "error") && <button type="button" onClick={requestGpsAgain} className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-black text-red-300">🔄 Retry GPS</button>}
              {deliveryBoy.last_location_at && (
                <p className="mt-1 text-[10px] font-bold text-white/25">
                  Last saved: {formatTime(deliveryBoy.last_location_at)}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* TODAY'S DELIVERY STATS */}
        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/30">
                Today&apos;s performance
              </p>
              <h2 className="mt-1 text-xl font-black">Delivery Summary</h2>
            </div>
            <p className="text-xs font-semibold text-white/30">
              {new Date().toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-white/25">
                Completed
              </p>
              <p className="mt-2 text-2xl font-black text-orange-300">
                {todaysOrders.length}
              </p>
              <p className="mt-1 text-[11px] text-white/30">orders today</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-white/25">
                COD Collected
              </p>
              <p className="mt-2 text-2xl font-black text-green-300">
                ₹{todaysCod.toFixed(0)}
              </p>
              <p className="mt-1 text-[11px] text-white/30">cash collected</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-white/25">
                Order Value
              </p>
              <p className="mt-2 text-2xl font-black text-white/85">
                ₹{todaysRevenue.toFixed(0)}
              </p>
              <p className="mt-1 text-[11px] text-white/30">delivered today</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-white/25">
                Recent
              </p>
              <p className="mt-2 text-2xl font-black text-blue-300">
                {completedOrders.length}
              </p>
              <p className="mt-1 text-[11px] text-white/30">history loaded</p>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm font-semibold text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm font-semibold text-green-300">
            {success}
          </div>
        )}

        {!order ? (
          <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-8 text-center sm:p-12">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-500/10 text-4xl">
              🛵
            </div>
            <h2 className="mt-6 text-2xl font-black">
              Waiting for your next delivery
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/40">
              Stay online. A new assigned order will appear here instantly
              with a notification and sound.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/50">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
              Live delivery connection active
            </div>
          </section>
        ) : (
          <section className="overflow-hidden rounded-3xl border border-orange-500/20 bg-[#0f1013] shadow-2xl shadow-black/30">
            {/* ORDER HERO */}
            <div className="border-b border-white/10 bg-gradient-to-br from-orange-500/10 via-orange-500/[0.03] to-transparent p-5 sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
                    Assigned Delivery
                  </p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight">
                    #{order.order_id}
                  </h2>
                  <p className="mt-1 text-sm text-white/40">
                    Assigned {formatTime(order.delivery_assigned_at)}
                  </p>
                </div>

                <span className="w-fit rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-2 text-xs font-black uppercase text-orange-300">
                  {order.status}
                </span>
              </div>

              {/* PROGRESS */}
              <div className="mt-7 flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/30">
                  Delivery progress
                </p>
                <span className="text-xs font-black text-orange-300">{progressPercent}%</span>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {[
                  ["OTP", accepted],
                  ["Picked Up", pickedUp],
                  ["Arrived", arrived],
                  ["Delivered", Boolean(order.delivered_at)],
                ].map(([label, done]) => (
                  <div key={String(label)}>
                    <div
                      className={`h-1.5 rounded-full ${
                        done ? "bg-orange-500" : "bg-white/10"
                      }`}
                    />
                    <p
                      className={`mt-2 text-[10px] font-bold ${
                        done ? "text-orange-300" : "text-white/30"
                      }`}
                    >
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6 p-5 sm:p-7">
              {/* CUSTOMER */}
              <div>
                <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-white/30">
                  Customer
                </p>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-lg font-black">
                        {order.customer_name}
                      </p>
                      <p className="mt-1 text-sm text-orange-300">
                        📞 {order.customer_phone}
                      </p>
                    </div>

                    <a
                      href={`tel:${order.customer_phone}`}
                      className="rounded-xl bg-green-500/10 px-4 py-2.5 text-center text-xs font-black text-green-300 transition hover:bg-green-500/20"
                    >
                      Call Customer
                    </a>
                  </div>
                </div>
              </div>

              {/* EXACT LOCATION */}
              <div>
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-white/30">
                      Destination
                    </p>
                    <p className="mt-1 text-sm font-bold text-white/70">
                      Exact customer location
                    </p>
                  </div>

                  {order.distance_km !== null && (
                    <span className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-bold text-white/50">
                      {Number(order.distance_km).toFixed(1)} km
                    </span>
                  )}
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                  {order.customer_lat !== null &&
                  order.customer_lng !== null ? (
                    <>
                      <div className="h-64 w-full bg-[#17181b] sm:h-72">
                        <iframe
                          title="Exact customer delivery location"
                          src={`https://www.google.com/maps?q=${order.customer_lat},${order.customer_lng}&z=17&output=embed`}
                          className="h-full w-full border-0"
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      </div>

                      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-black text-green-300">
                            ● Exact GPS pin available
                          </p>
                          <p className="mt-1 text-[11px] text-white/35">
                            {Number(order.customer_lat).toFixed(6)},{" "}
                            {Number(order.customer_lng).toFixed(6)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            openMaps(
                              order.customer_lat,
                              order.customer_lng,
                              order.delivery_address
                            )
                          }
                          className="rounded-xl bg-orange-500 px-4 py-3 text-xs font-black text-black transition hover:bg-orange-400"
                        >
                          Navigate to Customer ↗
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-5">
                      <p className="text-sm font-bold text-yellow-300">
                        GPS coordinates unavailable
                      </p>
                      <p className="mt-1 text-xs leading-5 text-white/40">
                        Use the saved delivery address for navigation.
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          openMaps(null, null, order.delivery_address)
                        }
                        className="mt-4 rounded-xl bg-orange-500 px-4 py-3 text-xs font-black text-black"
                      >
                        Open Address in Maps ↗
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-white/30">
                    Delivery Address
                  </p>
                  <p className="mt-1 text-sm leading-6 text-white/65">
                    {order.delivery_address}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-orange-500/10 bg-orange-500/[0.04] p-4">
                <div className="flex gap-3">
                  <span className="text-lg">🛡️</span>
                  <div>
                    <div className="mt-4 grid grid-cols-2 gap-2"><a href={`https://wa.me/${String(order.customer_phone || "").replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="rounded-xl border border-green-500/20 bg-green-500/10 px-3 py-2.5 text-center text-xs font-black text-green-300">💬 WhatsApp</a><button type="button" onClick={() => setIssueOpen(true)} className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-3 py-2.5 text-xs font-black text-yellow-300">⚠️ Report Issue</button></div>

                    <p className="text-xs font-black text-orange-300">Delivery safety check</p>
                    <p className="mt-1 text-[11px] leading-5 text-white/35">
                      Verify the customer handover before completing the order.
                      Never share the customer's OTP with anyone else.
                    </p>
                  </div>
                </div>
              </div>

              {/* ORDER SUMMARY */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs text-white/30">Order Total</p>
                  <p className="mt-1 text-xl font-black">
                    ₹{Number(order.total || 0).toFixed(0)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs text-white/30">Payment</p>
                  <p className="mt-1 text-xl font-black">
                    {Number(order.cod_collected_amount || 0) > 0
                      ? "COD"
                      : "Paid / Verify"}
                  </p>
                </div>
              </div>

              {/* OTP ACCEPT */}
              {!accepted && (
                <div className="overflow-hidden rounded-3xl border border-orange-500/25 bg-gradient-to-br from-orange-500/10 to-transparent">
                  <div className="p-5 sm:p-6">
                    <div className="flex gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500/15 text-2xl">
                        🔐
                      </div>
                      <div>
                        <p className="text-base font-black text-orange-300">
                          Customer verification required
                        </p>
                        <p className="mt-1 text-xs leading-5 text-white/40">
                          Ask the customer for the OTP shown in their order
                          confirmation / notification. The order cannot be
                          accepted without it.
                        </p>
                      </div>
                    </div>

                    <label className="mt-5 block text-xs font-black uppercase tracking-wider text-white/35">
                      6-digit customer OTP
                    </label>

                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={otp}
                      onChange={(e) =>
                        setOtp(
                          e.target.value.replace(/\D/g, "").slice(0, 6)
                        )
                      }
                      placeholder="••••••"
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-5 text-center text-2xl font-black tracking-[0.5em] text-white outline-none transition focus:border-orange-500/60"
                    />

                    <button
                      type="button"
                      onClick={acceptOrder}
                      disabled={actionLoading || otp.length !== 6}
                      className="mt-4 w-full rounded-2xl bg-orange-500 px-5 py-4 text-sm font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {actionLoading
                        ? "Verifying…"
                        : "Verify OTP & Accept Delivery"}
                    </button>
                  </div>
                </div>
              )}

              {/* PICKUP */}
              {accepted && !pickedUp && (
                <div className="rounded-3xl border border-blue-500/20 bg-blue-500/5 p-5 sm:p-6">
                  <p className="text-base font-black text-blue-300">
                    📦 Ready for pickup
                  </p>
                  <p className="mt-1 text-xs leading-5 text-white/40">
                    Collect the order from the restaurant, then confirm pickup.
                  </p>

                  <button
                    type="button"
                    onClick={markPickedUp}
                    disabled={actionLoading}
                    className="mt-5 w-full rounded-2xl bg-blue-500 px-5 py-4 text-sm font-black text-black transition hover:bg-blue-400 disabled:opacity-40"
                  >
                    {actionLoading ? "Updating…" : "Mark Order Picked Up"}
                  </button>
                </div>
              )}

              {/* ARRIVAL */}
              {pickedUp && !arrived && !order.delivered_at && (
                <div className="rounded-3xl border border-purple-500/20 bg-purple-500/5 p-5 sm:p-6">
                  <div className="flex gap-3">
                    <div className="text-2xl">📍</div>
                    <div>
                      <p className="text-base font-black text-purple-300">
                        At the customer's destination?
                      </p>
                      <p className="mt-1 text-xs leading-5 text-white/40">
                        Tap this only after you physically reach the delivery
                        location. The customer will receive an instant
                        notification.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={markArrived}
                    disabled={actionLoading}
                    className="mt-5 w-full rounded-2xl bg-purple-500 px-5 py-4 text-sm font-black text-white transition hover:bg-purple-400 disabled:opacity-40"
                  >
                    {actionLoading ? "Notifying Customer…" : "I Am at the Location"}
                  </button>
                </div>
              )}

              {/* DELIVER */}
              {pickedUp && arrived && !order.delivered_at && (
                <div className="rounded-3xl border border-green-500/20 bg-green-500/5 p-5 sm:p-6">
                  <div className="flex gap-3">
                    <div className="text-2xl">✅</div>
                    <div>
                      <p className="text-base font-black text-green-300">
                        Final delivery confirmation
                      </p>
                      <p className="mt-1 text-xs leading-5 text-white/40">
                        Confirm the handover only after the customer has
                        received the order.
                      </p>
                    </div>
                  </div>

                  <label className="mt-5 block text-xs font-black uppercase tracking-wider text-white/35">
                    COD collected
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={codAmount}
                    onChange={(e) => setCodAmount(e.target.value)}
                    placeholder="₹0 if already paid online"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white outline-none focus:border-green-500/50"
                  />

                  <button
                    type="button"
                    onClick={markDelivered}
                    disabled={actionLoading}
                    className="mt-4 w-full rounded-2xl bg-green-500 px-5 py-4 text-sm font-black text-black transition hover:bg-green-400 disabled:opacity-40"
                  >
                    {actionLoading
                      ? "Completing Delivery…"
                      : "Confirm Handover & Mark Delivered"}
                  </button>

                  <p className="mt-3 text-center text-[11px] text-white/25">
                    Delivery completion is controlled by the delivery partner,
                    not the admin dashboard.
                  </p>
                </div>
              )}

              {/* DELIVERY TIMESTAMPS */}
              <div className="grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-4">
                {[
                  ["Assigned", order.delivery_assigned_at],
                  ["Accepted", order.delivery_accepted_at],
                  ["Picked Up", order.picked_up_at],
                  ["Arrived", order.delivery_arrived_at],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-2xl border border-white/10 bg-white/[0.025] p-3"
                  >
                    <p className="text-[10px] font-black uppercase tracking-wider text-white/25">
                      {label}
                    </p>
                    <p className="mt-1 text-xs font-bold text-white/55">
                      {formatTime(value as string | null)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* PERFORMANCE ANALYTICS */}
        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-orange-500/[0.07] via-white/[0.025] to-white/[0.015] p-5 shadow-2xl shadow-black/10 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400/80">
                Performance analytics
              </p>
              <h2 className="mt-1 text-xl font-black">Delivery Performance</h2>
              <p className="mt-1 text-xs leading-5 text-white/35">
                Calculated from your completed delivery history.
              </p>
            </div>
            <span className="w-fit rounded-full border border-orange-500/15 bg-orange-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-orange-300">
              {historyFilter === "today"
                ? "Today"
                : historyFilter === "week"
                ? "This Week"
                : "All History"}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[9px] font-black uppercase tracking-wider text-white/25">
                Deliveries
              </p>
              <p className="mt-2 text-2xl font-black text-orange-300">
                {filteredHistory.length}
              </p>
              <p className="mt-1 text-[10px] text-white/25">completed</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[9px] font-black uppercase tracking-wider text-white/25">
                Order Value
              </p>
              <p className="mt-2 text-2xl font-black text-white/85">
                ₹{filteredHistoryValue.toFixed(0)}
              </p>
              <p className="mt-1 text-[10px] text-white/25">delivered value</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[9px] font-black uppercase tracking-wider text-white/25">
                COD Collected
              </p>
              <p className="mt-2 text-2xl font-black text-green-300">
                ₹{filteredHistoryCod.toFixed(0)}
              </p>
              <p className="mt-1 text-[10px] text-white/25">cash recorded</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[9px] font-black uppercase tracking-wider text-white/25">
                Distance
              </p>
              <p className="mt-2 text-2xl font-black text-blue-300">
                {filteredHistoryDistance.toFixed(1)} km
              </p>
              <p className="mt-1 text-[10px] text-white/25">recorded distance</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[9px] font-black uppercase tracking-wider text-white/25">
                Avg. Delivery
              </p>
              <p className="mt-2 text-2xl font-black text-purple-300">
                {formatDuration(averageDeliveryMinutes)}
              </p>
              <p className="mt-1 text-[10px] text-white/25">assigned → delivered</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[9px] font-black uppercase tracking-wider text-white/25">
                Avg. Order
              </p>
              <p className="mt-2 text-2xl font-black text-yellow-300">
                ₹{filteredHistory.length > 0
                  ? (filteredHistoryValue / filteredHistory.length).toFixed(0)
                  : "0"}
              </p>
              <p className="mt-1 text-[10px] text-white/25">per delivery</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
            <div className="flex flex-col gap-1 text-[11px] text-white/35 sm:flex-row sm:items-center sm:justify-between">
              <span>Analytics update automatically when the history filter changes.</span>
              <span>
                Timing available for {deliveryDurations.length} of {filteredHistory.length} deliveries
              </span>
            </div>
          </div>
        </section>

        {/* DELIVERY HISTORY */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/30">
                Completed deliveries
              </p>
              <section className="mb-5 rounded-3xl border border-white/10 bg-black/10 p-5"><p className="text-xs font-black uppercase tracking-[0.2em] text-green-400/80">Settlement Summary</p><h2 className="mt-1 text-xl font-black">Delivery Value & COD</h2><p className="mt-1 text-xs text-white/35">Activity summary only — no commission or payout is assumed.</p><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-2xl bg-white/[0.03] p-4"><p className="text-[9px] font-black uppercase text-white/25">Deliveries</p><p className="mt-2 text-xl font-black">{filteredHistory.length}</p></div><div className="rounded-2xl bg-white/[0.03] p-4"><p className="text-[9px] font-black uppercase text-white/25">Order Value</p><p className="mt-2 text-xl font-black">₹{filteredHistoryValue.toFixed(0)}</p></div><div className="rounded-2xl bg-white/[0.03] p-4"><p className="text-[9px] font-black uppercase text-white/25">COD</p><p className="mt-2 text-xl font-black text-green-300">₹{filteredHistoryCod.toFixed(0)}</p></div><div className="rounded-2xl bg-white/[0.03] p-4"><p className="text-[9px] font-black uppercase text-white/25">Payout</p><p className="mt-2 text-xl font-black text-white/40">Not configured</p></div></div></section>
              <section className="mb-5 rounded-3xl border border-white/10 bg-black/10 p-5"><p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400/80">Help & Support</p><h2 className="mt-1 text-xl font-black">Need Help?</h2><p className="mt-2 text-xs leading-5 text-white/35">For delivery, payment or customer issues, contact the restaurant administrator. The support contact can be configured later without changing the delivery flow.</p><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-3 text-center text-xs font-black text-blue-300">🛟 Admin Support</div><div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center text-xs font-black text-white/50">📋 Keep Order ID Ready</div></div></section>
              <h2 className="mt-1 text-xl font-black">Delivery History</h2>
              <p className="mt-1 text-xs leading-5 text-white/35">
                Search your completed orders and review delivery performance.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => printDeliveryHistoryReport(filteredHistory, historyFilter)}
                disabled={filteredHistory.length === 0}
                className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3.5 py-2 text-xs font-black text-blue-300 transition hover:bg-blue-500/15 disabled:cursor-not-allowed disabled:opacity-30"
              >
                🖨️ Print Report
              </button>

              <button
                type="button"
                onClick={() => downloadDeliveryHistoryCSV(filteredHistory, historyFilter)}
                disabled={filteredHistory.length === 0}
                className="rounded-xl border border-green-500/20 bg-green-500/10 px-3.5 py-2 text-xs font-black text-green-300 transition hover:bg-green-500/15 disabled:cursor-not-allowed disabled:opacity-30"
              >
                ↓ Export CSV
              </button>

              {[
                ["today", "Today"],
                ["week", "This Week"],
                ["all", "All"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setHistoryFilter(value as "today" | "week" | "all")
                  }
                  className={`rounded-xl border px-3.5 py-2 text-xs font-black transition ${
                    historyFilter === value
                      ? "border-orange-500/30 bg-orange-500 text-black"
                      : "border-white/10 bg-white/5 text-white/45 hover:bg-white/10 hover:text-white/70"
                  }`}
                >
                  {label}
                </button>
              ))}
              <button type="button" onClick={() => setHistoryFilter("custom")} className={`rounded-xl border px-3.5 py-2 text-xs font-black transition ${historyFilter === "custom" ? "border-orange-500/30 bg-orange-500 text-black" : "border-white/10 bg-white/5 text-white/45 hover:bg-white/10"}`}>Custom</button>
            </div>
          </div>

          {historyFilter === "custom" && <div className="mt-4 grid grid-cols-2 gap-3"><label className="text-[10px] font-black uppercase text-white/30">From<input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs text-white" /></label><label className="text-[10px] font-black uppercase text-white/30">To<input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs text-white" /></label></div>}

          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/25">
                🔎
              </span>
              <input
                type="search"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search order ID or customer name"
                className="w-full rounded-2xl border border-white/10 bg-black/20 py-3.5 pl-11 pr-4 text-sm font-semibold text-white outline-none transition placeholder:text-white/20 focus:border-orange-500/40"
              />
            </div>

            <label className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <span className="block text-[9px] font-black uppercase tracking-wider text-white/25">
                Sort by
              </span>
              <select
                value={historySort}
                onChange={(e) =>
                  setHistorySort(
                    e.target.value as "newest" | "oldest" | "highest" | "distance"
                  )
                }
                className="mt-1 w-full bg-transparent text-sm font-black text-white/75 outline-none"
              >
                <option value="newest" className="bg-slate-900">Newest first</option>
                <option value="oldest" className="bg-slate-900">Oldest first</option>
                <option value="highest" className="bg-slate-900">Highest value</option>
                <option value="distance" className="bg-slate-900">Longest distance</option>
              </select>
            </label>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-wider text-white/25">
                Showing
              </p>
              <p className="mt-0.5 text-sm font-black text-white/75">
                {filteredHistory.length} deliveries
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-wider text-white/25">
                Value
              </p>
              <p className="mt-0.5 text-sm font-black text-orange-300">
                ₹{filteredHistoryValue.toFixed(0)}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
              <p className="text-[9px] font-black uppercase tracking-wider text-white/25">
                COD Collected
              </p>
              <p className="mt-1 text-sm font-black text-green-300">
                ₹{filteredHistoryCod.toFixed(0)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
              <p className="text-[9px] font-black uppercase tracking-wider text-white/25">
                Completed
              </p>
              <p className="mt-1 text-sm font-black text-white/75">
                {filteredHistory.length}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
              <p className="text-[9px] font-black uppercase tracking-wider text-white/25">
                Filter
              </p>
              <p className="mt-1 text-sm font-black capitalize text-blue-300">
                {historyFilter === "week" ? "This week" : historyFilter === "custom" ? "Custom Range" : historyFilter === "today" ? "Today" : "All History"}
              </p>
            </div>
          </div>

          {completedOrders.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-black/10 p-7 text-center">
              <div className="text-3xl">📦</div>
              <p className="mt-3 text-sm font-bold text-white/60">
                No completed deliveries yet
              </p>
              <p className="mt-1 text-xs text-white/30">
                Your completed orders will appear here automatically.
              </p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-black/10 p-7 text-center">
              <div className="text-3xl">🔎</div>
              <p className="mt-3 text-sm font-bold text-white/60">
                No matching deliveries
              </p>
              <p className="mt-1 text-xs text-white/30">
                Try another search or change the history filter.
              </p>
              {(historySearch || historyFilter !== "today") && (
                <button
                  type="button"
                  onClick={() => {
                    setHistorySearch("");
                    setHistoryFilter("today");
                  }}
                  className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-black text-white/60 transition hover:bg-white/10 hover:text-white"
                >
                  Reset History
                </button>
              )}
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {sortedHistory.map((item) => (
                <div
                  key={item.order_id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-white/15 hover:bg-white/[0.025]"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black">#{item.order_id}</p>
                          <span className="rounded-full bg-green-500/10 px-2 py-1 text-[10px] font-black uppercase text-green-300">
                            {item.status || "Delivered"}
                          </span>
                          {item.delivery_issue && (
                            <span className="rounded-full bg-yellow-500/10 px-2 py-1 text-[10px] font-black uppercase text-yellow-300">
                              Issue noted
                            </span>
                          )}
                        </div>

                        <p className="mt-1 truncate text-sm font-bold text-white/65">
                          {item.customer_name}
                        </p>

                        <p className="mt-1 text-[11px] text-white/30">
                          Completed {formatTime(item.delivered_at)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="rounded-xl bg-white/[0.035] px-3 py-2">
                          <p className="text-[9px] font-black uppercase tracking-wider text-white/25">
                            Order Value
                          </p>
                          <p className="mt-1 text-sm font-black text-white/80">
                            ₹{Number(item.total || 0).toFixed(0)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-green-500/[0.06] px-3 py-2">
                          <p className="text-[9px] font-black uppercase tracking-wider text-white/25">
                            COD
                          </p>
                          <p className="mt-1 text-sm font-black text-green-300">
                            ₹{Number(item.cod_collected_amount || 0).toFixed(0)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-3 sm:grid-cols-4">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-white/20">
                          Distance
                        </p>
                        <p className="mt-1 text-xs font-bold text-white/55">
                          {item.distance_km !== null
                            ? `${Number(item.distance_km).toFixed(1)} km`
                            : "Not recorded"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-white/20">
                          Completed At
                        </p>
                        <p className="mt-1 text-xs font-bold text-white/55">
                          {formatTime(item.delivered_at)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-white/20">
                          COD Time
                        </p>
                        <p className="mt-1 text-xs font-bold text-white/55">
                          {formatTime(item.cod_collected_at)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-white/20">
                          Assigned
                        </p>
                        <p className="mt-1 text-xs font-bold text-white/55">
                          {formatTime(item.delivery_assigned_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end border-t border-white/10 pt-3">
                      <button
                        type="button"
                        onClick={() => setSelectedHistoryOrder(item)}
                        className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-4 py-2.5 text-xs font-black text-blue-300 transition hover:bg-blue-500/15"
                      >
                        👁️ View Details
                      </button>
                    </div>

                    {item.delivery_issue && (
                      <div className="rounded-xl border border-yellow-500/15 bg-yellow-500/[0.04] px-3 py-2.5">
                        <p className="text-[9px] font-black uppercase tracking-wider text-yellow-300/60">
                          Delivery Issue
                        </p>
                        <p className="mt-1 text-xs leading-5 text-yellow-100/60">
                          {item.delivery_issue}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {completedOrders.length >= 100 && (
            <p className="mt-4 text-center text-[10px] font-semibold text-white/20">
              Showing the latest 100 completed deliveries.
            </p>
          )}
        </section>
      </div>

      {issueOpen && order && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4"><div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111317] p-5"><div className="flex justify-between"><h3 className="text-lg font-black">⚠️ Report Delivery Issue</h3><button type="button" onClick={() => setIssueOpen(false)}>✕</button></div><select value={issueType} onChange={(e) => setIssueType(e.target.value)} className="mt-5 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"><option>Customer unavailable</option><option>Wrong address</option><option>Customer refused order</option><option>Payment issue</option><option>Vehicle problem</option><option>Other</option></select><textarea value={issueNote} onChange={(e) => setIssueNote(e.target.value.slice(0,400))} rows={5} placeholder="Describe the issue..." className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white"/><button type="button" disabled={actionLoading} onClick={() => void submitDeliveryIssue()} className="mt-3 w-full rounded-xl bg-yellow-500 p-3 text-sm font-black text-black">{actionLoading ? "Reporting..." : "Report Issue"}</button></div></div>}

      {profileOpen && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4"><div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111317] p-5"><div className="flex justify-between"><h3 className="text-lg font-black">✏️ Edit Profile</h3><button type="button" onClick={() => setProfileOpen(false)}>✕</button></div><div className="mt-5 space-y-3">{([["full_name","Full Name"],["phone","Phone"],["vehicle_type","Vehicle Type"],["vehicle_number","Vehicle Number"]] as const).map(([key,label]) => <label key={key} className="block text-[10px] font-black uppercase text-white/30">{label}<input value={profileForm[key]} onChange={(e) => setProfileForm((current) => ({ ...current, [key]: e.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm normal-case text-white"/></label>)}</div><button type="button" disabled={profileSaving} onClick={() => void saveProfile()} className="mt-5 w-full rounded-xl bg-orange-500 p-3 text-sm font-black text-black">{profileSaving ? "Saving..." : "Save Profile"}</button></div></div>}

      {selectedHistoryOrder && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#111317] shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-white/10 bg-[#111317]/95 px-5 py-4 backdrop-blur-xl">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300/60">
                  Delivery Details
                </p>
                <h3 className="mt-1 text-lg font-black">#{selectedHistoryOrder.order_id}</h3>
              </div>
              <button type="button" onClick={() => setSelectedHistoryOrder(null)} className="rounded-xl bg-white/5 px-3 py-2 text-sm font-black text-white/50 hover:bg-white/10 hover:text-white">✕</button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl bg-white/[0.04] p-3"><p className="text-[9px] font-black uppercase text-white/25">Status</p><p className="mt-1 text-sm font-black text-green-300">{selectedHistoryOrder.status || "Delivered"}</p></div>
                <div className="rounded-2xl bg-white/[0.04] p-3"><p className="text-[9px] font-black uppercase text-white/25">Total</p><p className="mt-1 text-sm font-black">₹{Number(selectedHistoryOrder.total || 0).toFixed(0)}</p></div>
                <div className="rounded-2xl bg-white/[0.04] p-3"><p className="text-[9px] font-black uppercase text-white/25">COD</p><p className="mt-1 text-sm font-black text-green-300">₹{Number(selectedHistoryOrder.cod_collected_amount || 0).toFixed(0)}</p></div>
                <div className="rounded-2xl bg-white/[0.04] p-3"><p className="text-[9px] font-black uppercase text-white/25">Distance</p><p className="mt-1 text-sm font-black">{selectedHistoryOrder.distance_km != null ? `${Number(selectedHistoryOrder.distance_km).toFixed(1)} km` : "—"}</p></div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-white/25">Customer</p>
                <p className="mt-2 text-base font-black">{selectedHistoryOrder.customer_name}</p>
                {selectedHistoryOrder.customer_phone && <a href={`tel:${selectedHistoryOrder.customer_phone}`} className="mt-1 block text-sm font-bold text-blue-300">📞 {selectedHistoryOrder.customer_phone}</a>}
                <p className="mt-3 text-xs leading-5 text-white/55">📍 {selectedHistoryOrder.delivery_address || "Address not recorded"}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[["Assigned", selectedHistoryOrder.delivery_assigned_at],["Accepted", selectedHistoryOrder.delivery_accepted_at],["Picked Up", selectedHistoryOrder.picked_up_at],["Arrived", selectedHistoryOrder.delivery_arrived_at],["Delivered", selectedHistoryOrder.delivered_at],["COD Collected", selectedHistoryOrder.cod_collected_at]].map(([label,value]) => (
                  <div key={label as string} className="rounded-2xl border border-white/10 bg-white/[0.025] p-3"><p className="text-[9px] font-black uppercase text-white/25">{label as string}</p><p className="mt-1 text-xs font-bold text-white/60">{formatTime(value as string | null)}</p></div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"><p className="text-[9px] font-black uppercase text-white/25">Subtotal</p><p className="mt-1 font-black">₹{Number(selectedHistoryOrder.subtotal || 0).toFixed(0)}</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"><p className="text-[9px] font-black uppercase text-white/25">Delivery Charge</p><p className="mt-1 font-black">₹{Number(selectedHistoryOrder.delivery_charge || 0).toFixed(0)}</p></div>
              </div>

              {selectedHistoryOrder.delivery_issue && <div className="rounded-2xl border border-yellow-500/15 bg-yellow-500/[0.04] p-4"><p className="text-[9px] font-black uppercase text-yellow-300/60">Delivery Issue</p><p className="mt-2 text-sm leading-6 text-yellow-100/70">{selectedHistoryOrder.delivery_issue}</p></div>}

              {selectedHistoryOrder.customer_lat != null && selectedHistoryOrder.customer_lng != null && (
                <a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${selectedHistoryOrder.customer_lat},${selectedHistoryOrder.customer_lng}`} className="block rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-center text-sm font-black text-blue-300 hover:bg-blue-500/15">🗺️ Open Customer Location in Google Maps</a>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

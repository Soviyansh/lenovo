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

export default function NotificationBell() {
  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setUserId(user.id);

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Notifications fetch error:", error);
        setNotifications([]);
      } else {
        setNotifications((data as Notification[]) || []);
      }

      channel = supabase
        .channel(`notification-bell-${user.id}-${Date.now()}`)
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

            setOpen(true);
          }
        )
        .subscribe();
    };

    load();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  const visibleNotifications = showAllNotifications
    ? notifications
    : notifications.slice(0, 4);

  const markRead = async (id: number) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (error) {
      console.error("Mark notification read error:", error);
      return;
    }

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? { ...notification, is_read: true }
          : notification
      )
    );
  };

  const markAllRead = async () => {
    if (!userId) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      console.error("Mark all notifications read error:", error);
      return;
    }

    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        is_read: true,
      }))
    );
  };

  const getNotificationStyle = (type: string) => {
    const normalizedType = type.toLowerCase();

    if (
      normalizedType === "refund" ||
      normalizedType.includes("refund")
    ) {
      return {
        icon: "💸",
        iconClass: "bg-green-500/15 text-green-300",
        badgeClass: "bg-green-500/10 text-green-300",
        label: "Refund",
      };
    }

    if (
      normalizedType === "cancelled" ||
      normalizedType === "canceled" ||
      normalizedType.includes("cancel")
    ) {
      return {
        icon: "❌",
        iconClass: "bg-red-500/15 text-red-300",
        badgeClass: "bg-red-500/10 text-red-300",
        label: "Cancelled",
      };
    }

    if (
      normalizedType.includes("delivered") ||
      normalizedType === "success" ||
      normalizedType === "completed"
    ) {
      return {
        icon: "✅",
        iconClass: "bg-green-500/15 text-green-300",
        badgeClass: "bg-green-500/10 text-green-300",
        label: "Completed",
      };
    }

    if (
      normalizedType.includes("delivery") ||
      normalizedType.includes("out_for_delivery")
    ) {
      return {
        icon: "🛵",
        iconClass: "bg-blue-500/15 text-blue-300",
        badgeClass: "bg-blue-500/10 text-blue-300",
        label: "Delivery",
      };
    }

    if (
      normalizedType.includes("ready") ||
      normalizedType.includes("preparing") ||
      normalizedType.includes("order")
    ) {
      return {
        icon: "🍽️",
        iconClass: "bg-orange-500/15 text-orange-300",
        badgeClass: "bg-orange-500/10 text-orange-300",
        label: "Order",
      };
    }

    return {
      icon: "🔔",
      iconClass: "bg-orange-500/15 text-orange-300",
      badgeClass: "bg-white/5 text-white/50",
      label: "Update",
    };
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl transition hover:bg-white/10"
        aria-label="Notifications"
        aria-expanded={open}
      >
        🔔

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />

          <div className="absolute right-0 z-50 mt-3 w-[min(380px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-white/10 bg-[#17120f] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <h3 className="font-semibold text-white">Notifications</h3>

                {unreadCount > 0 ? (
                  <p className="text-xs text-white/50">
                    {unreadCount} unread notification
                    {unreadCount === 1 ? "" : "s"}
                  </p>
                ) : (
                  <p className="text-xs text-white/40">
                    You&apos;re all caught up
                  </p>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-orange-300 transition hover:bg-orange-500/10 hover:text-orange-200"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[460px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <div className="mb-2 text-3xl">🔔</div>
                  <p className="text-sm text-white/70">
                    No notifications yet.
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    Order and payment updates will appear here.
                  </p>
                </div>
              ) : (
                visibleNotifications.map((notification) => {
                  const style = getNotificationStyle(notification.type);

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => markRead(notification.id)}
                      className={`block w-full border-b border-white/5 px-4 py-4 text-left transition hover:bg-white/5 ${
                        !notification.is_read ? "bg-white/[0.04]" : ""
                      }`}
                    >
                      <div className="flex gap-3">
                        <div
                          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${style.iconClass}`}
                        >
                          {style.icon}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white">
                                {notification.title}
                              </p>

                              {notification.order_id && (
                                <span
                                  className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold ${style.badgeClass}`}
                                >
                                  {style.label} • {notification.order_id}
                                </span>
                              )}
                            </div>

                            {!notification.is_read && (
                              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-orange-400" />
                            )}
                          </div>

                          <p className="mt-2 text-xs leading-5 text-white/60">
                            {notification.message}
                          </p>

                          <p className="mt-2 text-[10px] text-white/35">
                            {new Date(
                              notification.created_at
                            ).toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}

              {notifications.length > 4 && (
                <button
                  type="button"
                  onClick={() => setShowAllNotifications((value) => !value)}
                  className="flex w-full items-center justify-center gap-1 border-t border-white/5 px-4 py-3 text-xs font-medium text-orange-300 transition hover:bg-orange-500/10 hover:text-orange-200"
                >
                  {showAllNotifications
                    ? "▲ Show fewer notifications"
                    : `▼ View all ${notifications.length} notifications`}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

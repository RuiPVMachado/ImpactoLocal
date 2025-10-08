import { useEffect, useMemo, useState } from "react";
import { Bell, Loader2, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { fetchNotifications, markNotificationsAsRead } from "../lib/api";
import type { Notification } from "../types";

export default function NotificationBell() {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);
  const [open, setOpen] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setNotifications([]);
      setOpen(false);
      return;
    }

    void loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAuthenticated]);

  const loadNotifications = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const data = await fetchNotifications(user.id);
      setNotifications(data);
    } catch (error) {
      console.error("Failed to load notifications", error);
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((notification) => !notification.read);
    if (unread.length === 0) return;

    try {
      setMarkingRead(true);
      await markNotificationsAsRead(
        unread.map((notification) => notification.id)
      );
      setNotifications((current) =>
        current.map((notification) =>
          notification.read ? notification : { ...notification, read: true }
        )
      );
    } catch (error) {
      console.error("Failed to mark notifications as read", error);
    } finally {
      setMarkingRead(false);
    }
  };

  const handleToggle = async () => {
    if (!open && notifications.length === 0 && !loading && user) {
      await loadNotifications();
    }

    const nextState = !open;
    setOpen(nextState);

    if (!open && unreadCount > 0) {
      await markAllAsRead();
    }
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  const getNotificationIcon = (notification: Notification) => {
    if (notification.type === "application_approved") {
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    }

    if (notification.type === "application_rejected") {
      return <AlertTriangle className="h-4 w-4 text-rose-500" />;
    }

    return <Info className="h-4 w-4 text-emerald-600" />;
  };

  const renderMessage = (notification: Notification) => {
    if (notification.type === "application_rejected") {
      return "Já existe uma candidatura sua que foi rejeitada.";
    }

    return notification.message;
  };

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:text-emerald-600"
        aria-label="Ver notificações"
        type="button"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3 w-80 rounded-xl border border-gray-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Notificações
              </p>
              <p className="text-xs text-gray-500">
                {unreadCount > 0
                  ? `${unreadCount} notificações por ler`
                  : "Todas as notificações estão lidas"}
              </p>
            </div>
            <button
              onClick={markAllAsRead}
              disabled={markingRead || unreadCount === 0}
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 disabled:cursor-not-allowed disabled:text-gray-400"
              type="button"
            >
              {markingRead ? "A atualizar..." : "Marcar como lidas"}
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-sm text-gray-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />A carregar
                notificações...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                Não tem notificações por agora.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`flex items-start gap-3 px-4 py-3 text-sm transition ${
                      notification.read ? "bg-white" : "bg-emerald-50"
                    }`}
                  >
                    <div className="mt-0.5">
                      {getNotificationIcon(notification)}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {notification.title}
                      </p>
                      <p className="mt-1 text-sm text-gray-700">
                        {renderMessage(notification)}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {new Date(notification.createdAt).toLocaleString(
                          "pt-PT"
                        )}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

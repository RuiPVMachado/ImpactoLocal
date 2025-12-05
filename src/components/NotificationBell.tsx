// Dropdown notification center that syncs with Supabase and auto-marks reads.
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
} from "react";
import { Bell, Loader2, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { fetchNotifications, markNotificationsAsRead } from "../lib/api";
import type { Notification } from "../types";

export default function NotificationBell() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

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

  // Pulls fresh notifications for the authenticated user via Supabase.
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

  // Marks every unread notification as read once the dropdown opens.
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

  // Toggle dropdown visibility and lazily load + mark notifications.
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

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) {
        return;
      }

      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Selects the appropriate icon per notification type.
  const getNotificationIcon = (notification: Notification) => {
    if (notification.type === "application_approved") {
      return <CheckCircle2 className="h-4 w-4 text-brand-secondary" />;
    }

    if (notification.type === "application_rejected") {
      return <AlertTriangle className="h-4 w-4 text-rose-500" />;
    }

    return <Info className="h-4 w-4 text-brand-secondary" />;
  };

  // Provides copy overrides for common system messages.
  const renderMessage = (notification: Notification) => {
    if (notification.type === "application_rejected") {
      return "Já existe uma candidatura sua que foi rejeitada.";
    }

    return notification.message;
  };

  // Deduces which route (internal or external) should open for a notification.
  const resolveNotificationLink = useCallback(
    (notification: Notification) => {
      const link = notification.link?.trim();
      const role = user?.type;

      if (role === "organization") {
        if (
          notification.type === "application_updated" &&
          notification.status === "pending"
        ) {
          return "/organization/dashboard";
        }

        if (notification.type === "event_reminder") {
          const match =
            link?.match(/organization\/events\/([^/]+)/)?.[1] ??
            link?.match(/events\/([^/]+)/)?.[1];

          if (match) {
            return `/organization/events/${match}/recap`;
          }

          return "/organization/events";
        }
      }

      return link ?? null;
    },
    [user?.type]
  );

  if (!isAuthenticated || !user) {
    return null;
  }

  // Marks the clicked notification as read and navigates to its destination.
  const handleNotificationClick = (notification: Notification) => {
    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, read: true } : item
      )
    );

    const destination = resolveNotificationLink(notification);

    if (destination) {
      if (/^https?:\/\//i.test(destination)) {
        window.open(destination, "_blank", "noopener,noreferrer");
      } else {
        navigate(destination);
      }
    }

    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleToggle}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-brand-secondary/20 bg-white text-brand-neutral transition duration-200 hover:border-brand-secondary/50 hover:shadow-lg hover:text-brand-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary/80 focus-visible:ring-offset-2"
        aria-label="Ver notificações"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        type="button"
      >
        <Bell
          className={`h-5 w-5 transition-transform duration-200 ${
            open ? "rotate-12 text-brand-secondary" : ""
          }`}
        />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-live="polite"
          className="fixed left-1/2 top-[calc(4rem+0.75rem)] z-50 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-brand-secondary/20 bg-white/95 shadow-xl backdrop-blur transition-all duration-200 ease-out motion-reduce:transition-none md:absolute md:left-auto md:right-0 md:top-full md:mt-3 md:w-80 md:translate-x-0"
          data-open={open}
        >
          <div className="flex items-center justify-between border-b border-brand-secondary/20 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Notificações
              </p>
              <p className="text-xs text-brand-neutral/70">
                {unreadCount > 0
                  ? `${unreadCount} notificações por ler`
                  : "Todas as notificações estão lidas"}
              </p>
            </div>
            <button
              onClick={markAllAsRead}
              disabled={markingRead || unreadCount === 0}
              className="text-xs font-medium text-brand-secondary hover:text-brand-secondary/80 disabled:cursor-not-allowed disabled:text-gray-400"
              type="button"
            >
              {markingRead ? "A atualizar..." : "Marcar como lidas"}
            </button>
          </div>

          <div className="max-h-[min(60vh,22rem)] overflow-y-auto px-1 md:max-h-80">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-sm text-gray-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />A carregar
                notificações...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-brand-neutral/70">
                Não tem notificações por agora.
              </div>
            ) : (
              <ul className="divide-y divide-brand-secondary/10">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleNotificationClick(notification)}
                      className={`group flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary/60 focus-visible:ring-offset-2 ${
                        notification.read
                          ? "bg-white hover:bg-brand-secondary/5"
                          : "bg-brand-secondary/10 hover:bg-brand-secondary/20"
                      }`}
                    >
                      <div className="mt-0.5 text-brand-secondary transition-transform group-hover:scale-105">
                        {getNotificationIcon(notification)}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-brand-neutral/70">
                          {notification.title}
                        </p>
                        <p className="mt-1 text-sm text-brand-neutral">
                          {renderMessage(notification)}
                        </p>
                        <p className="mt-1 text-xs text-brand-neutral/60">
                          {new Date(notification.createdAt).toLocaleString(
                            "pt-PT"
                          )}
                        </p>
                      </div>
                    </button>
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

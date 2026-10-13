"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { manrope as navFont } from "@/components/admin/fonts";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Settings2,
  Sparkles,
  UserRound,
  CalendarDays,
  CheckCircle2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAdminShell } from "./AdminShellContext";
import { createClient } from "@/lib/supabase/client";

// Fuente redondeada, misma que usamos en el sidebar.

const pageMeta: Record<
  string,
  { eyebrow: string; title: string }
> = {
  "/admin": {
    eyebrow: "DASHBOARD",
    title: "Dashboard",
  },
  "/admin/turnos": {
    eyebrow: "OPERACIÓN",
    title: "Agenda",
  },
  "/admin/clientes": {
    eyebrow: "CLIENTES",
    title: "Clientes",
  },
  "/admin/equipo": {
    eyebrow: "OPERACIÓN",
    title: "Equipo",
  },
  "/admin/servicios": {
    eyebrow: "OPERACIÓN",
    title: "Servicios",
  },
  "/admin/fidelizacion": {
    eyebrow: "CRECIMIENTO",
    title: "Fidelización",
  },
  "/admin/referidos": {
    eyebrow: "CRECIMIENTO",
    title: "Referidos",
  },
  "/admin/analytics": {
    eyebrow: "INTELIGENCIA",
    title: "Analytics",
  },
  "/admin/configuracion": {
    eyebrow: "SISTEMA",
    title: "Configuración",
  },
};

function getPageMeta(pathname: string) {
  if (pageMeta[pathname]) {
    return pageMeta[pathname];
  }

  const match = Object.keys(pageMeta)
    .filter(
      (item) =>
        item !== "/admin" &&
        pathname.startsWith(item)
    )
    .sort((a, b) => b.length - a.length)[0];

  return match
    ? pageMeta[match]
    : {
        eyebrow: "BARBEROS",
        title: "Workspace",
      };
}

type Notification = {
  id: string;
  title: string;
  detail: string;
  time: string;
  unread: boolean;
};

function formatWhen(iso: string) {
  const date = new Date(iso);
  const now = new Date();

  const sameDay =
    date.toDateString() === now.toDateString();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const isTomorrow =
    date.toDateString() === tomorrow.toDateString();

  const time = date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (sameDay) return `Hoy ${time}`;

  if (isTomorrow) return `Mañana ${time}`;

  return `${date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
  })} ${time}`;
}

function minutesUntil(iso: string) {
  const diffMs =
    new Date(iso).getTime() - Date.now();

  const minutes = Math.max(
    0,
    Math.round(diffMs / 60000)
  );

  if (minutes < 60) {
    return `En ${minutes} min`;
  }

  return `En ${Math.round(minutes / 60)} h`;
}

export default function Topbar() {
  const pathname = usePathname();
  const { collapsed } = useAdminShell();

  const meta = getPageMeta(pathname);

  const [scrolled, setScrolled] =
    useState(false);

  const [notificationsOpen, setNotificationsOpen] =
    useState(false);

  const [profileOpen, setProfileOpen] =
    useState(false);

  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [shopName, setShopName] =
    useState("Don Segundo");

  const [shopPhoto, setShopPhoto] =
    useState<string | null>(null);

  /*
   * IMPORTANTE:
   * Fallback real del administrador.
   * Si Supabase devuelve full_name, usamos ese.
   * Si no, usamos Manuel Cladera.
   */
  const [adminName, setAdminName] =
    useState("Manuel Cladera");

  const firstName =
    adminName.trim().split(" ")[0] ||
    "Manuel";

  /* ============================================================
     LOAD WORKSPACE + USER
  ============================================================ */

  useEffect(() => {
    const supabase = createClient();

    let active = true;

    async function loadWorkspace() {
      const [settingsRes, userRes] =
        await Promise.all([
          supabase
            .from("barbershop_settings")
            .select("name, logo_url")
            .limit(1)
            .maybeSingle(),

          supabase.auth.getUser(),
        ]);

      if (!active) return;

      if (settingsRes.data) {
        if (settingsRes.data.name) {
          setShopName(settingsRes.data.name);
        }

        setShopPhoto(
          settingsRes.data.logo_url ?? null
        );
      }

      const user = userRes.data.user;

      if (user) {
        const metadata =
          user.user_metadata ?? {};

        const metadataName =
          typeof metadata.full_name === "string"
            ? metadata.full_name
            : typeof metadata.name === "string"
              ? metadata.name
              : null;

        /*
         * No usamos el email como nombre visual.
         */
        if (metadataName?.trim()) {
          setAdminName(metadataName.trim());
        } else {
          setAdminName("Manuel Cladera");
        }
      }
    }

    async function loadNotifications() {
      const now = new Date();

      const soonLimit = new Date(
        now.getTime() +
          3 * 60 * 60 * 1000
      ).toISOString();

      const columns =
        "id, start_at, status, customer:customers (full_name), service:services (name)";

      const [
        pendingRes,
        upcomingRes,
      ] = await Promise.all([
        supabase
          .from("appointments")
          .select(columns)
          .eq("status", "pending")
          .gte(
            "start_at",
            now.toISOString()
          )
          .order("start_at", {
            ascending: true,
          })
          .limit(5),

        supabase
          .from("appointments")
          .select(columns)
          .eq("status", "confirmed")
          .gte(
            "start_at",
            now.toISOString()
          )
          .lte(
            "start_at",
            soonLimit
          )
          .order("start_at", {
            ascending: true,
          })
          .limit(5),
      ]);

      if (!active) return;

      type Row = {
        id: string;
        start_at: string;
        customer:
          | {
              full_name: string;
            }
          | null;
        service:
          | {
              name: string;
            }
          | null;
      };

      const pending =
        ((pendingRes.data ?? []) as unknown as Row[]).map(
          (row): Notification => ({
            id: `pending-${row.id}`,
            title:
              "Turno pendiente de confirmar",
            detail: `${
              row.customer?.full_name ??
              "Cliente"
            } · ${
              row.service?.name ??
              "Servicio"
            }`,
            time: formatWhen(
              row.start_at
            ),
            unread: true,
          })
        );

      const upcoming =
        ((upcomingRes.data ?? []) as unknown as Row[]).map(
          (row): Notification => ({
            id: `soon-${row.id}`,
            title: "Turno próximo",
            detail: `${
              row.customer?.full_name ??
              "Cliente"
            } · ${
              row.service?.name ??
              "Servicio"
            }`,
            time: minutesUntil(
              row.start_at
            ),
            unread: false,
          })
        );

      setNotifications(
        [...pending, ...upcoming].slice(
          0,
          8
        )
      );
    }

    loadWorkspace();
    loadNotifications();

    function onLogoUpdated(
      event: Event
    ) {
      const detail =
        (
          event as CustomEvent<{
            logoUrl:
              | string
              | null;
          }>
        ).detail;

      setShopPhoto(
        detail?.logoUrl ?? null
      );
    }

    window.addEventListener(
      "barberos:workspace-logo-updated",
      onLogoUpdated
    );

    return () => {
      active = false;

      window.removeEventListener(
        "barberos:workspace-logo-updated",
        onLogoUpdated
      );
    };
  }, []);

  /* ============================================================
     SCROLL
  ============================================================ */

  useEffect(() => {
    const onScroll = () => {
      setScrolled(
        window.scrollY > 8
      );
    };

    onScroll();

    window.addEventListener(
      "scroll",
      onScroll,
      { passive: true }
    );

    return () => {
      window.removeEventListener(
        "scroll",
        onScroll
      );
    };
  }, []);

  /* ============================================================
     CLOSE MENUS
  ============================================================ */

  useEffect(() => {
    const closeMenus = (
      event: MouseEvent
    ) => {
      const target =
        event.target as HTMLElement;

      if (
        !target.closest(
          "[data-topbar-notifications]"
        )
      ) {
        setNotificationsOpen(false);
      }

      if (
        !target.closest(
          "[data-topbar-profile]"
        )
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      closeMenus
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        closeMenus
      );
    };
  }, []);

  const unreadCount =
    notifications.filter(
      (notification) =>
        notification.unread
    ).length;

  function openNotifications() {
    setProfileOpen(false);

    setNotificationsOpen(
      (value) => !value
    );
  }

  function openProfile() {
    setNotificationsOpen(false);

    setProfileOpen(
      (value) => !value
    );
  }

  function markNotificationsRead() {
    setNotifications(
      (current) =>
        current.map(
          (notification) => ({
            ...notification,
            unread: false,
          })
        )
    );
  }

  return (
    <header
      className={[
        "fixed top-0 right-0 z-30 h-[72px]",
        "transition-[left,background-color,backdrop-filter,box-shadow]",
        "duration-300 ease-out",
        collapsed
          ? "lg:left-[76px]"
          : "lg:left-[240px]",
        scrolled
          ? "bg-[#050505]/65 backdrop-blur-2xl shadow-[0_16px_50px_rgba(0,0,0,.28)]"
          : "bg-transparent",
      ].join(" ")}
    >
      {/* ========================================================
          SUBTLE ORANGE ATMOSPHERE
      ======================================================== */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="
            absolute
            right-[8%]
            top-[-260px]
            h-[420px]
            w-[600px]
            rounded-full
            bg-[radial-gradient(ellipse,rgba(255,90,0,0.065)_0%,rgba(255,90,0,0.025)_35%,transparent_72%)]
          "
        />
      </div>

      {/* ========================================================
          CONTENT
      ======================================================== */}

      <div className="relative flex h-full items-center justify-between px-5 sm:px-7 lg:px-9">

        {/* ======================================================
            LEFT
        ====================================================== */}

        <div className="min-w-0">

          <div className="flex items-center gap-2">
            <span
              className="
                font-[family:var(--font-barberos-ui)]
                text-[8px]
                font-semibold
                uppercase
                tracking-[0.20em]
                text-white/25
              "
            >
              {meta.eyebrow}
            </span>

            <ChevronRight
              size={9}
              strokeWidth={1.4}
              className="text-white/12"
            />

            <span
              className="
                truncate
                font-[family:var(--font-barberos-ui)]
                text-[8px]
                font-semibold
                uppercase
                tracking-[0.20em]
                text-[#ff6a18]
              "
            >
              {shopName}
            </span>
          </div>

          <p
            className={[
              navFont.className,
              "mt-1 text-[13px] font-medium tracking-[-0.006em] text-white/82",
            ].join(" ")}
          >
            Hola, {adminName} · bienvenido
          </p>
        </div>

        {/* ======================================================
            RIGHT
        ====================================================== */}

        <div className="flex items-center gap-1">

          {/* Analytics / Intelligence */}

          <Link
            href="/admin/analytics"
            aria-label="Abrir Analytics"
            title="Analytics"
            className="
              hidden
              h-10
              w-10
              items-center
              justify-center
              rounded-[11px]
              text-white/38
              transition-all
              duration-200
              hover:bg-white/[0.035]
              hover:text-[#ff6a18]
              sm:flex
            "
          >
            <Sparkles
              size={17}
              strokeWidth={1.45}
            />
          </Link>

          {/* Notifications */}

          <div
            className="relative"
            data-topbar-notifications
          >
            <button
              type="button"
              onClick={
                openNotifications
              }
              aria-label="Notificaciones"
              aria-expanded={
                notificationsOpen
              }
              className={[
                "relative flex h-10 w-10 items-center justify-center rounded-[11px]",
                "font-[family:var(--font-barberos-ui)]",
                "text-white/40 transition-all duration-200",
                "hover:bg-white/[0.035] hover:text-white/85",
                notificationsOpen
                  ? "bg-white/[0.05] text-white"
                  : "",
              ].join(" ")}
            >
              <Bell
                size={17}
                strokeWidth={1.45}
              />

              {unreadCount > 0 && (
                <span
                  className="
                    absolute
                    right-[8px]
                    top-[7px]
                    flex
                    h-[6px]
                    w-[6px]
                    rounded-full
                    bg-[#ff5a00]
                    shadow-[0_0_10px_rgba(255,90,0,.65)]
                  "
                />
              )}
            </button>

            {notificationsOpen && (
              <div
                className="
                  absolute
                  right-0
                  top-[54px]
                  w-[340px]
                  overflow-hidden
                  rounded-[17px]
                  border
                  border-white/[0.075]
                  bg-[#0a0a0a]/95
                  shadow-[0_30px_90px_rgba(0,0,0,.65)]
                  backdrop-blur-2xl
                "
              >
                <div className="flex items-center justify-between px-4 py-4">
                  <div>
                    <p className="font-[family:var(--font-barberos-ui)] text-[13px] font-semibold text-white/90">
                      Notificaciones
                    </p>

                    <p className="mt-1 font-[family:var(--font-barberos-ui)] text-[10px] text-white/30">
                      Actividad reciente
                    </p>
                  </div>

                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={
                        markNotificationsRead
                      }
                      className="
                        font-[family:var(--font-barberos-ui)]
                        text-[10px]
                        font-medium
                        text-[#ff6a18]
                        hover:text-[#ff8540]
                      "
                    >
                      Marcar leídas
                    </button>
                  )}
                </div>

                <div className="max-h-[310px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-5 py-10 text-center">
                      <CheckCircle2
                        size={22}
                        strokeWidth={1.3}
                        className="mx-auto text-[#20d68a]"
                      />

                      <p className="mt-3 font-[family:var(--font-barberos-ui)] text-[11px] font-medium text-white/50">
                        Todo tranquilo
                      </p>

                      <p className="mt-1 font-[family:var(--font-barberos-ui)] text-[10px] leading-4 text-white/25">
                        No hay nuevas
                        notificaciones.
                      </p>
                    </div>
                  ) : (
                    notifications.map(
                      (notification) => (
                        <div
                          key={
                            notification.id
                          }
                          className="
                            flex
                            gap-3
                            px-4
                            py-3.5
                            transition
                            hover:bg-white/[0.025]
                          "
                        >
                          <span
                            className={[
                              "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                              notification.unread
                                ? "bg-[#ff5a00]"
                                : "bg-white/15",
                            ].join(" ")}
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <p className="font-[family:var(--font-barberos-ui)] text-[11px] font-medium text-white/75">
                                {
                                  notification.title
                                }
                              </p>

                              <span className="shrink-0 font-[family:var(--font-barberos-ui)] text-[9px] text-white/25">
                                {
                                  notification.time
                                }
                              </span>
                            </div>

                            <p className="mt-1 font-[family:var(--font-barberos-ui)] text-[10px] leading-4 text-white/35">
                              {
                                notification.detail
                              }
                            </p>
                          </div>
                        </div>
                      )
                    )
                  )}
                </div>

                <Link
                  href="/admin/turnos"
                  onClick={() =>
                    setNotificationsOpen(
                      false
                    )
                  }
                  className="
                    flex
                    items-center
                    justify-between
                    bg-white/[0.018]
                    px-4
                    py-3.5
                    font-[family:var(--font-barberos-ui)]
                    text-[10px]
                    font-medium
                    text-white/45
                    transition
                    hover:bg-white/[0.035]
                    hover:text-white/75
                  "
                >
                  <span>
                    Ver agenda
                  </span>

                  <ChevronRight
                    size={13}
                  />
                </Link>
              </div>
            )}
          </div>

          {/* ====================================================
              PROFILE
          ==================================================== */}

          <div
            className="relative ml-1"
            data-topbar-profile
          >
            <button
              type="button"
              onClick={openProfile}
              aria-expanded={
                profileOpen
              }
              aria-label="Abrir perfil"
              className={[
                "group flex h-[48px] items-center gap-2.5 rounded-[13px] px-2",
                "transition-all duration-200",
                "hover:bg-white/[0.035]",
                profileOpen
                  ? "bg-white/[0.045]"
                  : "",
              ].join(" ")}
            >
              {/* Avatar */}

              <div className="relative">
                <div
                  className="
                    relative
                    h-[34px]
                    w-[34px]
                    overflow-hidden
                    rounded-full
                    border
                    border-white/[0.10]
                    bg-[#101010]
                  "
                >
                  {shopPhoto ? (
                    <img
                      src={shopPhoto}
                      alt={`Logo de ${shopName}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src="/brand/barberos-mark.png"
                      alt="barberOS"
                      className="h-full w-full object-contain p-[5px]"
                    />
                  )}
                </div>

                <span
                  className="
                    absolute
                    bottom-[-1px]
                    right-[-1px]
                    h-[8px]
                    w-[8px]
                    rounded-full
                    border-2
                    border-[#050505]
                    bg-[#20d68a]
                  "
                />
              </div>

              {/* Name */}

              <div className="hidden text-left sm:block">
                <p
                  className={[
                    navFont.className,
                    "text-[11px] font-semibold tracking-[-0.006em] text-white/88",
                  ].join(" ")}
                >
                  {adminName}
                </p>

                <p
                  className={[
                    navFont.className,
                    "mt-0.5 text-[10px] font-medium text-white/48",
                  ].join(" ")}
                >
                  Administrador
                </p>
              </div>

              <ChevronDown
                size={12}
                strokeWidth={1.4}
                className={[
                  "hidden text-white/25 transition-transform duration-200 sm:block",
                  profileOpen
                    ? "rotate-180"
                    : "",
                ].join(" ")}
              />
            </button>

            {/* ==================================================
                PROFILE MENU
            ================================================== */}

            {profileOpen && (
              <div
                className="
                  absolute
                  right-0
                  top-[56px]
                  w-[270px]
                  overflow-hidden
                  rounded-[17px]
                  border
                  border-white/[0.075]
                  bg-[#0a0a0a]/96
                  shadow-[0_30px_90px_rgba(0,0,0,.65)]
                  backdrop-blur-2xl
                "
              >
                {/* Identity */}

                <div className="p-3">
                  <div
                    className="
                      flex
                      items-center
                      gap-3
                      rounded-[12px]
                      bg-white/[0.025]
                      p-3
                    "
                  >
                    <div className="relative">
                      <div
                        className="
                          relative
                          h-[42px]
                          w-[42px]
                          overflow-hidden
                          rounded-full
                          border
                          border-white/[0.10]
                          bg-[#111]
                        "
                      >
                        {shopPhoto ? (
                          <img
                            src={shopPhoto}
                            alt={`Logo de ${shopName}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <img
                            src="/brand/barberos-mark.png"
                            alt="barberOS"
                            className="h-full w-full object-contain p-[6px]"
                          />
                        )}
                      </div>

                      <span
                        className="
                          absolute
                          bottom-0
                          right-0
                          h-2.5
                          w-2.5
                          rounded-full
                          border-2
                          border-[#111]
                          bg-[#20d68a]
                        "
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-[family:var(--font-barberos-ui)] text-[13px] font-semibold text-white/92">
                        Hola, {firstName}
                      </p>

                      <p className="mt-1 truncate font-[family:var(--font-barberos-ui)] text-[9px] text-white/35">
                        {adminName}
                      </p>

                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#20d68a]" />

                        <span className="font-[family:var(--font-barberos-ui)] text-[9px] text-[#20d68a]/80">
                          En línea
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  <Link
                    href="/admin/configuracion"
                    onClick={() =>
                      setProfileOpen(false)
                    }
                    className="
                      flex
                      items-center
                      gap-3
                      rounded-[11px]
                      px-3
                      py-2.5
                      font-[family:var(--font-barberos-ui)]
                      text-[11px]
                      font-medium
                      text-white/55
                      transition
                      hover:bg-white/[0.035]
                      hover:text-white/90
                    "
                  >
                    <Settings2
                      size={15}
                      strokeWidth={1.5}
                    />

                    Configuración
                  </Link>

                  <Link
                    href="/admin/configuracion#cuenta"
                    onClick={() =>
                      setProfileOpen(false)
                    }
                    className="
                      flex
                      items-center
                      gap-3
                      rounded-[11px]
                      px-3
                      py-2.5
                      font-[family:var(--font-barberos-ui)]
                      text-[11px]
                      font-medium
                      text-white/55
                      transition
                      hover:bg-white/[0.035]
                      hover:text-white/90
                    "
                  >
                    <UserRound
                      size={15}
                      strokeWidth={1.5}
                    />

                    Mi cuenta
                  </Link>

                  <Link
                    href="/admin/turnos"
                    onClick={() =>
                      setProfileOpen(false)
                    }
                    className="
                      flex
                      items-center
                      gap-3
                      rounded-[11px]
                      px-3
                      py-2.5
                      font-[family:var(--font-barberos-ui)]
                      text-[11px]
                      font-medium
                      text-white/55
                      transition
                      hover:bg-white/[0.035]
                      hover:text-white/90
                    "
                  >
                    <CalendarDays
                      size={15}
                      strokeWidth={1.5}
                    />

                    Agenda
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
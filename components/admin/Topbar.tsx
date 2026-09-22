"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Settings2,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAdminShell } from "./AdminShellContext";
import { createClient } from "@/lib/supabase/client";

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
   * Nombre visible del administrador.
   *
   * No usamos el email como fallback visual.
   * Para este workspace el administrador es Manuel Cladera.
   */
  const adminName = "Manuel Cladera";

  const firstName = "Manuel";

  useEffect(() => {
    const supabase = createClient();

    let active = true;

    async function loadWorkspace() {
      const { data } = await supabase
        .from("barbershop_settings")
        .select("name, logo_url")
        .limit(1)
        .maybeSingle();

      if (!active) return;

      if (data) {
        if (data.name) {
          setShopName(data.name);
        }

        setShopPhoto(data.logo_url ?? null);
      }
    }

    async function loadNotifications() {
      const now = new Date();

      const soonLimit = new Date(
        now.getTime() + 3 * 60 * 60 * 1000
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
          .lte("start_at", soonLimit)
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
            title: "Turno pendiente de confirmar",
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

    function onLogoUpdated(event: Event) {
      const detail = (
        event as CustomEvent<{
          logoUrl: string | null;
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
        "fixed left-0 right-0 top-0 z-40 h-[72px]",
        "transition-[left] duration-300 ease-out",
        collapsed
          ? "lg:left-[82px]"
          : "lg:left-[270px]",
      ].join(" ")}
      style={{
        fontFamily:
          "var(--font-barberos-ui, Manrope, Inter, sans-serif)",
      }}
    >
      {/* ====================================================== */}
      {/* ATMÓSFERA                                               */}
      {/* ====================================================== */}

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-0
          overflow-hidden
        "
      >
        <div
          className="
            absolute
            right-[10%]
            top-[-190px]
            h-[340px]
            w-[500px]
            rounded-full
            bg-[radial-gradient(ellipse,rgba(255,90,0,0.035),transparent_70%)]
          "
        />

        <div
          className="
            absolute
            left-[22%]
            top-0
            h-[1px]
            w-[300px]
            bg-gradient-to-r
            from-transparent
            via-[#ff6a00]/[0.06]
            to-transparent
          "
        />
      </div>

      {/* ====================================================== */}
      {/* CONTENIDO                                               */}
      {/* ====================================================== */}

      <div
        className="
          relative
          flex
          h-full
          items-center
          justify-between
          px-5
          sm:px-7
          lg:px-9
        "
      >
        {/* ==================================================== */}
        {/* LEFT                                                  */}
        {/* ==================================================== */}

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="
                text-[9px]
                font-semibold
                uppercase
                tracking-[0.18em]
                text-white/25
              "
            >
              {meta.eyebrow}
            </span>

            <ChevronRight
              size={10}
              strokeWidth={1.5}
              className="text-white/12"
            />

            <span
              className="
                truncate
                text-[9px]
                font-semibold
                uppercase
                tracking-[0.18em]
                text-[#ff6a18]
              "
            >
              {shopName}
            </span>
          </div>

          <p
            className="
              mt-[5px]
              text-[13px]
              font-medium
              tracking-[-0.02em]
              text-white/78
            "
          >
            Hola, {firstName} · bienvenido
          </p>
        </div>

        {/* ==================================================== */}
        {/* RIGHT                                                 */}
        {/* ==================================================== */}

        <div className="flex items-center gap-1">
          {/* ANALYTICS */}

          <Link
            href="/admin/analytics"
            aria-label="Ir a Analytics"
            title="Analytics"
            className="
              hidden
              h-10
              w-10
              items-center
              justify-center
              rounded-[12px]
              text-white/35
              transition-all
              duration-200
              hover:bg-white/[0.035]
              hover:text-[#ff6a18]
              sm:flex
            "
          >
            <Sparkles
              size={16}
              strokeWidth={1.55}
            />
          </Link>

          {/* NOTIFICATIONS */}

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
                "relative flex h-10 w-10 items-center justify-center rounded-[12px]",
                "text-white/35 transition-all duration-200",
                "hover:bg-white/[0.035] hover:text-white/80",
                notificationsOpen
                  ? "bg-white/[0.045] text-white/80"
                  : "",
              ].join(" ")}
            >
              <Bell
                size={16}
                strokeWidth={1.5}
              />

              {unreadCount > 0 ? (
                <span
                  className="
                    absolute
                    right-[7px]
                    top-[6px]
                    flex
                    h-[15px]
                    min-w-[15px]
                    items-center
                    justify-center
                    rounded-full
                    bg-[#ff5a00]
                    px-1
                    text-[8px]
                    font-bold
                    leading-none
                    text-white
                    shadow-[0_0_12px_rgba(255,90,0,.22)]
                  "
                >
                  {unreadCount}
                </span>
              ) : (
                <span
                  className="
                    absolute
                    right-[8px]
                    top-[7px]
                    h-[5px]
                    w-[5px]
                    rounded-full
                    bg-[#ff6a18]
                  "
                />
              )}
            </button>

            {notificationsOpen && (
              <div
                className="
                  absolute
                  right-0
                  top-[48px]
                  w-[340px]
                  overflow-hidden
                  rounded-[18px]
                  border
                  border-white/[0.07]
                  bg-[#0A0A0A]
                  shadow-[0_28px_80px_rgba(0,0,0,.55)]
                "
              >
                {/* HEADER */}

                <div
                  className="
                    flex
                    items-center
                    justify-between
                    px-4
                    py-4
                  "
                >
                  <div>
                    <p
                      className="
                        text-[13px]
                        font-semibold
                        tracking-[-0.015em]
                        text-white/90
                      "
                    >
                      Notificaciones
                    </p>

                    <p
                      className="
                        mt-1
                        text-[10px]
                        text-white/30
                      "
                    >
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
                        text-[10px]
                        font-medium
                        text-[#ff6a18]
                        transition
                        hover:text-[#ff8540]
                      "
                    >
                      Marcar leídas
                    </button>
                  )}
                </div>

                {/* LIST */}

                <div className="max-h-[310px] overflow-y-auto">
                  {notifications.length ===
                  0 ? (
                    <div className="px-5 py-9 text-center">
                      <Bell
                        size={20}
                        strokeWidth={1.3}
                        className="mx-auto text-white/15"
                      />

                      <p
                        className="
                          mt-3
                          text-[11px]
                          font-medium
                          text-white/45
                        "
                      >
                        Todo tranquilo
                      </p>

                      <p
                        className="
                          mt-1
                          text-[10px]
                          leading-4
                          text-white/25
                        "
                      >
                        No hay turnos pendientes
                        ni próximos.
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
                          <div
                            className={[
                              "mt-[6px] h-2 w-2 shrink-0 rounded-full",
                              notification.unread
                                ? "bg-[#ff6a18]"
                                : "bg-white/12",
                            ].join(" ")}
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <p
                                className="
                                  text-[11px]
                                  font-medium
                                  leading-4
                                  text-white/75
                                "
                              >
                                {
                                  notification.title
                                }
                              </p>

                              <span
                                className="
                                  shrink-0
                                  text-[9px]
                                  text-white/22
                                "
                              >
                                {
                                  notification.time
                                }
                              </span>
                            </div>

                            <p
                              className="
                                mt-1
                                text-[10px]
                                leading-4
                                text-white/32
                              "
                            >
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

                {/* FOOTER */}

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
                    border-t
                    border-white/[0.045]
                    px-4
                    py-3
                    text-[10px]
                    font-medium
                    text-white/35
                    transition
                    hover:bg-white/[0.025]
                    hover:text-white/70
                  "
                >
                  <span>
                    Ver agenda completa
                  </span>

                  <ChevronRight
                    size={13}
                    strokeWidth={1.5}
                  />
                </Link>
              </div>
            )}
          </div>

          {/* PROFILE */}

          <div
            className="relative ml-1"
            data-topbar-profile
          >
            <button
              type="button"
              onClick={openProfile}
              aria-expanded={profileOpen}
              aria-label="Abrir menú de Manuel Cladera"
              className={[
                "group flex h-[48px] items-center gap-2.5 rounded-[14px] px-1.5",
                "transition-all duration-200",
                "hover:bg-white/[0.028]",
                profileOpen
                  ? "bg-white/[0.04]"
                  : "",
              ].join(" ")}
            >
              {/* FOTO */}

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
                    bg-[#111]
                  "
                >
                  <Image
                    src={
                      shopPhoto ||
                      "/brand/barberos-mark.png"
                    }
                    alt="Manuel Cladera"
                    fill
                    sizes="34px"
                    unoptimized={Boolean(
                      shopPhoto
                    )}
                    className={
                      shopPhoto
                        ? "object-cover"
                        : "object-contain p-[5px]"
                    }
                  />
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
                    bg-[#20D68A]
                  "
                />
              </div>

              {/* USER INFO */}

              <div className="hidden text-left sm:block">
                <p
                  className="
                    text-[11px]
                    font-semibold
                    tracking-[-0.015em]
                    text-white/82
                  "
                >
                  Manuel Cladera
                </p>

                <div className="mt-[3px] flex items-center gap-1.5">
                  <span
                    className="
                      max-w-[110px]
                      truncate
                      text-[9px]
                      text-white/30
                    "
                  >
                    {shopName}
                  </span>

                  <span className="text-white/12">
                    ·
                  </span>

                  <span
                    className="
                      text-[9px]
                      text-white/30
                    "
                  >
                    Admin
                  </span>
                </div>
              </div>

              <ChevronDown
                size={12}
                strokeWidth={1.45}
                className={[
                  "hidden text-white/22 transition-transform duration-200 sm:block",
                  profileOpen
                    ? "rotate-180"
                    : "",
                ].join(" ")}
              />
            </button>

            {/* PROFILE MENU */}

            {profileOpen && (
              <div
                className="
                  absolute
                  right-0
                  top-[54px]
                  w-[285px]
                  overflow-hidden
                  rounded-[18px]
                  border
                  border-white/[0.075]
                  bg-[#0A0A0A]
                  shadow-[0_30px_90px_rgba(0,0,0,.60)]
                "
              >
                {/* IDENTITY */}

                <div className="p-3">
                  <div
                    className="
                      flex
                      items-center
                      gap-3
                      rounded-[13px]
                      bg-white/[0.025]
                      p-3
                    "
                  >
                    <div className="relative">
                      <div
                        className="
                          relative
                          h-[44px]
                          w-[44px]
                          overflow-hidden
                          rounded-full
                          border
                          border-white/[0.10]
                          bg-[#111]
                        "
                      >
                        <Image
                          src={
                            shopPhoto ||
                            "/brand/barberos-mark.png"
                          }
                          alt="Manuel Cladera"
                          fill
                          sizes="44px"
                          unoptimized={Boolean(
                            shopPhoto
                          )}
                          className={
                            shopPhoto
                              ? "object-cover"
                              : "object-contain p-[6px]"
                          }
                        />
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
                          bg-[#20D68A]
                        "
                      />
                    </div>

                    <div className="min-w-0">
                      <p
                        className="
                          truncate
                          text-[13px]
                          font-semibold
                          tracking-[-0.015em]
                          text-white/90
                        "
                      >
                        Manuel Cladera
                      </p>

                      <p
                        className="
                          mt-1
                          truncate
                          text-[9px]
                          text-white/30
                        "
                      >
                        Administrador ·{" "}
                        {shopName}
                      </p>

                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#20D68A]" />

                        <span
                          className="
                            text-[9px]
                            font-medium
                            text-[#20D68A]/75
                          "
                        >
                          En línea
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* MENU */}

                <div className="px-2 pb-2">
                  <Link
                    href="/admin/configuracion"
                    onClick={() =>
                      setProfileOpen(
                        false
                      )
                    }
                    className="
                      flex
                      items-center
                      gap-3
                      rounded-[11px]
                      px-3
                      py-2.5
                      text-[11px]
                      font-medium
                      text-white/50
                      transition
                      hover:bg-white/[0.035]
                      hover:text-white/85
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
                      setProfileOpen(
                        false
                      )
                    }
                    className="
                      flex
                      items-center
                      gap-3
                      rounded-[11px]
                      px-3
                      py-2.5
                      text-[11px]
                      font-medium
                      text-white/50
                      transition
                      hover:bg-white/[0.035]
                      hover:text-white/85
                    "
                  >
                    <UserRound
                      size={15}
                      strokeWidth={1.5}
                    />

                    Mi cuenta
                  </Link>

                  <Link
                    href="/admin/analytics"
                    onClick={() =>
                      setProfileOpen(
                        false
                      )
                    }
                    className="
                      flex
                      items-center
                      gap-3
                      rounded-[11px]
                      px-3
                      py-2.5
                      text-[11px]
                      font-medium
                      text-white/50
                      transition
                      hover:bg-white/[0.035]
                      hover:text-white/85
                    "
                  >
                    <Sparkles
                      size={15}
                      strokeWidth={1.5}
                    />

                    Analytics
                  </Link>
                </div>

                {/* SESSION */}

                <div
                  className="
                    flex
                    items-center
                    justify-between
                    bg-white/[0.018]
                    px-4
                    py-3
                  "
                >
                  <span
                    className="
                      text-[9px]
                      font-medium
                      text-white/25
                    "
                  >
                    Sesión activa
                  </span>

                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#20D68A]" />

                    <span
                      className="
                        text-[9px]
                        text-white/25
                      "
                    >
                      Segura
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
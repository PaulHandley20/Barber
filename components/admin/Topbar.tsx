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
  id: number;
  title: string;
  detail: string;
  time: string;
  unread: boolean;
};

const initialNotifications: Notification[] = [
  {
    id: 1,
    title: "Centro de notificaciones activo",
    detail: "Las novedades importantes aparecerán acá.",
    time: "Ahora",
    unread: false,
  },
];

export default function Topbar() {
  const pathname = usePathname();

  const meta = getPageMeta(pathname);

  const [notificationsOpen, setNotificationsOpen] =
    useState(false);

  const [profileOpen, setProfileOpen] =
    useState(false);

  const [notifications, setNotifications] =
    useState(initialNotifications);

  useEffect(() => {
    const closeMenus = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (
        !target.closest("[data-topbar-notifications]")
      ) {
        setNotificationsOpen(false);
      }

      if (!target.closest("[data-topbar-profile]")) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", closeMenus);

    return () => {
      document.removeEventListener(
        "mousedown",
        closeMenus
      );
    };
  }, []);

  const unreadCount = notifications.filter(
    (notification) => notification.unread
  ).length;

  function openNotifications() {
    setProfileOpen(false);
    setNotificationsOpen((value) => !value);
  }

  function openProfile() {
    setNotificationsOpen(false);
    setProfileOpen((value) => !value);
  }

  function markNotificationsRead() {
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        unread: false,
      }))
    );
  }

  return (
    <header
      className="
        fixed
        left-0
        right-0
        top-0
        z-40
        h-[76px]
        bg-transparent
      "
    >
      {/* ========================================================= */}
      {/* TOPBAR ATMOSPHERE                                         */}
      {/* ========================================================= */}

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
            right-[8%]
            top-[-180px]
            h-[360px]
            w-[520px]
            rounded-full
            bg-[radial-gradient(ellipse,rgba(255,90,0,0.035),transparent_68%)]
            blur-[25px]
          "
        />

        <div
          className="
            absolute
            left-[18%]
            top-0
            h-px
            w-[420px]
            bg-gradient-to-r
            from-transparent
            via-[#ff5a00]/[0.10]
            to-transparent
          "
        />
      </div>

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
        {/* ======================================================= */}
        {/* LEFT                                                    */}
        {/* ======================================================= */}

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="
                text-[8px]
                font-semibold
                uppercase
                tracking-[0.20em]
                text-white/28
              "
            >
              {meta.eyebrow}
            </span>

            <ChevronRight
              size={10}
              strokeWidth={1.5}
              className="text-white/14"
            />

            <span
              className="
                truncate
                text-[8px]
                font-semibold
                uppercase
                tracking-[0.20em]
                text-[#ff6a18]
              "
            >
              DON SEGUNDO
            </span>
          </div>

          <div className="mt-1">
            <p
              className="
                text-[14px]
                font-semibold
                tracking-[-0.025em]
                text-white/90
              "
              style={{
                fontFamily:
                  "var(--font-barberos-ui, Inter, sans-serif)",
              }}
            >
              Hola, Manuel · bienvenido
            </p>
          </div>
        </div>

        {/* ======================================================= */}
        {/* RIGHT ACTIONS                                           */}
        {/* ======================================================= */}

        <div className="flex items-center gap-1.5">
          {/* Assistant */}
          <button
            type="button"
            aria-label="Asistente"
            className="
              hidden
              h-10
              items-center
              gap-2
              rounded-[11px]
              px-3
              text-white/40
              transition
              hover:bg-white/[0.028]
              hover:text-[#ff6a18]
              sm:flex
            "
          >
            <Sparkles
              size={16}
              strokeWidth={1.5}
            />

            <span
              className="
                text-[11px]
                font-medium
              "
            >
              Asistente
            </span>
          </button>

          {/* Notifications */}
          <div
            className="relative"
            data-topbar-notifications
          >
            <button
              type="button"
              onClick={openNotifications}
              aria-label="Notificaciones"
              aria-expanded={notificationsOpen}
              className={[
                "relative flex h-10 w-10 items-center justify-center rounded-[11px]",
                "text-white/42 transition-all duration-200",
                "hover:bg-white/[0.035] hover:text-white/82",
                notificationsOpen
                  ? "bg-white/[0.05] text-white"
                  : "",
              ].join(" ")}
            >
              <Bell
                size={17}
                strokeWidth={1.55}
              />

              {unreadCount > 0 ? (
                <span
                  className="
                    absolute
                    right-[8px]
                    top-[7px]
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
                    shadow-[0_0_14px_rgba(255,90,0,.24)]
                  "
                >
                  {unreadCount}
                </span>
              ) : (
                <span
                  className="
                    absolute
                    right-[9px]
                    top-[8px]
                    h-[5px]
                    w-[5px]
                    rounded-full
                    bg-[#ff5a00]
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
                  w-[330px]
                  overflow-hidden
                  rounded-[16px]
                  border
                  border-white/[0.075]
                  bg-[#0B0B0B]/95
                  shadow-[0_28px_80px_rgba(0,0,0,.58)]
                  backdrop-blur-2xl
                "
              >
                <div
                  className="
                    flex
                    items-center
                    justify-between
                    border-b
                    border-white/[0.055]
                    px-4
                    py-3.5
                  "
                >
                  <div>
                    <p className="text-[13px] font-semibold text-white/90">
                      Notificaciones
                    </p>

                    <p className="mt-0.5 text-[10px] text-white/32">
                      Actividad del workspace
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={markNotificationsRead}
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
                </div>

                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.map(
                    (notification) => (
                      <div
                        key={notification.id}
                        className="
                          flex
                          gap-3
                          border-b
                          border-white/[0.045]
                          px-4
                          py-3.5
                          last:border-b-0
                        "
                      >
                        <div
                          className={[
                            "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                            notification.unread
                              ? "bg-[#ff5a00]"
                              : "bg-white/15",
                          ].join(" ")}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-[11px] font-medium text-white/78">
                              {notification.title}
                            </p>

                            <span className="shrink-0 text-[9px] text-white/25">
                              {notification.time}
                            </span>
                          </div>

                          <p className="mt-1 text-[10px] leading-4 text-white/38">
                            {notification.detail}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>

                <Link
                  href="/admin/turnos"
                  onClick={() =>
                    setNotificationsOpen(false)
                  }
                  className="
                    flex
                    items-center
                    justify-between
                    bg-white/[0.018]
                    px-4
                    py-3
                    text-[10px]
                    font-medium
                    text-white/48
                    transition
                    hover:bg-white/[0.035]
                    hover:text-white/75
                  "
                >
                  <span>Ir a la agenda</span>
                  <ChevronRight size={13} />
                </Link>
              </div>
            )}
          </div>

          {/* Profile */}
          <div
            className="relative ml-1"
            data-topbar-profile
          >
            <button
              type="button"
              onClick={openProfile}
              aria-expanded={profileOpen}
              aria-label="Abrir menú de perfil"
              className={[
                "group flex h-[48px] items-center gap-2.5 rounded-[13px] px-1.5",
                "transition-all duration-200",
                "hover:bg-white/[0.028]",
                profileOpen
                  ? "bg-white/[0.035]"
                  : "",
              ].join(" ")}
            >
              <div className="relative">
                <div
                  className="
                    relative
                    h-[34px]
                    w-[34px]
                    overflow-hidden
                    rounded-full
                    border
                    border-white/[0.11]
                    bg-[#101010]
                  "
                >
                  <Image
                    src="/brand/barberos-mark.png"
                    alt="Perfil de Manuel Cladera"
                    fill
                    sizes="34px"
                    className="object-contain p-[5px]"
                  />
                </div>

                <span
                  className="
                    absolute
                    bottom-[-1px]
                    right-[-1px]
                    h-[9px]
                    w-[9px]
                    rounded-full
                    border-2
                    border-[#050505]
                    bg-[#20D68A]
                    shadow-[0_0_10px_rgba(32,214,138,.42)]
                  "
                />
              </div>

              <div className="hidden text-left sm:block">
                <p
                  className="
                    text-[11px]
                    font-semibold
                    tracking-[-0.012em]
                    text-white/84
                  "
                >
                  Manuel Cladera
                </p>

                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-[9px] text-white/34">
                    Don Segundo
                  </span>

                  <span className="text-white/14">
                    ·
                  </span>

                  <span className="text-[9px] text-white/34">
                    Admin
                  </span>
                </div>
              </div>

              <ChevronDown
                size={13}
                strokeWidth={1.45}
                className={[
                  "hidden text-white/28 transition-transform duration-200 sm:block",
                  profileOpen
                    ? "rotate-180"
                    : "",
                ].join(" ")}
              />
            </button>

            {profileOpen && (
              <div
                className="
                  absolute
                  right-0
                  top-[54px]
                  w-[270px]
                  overflow-hidden
                  rounded-[16px]
                  border
                  border-white/[0.08]
                  bg-[#0B0B0B]/96
                  shadow-[0_30px_90px_rgba(0,0,0,.62)]
                  backdrop-blur-2xl
                "
              >
                {/* Identity */}
                <div className="p-3.5">
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
                        <Image
                          src="/brand/barberos-mark.png"
                          alt="Perfil de Manuel Cladera"
                          fill
                          sizes="42px"
                          className="object-contain p-[6px]"
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
                      <p className="truncate text-[12px] font-semibold text-white/90">
                        Manuel Cladera
                      </p>

                      <p className="mt-1 text-[9px] text-white/35">
                        Administrador · Don Segundo
                      </p>

                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#20D68A]" />
                        <span className="text-[9px] text-[#20D68A]/80">
                          En línea
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-white/[0.055]" />

                {/* Menu */}
                <div className="p-2">
                  <Link
                    href="/admin/configuracion"
                    onClick={() => setProfileOpen(false)}
                    className="
                      flex
                      items-center
                      gap-3
                      rounded-[11px]
                      px-3
                      py-2.5
                      text-[11px]
                      font-medium
                      text-white/58
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
                    onClick={() => setProfileOpen(false)}
                    className="
                      flex
                      items-center
                      gap-3
                      rounded-[11px]
                      px-3
                      py-2.5
                      text-[11px]
                      font-medium
                      text-white/58
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
                </div>

                <div className="h-px bg-white/[0.055]" />

                <div className="p-2">
                  <button
                    type="button"
                    onClick={() => setProfileOpen(false)}
                    className="
                      flex
                      w-full
                      items-center
                      justify-between
                      rounded-[11px]
                      px-3
                      py-2.5
                      text-[11px]
                      font-medium
                      text-white/35
                      transition
                      hover:bg-white/[0.025]
                      hover:text-white/62
                    "
                  >
                    <span>Sesión activa</span>

                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#20D68A]" />
                      <span className="text-[9px] text-white/25">
                        Segura
                      </span>
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
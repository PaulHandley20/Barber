"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_BOOKING_RULES,
  FALLBACK_HOURS,
  type BusinessDay,
} from "@/lib/barbershop";

export type PublicBookingConfig = {
  hours: BusinessDay[];
  maxBookingDaysAhead: number;
  cancellationNoticeHours: number;
  onlineBookingEnabled: boolean;
  /* true cuando los datos vienen de Supabase y no del respaldo local */
  fromDatabase: boolean;
};

const FALLBACK_CONFIG: PublicBookingConfig = {
  hours: FALLBACK_HOURS,
  maxBookingDaysAhead: DEFAULT_BOOKING_RULES.maxBookingDaysAhead,
  cancellationNoticeHours: DEFAULT_BOOKING_RULES.cancellationNoticeHours,
  onlineBookingEnabled: true,
  fromDatabase: false,
};

type RpcConfig = {
  hours?: BusinessDay[] | null;
  max_booking_days_ahead?: number | null;
  cancellation_notice_hours?: number | null;
  online_booking_enabled?: boolean | null;
};

let configPromise: Promise<PublicBookingConfig> | null = null;

function positiveOr(value: number | null | undefined, fallback: number) {
  return typeof value === "number" && value > 0 ? value : fallback;
}

async function fetchConfig(): Promise<PublicBookingConfig> {
  const supabase = createClient();

  /*
    1) Función pública (supabase/migrations/…_public_booking.sql).
       Devuelve solo datos no sensibles y funciona aunque las tablas
       tengan RLS cerrado para visitantes.
  */
  const { data, error } = await supabase.rpc("get_public_booking_config");

  if (!error && data) {
    const config = (Array.isArray(data) ? data[0] : data) as RpcConfig;
    const hours =
      Array.isArray(config.hours) && config.hours.length > 0
        ? config.hours
        : FALLBACK_HOURS;

    return {
      hours,
      maxBookingDaysAhead: positiveOr(
        config.max_booking_days_ahead,
        FALLBACK_CONFIG.maxBookingDaysAhead
      ),
      cancellationNoticeHours:
        typeof config.cancellation_notice_hours === "number"
          ? config.cancellation_notice_hours
          : FALLBACK_CONFIG.cancellationNoticeHours,
      onlineBookingEnabled: config.online_booking_enabled !== false,
      fromDatabase: true,
    };
  }

  /* 2) Lectura directa, por si la tabla de horarios es pública. */
  const { data: hours, error: hoursError } = await supabase
    .from("barbershop_hours")
    .select(
      "day_of_week, is_open, open_time, close_time, has_break, break_start, break_end"
    );

  if (!hoursError && hours && hours.length > 0) {
    return {
      ...FALLBACK_CONFIG,
      hours: hours as BusinessDay[],
      fromDatabase: true,
    };
  }

  /* 3) Respaldo local. */
  return FALLBACK_CONFIG;
}

export function loadPublicBookingConfig() {
  if (!configPromise) {
    configPromise = fetchConfig().catch(() => FALLBACK_CONFIG);
  }

  return configPromise;
}

export function usePublicBookingConfig() {
  const [config, setConfig] = useState<PublicBookingConfig>(FALLBACK_CONFIG);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    loadPublicBookingConfig().then((result) => {
      if (!mounted) return;

      setConfig(result);
      setLoaded(true);
    });

    return () => {
      mounted = false;
    };
  }, []);

  return { config, loaded };
}

export function isOpenOnDay(config: PublicBookingConfig, dayOfWeek: number) {
  const day = config.hours.find((item) => item.day_of_week === dayOfWeek);

  return Boolean(day?.is_open);
}

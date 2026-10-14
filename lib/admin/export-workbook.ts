"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

/*
  Exportación completa de la barbería a Excel (.xlsx).

  Se genera en el navegador con la sesión del admin (las políticas RLS
  ya limitan el acceso a administradores). La librería exceljs se carga
  recién al exportar, así no pesa en el resto del panel.

  Hojas:
    1. Resumen            → números generales del negocio
    2. Clientes           → una fila por cliente, columnas agrupadas
                            (contacto · actividad · gasto · servicios ·
                            barberos · fidelización · historial)
    3. Turnos             → historial completo, un turno por fila
    4. Servicios          → rendimiento de cada servicio
    5. Equipo             → rendimiento de cada barbero
    6. Por mes            → evolución mensual
    7. Puntos             → movimientos de fidelización
*/

/* ---------------------------------------------------------
   Tipos de los datos que se leen
   --------------------------------------------------------- */
type Customer = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string | null;
  notes?: string | null;
  marketing_opt_in?: boolean | null;
};

type Service = {
  id: string;
  name: string;
  price: number | null;
  duration_minutes: number | null;
  active: boolean | null;
};

type Barber = { id: string; name: string | null; active?: boolean | null };

type Appointment = {
  id: string;
  customer_id: string | null;
  service_id: string | null;
  barber_id: string | null;
  start_at: string;
  status: string | null;
  notes: string | null;
  reservation_code: string | null;
  created_at: string | null;
  source?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancelled_by_email?: string | null;
  no_show_at?: string | null;
};

type LoyaltyAccount = {
  id: string;
  customer_id: string;
  points_balance: number | null;
  visits: number | null;
  rewards_earned: number | null;
  rewards_redeemed: number | null;
};

type LoyaltyTransaction = {
  id: string;
  loyalty_account_id: string;
  transaction_type: string | null;
  points_delta: number | null;
  description: string | null;
  created_at: string;
};

/* ---------------------------------------------------------
   Lectura de datos (paginada: Supabase devuelve hasta 1000 filas)
   --------------------------------------------------------- */
const PAGE = 1000;

async function fetchAll<T>(
  supabase: SupabaseClient,
  table: string,
  columns: string,
  order: string,
  optional = false
): Promise<T[]> {
  const rows: T[] = [];

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order(order, { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) {
      if (optional) return rows;
      throw new Error(`${table}: ${error.message}`);
    }

    rows.push(...((data ?? []) as T[]));

    if (!data || data.length < PAGE) return rows;
  }
}

/* Intenta con columnas opcionales (de migraciones nuevas) y, si la
   base todavía no las tiene, vuelve a pedir sin ellas. */
async function fetchWithFallback<T>(
  supabase: SupabaseClient,
  table: string,
  full: string,
  basic: string,
  order: string
) {
  try {
    return await fetchAll<T>(supabase, table, full, order);
  } catch {
    return fetchAll<T>(supabase, table, basic, order);
  }
}

/* ---------------------------------------------------------
   Ayudas de formato
   --------------------------------------------------------- */
const STATUS_LABEL: Record<string, string> = {
  completed: "Completado",
  confirmed: "Confirmado",
  pending: "Pendiente",
  cancelled: "Cancelado",
  canceled: "Cancelado",
  no_show: "No asistió",
};

const DAY_LABEL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const MONTH_LABEL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/* Excel no tiene zonas horarias: se guarda la fecha con la hora local
   de quien exporta (Argentina), que es la que se ve en el panel. */
function excelDate(iso: string | null | undefined) {
  if (!iso) return null;

  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return null;

  return new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes())
  );
}

function shortDate(iso: string) {
  const d = new Date(iso);

  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getFullYear()
  ).slice(2)}`;
}

function isCompleted(status: string | null) {
  return status === "completed";
}

function isCancelled(status: string | null) {
  return status === "cancelled" || status === "canceled";
}

function topEntry(map: Map<string, number>) {
  let best = "";
  let max = 0;

  for (const [key, value] of map) {
    if (value > max) {
      best = key;
      max = value;
    }
  }

  return best;
}

function sanitizeSheetTitle(value: string) {
  return value.replace(/[\\/?*[\]:]/g, " ").slice(0, 31);
}

/* ---------------------------------------------------------
   Estilos
   --------------------------------------------------------- */
const COLORS = {
  ink: "FF111111",
  orange: "FFFF5A00",
  white: "FFFFFFFF",
  zebra: "FFF7F7F7",
  line: "FFE4E4E4",
  muted: "FF6B6B6B",
};

/* Cada grupo de columnas tiene su propio color de encabezado. */
const GROUP_COLORS: Record<string, string> = {
  Cliente: "FF1F2937",
  Contacto: "FF1F2937",
  Actividad: "FF7C2D12",
  Gasto: "FF14532D",
  "Servicios elegidos (veces)": "FF1E3A8A",
  Barberos: "FF4C1D95",
  Fidelización: "FF9A3412",
  Historial: "FF374151",
  Turno: "FF1F2937",
  Detalle: "FF1E3A8A",
  Importe: "FF14532D",
  Seguimiento: "FF374151",
  "Cancelación / ausencia": "FF7F1D1D",
};

const MONEY = '"$" #,##0';
const DATE = "dd/mm/yyyy";
const TIME = "hh:mm";
const PERCENT = "0.0%";

/* Contadores (veces, turnos, puntos) centrados; plata a la derecha;
   texto a la izquierda. Todo con un pequeño margen interno. */
function alignmentOf(column: { format?: string; align?: "left" | "right" | "center" }) {
  if (column.align) return column.align;
  if (!column.format) return "left";
  if (column.format === MONEY || column.format === PERCENT) return "right";
  if (column.format === DATE || column.format === TIME) return "center";
  return "center";
}

type Column = {
  header: string;
  key: string;
  width: number;
  group?: string;
  format?: string;
  align?: "left" | "right" | "center";
  wrap?: boolean;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
type Sheet = any;
type Workbook = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

function buildTable(
  workbook: Workbook,
  title: string,
  columns: Column[],
  rows: Record<string, unknown>[],
  options: { frozenColumns?: number } = {}
): Sheet {
  const sheet = workbook.addWorksheet(sanitizeSheetTitle(title), {
    properties: { defaultRowHeight: 18 },
    // Al imprimir: horizontal y todas las columnas en el ancho de la hoja.
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    },
  });

  const hasGroups = columns.some((column) => column.group);
  const headerRowNumber = hasGroups ? 2 : 1;

  sheet.columns = columns.map((column) => ({
    key: column.key,
    width: column.width,
    style: {
      numFmt: column.format,
      alignment: {
        vertical: "middle",
        horizontal: alignmentOf(column),
        wrapText: column.wrap ?? false,
        indent: alignmentOf(column) === "center" ? 0 : 1,
      },
    },
  }));

  // Fila 1: grupos de columnas (celdas combinadas)
  if (hasGroups) {
    const groupRow = sheet.getRow(1);
    let start = 1;

    while (start <= columns.length) {
      const group = columns[start - 1].group ?? "";
      let end = start;

      while (end < columns.length && (columns[end].group ?? "") === group) end++;

      if (end > start) sheet.mergeCells(1, start, 1, end);

      const cell = groupRow.getCell(start);
      cell.value = group.toUpperCase();
      cell.font = { bold: true, size: 9, color: { argb: COLORS.white } };
      cell.alignment = { vertical: "middle", horizontal: "center" };

      for (let c = start; c <= end; c++) {
        groupRow.getCell(c).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: GROUP_COLORS[group] ?? COLORS.ink },
        };
        if (c === start) {
          groupRow.getCell(c).border = {
            left: { style: "thin", color: { argb: COLORS.white } },
          };
        }
      }

      start = end + 1;
    }

    groupRow.height = 20;
  }

  // Encabezados
  const headerRow = sheet.getRow(headerRowNumber);

  columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = column.header;
    cell.font = { bold: true, size: 10, color: { argb: COLORS.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.ink } };
    cell.alignment = {
      vertical: "middle",
      horizontal: alignmentOf(column),
      wrapText: true,
      indent: alignmentOf(column) === "center" ? 0 : 1,
    };
    cell.border = { bottom: { style: "medium", color: { argb: COLORS.orange } } };
  });

  headerRow.height = 32;

  // Datos
  rows.forEach((row, index) => {
    const excelRow = sheet.getRow(headerRowNumber + 1 + index);

    columns.forEach((column, columnIndex) => {
      const value = row[column.key];
      const cell = excelRow.getCell(columnIndex + 1);
      cell.value = value === undefined || value === "" ? null : (value as never);
    });

    excelRow.height = 18;

    if (index % 2 === 1) {
      excelRow.eachCell({ includeEmpty: true }, (cell: { fill: unknown }) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.zebra } };
      });
    }

    excelRow.eachCell({ includeEmpty: true }, (cell: { border: unknown }) => {
      cell.border = { bottom: { style: "hair", color: { argb: COLORS.line } } };
    });
  });

  sheet.views = [
    {
      state: "frozen",
      ySplit: headerRowNumber,
      xSplit: options.frozenColumns ?? 1,
      showGridLines: false,
    },
  ];

  if (rows.length > 0) {
    sheet.autoFilter = {
      from: { row: headerRowNumber, column: 1 },
      to: { row: headerRowNumber + rows.length, column: columns.length },
    };
  }

  return sheet;
}

/* ---------------------------------------------------------
   Exportación
   --------------------------------------------------------- */
export async function exportBarbershopWorkbook(
  supabase: SupabaseClient,
  shopName = "Don Segundo"
) {
  const [
    customers,
    services,
    barbers,
    appointments,
    accounts,
    transactions,
  ] = await Promise.all([
    fetchWithFallback<Customer>(
      supabase,
      "customers",
      "id,full_name,phone,email,created_at,notes,marketing_opt_in,deleted_at",
      "id,full_name,phone,email,created_at,notes,deleted_at",
      "full_name"
    ),
    fetchAll<Service>(supabase, "services", "id,name,price,duration_minutes,active", "name"),
    fetchAll<Barber>(supabase, "barbers", "id,name,active", "name", true),
    // Con registro de cancelaciones (migración 12) → con origen (11) → básico.
    fetchWithFallback<Appointment>(
      supabase,
      "appointments",
      "id,customer_id,service_id,barber_id,start_at,status,notes,reservation_code,created_at,source,cancelled_at,cancelled_by,cancelled_by_email,no_show_at",
      "id,customer_id,service_id,barber_id,start_at,status,notes,reservation_code,created_at,source",
      "start_at"
    ).catch(() =>
      fetchAll<Appointment>(
        supabase,
        "appointments",
        "id,customer_id,service_id,barber_id,start_at,status,notes,reservation_code,created_at",
        "start_at"
      )
    ),
    fetchAll<LoyaltyAccount>(
      supabase,
      "loyalty_accounts",
      "id,customer_id,points_balance,visits,rewards_earned,rewards_redeemed",
      "id",
      true
    ),
    fetchAll<LoyaltyTransaction>(
      supabase,
      "loyalty_point_transactions",
      "id,loyalty_account_id,transaction_type,points_delta,description,created_at",
      "created_at",
      true
    ),
  ]);

  // Siempre en orden cronológico (no depende del orden de la consulta).
  appointments.sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  );

  const activeCustomers = customers.filter(
    (customer) => !(customer as Customer & { deleted_at?: string | null }).deleted_at
  );

  const serviceById = new Map(services.map((service) => [service.id, service]));
  const barberById = new Map(barbers.map((barber) => [barber.id, barber]));
  const customerById = new Map(customers.map((customer) => [customer.id, customer]));
  const accountById = new Map(accounts.map((account) => [account.id, account]));

  const priceOf = (appointment: Appointment) =>
    Number(serviceById.get(appointment.service_id ?? "")?.price ?? 0);

  const barberName = (appointment: Appointment) =>
    barberById.get(appointment.barber_id ?? "")?.name ?? "Sin asignar";

  const serviceName = (appointment: Appointment) =>
    serviceById.get(appointment.service_id ?? "")?.name ?? "Servicio eliminado";

  // Servicios ordenados por uso: así las columnas de "veces" van de
  // más a menos elegido.
  const serviceUse = new Map<string, number>();

  for (const appointment of appointments) {
    if (!appointment.service_id || isCancelled(appointment.status)) continue;
    serviceUse.set(appointment.service_id, (serviceUse.get(appointment.service_id) ?? 0) + 1);
  }

  const servicesByUse = [...services].sort(
    (a, b) => (serviceUse.get(b.id) ?? 0) - (serviceUse.get(a.id) ?? 0) || a.name.localeCompare(b.name)
  );

  // Puntos por cliente
  const loyaltyByCustomer = new Map<
    string,
    { balance: number; earned: number; redeemed: number; rewards: number }
  >();

  for (const account of accounts) {
    const current = loyaltyByCustomer.get(account.customer_id) ?? {
      balance: 0,
      earned: 0,
      redeemed: 0,
      rewards: 0,
    };

    current.balance += Number(account.points_balance ?? 0);
    current.rewards += Number(account.rewards_redeemed ?? 0);
    loyaltyByCustomer.set(account.customer_id, current);
  }

  for (const transaction of transactions) {
    const account = accountById.get(transaction.loyalty_account_id);

    if (!account) continue;

    const current = loyaltyByCustomer.get(account.customer_id);

    if (!current) continue;

    const delta = Number(transaction.points_delta ?? 0);

    if (delta > 0) current.earned += delta;
    else current.redeemed += Math.abs(delta);
  }

  /* ---------------- Clientes ---------------- */
  const appointmentsByCustomer = new Map<string, Appointment[]>();

  for (const appointment of appointments) {
    if (!appointment.customer_id) continue;

    const list = appointmentsByCustomer.get(appointment.customer_id) ?? [];
    list.push(appointment);
    appointmentsByCustomer.set(appointment.customer_id, list);
  }

  const today = Date.now();

  const customerRows = activeCustomers.map((customer) => {
    const list = appointmentsByCustomer.get(customer.id) ?? [];
    const completed = list.filter((item) => isCompleted(item.status));
    const spent = completed.reduce((sum, item) => sum + priceOf(item), 0);

    const barberCount = new Map<string, number>();
    const serviceCount = new Map<string, number>();

    for (const item of completed) {
      const barber = barberName(item);
      barberCount.set(barber, (barberCount.get(barber) ?? 0) + 1);
      if (item.service_id) {
        serviceCount.set(item.service_id, (serviceCount.get(item.service_id) ?? 0) + 1);
      }
    }

    const first = completed[0]?.start_at ?? null;
    const last = completed[completed.length - 1]?.start_at ?? null;
    const upcoming = list.find(
      (item) =>
        new Date(item.start_at).getTime() > today &&
        (item.status === "confirmed" || item.status === "pending")
    );
    const loyalty = loyaltyByCustomer.get(customer.id);
    const favoriteServiceId = topEntry(serviceCount);

    const row: Record<string, unknown> = {
      name: customer.full_name ?? "Sin nombre",
      phone: customer.phone,
      email: customer.email,
      marketing:
        customer.marketing_opt_in === undefined || customer.marketing_opt_in === null
          ? null
          : customer.marketing_opt_in
            ? "Sí"
            : "No",
      since: excelDate(customer.created_at),
      total: list.length,
      completed: completed.length,
      cancelled: list.filter((item) => isCancelled(item.status)).length,
      noShow: list.filter((item) => item.status === "no_show").length,
      first: excelDate(first),
      last: excelDate(last),
      daysSince: last ? Math.floor((today - new Date(last).getTime()) / 86400000) : null,
      next: excelDate(upcoming?.start_at),
      spent,
      ticket: completed.length ? Math.round(spent / completed.length) : null,
      favorite: favoriteServiceId ? serviceById.get(favoriteServiceId)?.name ?? null : null,
      mainBarber: topEntry(barberCount) || null,
      barbers: [...barberCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => `${name} (${count})`)
        .join(", "),
      points: loyalty ? loyalty.balance : null,
      earned: loyalty ? loyalty.earned : null,
      redeemed: loyalty ? loyalty.redeemed : null,
      rewards: loyalty ? loyalty.rewards : null,
      dates: completed.map((item) => shortDate(item.start_at)).join(", "),
      notes: customer.notes ?? null,
    };

    for (const service of servicesByUse) {
      row[`svc_${service.id}`] = serviceCount.get(service.id) ?? 0;
    }

    return row;
  });

  customerRows.sort((a, b) => Number(b.spent) - Number(a.spent));

  const customerColumns: Column[] = [
    { header: "Cliente", key: "name", width: 26, group: "Cliente" },
    { header: "Teléfono", key: "phone", width: 16, group: "Contacto" },
    { header: "Email", key: "email", width: 28, group: "Contacto" },
    { header: "Acepta promociones", key: "marketing", width: 13, group: "Contacto", align: "center" },
    { header: "Cliente desde", key: "since", width: 13, group: "Actividad", format: DATE },
    { header: "Turnos totales", key: "total", width: 10, group: "Actividad", format: "0" },
    { header: "Cortes realizados", key: "completed", width: 11, group: "Actividad", format: "0" },
    { header: "Cancelados", key: "cancelled", width: 11, group: "Actividad", format: "0" },
    { header: "No asistió", key: "noShow", width: 10, group: "Actividad", format: "0" },
    { header: "Primer corte", key: "first", width: 13, group: "Actividad", format: DATE },
    { header: "Último corte", key: "last", width: 13, group: "Actividad", format: DATE },
    { header: "Días sin venir", key: "daysSince", width: 10, group: "Actividad", format: "0" },
    { header: "Próximo turno", key: "next", width: 13, group: "Actividad", format: DATE },
    { header: "Gasto total", key: "spent", width: 14, group: "Gasto", format: MONEY },
    { header: "Ticket promedio", key: "ticket", width: 13, group: "Gasto", format: MONEY },
    { header: "Servicio favorito", key: "favorite", width: 20, group: "Servicios elegidos (veces)" },
    ...servicesByUse.map(
      (service): Column => ({
        header: service.name,
        key: `svc_${service.id}`,
        width: Math.min(18, Math.max(11, service.name.length + 2)),
        group: "Servicios elegidos (veces)",
        format: "0",
      })
    ),
    { header: "Barbero habitual", key: "mainBarber", width: 16, group: "Barberos" },
    { header: "Con quién se cortó", key: "barbers", width: 24, group: "Barberos" },
    { header: "Puntos disponibles", key: "points", width: 11, group: "Fidelización", format: "#,##0" },
    { header: "Puntos ganados", key: "earned", width: 11, group: "Fidelización", format: "#,##0" },
    { header: "Puntos canjeados", key: "redeemed", width: 11, group: "Fidelización", format: "#,##0" },
    { header: "Premios canjeados", key: "rewards", width: 11, group: "Fidelización", format: "0" },
    { header: "Fechas de cada corte", key: "dates", width: 60, group: "Historial" },
    { header: "Notas", key: "notes", width: 30, group: "Historial" },
  ];

  /* ---------------- Turnos ---------------- */
  const appointmentRows = [...appointments]
    .sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime())
    .map((appointment) => {
      const customer = customerById.get(appointment.customer_id ?? "");
      const start = new Date(appointment.start_at);
      const status = appointment.status ?? "";

      return {
        date: excelDate(appointment.start_at),
        time: excelDate(appointment.start_at),
        weekday: DAY_LABEL[start.getDay()],
        customer: customer?.full_name ?? "Sin cliente",
        phone: customer?.phone ?? null,
        service: serviceName(appointment),
        barber: barberName(appointment),
        status: STATUS_LABEL[status] ?? status,
        price: priceOf(appointment),
        charged: isCompleted(appointment.status) ? priceOf(appointment) : 0,
        source:
          appointment.source === "web"
            ? "Web"
            : appointment.source === "panel"
              ? "Panel"
              : null,
        cancelledBy:
          appointment.cancelled_by === "cliente"
            ? "Cliente (web)"
            : appointment.cancelled_by === "admin"
              ? `Panel${appointment.cancelled_by_email ? ` (${appointment.cancelled_by_email})` : ""}`
              : null,
        cancelledAt: excelDate(appointment.cancelled_at),
        noShowAt: excelDate(appointment.no_show_at),
        code: appointment.reservation_code,
        created: excelDate(appointment.created_at),
        notes: appointment.notes,
      };
    });

  const appointmentColumns: Column[] = [
    { header: "Fecha", key: "date", width: 12, group: "Turno", format: DATE },
    { header: "Hora", key: "time", width: 8, group: "Turno", format: TIME, align: "center" },
    { header: "Día", key: "weekday", width: 11, group: "Turno" },
    { header: "Cliente", key: "customer", width: 26, group: "Detalle" },
    { header: "Teléfono", key: "phone", width: 16, group: "Detalle" },
    { header: "Servicio", key: "service", width: 20, group: "Detalle" },
    { header: "Barbero", key: "barber", width: 14, group: "Detalle" },
    { header: "Estado", key: "status", width: 12, group: "Detalle" },
    { header: "Precio del servicio", key: "price", width: 13, group: "Importe", format: MONEY },
    { header: "Facturado", key: "charged", width: 13, group: "Importe", format: MONEY },
    { header: "Cancelado por", key: "cancelledBy", width: 22, group: "Cancelación / ausencia" },
    { header: "Cancelado el", key: "cancelledAt", width: 16, group: "Cancelación / ausencia", format: "dd/mm/yyyy hh:mm" },
    { header: "No asistió (registrado)", key: "noShowAt", width: 16, group: "Cancelación / ausencia", format: "dd/mm/yyyy hh:mm" },
    { header: "Origen", key: "source", width: 9, group: "Seguimiento", align: "center" },
    { header: "Código de reserva", key: "code", width: 16, group: "Seguimiento" },
    { header: "Registrado el", key: "created", width: 13, group: "Seguimiento", format: DATE },
    { header: "Notas", key: "notes", width: 30, group: "Seguimiento" },
  ];

  /* ---------------- Servicios ---------------- */
  const completedAll = appointments.filter((item) => isCompleted(item.status));
  const totalRevenue = completedAll.reduce((sum, item) => sum + priceOf(item), 0);

  const serviceRows = servicesByUse.map((service) => {
    const list = appointments.filter((item) => item.service_id === service.id);
    const done = list.filter((item) => isCompleted(item.status));
    const revenue = done.reduce((sum, item) => sum + priceOf(item), 0);

    return {
      name: service.name,
      active: service.active ? "Activo" : "Inactivo",
      duration: service.duration_minutes,
      price: Number(service.price ?? 0),
      booked: list.filter((item) => !isCancelled(item.status)).length,
      completed: done.length,
      cancelled: list.filter((item) => isCancelled(item.status)).length,
      customers: new Set(done.map((item) => item.customer_id)).size,
      revenue,
      share: totalRevenue ? revenue / totalRevenue : 0,
    };
  });

  const serviceColumns: Column[] = [
    { header: "Servicio", key: "name", width: 26 },
    { header: "Estado", key: "active", width: 10 },
    { header: "Duración (min)", key: "duration", width: 11, format: "0" },
    { header: "Precio actual", key: "price", width: 13, format: MONEY },
    { header: "Turnos (sin cancelar)", key: "booked", width: 12, format: "0" },
    { header: "Realizados", key: "completed", width: 11, format: "0" },
    { header: "Cancelados", key: "cancelled", width: 11, format: "0" },
    { header: "Clientes distintos", key: "customers", width: 11, format: "0" },
    { header: "Facturación", key: "revenue", width: 15, format: MONEY },
    { header: "% de la facturación", key: "share", width: 12, format: PERCENT },
  ];

  /* ---------------- Equipo ---------------- */
  const barberIds = new Set(appointments.map((item) => item.barber_id ?? ""));
  const teamRows = [...barberIds]
    .map((id) => {
      const list = appointments.filter((item) => (item.barber_id ?? "") === id);
      const done = list.filter((item) => isCompleted(item.status));
      const revenue = done.reduce((sum, item) => sum + priceOf(item), 0);
      const serviceCount = new Map<string, number>();

      for (const item of done) {
        const name = serviceName(item);
        serviceCount.set(name, (serviceCount.get(name) ?? 0) + 1);
      }

      return {
        name: barberById.get(id)?.name ?? "Sin asignar",
        completed: done.length,
        cancelled: list.filter((item) => isCancelled(item.status)).length,
        noShow: list.filter((item) => item.status === "no_show").length,
        customers: new Set(done.map((item) => item.customer_id)).size,
        revenue,
        ticket: done.length ? Math.round(revenue / done.length) : null,
        topService: topEntry(serviceCount) || null,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const teamColumns: Column[] = [
    { header: "Barbero", key: "name", width: 20 },
    { header: "Cortes realizados", key: "completed", width: 12, format: "0" },
    { header: "Cancelados", key: "cancelled", width: 11, format: "0" },
    { header: "No asistió", key: "noShow", width: 10, format: "0" },
    { header: "Clientes distintos", key: "customers", width: 11, format: "0" },
    { header: "Facturación", key: "revenue", width: 15, format: MONEY },
    { header: "Ticket promedio", key: "ticket", width: 13, format: MONEY },
    { header: "Servicio que más hace", key: "topService", width: 22 },
  ];

  /* ---------------- Por mes ---------------- */
  const months = new Map<
    string,
    { label: string; total: number; completed: number; cancelled: number; noShow: number; revenue: number; newCustomers: number; customers: Set<string> }
  >();

  const monthKey = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  const ensureMonth = (key: string) => {
    if (!months.has(key)) {
      const [year, month] = key.split("-").map(Number);
      months.set(key, {
        label: `${MONTH_LABEL[month - 1]} ${year}`,
        total: 0,
        completed: 0,
        cancelled: 0,
        noShow: 0,
        revenue: 0,
        newCustomers: 0,
        customers: new Set(),
      });
    }

    return months.get(key)!;
  };

  for (const appointment of appointments) {
    const month = ensureMonth(monthKey(appointment.start_at));
    month.total += 1;

    if (isCompleted(appointment.status)) {
      month.completed += 1;
      month.revenue += priceOf(appointment);
      if (appointment.customer_id) month.customers.add(appointment.customer_id);
    } else if (isCancelled(appointment.status)) {
      month.cancelled += 1;
    } else if (appointment.status === "no_show") {
      month.noShow += 1;
    }
  }

  for (const customer of activeCustomers) {
    if (customer.created_at) ensureMonth(monthKey(customer.created_at)).newCustomers += 1;
  }

  const monthRows = [...months.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([, month]) => ({
      label: month.label,
      total: month.total,
      completed: month.completed,
      cancelled: month.cancelled,
      noShow: month.noShow,
      customers: month.customers.size,
      newCustomers: month.newCustomers,
      revenue: month.revenue,
      ticket: month.completed ? Math.round(month.revenue / month.completed) : null,
    }));

  const monthColumns: Column[] = [
    { header: "Mes", key: "label", width: 16 },
    { header: "Turnos", key: "total", width: 10, format: "0" },
    { header: "Realizados", key: "completed", width: 11, format: "0" },
    { header: "Cancelados", key: "cancelled", width: 11, format: "0" },
    { header: "No asistió", key: "noShow", width: 10, format: "0" },
    { header: "Clientes atendidos", key: "customers", width: 12, format: "0" },
    { header: "Clientes nuevos", key: "newCustomers", width: 11, format: "0" },
    { header: "Facturación", key: "revenue", width: 15, format: MONEY },
    { header: "Ticket promedio", key: "ticket", width: 13, format: MONEY },
  ];

  /* ---------------- Puntos ---------------- */
  const pointRows = [...transactions]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((transaction) => {
      const account = accountById.get(transaction.loyalty_account_id);
      const customer = customerById.get(account?.customer_id ?? "");
      const delta = Number(transaction.points_delta ?? 0);

      return {
        date: excelDate(transaction.created_at),
        customer: customer?.full_name ?? "Cliente",
        type: delta >= 0 ? "Suma" : "Canje",
        points: delta,
        detail: transaction.description ?? transaction.transaction_type,
      };
    });

  const pointColumns: Column[] = [
    { header: "Fecha", key: "date", width: 12, format: DATE },
    { header: "Cliente", key: "customer", width: 26 },
    { header: "Movimiento", key: "type", width: 11 },
    { header: "Puntos", key: "points", width: 10, format: "+#,##0;-#,##0;0" },
    { header: "Detalle", key: "detail", width: 40 },
  ];

  /* ---------------- Armado del libro ---------------- */
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "BarberOS";
  workbook.created = new Date();

  // Resumen
  const summary = workbook.addWorksheet("Resumen", {
    views: [{ showGridLines: false }],
    pageSetup: { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
  });

  summary.columns = [
    { width: 3 },
    { width: 34 },
    { width: 22 },
  ];

  summary.getCell("B2").value = shopName;
  summary.getCell("B2").font = { bold: true, size: 20, color: { argb: COLORS.ink } };
  summary.getCell("B3").value = `Reporte completo del negocio · generado el ${new Date().toLocaleDateString(
    "es-AR",
    { day: "2-digit", month: "long", year: "numeric" }
  )}`;
  summary.getCell("B3").font = { size: 10, color: { argb: COLORS.muted } };

  const uniqueServed = new Set(completedAll.map((item) => item.customer_id)).size;
  const firstDate = appointments[0]?.start_at;

  const summaryRows: [string, unknown, string?][] = [
    ["Clientes registrados", activeCustomers.length, "0"],
    ["Clientes atendidos al menos una vez", uniqueServed, "0"],
    ["Clientes que volvieron (2 o más cortes)", customerRows.filter((row) => Number(row.completed) >= 2).length, "0"],
    ["Turnos registrados", appointments.length, "0"],
    ["Cortes realizados", completedAll.length, "0"],
    ["Cancelados", appointments.filter((item) => isCancelled(item.status)).length, "0"],
    ["No asistieron", appointments.filter((item) => item.status === "no_show").length, "0"],
    ["Facturación total", totalRevenue, MONEY],
    ["Ticket promedio", completedAll.length ? Math.round(totalRevenue / completedAll.length) : 0, MONEY],
    ["Servicio más elegido", servicesByUse[0]?.name ?? "—"],
    ["Datos desde", excelDate(firstDate), DATE],
  ];

  summary.getCell("B5").value = "INDICADOR";
  summary.getCell("C5").value = "VALOR";

  for (const ref of ["B5", "C5"]) {
    const cell = summary.getCell(ref);
    cell.font = { bold: true, size: 9, color: { argb: COLORS.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.ink } };
    cell.border = { bottom: { style: "medium", color: { argb: COLORS.orange } } };
    cell.alignment = { vertical: "middle", horizontal: ref === "C5" ? "right" : "left" };
  }

  summary.getRow(5).height = 22;

  summaryRows.forEach(([label, value, format], index) => {
    const row = summary.getRow(6 + index);
    row.height = 20;
    row.getCell(2).value = label;
    row.getCell(3).value = value as never;
    row.getCell(3).alignment = { horizontal: "right", vertical: "middle" };
    row.getCell(2).alignment = { vertical: "middle" };
    if (format) row.getCell(3).numFmt = format;
    row.getCell(3).font = { bold: true };

    for (const cellIndex of [2, 3]) {
      const cell = row.getCell(cellIndex);
      cell.border = { bottom: { style: "hair", color: { argb: COLORS.line } } };
      if (index % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.zebra } };
      }
    }
  });

  const notesStart = 6 + summaryRows.length + 1;
  const notes = [
    "Cómo leer este archivo:",
    "• Cada hoja tiene filtros en los encabezados: tocá la flecha para ordenar o filtrar.",
    "• La facturación se calcula con los turnos completados y el precio actual de cada servicio.",
    "• \"Clientes\" muestra cuántas veces eligió cada servicio, con quién se cortó, sus puntos y las fechas de cada corte.",
    "• \"Turnos\" tiene el historial completo, un turno por fila.",
  ];

  notes.forEach((text, index) => {
    const cell = summary.getCell(`B${notesStart + index}`);
    cell.value = text;
    cell.font = index === 0 ? { bold: true, size: 10 } : { size: 10, color: { argb: COLORS.muted } };
  });

  buildTable(workbook, "Clientes", customerColumns, customerRows);
  buildTable(workbook, "Turnos", appointmentColumns, appointmentRows, { frozenColumns: 1 });
  buildTable(workbook, "Servicios", serviceColumns, serviceRows);
  buildTable(workbook, "Equipo", teamColumns, teamRows);
  buildTable(workbook, "Por mes", monthColumns, monthRows);

  if (pointRows.length > 0) {
    buildTable(workbook, "Puntos", pointColumns, pointRows);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const stamp = new Date();
  const fileName = `${shopName.replace(/\s+/g, "-")}-reporte-${stamp.getFullYear()}-${String(
    stamp.getMonth() + 1
  ).padStart(2, "0")}-${String(stamp.getDate()).padStart(2, "0")}.xlsx`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);

  return {
    fileName,
    customers: customerRows.length,
    appointments: appointmentRows.length,
  };
}

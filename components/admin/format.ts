/*
  Formato único de montos en el panel: "$ 68.000".
  Es el mismo que usan las tarjetas KPI del Dashboard.
*/
const moneyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export function formatMoney(value: number) {
  return moneyFormatter.format(Number.isFinite(value) ? value : 0);
}

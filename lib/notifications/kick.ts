/*
  Avisa al servidor que hay emails/eventos nuevos en la cola, para que
  salgan al instante (sin esperar al cron). Si falla no pasa nada: el
  cron los procesa igual.
*/
export function kickNotifications() {
  try {
    void fetch("/api/notifications/process", { method: "POST", keepalive: true }).catch(() => {});
  } catch {
    // sin conexión: lo toma el cron
  }
}

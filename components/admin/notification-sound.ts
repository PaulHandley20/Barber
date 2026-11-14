/*
  Sonido de avisos del panel (reservas web nuevas y cancelaciones de
  clientes). Se genera con Web Audio: no hace falta ningún archivo.

  Los navegadores solo dejan reproducir sonido después de que la persona
  tocó la página: unlockNotificationSound() se llama con el primer clic.
  La preferencia (activado / silenciado) se guarda en este dispositivo.
*/

const PREF_KEY = "barberos:notifications-sound";

let audioContext: AudioContext | null = null;

export function isNotificationSoundOn() {
  try {
    return window.localStorage.getItem(PREF_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setNotificationSoundOn(on: boolean) {
  try {
    window.localStorage.setItem(PREF_KEY, on ? "on" : "off");
  } catch {
    // Sin almacenamiento (modo privado): vale solo para esta visita.
  }
}

function getContext() {
  if (typeof window === "undefined") return null;
  const AudioCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  audioContext ??= new AudioCtor();
  return audioContext;
}

export function unlockNotificationSound() {
  const context = getContext();
  if (context?.state === "suspended") void context.resume().catch(() => {});
}

/* "booking": dos notas que suben. "cancel": dos notas que bajan. */
export function playNotificationSound(kind: "booking" | "cancel" = "booking", force = false) {
  if (!force && !isNotificationSoundOn()) return;
  const context = getContext();
  if (!context) return;
  if (context.state === "suspended") void context.resume().catch(() => {});

  const notes = kind === "cancel" ? [783.99, 587.33] : [783.99, 1174.66];
  const startAt = context.currentTime + 0.02;

  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = startAt + index * 0.16;

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.55);

    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.6);
  });
}

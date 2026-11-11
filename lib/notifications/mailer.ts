import nodemailer, { type Transporter } from "nodemailer";
import { EMAIL_LOGO_CID, EMAIL_LOGO_PNG_BASE64 } from "./logo";

/*
  Envío de emails desde la cuenta de Gmail de la barbería, con una
  "contraseña de aplicación" (requiere verificación en 2 pasos).

  Variables de entorno (solo servidor):
    GMAIL_USER           barberia.donsegundo@gmail.com
    GMAIL_APP_PASSWORD   la contraseña de aplicación de 16 letras
    NOTIFICATIONS_DRY_RUN=1  (opcional) no envía: muestra el email en la consola
*/

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  fromName: string;
  ics?: string;
};

function isDryRun() {
  return process.env.NOTIFICATIONS_DRY_RUN === "1";
}

export function isMailConfigured() {
  return isDryRun() || Boolean(process.env.GMAIL_USER?.trim() && process.env.GMAIL_APP_PASSWORD?.trim());
}

export function mailSender() {
  return process.env.GMAIL_USER?.trim() || null;
}

let transport: Transporter | null = null;

function getTransport() {
  if (transport) return transport;

  transport = isDryRun()
    ? nodemailer.createTransport({ jsonTransport: true })
    : nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: process.env.GMAIL_USER!.trim(),
          // Google la muestra en grupos de 4 letras: se aceptan con o sin espacios.
          pass: process.env.GMAIL_APP_PASSWORD!.replace(/\s+/g, ""),
        },
      });

  return transport;
}

export async function sendEmail(email: OutgoingEmail) {
  if (!isMailConfigured()) {
    throw new Error("El envío de emails no está configurado (GMAIL_USER / GMAIL_APP_PASSWORD).");
  }

  const sender = mailSender() ?? "no-configurado@example.com";
  const info = await getTransport().sendMail({
    from: { name: email.fromName, address: sender },
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
    attachments: [
      // Logo dentro del email (se ve aunque no carguen imágenes externas).
      ...(email.html.includes(`cid:${EMAIL_LOGO_CID}`)
        ? [{
            filename: "don-segundo.png",
            content: Buffer.from(EMAIL_LOGO_PNG_BASE64, "base64"),
            contentType: "image/png",
            cid: EMAIL_LOGO_CID,
          }]
        : []),
      ...(email.ics
        ? [{ filename: "turno.ics", content: email.ics, contentType: "text/calendar; charset=utf-8" }]
        : []),
    ],
  });

  if (isDryRun()) {
    console.info(`[notificaciones · prueba] Email para ${email.to}: ${email.subject}`);
  }

  return info.messageId as string | undefined;
}

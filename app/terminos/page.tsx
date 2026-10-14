import type { Metadata } from "next";
import Link from "next/link";
import { LegalList, LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { BARBERSHOP, DEFAULT_BOOKING_RULES } from "@/lib/barbershop";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: `Condiciones para reservar turnos online en ${BARBERSHOP.legalName}.`,
};

const linkClass = "text-[#c09a6c] underline underline-offset-4";

export default function TerminosPage() {
  const { cancellationNoticeHours, lateToleranceMinutes } =
    DEFAULT_BOOKING_RULES;

  return (
    <LegalPage
      eyebrow="Legales"
      title="Términos y condiciones"
      intro={
        <p>
          Estas condiciones regulan el uso del sistema de reservas online de{" "}
          {BARBERSHOP.legalName} ({BARBERSHOP.address}, {BARBERSHOP.city},{" "}
          {BARBERSHOP.province}). Al confirmar un turno declarás haberlas
          leído y aceptado.
        </p>
      }
    >
      <LegalSection title="1. Reservas">
        <LegalList
          items={[
            "Podés reservar un turno eligiendo servicio, día y horario entre los disponibles. El turno queda confirmado cuando ves la pantalla de confirmación con tu código de reserva.",
            "Los datos que ingreses tienen que ser reales y de tu titularidad. Los usamos para identificarte y contactarte por cualquier novedad sobre el turno.",
            "Cada turno es personal. Si vas a reservar para otra persona, ingresá sus datos y avisale que lo hiciste.",
            "Guardá tu código de reserva: lo vas a necesitar (o tu email y teléfono) para consultar, modificar o cancelar el turno.",
          ]}
        />
      </LegalSection>

      <LegalSection title="2. Modificaciones y cancelaciones">
        <LegalList
          items={[
            <>
              Podés cancelar tu turno en cualquier momento antes del horario
              reservado desde{" "}
              <Link href="/gestionar-reserva" className={linkClass}>
                Gestionar mi reserva
              </Link>
              . Las cancelaciones quedan registradas.
            </>,
            <>
              Para cambiar el día u horario necesitás al menos{" "}
              {cancellationNoticeHours}{" "}
              {cancellationNoticeHours === 1 ? "hora" : "horas"} de anticipación.
              Si falta menos, escribinos por Instagram, WhatsApp o email.
            </>,
            "Si no podés venir, cancelá el turno aunque sea con poco tiempo: así liberamos el horario para otra persona. Las ausencias sin aviso también quedan registradas.",
            "Si no te presentás sin avisar en reiteradas oportunidades, podemos limitar la posibilidad de reservar online y pedirte que coordines tus próximos turnos directamente con la barbería.",
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Puntualidad">
        <p>
          Te pedimos llegar a horario. Tenemos una tolerancia de{" "}
          {lateToleranceMinutes} minutos; pasado ese tiempo puede que no
          podamos realizar el servicio completo sin afectar al siguiente
          cliente, en cuyo caso podremos adaptarlo o reprogramar el turno.
        </p>
      </LegalSection>

      <LegalSection title="4. Precios y pagos">
        <LegalList
          items={[
            "Los precios publicados están expresados en pesos argentinos e incluyen el servicio indicado.",
            "Se respeta el precio publicado al momento de la reserva, salvo que en el local se cambie o se agregue un servicio.",
            "El pago se realiza en la barbería al finalizar el servicio. La web no solicita ni procesa datos de pago.",
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Cambios por parte de la barbería">
        <p>
          Por causas de fuerza mayor o imprevistos podemos necesitar
          reprogramar o cancelar un turno. En ese caso te vamos a avisar con
          la mayor anticipación posible, usando los datos de contacto que nos
          diste, y te ofreceremos un nuevo horario.
        </p>
      </LegalSection>

      <LegalSection title="6. Programa de fidelización">
        <p>
          Si la barbería tiene un programa de fidelización activo, los puntos
          o beneficios son personales, no transferibles, no canjeables por
          dinero y pueden modificarse o finalizar avisando previamente en el
          local o en la web.
        </p>
      </LegalSection>

      <LegalSection title="7. Datos personales">
        <p>
          El tratamiento de tus datos se rige por nuestra{" "}
          <Link href="/privacidad" className={linkClass}>
            Política de privacidad
          </Link>
          . Recibir novedades y promociones es opcional y no es necesario para
          reservar.
        </p>
      </LegalSection>

      <LegalSection title="8. Uso del sitio">
        <p>
          Te comprometés a usar el sistema de reservas de buena fe. No está
          permitido realizar reservas falsas, automatizadas o con datos de
          terceros sin su autorización. Podemos cancelar las reservas que no
          cumplan estas condiciones.
        </p>
      </LegalSection>

      <LegalSection title="9. Ley aplicable">
        <p>
          Estos términos se rigen por las leyes de la República Argentina,
          incluida la Ley N° 24.240 de Defensa del Consumidor. Ante cualquier
          controversia serán competentes los tribunales ordinarios de{" "}
          {BARBERSHOP.city}, {BARBERSHOP.province}, sin perjuicio de los
          derechos que te correspondan como consumidor.
        </p>
      </LegalSection>

      <LegalSection title="10. Contacto">
        <p>
          Por cualquier consulta escribinos a{" "}
          <a href={`mailto:${BARBERSHOP.email}`} className={linkClass}>
            {BARBERSHOP.email}
          </a>{" "}
          o por Instagram a{" "}
          <a
            href={BARBERSHOP.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            @{BARBERSHOP.instagramHandle}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { LegalList, LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { BARBERSHOP } from "@/lib/barbershop";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: `Cómo ${BARBERSHOP.legalName} recopila, usa y protege tus datos personales.`,
};

const mail = (
  <a
    href={`mailto:${BARBERSHOP.email}`}
    className="text-[#c09a6c] underline underline-offset-4"
  >
    {BARBERSHOP.email}
  </a>
);

export default function PrivacidadPage() {
  return (
    <LegalPage
      eyebrow="Legales"
      title="Política de privacidad"
      intro={
        <p>
          En {BARBERSHOP.legalName} cuidamos tus datos. Acá te contamos, en
          lenguaje simple, qué información recopilamos cuando reservás un
          turno, para qué la usamos, con quién la compartimos y cómo podés
          pedir que la corrijamos o la eliminemos. Esta política se rige por
          la Ley N° 25.326 de Protección de los Datos Personales de la
          República Argentina.
        </p>
      }
    >
      <LegalSection title="1. Quién es responsable de tus datos">
        <p>
          El responsable de la base de datos es {BARBERSHOP.owner}, titular de{" "}
          {BARBERSHOP.legalName}, con domicilio en {BARBERSHOP.address},{" "}
          {BARBERSHOP.city}, {BARBERSHOP.province}, {BARBERSHOP.country}.
          Contacto: {mail}.
        </p>
      </LegalSection>

      <LegalSection title="2. Qué datos recopilamos">
        <p>Cuando reservás un turno desde esta web nos das:</p>
        <LegalList
          items={[
            "Nombre y apellido.",
            "Teléfono.",
            "Email.",
            "Observaciones que quieras dejarnos (opcional). Te pedimos que no incluyas datos de salud ni otra información sensible.",
            "Tus preferencias de comunicación (si aceptás o no recibir novedades y promociones).",
          ]}
        />
        <p>Además, a partir de tus visitas registramos:</p>
        <LegalList
          items={[
            "Los turnos reservados: servicio, fecha, horario, estado (confirmado, cancelado, completado) y código de reserva.",
            "El historial de servicios y el importe de cada visita.",
            "Si participás del programa de fidelización, los puntos y beneficios acumulados.",
            "La fecha y la versión de esta política y de los Términos que aceptaste.",
          ]}
        />
        <p>
          Este sitio no usa cookies de publicidad ni herramientas de
          seguimiento de terceros. Solo guarda en tu navegador un dato técnico
          temporal para que el proceso de reserva funcione correctamente.
        </p>
      </LegalSection>

      <LegalSection title="3. Para qué usamos tus datos">
        <LegalList
          items={[
            <>
              <strong className="text-[#F4EEE5]">Gestionar tu turno</strong>:
              registrarlo, mostrártelo, permitirte modificarlo o cancelarlo y
              contactarte si hay algún cambio (por ejemplo, si tenemos que
              reprogramarlo).
            </>,
            <>
              <strong className="text-[#F4EEE5]">Atenderte mejor</strong>:
              conocer tu historial de servicios y tus preferencias.
            </>,
            <>
              <strong className="text-[#F4EEE5]">Programa de fidelización</strong>:
              calcular los puntos y beneficios que te correspondan.
            </>,
            <>
              <strong className="text-[#F4EEE5]">Estadísticas internas</strong>:
              entender, de forma agregada, qué servicios y horarios se usan
              más para organizar mejor la agenda.
            </>,
            <>
              <strong className="text-[#F4EEE5]">
                Novedades y promociones (solo si lo aceptás)
              </strong>
              : enviarte ocasionalmente información sobre servicios,
              beneficios o recordatorios comerciales. Es totalmente opcional,
              no es necesario para reservar y podés darte de baja cuando
              quieras.
            </>,
          ]}
        />
        <p>
          Nunca vendemos ni alquilamos tus datos, y no los usamos para fines
          distintos de los indicados.
        </p>
      </LegalSection>

      <LegalSection title="4. Base legal">
        <p>
          Tratamos tus datos porque son necesarios para prestarte el servicio
          que solicitás (la reserva y atención del turno) y porque nos das tu
          consentimiento al aceptar esta política. El consentimiento para
          comunicaciones comerciales es independiente y opcional.
        </p>
      </LegalSection>

      <LegalSection title="5. Con quién compartimos tus datos">
        <p>
          Para que la web funcione usamos proveedores tecnológicos que
          almacenan o procesan la información por cuenta nuestra y bajo
          nuestras instrucciones:
        </p>
        <LegalList
          items={[
            <>
              <strong className="text-[#F4EEE5]">Supabase Inc.</strong> —
              base de datos y autenticación del panel de administración. Sus
              servidores pueden estar ubicados fuera de Argentina.
            </>,
            <>
              <strong className="text-[#F4EEE5]">Vercel Inc.</strong> —
              alojamiento del sitio web. Procesa datos técnicos de conexión
              (como la dirección IP) para servir la página.
            </>,
          ]}
        />
        <p>
          Estos proveedores aplican medidas de seguridad reconocidas
          internacionalmente. Si usás los enlaces a Instagram, WhatsApp o
          Google Maps, esos servicios tratarán tus datos según sus propias
          políticas. Fuera de estos casos, solo compartiremos información si
          una autoridad competente lo exige conforme a la ley.
        </p>
      </LegalSection>

      <LegalSection title="6. Cuánto tiempo guardamos tus datos">
        <p>
          Conservamos tus datos mientras seas cliente de la barbería. Si
          pasan 24 meses sin que registres turnos, podemos eliminarlos o
          anonimizarlos, salvo que debamos conservarlos por una obligación
          legal. Si nos pedís la eliminación, la hacemos antes.
        </p>
      </LegalSection>

      <LegalSection title="7. Cómo protegemos tus datos">
        <p>
          La información viaja cifrada (HTTPS), se guarda en una base de
          datos con reglas de acceso por fila y solo puede consultarla el
          personal autorizado de la barbería mediante usuario y contraseña.
          Los datos de una reserva solo se muestran a quien tenga su código o
          la combinación de email y teléfono con la que se hizo.
        </p>
      </LegalSection>

      <LegalSection title="8. Tus derechos y cómo ejercerlos">
        <p>Podés, en cualquier momento y sin costo:</p>
        <LegalList
          items={[
            "Acceder a los datos que tenemos sobre vos.",
            "Pedir que los corrijamos o actualicemos.",
            "Pedir que los eliminemos (supresión).",
            "Retirar tu consentimiento para recibir novedades y promociones.",
          ]}
        />
        <p>
          Para hacerlo, escribinos a {mail} desde el email con el que
          reservaste (o indicando tu nombre y teléfono) y contanos qué
          necesitás. También podés pedirlo personalmente en la barbería. Para
          proteger tu información, podemos pedirte que acredites tu identidad
          antes de entregarte o modificar datos. Respondemos los pedidos de
          acceso dentro de los 10 días corridos y los de corrección o
          eliminación dentro de los 5 días hábiles, como establece la ley.
        </p>
        <p>
          Si querés modificar o cancelar un turno, podés hacerlo directamente
          desde{" "}
          <Link
            href="/gestionar-reserva"
            className="text-[#c09a6c] underline underline-offset-4"
          >
            Gestionar mi reserva
          </Link>
          .
        </p>
        <p className="border-l border-[#b08a5a]/50 pl-4 text-[13px] leading-7 text-[#aaa198]">
          El titular de los datos personales tiene la facultad de ejercer el
          derecho de acceso a los mismos en forma gratuita a intervalos no
          inferiores a seis meses, salvo que se acredite un interés legítimo
          al efecto conforme lo establecido en el artículo 14, inciso 3 de la
          Ley N° 25.326. La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su
          carácter de Órgano de Control de la Ley N° 25.326, tiene la
          atribución de atender las denuncias y reclamos que interpongan
          quienes resulten afectados en sus derechos por incumplimiento de las
          normas vigentes en materia de protección de datos personales.
        </p>
      </LegalSection>

      <LegalSection title="9. Menores de edad">
        <p>
          Si sos menor de 18 años, la reserva debe hacerla o autorizarla tu
          madre, padre o tutor.
        </p>
      </LegalSection>

      <LegalSection title="10. Cambios en esta política">
        <p>
          Si actualizamos esta política, publicaremos la nueva versión en esta
          página con su fecha. Si el cambio es importante, te lo vamos a pedir
          aceptar nuevamente en tu próxima reserva.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

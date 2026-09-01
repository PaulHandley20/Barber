"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Service = {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
  active: boolean;
};

type Slot = {
  slot_start: string;
  slot_end: string;
};

export default function BookingTestPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);

  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --------------------------------------------------
  // Cargar servicios
  // --------------------------------------------------

  useEffect(() => {
    async function loadServices() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("services")
        .select(
          "id, name, description, duration_minutes, price, active"
        )
        .eq("active", true)
        .order("price", { ascending: true });

      if (error) {
        console.error(error);
        setError(error.message);
        setLoadingServices(false);
        return;
      }

      setServices(data ?? []);
      setLoadingServices(false);
    }

    loadServices();
  }, []);

  // --------------------------------------------------
  // Buscar horarios
  // --------------------------------------------------

  async function loadSlots() {
    if (!selectedService || !selectedDate) {
      return;
    }

    setLoadingSlots(true);
    setError(null);
    setSlots([]);

    const supabase = createClient();

    const { data, error } = await supabase.rpc(
      "get_available_slots",
      {
        p_date: selectedDate,
        p_service_id: selectedService,
      }
    );

    if (error) {
      console.error(error);
      setError(error.message);
      setLoadingSlots(false);
      return;
    }

    setSlots(data ?? []);
    setLoadingSlots(false);
  }

  // --------------------------------------------------
  // Convertir UTC → Argentina
  // --------------------------------------------------

  function formatArgentinaTime(dateString: string) {
    return new Intl.DateTimeFormat("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(dateString));
  }

  return (
    <main
      style={{
        padding: "40px",
        maxWidth: "900px",
        margin: "0 auto",
      }}
    >
      <h1>Booking Test</h1>

      <hr style={{ margin: "30px 0" }} />

      {/* SERVICIOS */}

      <h2>1. Elegí un servicio</h2>

      {loadingServices && <p>Cargando servicios...</p>}

      {!loadingServices && (
        <div
          style={{
            display: "grid",
            gap: "12px",
            marginTop: "20px",
          }}
        >
          {services.map((service) => (
            <button
              key={service.id}
              onClick={() => setSelectedService(service.id)}
              style={{
                padding: "16px",
                textAlign: "left",
                cursor: "pointer",
                border:
                  selectedService === service.id
                    ? "2px solid black"
                    : "1px solid #ccc",
                background:
                  selectedService === service.id
                    ? "#eee"
                    : "white",
              }}
            >
              <strong>{service.name}</strong>

              <br />

              {service.duration_minutes} minutos — $
              {service.price.toLocaleString("es-AR")}
            </button>
          ))}
        </div>
      )}

      <hr style={{ margin: "40px 0" }} />

      {/* FECHA */}

      <h2>2. Elegí una fecha</h2>

      <input
        type="date"
        value={selectedDate}
        onChange={(event) => {
          setSelectedDate(event.target.value);
          setSlots([]);
        }}
        style={{
          marginTop: "20px",
          padding: "12px",
          fontSize: "16px",
        }}
      />

      <hr style={{ margin: "40px 0" }} />

      {/* BUSCAR */}

      <h2>3. Buscar horarios</h2>

      <button
        onClick={loadSlots}
        disabled={!selectedService || !selectedDate || loadingSlots}
        style={{
          marginTop: "20px",
          padding: "14px 24px",
          cursor: "pointer",
        }}
      >
        {loadingSlots
          ? "Buscando..."
          : "Buscar horarios disponibles"}
      </button>

      {/* ERROR */}

      {error && (
        <pre
          style={{
            marginTop: "30px",
            color: "red",
            whiteSpace: "pre-wrap",
          }}
        >
          {error}
        </pre>
      )}

      {/* HORARIOS */}

      {!loadingSlots && slots.length > 0 && (
        <>
          <hr style={{ margin: "40px 0" }} />

          <h2>4. Horarios disponibles</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(120px, 1fr))",
              gap: "12px",
              marginTop: "20px",
            }}
          >
            {slots.map((slot) => (
              <button
                key={slot.slot_start}
                style={{
                  padding: "16px",
                  cursor: "pointer",
                  background: "white",
                  border: "1px solid #ccc",
                }}
              >
                {formatArgentinaTime(slot.slot_start)}
              </button>
            ))}
          </div>
        </>
      )}

      {!loadingSlots &&
        selectedService &&
        selectedDate &&
        slots.length === 0 && (
          <p style={{ marginTop: "30px" }}>
            No hay horarios disponibles para esta fecha.
          </p>
        )}
    </main>
  );
}
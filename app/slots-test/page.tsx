"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Slot = {
  slot_start: string;
  slot_end: string;
};

export default function SlotsTestPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSlots() {
      const supabase = createClient();

      const { data, error } = await supabase.rpc(
        "get_available_slots",
        {
          p_date: "2026-09-02",
          p_service_id:
            "681a3c51-5164-4e39-b874-059d78b1f19f",
        }
      );

      if (error) {
        console.error(error);
        setError(error.message);
        return;
      }

      setSlots(data ?? []);
    }

    loadSlots();
  }, []);

  return (
    <main style={{ padding: "40px" }}>
      <h1>Slots Test</h1>

      {error && <p>{error}</p>}

      {!error && (
        <pre>
          {JSON.stringify(slots, null, 2)}
        </pre>
      )}
    </main>
  );
}
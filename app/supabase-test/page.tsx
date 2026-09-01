"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SupabaseTestPage() {
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    async function loadServices() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("price", { ascending: true });

      if (error) {
        setError(error);
        return;
      }

      setData(data || []);
    }

    loadServices();
  }, []);

  return (
    <main style={{ padding: "40px" }}>
      <h1>Supabase Test</h1>

      {error && (
        <pre>
          {JSON.stringify(error, null, 2)}
        </pre>
      )}

      {!error && (
        <pre>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </main>
  );
}
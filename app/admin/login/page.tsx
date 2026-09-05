"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Email o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    window.location.href = "/admin";
  }

  return (
    <main className="min-h-screen bg-[#0d0d0d] text-[#f4efe6] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <p className="text-xs tracking-[0.35em] uppercase text-[#b8a27a] mb-4">
            Don Segundo
          </p>

          <h1 className="text-4xl font-serif tracking-wide">
            Panel de administración
          </h1>

          <p className="mt-3 text-sm text-white/50">
            Ingresá para gestionar la barbería.
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 space-y-6"
        >
          <div>
            <label
              htmlFor="email"
              className="block text-sm text-white/70 mb-2"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none transition focus:border-[#b8a27a]"
              placeholder="manu@..."
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm text-white/70 mb-2"
            >
              Contraseña
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none transition focus:border-[#b8a27a]"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#b8a27a] text-black font-medium py-3 transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </main>
  );
}
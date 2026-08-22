"use client";

export const dynamic = "force-dynamic";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const searchParams = useSearchParams();
  const urlError = searchParams?.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    urlError === "CredentialsSignin" ? "Invalid email or password." : null
  );
  const [loading, setLoading] = useState(false);

  function fillDemoUser(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("demo1234");
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const targetUrl = email.toLowerCase().includes("plant") ? "/plant" : "/dashboard";

    signIn("credentials", {
      email,
      password,
      callbackUrl: targetUrl
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="card space-y-4 p-6 border border-slate-700/80 bg-slate-900 shadow-2xl">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
            Work Email Address
          </label>
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 shadow-inner transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="office@opussteel.ae"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
            Password
          </label>
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 shadow-inner transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="rounded-md bg-rose-950/60 border border-rose-800/80 p-3 text-xs font-semibold text-rose-300">
            {error}
          </div>
        )}

        <button
          className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500 active:scale-[0.99] disabled:opacity-50"
          disabled={loading}
          type="submit"
        >
          {loading ? (
            <>
              <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Authenticating…
            </>
          ) : (
            "Sign In to OPUS Steel →"
          )}
        </button>
      </form>

      {/* Preset Demo Account Selectors */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
          Quick Demo Accounts (Click to Fill)
        </p>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => fillDemoUser("office@opussteel.ae")}
            className="rounded border border-slate-700 bg-slate-800/80 py-1.5 px-2 text-[11px] font-semibold text-slate-200 hover:bg-slate-700 hover:border-slate-600 transition"
          >
            🏢 Office
          </button>
          <button
            type="button"
            onClick={() => fillDemoUser("plant@opussteel.ae")}
            className="rounded border border-slate-700 bg-slate-800/80 py-1.5 px-2 text-[11px] font-semibold text-slate-200 hover:bg-slate-700 hover:border-slate-600 transition"
          >
            🏭 Plant
          </button>
          <button
            type="button"
            onClick={() => fillDemoUser("admin@opussteel.ae")}
            className="rounded border border-slate-700 bg-slate-800/80 py-1.5 px-2 text-[11px] font-semibold text-slate-200 hover:bg-slate-700 hover:border-slate-600 transition"
          >
            ⚡ Admin
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4 selection:bg-blue-600 selection:text-white">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      <div className="relative w-full max-w-md space-y-6">
        {/* Header Branding */}
        <div className="text-center">
          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 font-black text-white text-xl shadow-xl shadow-blue-600/30 border border-blue-400/30">
            OP
          </div>
          <h1 className="text-xl font-black tracking-tight text-white uppercase">OPUS Steel Construction</h1>
          <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase mt-0.5">
            Enterprise ERP & Production Platform
          </p>
        </div>

        <Suspense fallback={<div className="card p-6 text-center text-slate-400 bg-slate-900 border-slate-800">Loading...</div>}>
          <LoginForm />
        </Suspense>

        <p className="text-center text-[11px] text-slate-500 font-medium">
          OPUS Steel Construction LLC • Dubai, UAE
        </p>
      </div>
    </div>
  );
}

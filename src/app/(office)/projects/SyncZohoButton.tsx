"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncZohoButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/integrations/zoho/sync", { method: "POST" });
      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        setMessage(data.message || "Synced cleanly!");
        router.refresh();
      } else {
        setMessage(data.error || "Sync failed");
      }
    } catch (err) {
      setLoading(false);
      setMessage("Sync error");
    }
  }

  return (
    <div className="flex items-center gap-3">
      {message && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200 shadow-subtle animate-in fade-in duration-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {message}
        </span>
      )}
      <button
        onClick={handleSync}
        disabled={loading}
        className="btn-primary text-xs shadow-subtle hover:shadow"
      >
        {loading ? (
          <>
            <svg className="h-3.5 w-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Syncing Zoho Books…
          </>
        ) : (
          <>
            <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync Zoho Books
          </>
        )}
      </button>
    </div>
  );
}

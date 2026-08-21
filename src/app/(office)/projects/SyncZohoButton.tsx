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
    <div className="flex items-center gap-2">
      <button
        onClick={handleSync}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded bg-steel-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-steel-700 disabled:opacity-50"
      >
        {loading ? "Syncing..." : "⚡ Sync Zoho Projects"}
      </button>
      {message && <span className="text-xs text-signal-blue">{message}</span>}
    </div>
  );
}

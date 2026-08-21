"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReleaseButton({ workOrderId }: { workOrderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function release() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/work-orders/${workOrderId}/release`, { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Could not release work order.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="text-right">
      <button className="btn-primary" onClick={release} disabled={loading}>
        {loading ? "Releasing…" : "Release to Plant"}
      </button>
      {error && <p className="mt-1 text-xs text-signal-red">{error}</p>}
    </div>
  );
}

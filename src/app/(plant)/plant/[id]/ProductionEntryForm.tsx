"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Process = { id: string; name: string };

export function ProductionEntryForm({ workOrderId, processes }: { workOrderId: string; processes: Process[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ processId: "", completedQuantity: "", rejectedQuantity: "0", steelUsedKg: "", scrapKg: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/production-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workOrderId,
        processId: form.processId || undefined,
        completedQuantity: Number(form.completedQuantity),
        rejectedQuantity: Number(form.rejectedQuantity || 0),
        steelUsedKg: Number(form.steelUsedKg || 0),
        scrapKg: Number(form.scrapKg || 0)
      })
    });

    setLoading(false);
    if (!res.ok) {
      const body = await res.json();
      setError(typeof body.error === "string" ? body.error : "Could not submit production.");
      return;
    }
    setForm({ processId: form.processId, completedQuantity: "", rejectedQuantity: "0", steelUsedKg: "", scrapKg: "" });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      <p className="label-eyebrow">Submit production</p>

      <div>
        <label className="label-eyebrow mb-1 block">Process</label>
        <select
          className="input h-12 text-base"
          value={form.processId}
          onChange={(e) => setForm({ ...form, processId: e.target.value })}
        >
          <option value="">Select…</option>
          {processes.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-eyebrow mb-1 block">Completed</label>
          <input
            className="input h-12 text-base"
            type="number"
            inputMode="numeric"
            required
            value={form.completedQuantity}
            onChange={(e) => setForm({ ...form, completedQuantity: e.target.value })}
          />
        </div>
        <div>
          <label className="label-eyebrow mb-1 block">Rejected</label>
          <input
            className="input h-12 text-base"
            type="number"
            inputMode="numeric"
            value={form.rejectedQuantity}
            onChange={(e) => setForm({ ...form, rejectedQuantity: e.target.value })}
          />
        </div>
        <div>
          <label className="label-eyebrow mb-1 block">Steel Used (KG)</label>
          <input
            className="input h-12 text-base"
            type="number"
            inputMode="decimal"
            value={form.steelUsedKg}
            onChange={(e) => setForm({ ...form, steelUsedKg: e.target.value })}
          />
        </div>
        <div>
          <label className="label-eyebrow mb-1 block">Scrap (KG)</label>
          <input
            className="input h-12 text-base"
            type="number"
            inputMode="decimal"
            value={form.scrapKg}
            onChange={(e) => setForm({ ...form, scrapKg: e.target.value })}
          />
        </div>
      </div>

      {error && <p className="text-sm text-signal-red">{error}</p>}
      <button className="btn-primary h-12 w-full text-base" disabled={loading} type="submit">
        {loading ? "Submitting…" : "Submit Production"}
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ProjectOption = { id: string; name: string; customerId: string; customer: { name: string } };

type ItemDraft = { description: string; plannedQuantity: string; unit: string; drawingNumber: string };

const emptyItem: ItemDraft = { description: "", plannedQuantity: "", unit: "Nos", drawingNumber: "" };

export function NewWorkOrderForm({ projects }: { projects: ProjectOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [requiredDeliveryDate, setRequiredDeliveryDate] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([{ ...emptyItem }]);

  function updateItem(idx: number, patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const project = projects.find((p) => p.id === projectId);
    if (!project) {
      setError("Select a project.");
      return;
    }
    setLoading(true);
    setError(null);

    const res = await fetch("/api/work-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        customerId: project.customerId,
        jobDescription,
        requiredDeliveryDate: requiredDeliveryDate || undefined,
        items: items
          .filter((it) => it.description && it.plannedQuantity)
          .map((it) => ({
            description: it.description,
            plannedQuantity: Number(it.plannedQuantity),
            unit: it.unit,
            drawingNumber: it.drawingNumber || undefined
          }))
      })
    });

    setLoading(false);
    if (!res.ok) {
      const body = await res.json();
      setError(typeof body.error === "string" ? body.error : "Could not create work order.");
      return;
    }
    setOpen(false);
    setProjectId("");
    setJobDescription("");
    setItems([{ ...emptyItem }]);
    router.refresh();
  }

  if (!open) {
    return (
      <button className="btn-primary" onClick={() => setOpen(true)}>
        + New Work Order
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="label-eyebrow mb-1 block">Project</label>
          <select className="input" required value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">Select…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.customer.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-eyebrow mb-1 block">Required Delivery Date</label>
          <input
            type="date"
            className="input"
            value={requiredDeliveryDate}
            onChange={(e) => setRequiredDeliveryDate(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="label-eyebrow mb-1 block">Job Description</label>
        <input className="input" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
      </div>

      <div>
        <p className="label-eyebrow mb-2">Items</p>
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2">
              <input
                className="input col-span-5"
                placeholder="Description (e.g. Bracket Assembly)"
                value={it.description}
                onChange={(e) => updateItem(idx, { description: e.target.value })}
              />
              <input
                className="input col-span-2"
                type="number"
                placeholder="Qty"
                value={it.plannedQuantity}
                onChange={(e) => updateItem(idx, { plannedQuantity: e.target.value })}
              />
              <input
                className="input col-span-2"
                placeholder="Unit"
                value={it.unit}
                onChange={(e) => updateItem(idx, { unit: e.target.value })}
              />
              <input
                className="input col-span-3"
                placeholder="Drawing #"
                value={it.drawingNumber}
                onChange={(e) => updateItem(idx, { drawingNumber: e.target.value })}
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn-secondary mt-2 text-xs"
          onClick={() => setItems((prev) => [...prev, { ...emptyItem }])}
        >
          + Add item
        </button>
      </div>

      {error && <p className="text-sm text-signal-red">{error}</p>}
      <div className="flex gap-2">
        <button className="btn-primary" disabled={loading} type="submit">
          {loading ? "Saving…" : "Save as Draft"}
        </button>
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

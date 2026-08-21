"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewProjectForm({ customers }: { customers: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", customerId: "", location: "", projectManager: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json();
      setError(typeof body.error === "string" ? body.error : "Could not create project.");
      return;
    }
    setOpen(false);
    setForm({ name: "", customerId: "", location: "", projectManager: "" });
    router.refresh();
  }

  if (!open) {
    return (
      <button className="btn-primary" onClick={() => setOpen(true)}>
        + New Project
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card grid gap-3 p-5 md:grid-cols-2">
      <div>
        <label className="label-eyebrow mb-1 block">Project Name</label>
        <input
          className="input"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div>
        <label className="label-eyebrow mb-1 block">Customer</label>
        <select
          className="input"
          required
          value={form.customerId}
          onChange={(e) => setForm({ ...form, customerId: e.target.value })}
        >
          <option value="">Select…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label-eyebrow mb-1 block">Location</label>
        <input
          className="input"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
        />
      </div>
      <div>
        <label className="label-eyebrow mb-1 block">Project Manager</label>
        <input
          className="input"
          value={form.projectManager}
          onChange={(e) => setForm({ ...form, projectManager: e.target.value })}
        />
      </div>
      {error && <p className="text-sm text-signal-red md:col-span-2">{error}</p>}
      <div className="flex gap-2 md:col-span-2">
        <button className="btn-primary" disabled={loading} type="submit">
          {loading ? "Creating…" : "Create Project"}
        </button>
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

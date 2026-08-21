import { getZohoIntegrationStatus } from "@/lib/zoho";

export const dynamic = "force-dynamic";

export default async function ZohoSettingsPage() {
  const status = await getZohoIntegrationStatus();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-steel-900">Zoho Books Integration</h1>
        <p className="text-sm text-steel-500">
          Sync Sales Orders into Work Orders and send Dispatches as Draft Invoices to Zoho Books.
        </p>
      </div>

      {/* Connection Status Card */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                status.connected ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
              }`}
            >
              {status.connected ? "● Connected" : "○ Disconnected"}
            </span>
            <h2 className="mt-2 text-base font-medium text-steel-900">{status.statusText}</h2>
          </div>
          <a
            href="https://api-console.zoho.com"
            target="_blank"
            rel="noreferrer"
            className="btn-secondary text-xs"
          >
            Zoho Developer Console ↗
          </a>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-steel-200 pt-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-steel-500">Organization ID</p>
            <p className="text-sm font-mono text-steel-800">{status.organizationId}</p>
          </div>
          <div>
            <p className="text-xs text-steel-500">Client ID</p>
            <p className="text-sm font-mono text-steel-800">{status.clientId}</p>
          </div>
        </div>
      </div>

      {/* Webhook Configuration Guide */}
      <div className="card space-y-4 p-6">
        <h3 className="text-base font-semibold text-steel-900">1. Inbound Webhook (Zoho Books → OPUS Steel)</h3>
        <p className="text-sm text-steel-600">
          Configure a Webhook in Zoho Books to automatically trigger project creation when a Sales Order is confirmed.
        </p>
        
        <div>
          <label className="label-eyebrow mb-1 block">Your Webhook URL</label>
          <input
            readOnly
            className="input font-mono text-xs bg-steel-50 select-all"
            value={status.webhookUrl}
          />
        </div>

        <div className="rounded bg-steel-50 p-4 text-xs text-steel-600 space-y-1">
          <p className="font-semibold text-steel-800">Setup Instructions in Zoho Books:</p>
          <p>1. Open <strong>Zoho Books → Settings → Automation → Webhooks</strong>.</p>
          <p>2. Click <strong>+ New Webhook</strong>.</p>
          <p>3. Paste the Webhook URL above into the <strong>URL</strong> field.</p>
          <p>4. Attach the Webhook to Workflow Rule: <strong>Sales Order → Created / Confirmed</strong>.</p>
        </div>
      </div>

      {/* Required Environment Variables */}
      <div className="card p-6 space-y-3">
        <h3 className="text-base font-semibold text-steel-900">2. Required Environment Variables</h3>
        <p className="text-sm text-steel-600">
          To activate the OAuth connection, add these variables in Vercel / environment settings:
        </p>

        <div className="overflow-x-auto rounded border border-steel-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-steel-100 text-steel-700">
              <tr>
                <th className="p-2.5">Variable Name</th>
                <th className="p-2.5">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-steel-200 font-mono">
              <tr>
                <td className="p-2.5 text-steel-900 font-semibold">ZOHO_CLIENT_ID</td>
                <td className="p-2.5 text-steel-600 font-sans">Client ID from api-console.zoho.com</td>
              </tr>
              <tr>
                <td className="p-2.5 text-steel-900 font-semibold">ZOHO_CLIENT_SECRET</td>
                <td className="p-2.5 text-steel-600 font-sans">Client Secret from Zoho Developer Console</td>
              </tr>
              <tr>
                <td className="p-2.5 text-steel-900 font-semibold">ZOHO_ORGANIZATION_ID</td>
                <td className="p-2.5 text-steel-600 font-sans">Zoho Books Organization ID (found in Organization settings)</td>
              </tr>
              <tr>
                <td className="p-2.5 text-steel-900 font-semibold">ZOHO_REFRESH_TOKEN</td>
                <td className="p-2.5 text-steel-600 font-sans">OAuth Refresh Token generated for your account</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { apiFetch, authUrl } from "./api";
import type { GoogleAccount, GoogleCalendar, User, Workflow } from "./types";

type AuthResponse = {
  user: User | null;
};

type StatusMap = Record<number, string>;

function Navbar({ user, onLogout }: { user: User | null; onLogout: () => Promise<void> }) {
  return (
    <div className="bg-indigo-600 text-white px-6 py-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <a className="font-semibold" href="/">
          Sorting Calendar
        </a>
        <div className="flex items-center gap-5 text-sm">
          <a className="hover:text-indigo-100" href="/">
            Home
          </a>
          <a className="hover:text-indigo-100" href="/dashboard">
            Dashboard
          </a>
          <a className="hover:text-indigo-100" href="/faq">
            FAQ
          </a>
          <a className="hover:text-indigo-100" href="/settings">
            Settings
          </a>
          {user && (
            <button className="hover:text-indigo-100" onClick={onLogout}>
              Logout
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Home({ user }: { user: User | null }) {
  if (user) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="mb-4 text-4xl font-semibold text-gray-900">
          Keep calendars private with fewer conflicts
        </h1>
        <p className="mb-8 max-w-2xl text-gray-600">
          Copy events across connected Google accounts while exposing only the details you choose.
        </p>
        <a
          href="/dashboard"
          className="inline-flex rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Open dashboard
        </a>
      </main>
    );
  }

  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold text-gray-900">Sorting Calendar</h1>
        <p className="mb-6 text-sm text-gray-500">
          Connect Google Calendar and create private busy blocks across accounts.
        </p>
        <a
          className="flex w-full items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          href={authUrl()}
        >
          Login with Google
        </a>
      </div>
    </main>
  );
}

function Dashboard({ user }: { user: User | null }) {
  const [showForm, setShowForm] = useState(false);
  const [sourceGoogleAccountId, setSourceGoogleAccountId] = useState("");
  const [targetGoogleAccountId, setTargetGoogleAccountId] = useState("");
  const [sourceCal, setSourceCal] = useState("");
  const [targetCal, setTargetCal] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [sourceCalendars, setSourceCalendars] = useState<GoogleCalendar[]>([]);
  const [targetCalendars, setTargetCalendars] = useState<GoogleCalendar[]>([]);
  const [statusMap, setStatusMap] = useState<StatusMap>({});
  const [error, setError] = useState("");

  const canSave = sourceGoogleAccountId && targetGoogleAccountId && sourceCal && targetCal;

  async function fetchWorkflows() {
    const data = await apiFetch<Workflow[]>("/api/workflows");
    setWorkflows(Array.isArray(data) ? data : []);
  }

  async function fetchAccounts() {
    const data = await apiFetch<GoogleAccount[]>("/api/google/accounts");
    setAccounts(Array.isArray(data) ? data : []);
  }

  async function fetchCalendars(
    accountId: string,
    setCalendars: (calendars: GoogleCalendar[]) => void
  ) {
    if (!accountId) {
      setCalendars([]);
      return;
    }

    const data = await apiFetch<GoogleCalendar[]>(`/api/google/calendars?accountId=${accountId}`);
    setCalendars(Array.isArray(data) ? data : []);
  }

  function resetForm() {
    setSourceGoogleAccountId("");
    setTargetGoogleAccountId("");
    setSourceCal("");
    setTargetCal("");
    setSourceCalendars([]);
    setTargetCalendars([]);
    setEditingId(null);
    setShowForm(false);
    setError("");
  }

  useEffect(() => {
    if (!user) return;

    fetchWorkflows().catch((err: Error) => setError(err.message));
    fetchAccounts().catch((err: Error) => setError(err.message));
  }, [user]);

  useEffect(() => {
    fetchCalendars(sourceGoogleAccountId, setSourceCalendars).catch((err: Error) =>
      setError(err.message)
    );
  }, [sourceGoogleAccountId]);

  useEffect(() => {
    fetchCalendars(targetGoogleAccountId, setTargetCalendars).catch((err: Error) =>
      setError(err.message)
    );
  }, [targetGoogleAccountId]);

  async function saveWorkflow() {
    if (!canSave) {
      setError("Please select both Gmail accounts and both calendars.");
      return;
    }

    const payload = {
      name: "Custom Workflow",
      sourceGoogleAccountId: Number(sourceGoogleAccountId),
      targetGoogleAccountId: Number(targetGoogleAccountId),
      sourceCal,
      targetCal,
    };

    if (editingId) {
      await apiFetch(`/api/workflows/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    } else {
      await apiFetch("/api/workflows", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }

    await fetchWorkflows();
    resetForm();
  }

  async function runSync(workflow: Workflow) {
    try {
      setStatusMap((prev) => ({ ...prev, [workflow.id]: "syncing" }));
      await apiFetch(`/api/workflows/${workflow.id}/run`, { method: "POST" });
      setStatusMap((prev) => ({ ...prev, [workflow.id]: "done" }));
      await fetchWorkflows();
      window.setTimeout(() => {
        setStatusMap((prev) => ({ ...prev, [workflow.id]: "" }));
      }, 2000);
    } catch (err) {
      setStatusMap((prev) => ({ ...prev, [workflow.id]: "error" }));
      setError(err instanceof Error ? err.message : "Sync failed");
    }
  }

  async function editWorkflow(workflow: Workflow) {
    setEditingId(workflow.id);
    setSourceGoogleAccountId(String(workflow.sourceGoogleAccountId));
    setTargetGoogleAccountId(String(workflow.targetGoogleAccountId));
    await fetchCalendars(String(workflow.sourceGoogleAccountId), setSourceCalendars);
    await fetchCalendars(String(workflow.targetGoogleAccountId), setTargetCalendars);
    setSourceCal(workflow.sourceCal);
    setTargetCal(workflow.targetCal);
    setShowForm(true);
  }

  async function toggleWorkflow(workflow: Workflow) {
    const enabled = !workflow.enabled;
    await apiFetch(`/api/workflows/${workflow.id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    });
    setWorkflows((prev) =>
      prev.map((item) => (item.id === workflow.id ? { ...item, enabled } : item))
    );
  }

  async function deleteWorkflow(workflow: Workflow) {
    await apiFetch(`/api/workflows/${workflow.id}`, { method: "DELETE" });
    setWorkflows((prev) => prev.filter((item) => item.id !== workflow.id));
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="mb-2 text-2xl font-semibold text-gray-900">Login required</h1>
          <p className="mb-6 text-sm text-gray-500">Connect Google before managing workflows.</p>
          <a className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white" href={authUrl()}>
            Login with Google
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-500">Manage cross-account calendar workflows.</p>
      </div>

      {error && (
        <div className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-8 rounded-md border border-blue-200 bg-blue-50 p-4 text-blue-700">
        Welcome to Sorting Calendar. Your free trial is currently active.
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Workflows</h2>
            <p className="text-sm text-gray-500">Choose source and destination calendars.</p>
          </div>
          <div className="flex gap-2">
            <a
              href={authUrl()}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Connect Gmail
            </a>
            <button
              onClick={() => setShowForm(true)}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
            >
              Add
            </button>
          </div>
        </div>

        {showForm && (
          <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 text-sm font-medium text-gray-900">
              {editingId ? "Edit Workflow" : "Create Workflow"}
            </h3>
            <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <select
                className="rounded border border-gray-300 px-3 py-2 text-sm"
                value={sourceGoogleAccountId}
                onChange={(event) => {
                  setSourceGoogleAccountId(event.target.value);
                  setSourceCal("");
                }}
              >
                <option value="">Source Gmail</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.email}
                  </option>
                ))}
              </select>

              <select
                className="rounded border border-gray-300 px-3 py-2 text-sm"
                value={targetGoogleAccountId}
                onChange={(event) => {
                  setTargetGoogleAccountId(event.target.value);
                  setTargetCal("");
                }}
              >
                <option value="">Target Gmail</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.email}
                  </option>
                ))}
              </select>

              <select
                className="rounded border border-gray-300 px-3 py-2 text-sm"
                value={sourceCal}
                onChange={(event) => setSourceCal(event.target.value)}
              >
                <option value="">Source Calendar</option>
                {sourceCalendars.map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.summary}
                  </option>
                ))}
              </select>

              <select
                className="rounded border border-gray-300 px-3 py-2 text-sm"
                value={targetCal}
                onChange={(event) => setTargetCal(event.target.value)}
              >
                <option value="">Target Calendar</option>
                {targetCalendars.map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.summary}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => saveWorkflow().catch((err: Error) => setError(err.message))}
                className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
                disabled={!canSave}
              >
                Save
              </button>
              <button onClick={resetForm} className="px-3 py-2 text-sm text-gray-500">
                Cancel
              </button>
            </div>
          </div>
        )}

        {accounts.length === 0 && (
          <div className="mt-10 text-center text-gray-400">
            Connect a Gmail account before creating workflows.
          </div>
        )}

        {accounts.length > 0 && workflows.length === 0 && (
          <div className="mt-10 text-center text-gray-400">
            No workflows yet. Click Add to create one.
          </div>
        )}

        <div className="space-y-3">
          {workflows.map((workflow) => (
            <WorkflowRow
              key={workflow.id}
              workflow={workflow}
              status={statusMap[workflow.id]}
              onToggle={() => toggleWorkflow(workflow).catch((err: Error) => setError(err.message))}
              onEdit={() => editWorkflow(workflow).catch((err: Error) => setError(err.message))}
              onRun={() => runSync(workflow)}
              onDelete={() =>
                deleteWorkflow(workflow).catch((err: Error) => setError(err.message))
              }
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function WorkflowRow({
  workflow,
  status,
  onToggle,
  onEdit,
  onRun,
  onDelete,
}: {
  workflow: Workflow;
  status?: string;
  onToggle: () => void;
  onEdit: () => void;
  onRun: () => void;
  onDelete: () => void;
}) {
  const runLabel =
    status === "syncing"
      ? "Syncing..."
      : status === "done"
        ? "Synced"
        : status === "error"
          ? "Error"
          : "Run";

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-5 shadow-sm">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${workflow.enabled ? "bg-green-500" : "bg-gray-400"}`}
          />
          <h2 className="text-lg font-semibold text-gray-800">{workflow.name}</h2>
        </div>
        <p className="text-sm text-gray-500">
          {workflow.sourceGoogleAccount?.email} / {workflow.sourceCal} &rarr;{" "}
          {workflow.targetGoogleAccount?.email} / {workflow.targetCal}
        </p>
        <p className="mt-2 text-sm text-gray-800">
          Last synced:{" "}
          {workflow.lastSyncedAt ? new Date(workflow.lastSyncedAt).toLocaleString() : "Never"}
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={onToggle}
          className="rounded-md bg-yellow-500 px-3 py-2 text-white hover:bg-yellow-600"
        >
          {workflow.enabled ? "Disable" : "Enable"}
        </button>
        <button onClick={onEdit} className="rounded-md px-3 py-2 text-gray-500 hover:text-black">
          Edit
        </button>
        <button
          onClick={onRun}
          className={`rounded-md px-3 py-2 text-white ${
            status === "syncing"
              ? "bg-gray-400"
              : status === "done"
                ? "bg-green-500"
                : status === "error"
                  ? "bg-red-500"
                  : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {runLabel}
        </button>
        <button
          onClick={onDelete}
          className="rounded-md bg-red-500 px-3 py-2 text-white hover:bg-red-600"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function FAQ() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-3xl font-semibold text-gray-900">FAQ</h1>
      <div className="space-y-5 text-sm text-gray-600">
        <section>
          <h2 className="mb-1 font-medium text-gray-900">What gets copied?</h2>
          <p>Right now the app copies future timed events as private busy blocks.</p>
        </section>
        <section>
          <h2 className="mb-1 font-medium text-gray-900">Can I connect multiple accounts?</h2>
          <p>Yes. Connect Gmail again while logged in to add another Google account.</p>
        </section>
      </div>
    </main>
  );
}

function Settings({ user, onLogout }: { user: User | null; onLogout: () => Promise<void> }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-3xl font-semibold text-gray-900">Settings</h1>
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <p className="mb-2 text-sm text-gray-500">Signed in as</p>
        <p className="mb-6 font-medium text-gray-900">{user?.email || "Not logged in"}</p>
        {user ? (
          <button onClick={onLogout} className="rounded-md bg-black px-4 py-2 text-sm text-white">
            Logout
          </button>
        ) : (
          <a href={authUrl()} className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white">
            Login with Google
          </a>
        )}
      </div>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const path = useMemo(() => window.location.pathname, []);

  async function loadUser() {
    const data = await apiFetch<AuthResponse>("/api/auth/me");
    setUser(data.user);
  }

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.href = "/";
  }

  useEffect(() => {
    loadUser()
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  let page = <Home user={user} />;

  if (path === "/dashboard") page = <Dashboard user={user} />;
  if (path === "/faq") page = <FAQ />;
  if (path === "/settings") page = <Settings user={user} onLogout={logout} />;

  return (
    <>
      <Navbar user={user} onLogout={logout} />
      {isLoading ? (
        <main className="mx-auto max-w-3xl px-6 py-16 text-sm text-gray-500">Loading...</main>
      ) : (
        page
      )}
    </>
  );
}

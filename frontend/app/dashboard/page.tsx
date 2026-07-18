"use client";

import { useEffect, useState } from "react";

type GoogleAccount = {
  id: number;
  email: string;
};
type WorkflowCalendar = {
  id: number;
  googleAccountId: number;
  calendarId: string;
  googleAccount?: GoogleAccount;
};
type Workflow = {
  id: number;
  name: string;
  sourceCal: string;
  targetCal: string;
  sourceGoogleAccountId: number;
  targetGoogleAccountId: number;
  sourceGoogleAccount?: GoogleAccount;
  targetGoogleAccount?: GoogleAccount;
  sourceCalendars: WorkflowCalendar[];
  targetCalendars: WorkflowCalendar[];
  enabled: boolean;
  lastSyncedAt?: string | null;

  includeTimedEvents: boolean;
  includeAllDayEvents: boolean;
  includeNonBusyEvents: boolean;
  includeTentativeEvents: boolean;
  includeFocusTimeEvents: boolean;
  includeOutOfOfficeEvents: boolean;

  removeSummaryLocation: boolean;
  replacementSummary?: string | null;

  preserveManualChanges: boolean;
};

export default function Dashboard() {
  const [showForm, setShowForm] = useState(false);
  const [sourceGoogleAccountId, setSourceGoogleAccountId] = useState("");
  const [targetGoogleAccountId, setTargetGoogleAccountId] = useState("");
  const [sourceCal, setSourceCal] = useState("");
  const [targetCal, setTargetCal] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [workflows, setWorkFlows] = useState<Workflow[]>([]);
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [sourceCalendars, setSourceCalendars] = useState<any[]>([]);
  const [targetCalendars, setTargetCalendars] = useState<any[]>([]);
  const [selectedSources, setSelectedSources] = useState<any[]>([]);
  const [selectedTargets, setSelectedTargets] = useState<any[]>([]);
  const [statusMap, setStatusMap] = useState<{ [key: number]: string }>({});
  const [includeTimedEvents, setIncludeTimedEvents] = useState(true);
  const [includeAllDayEvents, setIncludeAllDayEvents] = useState(true);
  const [includeNonBusyEvents, setIncludeNonBusyEvents] = useState(false);
  const [includeTentativeEvents, setIncludeTentativeEvents] = useState(false);
  const [includeFocusTimeEvents, setIncludeFocusTimeEvents] = useState(false);
  const [includeOutOfOfficeEvents, setIncludeOutOfOfficeEvents] = useState(false);

  const [removeSummaryLocation, setRemoveSummaryLocation] = useState(false);
  const [replacementSummary, setReplacementSummary] = useState("");

  const [preserveManualChanges, setPreserveManualChanges] = useState(false);

  const fetchWorkflows = async () => {
    const res = await fetch("/api/workflows");
    if(!res.ok){
      throw new Error(`/api/workflows returned ${res.status}`);
    }
    const data = await res.json();
    console.log("Fetched workflows:", data);
    setWorkFlows(Array.isArray(data) ? data : []);
  };

  const fetchAccounts = async () => {
    const res = await fetch("/api/google/accounts");
    const data = await res.json();
    setAccounts(Array.isArray(data) ? data : []);
  };

  const [deletingAccountId, setDeletingAccountId] = useState<number | null>(null);
  const deleteGoogleAccount = async (accountId: number) => {
    const confirmed = window.confirm("Are you sure you want to remove this Google account?");
    if(!confirmed) return;
    try{
      setDeletingAccountId(accountId);
    
    const res = await fetch(`/api/google/accounts/delete?id=${accountId}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if(!res.ok){
      let message = data.error;
      if(data.workflow?.length){
        message +="\n\nUsed by:\n"+data.workflows.map((w: any)=> `• ${w.name}`).join("\n" );
      }
      alert(message);
      return;
    }
    alert("Google account removed successfully.");
    await fetchAccounts();
    //await fetchCalendars();
    // refresh workflows because dropdowns depend on accounts
    await fetchWorkflows();

  } catch(err){
    console.error(err);
    alert("Something went wrong while deleting the account.");
  }finally{
    setDeletingAccountId(null);
  }};

  const fetchCalendars = async (
    accountId: string,
    setCalendars: (calendars: any[]) => void
  ) => {
    if (!accountId) {
      setCalendars([]);
      return [];
    }

    const res = await fetch(`/api/google/calendars?accountId=${accountId}`);
    
    if(!res.ok){
      const error = await res.json();
      alert(
        error.error || "Failed to load calendars"
      );
      return;
    }
      const data = await res.json();
      const calendars = Array.isArray(data) ? data : [];
    setCalendars(calendars);
    return calendars;
  };

  const resetForm = () => {
    setSourceGoogleAccountId("");
    setTargetGoogleAccountId("");
    setSourceCal("");
    setTargetCal("");
    setSourceCalendars([]);
    setTargetCalendars([]);
    setSelectedSources([]);
    setSelectedTargets([]);
    setEditingId(null);
    setShowForm(false);
    setIncludeTimedEvents(true);
    setIncludeAllDayEvents(true);
    setIncludeNonBusyEvents(false);
    setIncludeTentativeEvents(false);
    setIncludeFocusTimeEvents(false);
    setIncludeOutOfOfficeEvents(false);

    setRemoveSummaryLocation(false);
    setReplacementSummary("");

    setPreserveManualChanges(false);
  };

  useEffect(() => {
    fetchWorkflows();
    fetchAccounts();
  }, []);

  useEffect(() => {
    fetchCalendars(sourceGoogleAccountId, setSourceCalendars);
  }, [sourceGoogleAccountId]);

  useEffect(() => {
    fetchCalendars(targetGoogleAccountId, setTargetCalendars);
  }, [targetGoogleAccountId]);

  const addSourceCalendar = () => {
    alert("addSourceCalendar called");
    if (!sourceGoogleAccountId || !sourceCal){
      alert("Select source Gmail and calendar");
      return;
    }
    const account = accounts.find(
      (a) => a.id == Number(sourceGoogleAccountId)
    );
    const calendar = sourceCalendars.find(
      (c) => c.id == sourceCal
    );
    if (!account || !calendar) return;

    // Prevent duplicate source calendars
    if(
      selectedSources.some(
        (s)=>
          s.calendarId === sourceCal && s.googleAccountId === Number(sourceGoogleAccountId)
      )
    ){
      alert("This source calendar has already been added");
      return;
    }
    setSelectedSources((prev)=> {
      const updated =[
      ...prev,
      {
        googleAccountId: Number(sourceGoogleAccountId),
        googleEmail: account.email,
        calendarId: sourceCal,
        calendarName: calendar.summary,
      },
    ]
  console.log("UPDATED SOURCES:", updated)
return updated;});
    setSourceCal("");
  };
  const removeSourceCalendar =(index:number)=> {
    setSelectedSources((prev)=>prev.filter((_,i)=> i !== index));
  };
  const removeTargetCalendar = (index: number)=> {
    setSelectedTargets((prev)=> prev.filter((_,i)=> i !== index));
  };
  const addTargetCalendar = () => {
    if(!targetGoogleAccountId || !targetCal){
      alert("Select target Gmail and calendar");
      return;
    }
    const account = accounts.find(
      (a) => a.id === Number(targetGoogleAccountId)
    );
    const calendar = targetCalendars.find(
      (c) => c.id === targetCal
    );
    if(!account || !calendar) return;
    if(
      selectedTargets.some(
        (t)=> 
          t.calendarId === targetCal && t.googleAccountId === Number(targetGoogleAccountId)
      )
    ){
      alert("This target calendar has already been added");
      return;
    }
    setSelectedTargets((prev)=> [
      ...prev,
      {
        googleAccountId: Number(targetGoogleAccountId),
        googleEmail: account.email,
        calendarId: targetCal,
        calendarName: calendar.summary,
      }

    ]
    );
    setTargetCal("");
  };

  const saveWorkflow = async () => {
    if (selectedSources.length === 0 || selectedTargets.length === 0){
      alert("Add at least one source and one target calendar");
      return;
    }

    const payload = {
      name: "Custom Workflow",
      sourceCalendars: selectedSources.map((s)=>({
        googleAccountId: s.googleAccountId,
        calendarId: s.calendarId,
      })),
      targetCalendars: selectedTargets.map((t)=> ({
        googleAccountId: t.googleAccountId,
        calendarId: t.calendarId,
      })),

      includeTimedEvents,
      includeAllDayEvents,
      includeNonBusyEvents,
      includeTentativeEvents,
      includeFocusTimeEvents,
      includeOutOfOfficeEvents,

      removeSummaryLocation,
      replacementSummary,

      preserveManualChanges,
    };

    if (editingId) {
      await fetch(`/api/workflows?id=${editingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } else {
      const workflowRes = await fetch("/api/workflows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if(!workflowRes.ok){
        throw new Error("Failed to create workflow");
      }
      const workflow = await workflowRes.json();
    
    }

    await fetchWorkflows();
    resetForm();
  };

  const runSync = async (workflow: Workflow) => {
    try {
      setStatusMap((prev) => ({ ...prev, [workflow.id]: "syncing" }));

      const res = await fetch("/api/workflows/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workflowId: workflow.id }),
      });

      if (!res.ok) {
        throw new Error("Sync failed");
      }

      setStatusMap((prev) => ({ ...prev, [workflow.id]: "done" }));
      await fetchWorkflows();

      setTimeout(() => {
        setStatusMap((prev) => ({ ...prev, [workflow.id]: "" }));
      }, 2000);
    } catch (err) {
      console.error(err);
      setStatusMap((prev) => ({ ...prev, [workflow.id]: "error" }));
    }
  };

  const editWorkflow = async (workflow: Workflow) => {
    console.log("EDIT WORKFLOW");
    console.log(workflow);
    console.log("SOURCE CALENDARS:", workflow.sourceCalendars);
    console.log("TARGET CALENDARS:", workflow.targetCalendars);
    setEditingId(workflow.id);
    setSourceGoogleAccountId(String(workflow.sourceGoogleAccountId));
    setTargetGoogleAccountId(String(workflow.targetGoogleAccountId));
    const sourceList = await fetchCalendars(
  String(workflow.sourceGoogleAccountId),
  setSourceCalendars
);

const targetList = await fetchCalendars(
  String(workflow.targetGoogleAccountId),
  setTargetCalendars
);
setSelectedSources(
  workflow.sourceCalendars.map((c) => ({
    googleAccountId: c.googleAccountId,
    googleEmail: c.googleAccount?.email,
    calendarId: c.calendarId,
    calendarName:
      sourceList.find((cal: any) => cal.id === c.calendarId)?.summary ??
      c.calendarId,
  }))
);

setSelectedTargets(
  workflow.targetCalendars.map((c) => ({
    googleAccountId: c.googleAccountId,
    googleEmail: c.googleAccount?.email,
    calendarId: c.calendarId,
    calendarName:
      targetList.find((cal: any) => cal.id === c.calendarId)?.summary ??
      c.calendarId,
  }))
);
    setSourceCal(workflow.sourceCal);
    setTargetCal(workflow.targetCal);
    setIncludeFocusTimeEvents(workflow.includeFocusTimeEvents);
    setIncludeAllDayEvents(workflow.includeAllDayEvents);
    setIncludeNonBusyEvents(workflow.includeNonBusyEvents);
    setIncludeTentativeEvents(workflow.includeTentativeEvents);
    setIncludeTimedEvents(workflow.includeTimedEvents);
    setIncludeOutOfOfficeEvents(workflow.includeOutOfOfficeEvents);

    setRemoveSummaryLocation(workflow.removeSummaryLocation);
    setReplacementSummary(workflow.replacementSummary || "");

    setPreserveManualChanges(workflow.preserveManualChanges);
    setShowForm(true);

  };
  console.log("selectedSources:", selectedSources);
  console.log("selectedTargets:", selectedTargets);

  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
      <p className="text-sm text-gray-500 mb-4">Manage your calendar workflows</p>

      <div className="bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-md mb-8">
        Welcome to Sorting Calendar. Your free trial is currently active.
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-medium mb-4">Getting Started</h2>

        <p className="text-gray-600 mb-4">
          Sorting Calendar automatically copies events between your calendars and removes identifying information.
        </p>

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Workflows</h2>
          <div className="flex gap-2">
            <a
              href="/api/google/connect"
              className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-50"
            >
              Connect Gmail
            </a>
            <button
              onClick={() => setShowForm(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700"
            >
              Add
            </button>
          </div>
        </div>
        <div className="bg-gray-50 border rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Connected Google Accounts</h3>
            <span className="text-sm text-gray-500">
              {accounts.length} connected
            </span>
          </div>
          {accounts.length === 0 ?(
            <p className="test-gray-500 text-sm">
              No Google accounts connected.
            </p>
          ): (
            <div className="space-y-2">
              {accounts.map((account)=>(
                <div 
                key={account.id}
                className="flex items-center justify-between border bg-white rounded-lg px-4 py-3">
                  <div> 
                    <p className="font-medium">{account.email}</p>
                    </div>
                    <button
                    onClick={()=> deleteGoogleAccount(account.id)}
                    disabled={deletingAccountId == account.id}
                    className="px-3 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 disabled:bg-gray-100 disabled:text-gray-400 transition text-sm">
                      {deletingAccountId === account.id  ? "Removing...": "Remove"}
                    </button>
                    </div>
              ))}
            </div>
          )}
        </div>

        {showForm && (
          <div className="border border-gray-200 p-4 rounded-lg mb-4 bg-gray-50">
            <h3 className="text-sm font-medium mb-3">
              {editingId ? "Edit Workflow" : "Create Workflow"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <select
                className="border px-2 py-1 rounded text-sm"
                value={sourceGoogleAccountId}
                onChange={(e) => {
                  setSourceGoogleAccountId(e.target.value);
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
                className="border px-2 py-1 rounded text-sm"
                value={targetGoogleAccountId}
                onChange={(e) => {
                  setTargetGoogleAccountId(e.target.value);
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
                className="border px-2 py-1 rounded text-sm"
                value={sourceCal}
                onChange={(e) => setSourceCal(e.target.value)}
              >
                <option value="">Source Calendar</option>
                {sourceCalendars.map((cal: any) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.summary}
                  </option>
                ))}
              </select>
              <button 
                type="button"
                onClick={addSourceCalendar}
                className="bg-green-500 text-white px-2 py-1 rounded">
                  Add Source
                </button>

              <select
                className="border px-2 py-1 rounded text-sm"
                value={targetCal}
                onChange={(e) => setTargetCal(e.target.value)}
              >
                <option value="">Target Calendar</option>
                {targetCalendars.map((cal: any) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.summary}
                  </option>
                ))}
                
              </select>
              <button 
                type="button"
                onClick={addTargetCalendar}
                className="bg-blue-500 text-white px-2 py-1 rounded">
                  Add Target
                </button>
              <div className="mt-4">
                <h4 className="font-medium">Selected Sources Test 123</h4>
                {selectedSources.map((s,idx)=>(
                  <div 
                  key={idx}
                  className="flex items-center justify-between border rounded-lg px-3 py-2 mb-2 bg-white">
                    <div>
                      <div className="font-medium">{s.calendarName}</div>
                      <div className="text-xs text-gray-500">
                        {s.googleEmail}
                    </div>
                    </div>
                    <button
                    type="button"
                    onClick={()=> removeSourceCalendar(idx)}
                    className="px-3 py-1 rounded-md bg-red text-red-600 hover:bg-red-100 text-sm">
                      Remove
                    </button>
                    </div>
                ))}
            </div>
            <div className="mt-4">
              <h4 className="font-medium"> Selected Targets</h4>
              {selectedTargets.map((t, idx)=> (
                <div key={idx}
                className="flex items-center justify-between border rounded-lg px-3 py-2 mb-2 bg-white">
                  <div>
                    <div className="font-medium">{t.calendarName}</div>
                    <div className="text-xs text-gray-500">
                      {t.googleEmail}
                  </div>
                  </div>
                  <button
                  type="button"
                  onClick={()=> removeTargetCalendar(idx)}
                  className="px-3 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 text-sm">
                    Remove
                  </button>
                  </div>
              ))}
              </div>
              </div>

            <div className="border-t pt-3 mt-3">
              <h4 className="font-medium mb-2">Event Filters</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">

                <label>
                  <input
                    type="checkbox"
                    checked={includeTimedEvents}
                    onChange ={(e)=> setIncludeTimedEvents(e.target.checked)}
                      />
                      {" "}Timed Events
                      </label>

                       <label>
                  <input
                    type="checkbox"
                    checked={includeAllDayEvents}
                    onChange ={(e)=> setIncludeAllDayEvents(e.target.checked)}
                      />
                      {" "}All Day Events
                      </label>

                       <label>
                  <input
                    type="checkbox"
                    checked={includeNonBusyEvents}
                    onChange ={(e)=> setIncludeNonBusyEvents(e.target.checked)}
                      />
                      {" "}Non Busy Events
                      </label>

                       <label>
                  <input
                    type="checkbox"
                    checked={includeTentativeEvents}
                    onChange ={(e)=> setIncludeTentativeEvents(e.target.checked)}
                      />
                      {" "}Tentative Events
                      </label>

                       <label>
                  <input
                    type="checkbox"
                    checked={includeFocusTimeEvents}
                    onChange ={(e)=> setIncludeFocusTimeEvents(e.target.checked)}
                      />
                      {" "}Focus Time Events
                      </label>

                       <label>
                  <input
                    type="checkbox"
                    checked={includeOutOfOfficeEvents}
                    onChange ={(e)=> setIncludeOutOfOfficeEvents(e.target.checked)}
                      />
                      {" "}Out Of Office
                      </label>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm">
                          <input
                           type="checkbox"
                           checked={removeSummaryLocation}
                           onChange={(e) => setRemoveSummaryLocation(e.target.checked)}
                           />
                           {" "}Replace Event Title
                        </label>

                        {removeSummaryLocation && (
                          <input
                            className="border rounded px-2 py-1 mt-2 w-full"
                            value={replacementSummary}
                            onChange={(e) => setReplacementSummary(e.target.value)}
                            placeholder="Busy"
                            />
                        )}
                        </div>

                        <div className="mt-4">
                          <label className="text-sm">
                            <input
                             type="checkbox"
                             checked={preserveManualChanges}
                             onChange={(e) => setPreserveManualChanges(e.target.checked)}
                             />
                             {" "}Preserve Manual Changes
                          </label>
                          </div>
                          </div>                    
                

            <div className="flex gap-2">
              <button
                onClick={saveWorkflow}
                className="bg-black text-white px-3 py-1 rounded text-sm"
              >
                Save
              </button>

              <button onClick={resetForm} className="text-gray-500 text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}

        {accounts.length === 0 && (
          <div className="text-center text-gray-400 mt-10">
            Connect a Gmail account before creating workflows.
          </div>
        )}

        {accounts.length > 0 && workflows.length === 0 && (
          <div className="text-center text-gray-400 mt-10">
            No workflows yet. Click Add to create one.
          </div>
        )}

        {workflows.map((wf) => (
          <div
            key={wf.id}
            className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 p-5 flex justify-between items-center"
          >
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    wf.enabled ? "bg-green-500" : "bg-gray-400"
                  }`}
                ></span>
                <h2 className="text-lg font-semibold text-gray-800">{wf.name}</h2>
              </div>

              <p className="text-sm text-gray-500">
                {wf.sourceGoogleAccount?.email} / {wf.sourceCal} &rarr;{" "}
                {wf.targetGoogleAccount?.email} / {wf.targetCal}
              </p>

              <span
                className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                  wf.enabled
                    ? "bg-green-100 text-green-600"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {wf.enabled ? "Enabled" : "Disabled"}
              </span>

              <p className="text-gray-800 text-sm">
                {wf.lastSyncedAt ? new Date(wf.lastSyncedAt).toLocaleString() : "Never"}
              </p>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <button
                onClick={async () => {
                  const newStatus = !wf.enabled;
                  await fetch(`/api/workflows?id=${wf.id}`, {
                    method: "PATCH",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      enabled: newStatus,
                      sourceCal: wf.sourceCal,
                      targetCal: wf.targetCal,
                      sourceGoogleAccountId: wf.sourceGoogleAccountId,
                      targetGoogleAccountId: wf.targetGoogleAccountId,
                    }),
                  });
                  setWorkFlows(
                    workflows.map((w) =>
                      w.id === wf.id ? { ...w, enabled: newStatus } : w
                    )
                  );
                }}
                className="px-3 py-1 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 active:scale-95 transition"
              >
                Toggle
              </button>

              <button
                onClick={() => editWorkflow(wf)}
                className="text-gray-500 hover:text-black"
              >
                Edit
              </button>

              <button
                onClick={() => runSync(wf)}
                className={`px-3 py-1 rounded-lg text-white transition ${
                  statusMap[wf.id] === "syncing"
                    ? "bg-gray-400"
                    : statusMap[wf.id] === "done"
                    ? "bg-green-500"
                    : statusMap[wf.id] === "error"
                    ? "bg-red-500"
                    : "bg-blue-500 hover:bg-blue-600"
                }`}
              >
                {statusMap[wf.id] === "syncing"
                  ? "Syncing..."
                  : statusMap[wf.id] === "done"
                  ? "Synced"
                  : statusMap[wf.id] === "error"
                  ? "Error...try again"
                  : "Run"}
              </button>

              <button
                onClick={async () => {
                  await fetch(`/api/workflows?id=${wf.id}`, {
                    method: "DELETE",
                  });
                  setWorkFlows(workflows.filter((w) => w.id !== wf.id));
                }}
                className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 active:scale-95 transition"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

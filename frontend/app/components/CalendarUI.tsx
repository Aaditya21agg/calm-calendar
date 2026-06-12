"use client";
import { signIn } from "next-auth/react";

export default function CalendarUI({
    session,
    calendars,
    events,
    sourceCal,
    targetCal,
    setSourceCal,
    setTargetCal,
    syncEvents,
    isSyncing,
    status,
    signOut,
}: any) {
if(!session){
    return(
      <div className ="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className = "bg-white shadow-lg rounded-2x1 p-10 w-full max-w-md text-center">
      
        <h1 className="text-2x1 font-bold text-gray-800 mb-2">
           Sorting Calendar
           </h1>
           <p className="text-sm text-gray-500 mb-6">
            Automatically sync and organize your Google Calendars
           </p>
        <button onClick={()=> signIn("google")}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition">
          <img src="https://www.svgrepo.com/show/475656/google-color.svg"
          className="w-h h-5"/>
           Login with Google</button>          
              </div>
              </div>
    );
  }
    return(
        
    
  <div className="min-h-screen bg-white text-gray-900 px-10 py-12">
    <div className="max-w-4xl mx-auto">

      {/* HERO TEXT */}
      <h1 className="text-4xl font-semibold leading-tight mb-4">
        Keep your calendars private, and with fewer conflicts
      </h1>

      <p className="text-lg text-gray-600 mb-10">
        Sync your work calendar into your personal plans, without revealing more than necessary.
      </p>

      {/* CONTROLS */}
      <div className="flex items-center gap-4 mb-10">

        <select
          className="border border-gray-300 px-3 py-2 rounded-md text-sm"
          onChange={(e) => setSourceCal(e.target.value)}
        >
          <option value="">Source calendar</option>
          {calendars.map((cal: any) => (
            <option key={cal.id} value={cal.id}>
              {cal.summary}
            </option>
          ))}
        </select>

        <select
          className="border border-gray-300 px-3 py-2 rounded-md text-sm"
          onChange={(e) => setTargetCal(e.target.value)}
        >
          <option value="">Target calendar</option>
          {calendars.map((cal: any) => (
            <option key={cal.id} value={cal.id}>
              {cal.summary}
            </option>
          ))}
        </select>

        <button
          onClick={syncEvents}
          disabled={isSyncing}
          className="bg-black text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800 transition"
        >
          {isSyncing ? "Syncing..." : "Sync"}
        </button>

        <button
          onClick={() => signOut()}
          className="text-sm text-gray-500 hover:text-black"
        >
          Logout
        </button>
      </div>

      {/* STATUS */}
      {status && (
        <p className="text-sm text-gray-500 mb-6">
          {status}
        </p>
      )}

      {/* EVENTS */}
      <div className="space-y-3">
        {events.map((event: any) => (
          <div key={event.id} className="text-sm">
            {event.summary}
          </div>
        ))}
      </div>

    </div>
  </div>
);
    
}
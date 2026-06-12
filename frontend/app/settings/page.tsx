"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

export default function Settings() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<any>(null);
  const trialStart = new Date(settings?.trialEndsAt);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const trialEnd = new Date(trialStart);
  trialEnd.setDate(trialEnd.getDate());

  const daysLeft = Math.max(0,Math.ceil((trialEnd.getTime()-Date.now())/(1000*60*60*24)));
  useEffect(()=>{
    fetch("/api/settings")
    .then(res=> res.json())
    .then(data=> setSettings(data));
  },[]);
  const deleteAccount = async ()=>{
    const confirmed = window.confirm("Delete your account permanently? This will also delete your workflows.");
    if(!confirmed) return;
    setIsDeleting(true);
    setDeleteError("");
    try{
      const res = await fetch("/api/user/delete", {
        method: "DELETE",
      });
      if(!res.ok) {
        const data= await res.json().catch(()=> null);
        throw new Error(data?.error || "Failed to delete account");
      }
      await signOut({ callbackUrl: "/"});
    }catch (err){
      setDeleteError( err instanceof Error? err.message : "Failed to delete account");
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* PAGE TITLE */}
      <h1 className="text-3xl font-bold">Settings</h1>

      {/*  ACCOUNT CARD  */}
      <div className="bg-white border rounded-xl p-5 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Account</h2>

        <p className="text-sm text-gray-600">
          Signed in as:
        </p>
        <p className="font-medium mb-3">
          {session?.user?.email}
        </p>

        {/* Trial Info (static for now) */}
        <div className="text-sm text-blue-600 mb-4">
          {daysLeft >0? <>Free Trial: {daysLeft} days left</>: "Free Trial Expired"}
        </div>

        <button
          onClick={() => signOut()}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
        >
          Sign Out
        </button>
      </div>

      {/* GOOGLE CARD  */}
      <div className="bg-white border rounded-xl p-5 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">
          Google Calendar Integration
        </h2>

        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className="text-green-600 font-medium">Connected</p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Last Sync</p>
            <p className="text-gray-800 text-sm">
              Just now (auto-sync active)
            </p>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-500">
          Your Google Calendar is securely connected and syncing automatically.
        </div>
      </div>

      {/*  PREFERENCES CARD */}
      <div className="bg-white border rounded-xl p-5 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Preferences</h2>

        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-gray-700">Auto Sync</span>
          <span className="text-green-600 text-sm font-medium">
            Enabled
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-700">Sync Frequency</span>
          <span className="text-sm text-gray-500">
            Every 2 minutes
          </span>
        </div>
      </div>

      {/*  DANGER ZONE */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-red-600 mb-3">
          Reset
        </h2>

        <p className="text-sm text-red-500 mb-3">
          This will permanently delete your account and workflows.
        </p>
        {deleteError && (
          <p className="text-sm text-red-600 mb-3">
            {deleteError}
          </p>
        )}

        <button 
        onClick={deleteAccount}
        disabled={isDeleting}
        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">
        
          {isDeleting ? "Deleting...": "Delete Account"}
        </button>
      </div>

    </div>
  );
}
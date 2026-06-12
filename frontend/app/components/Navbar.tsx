"use client";
import Link from "next/link";
export default function Navbar(){
    return(
        <div className="bg-indigo-600 text-white px-8 py-4 flex justify-between">
            <div className="font-semibold">Sorting Calendar</div>
            <div className="flex gap-6 text-sm">
                <Link href="/">Home</Link>
                <Link href="/dashboard">Dashboard</Link>
                <Link href="/faq">FAQ</Link>
                <Link href="/settings">Settings</Link>
            </div>
        </div>
    );
}
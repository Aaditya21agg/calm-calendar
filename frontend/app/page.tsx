"use client";
import CalendarUI from "./components/CalendarUI";
import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function Home(){
  const { data: session } = useSession();
  const [events, setEvents] = useState([]);
  const [calendars, setCalendars] = useState([]);
  const [sourceCal, setSourceCal] = useState("");
  const [targetCal, setTargetCal] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [status, setStatus] = useState("");


  const fetchEvents = async () => {
  if (!(session as any)?.accessToken || !sourceCal) return;

  const now = new Date();
  const nextMonth = new Date();
  nextMonth.setMonth(now.getMonth() + 2);

  const url = `https://www.googleapis.com/calendar/v3/calendars/${sourceCal}/events?timeMin=${now.toISOString()}&timeMax=${nextMonth.toISOString()}&singleEvents=true&orderBy=startTime`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${(session as any).accessToken}`,
    },
  });

  const data = await res.json();

  const filtered = (data.items || []).filter(
    (event: any) =>
      !event.summary?.toLowerCase().includes("birthday") &&
      event.summary !== "Busy"
  );

  setEvents(filtered);
};

  const syncEvents = async () => {
    if (!sourceCal || !targetCal) {
      setStatus("Please select both source and target calendars");
      return;
    }
    if (!(session as any)?.accessToken) return;
  // Fetch events

  setIsSyncing(true);
setStatus("Syncing...");
try{
  const now = new Date(); 
  const nextMonth = new Date();
  nextMonth.setMonth(now.getMonth()+2);
  const url = `https://www.googleapis.com/calendar/v3/calendars/${sourceCal}/events?timeMin=${now.toISOString()}&timeMax=${nextMonth.toISOString()}&singleEvents=true&orderBy=startTime`;
  const res = await fetch(url, 
    {
      headers: {
        Authorization: `Bearer ${(session as any).accessToken}`,
        "Content-Type": "application/json",

      },
    }
  );
  const targetRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${targetCal}/events?timeMin=${now.toISOString()}&timeMax=${nextMonth.toISOString()}&singleEvents=true&orderBy=startTime`,
{
  headers: {
    Authorization: `Bearer ${(session as any).accessToken}`,

  },
}
  );
  const targetData = await targetRes.json();
  const targetEvents = targetData.items || [];  
  const data = await res.json();
  const fetchedEvents = data.items || [];
  
  // Loop through events
  console.log("Fetched events:", fetchedEvents);
  for(const event of fetchedEvents) {
    const matchingBusy = targetEvents.find(
      (e:any)=>
        e.extendedProperties?.private?.sourceEventId === event.id
    );
    if (!event.start?.dateTime || !event.end?.dateTime) continue;
    if (!event.summary || event.summary == "Busy") continue;
   if (event.summary?.toLowerCase().includes("birthday")) continue;
    // checking if busy already exists
    
    if(!matchingBusy){
    console.log("Creating Busy for:", event.summary);
    // Create "Busy" event
    
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${targetCal}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${(session as any).accessToken}`,
          "Content-Type": "application/json",

        },
        body: JSON.stringify({
          summary: "Busy",
          start: {
            dateTime: event.start.dateTime,
            timeZone: "Asia/Kolkata",
          },
          end: {
            dateTime: event.end.dateTime,
            timeZone: "Asia/Kolkata",
          },
          extendedProperties: {
            private: {
              sourceEventId: event.id,
            },
          },
        }),
      }
    );
  }
   
  else{
    const sameTime =
    matchingBusy.start?.dateTime === event.start.dateTime && matchingBusy.end?.dateTime === event.end.dateTime;

    if(!sameTime) {
      console.log("Updating Busy for:", event.summary);
      await fetch(`https://www.googleapis.com/calendar/v3/calendars/${targetCal}/events/${matchingBusy.id}`,
{
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${(session as any).accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
          
          start: {
            dateTime: event.start.dateTime,
            timeZone: "Asia/Kolkata",
          },
          end: {
            dateTime: event.end.dateTime,
            timeZone: "Asia/Kolkata",
          },
        }
      ),
    });
  }
}}
  
  

for (const busy of targetEvents){
  const sourceExists = fetchedEvents.some(
    (event: any)=> event.id === busy.extendedProperties?.private?.sourceEventId
  );
  if(!sourceExists){
    console.log("Deleting orphan busy event");
    await fetch(`https://www.googleapis.com/calendar/v3/calendars/${targetCal}/events/${busy.id}`,
{
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${(session as any).accessToken}`,
  },
}
    );
  }
}


  setStatus("Sync Completed!");
}
catch(err){
  console.error(err);
  setStatus("Sync failed");  // error
}
setIsSyncing(false);
  await fetchEvents();
};
  useEffect(()=> {
    fetchEvents();
  }, [session, sourceCal]);

      useEffect(() => {
        if(!(session as any)?.accessToken) return;
      fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
        headers: {
          Authorization: `Bearer ${(session as any).accessToken}`,

        },
      })
      .then((res)=> res.json())
      .then((data)=> {
        const uniqueCalendars = (data.items || []).filter(
  (cal: any, index: number, self: any[]) =>
    !cal.summary.toLowerCase().includes("holidays") &&    // remove unwanted calendars
    index === self.findIndex((c) => c.summary === cal.summary) // avoid duplicate names
);

        setCalendars(uniqueCalendars);
      });
    
  }, [session]);


  return (
    <CalendarUI
    session={session}
    calendars={calendars}
    events={events}
    sourceCal={sourceCal}
    targetCal={targetCal}
    setSourceCal={setSourceCal}
    setTargetCal={setTargetCal}
    syncEvents={syncEvents}
    isSyncing={isSyncing}
    status={status}
    signOut={signOut}
    />
  );
}
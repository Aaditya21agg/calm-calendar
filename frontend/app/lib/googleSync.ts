import { prisma } from "@/app/lib/prisma";

export const refreshGoogleAccessToken = async (refreshToken: string) => {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("Google refresh response:", data);
    throw new Error(
      JSON.stringify(data)
    );
    //throw new Error(data?.error_description || "Failed to refresh Google token");
  }

  return data.access_token;
};

type GoogleSyncInput = {
  workflowId: number;
  sourceGoogleAccountId: number;
  targetGoogleAccountId: number;
  sourceCal: string;
  targetCal: string;
  sourceAccessToken: string;
  sourceRefreshToken: string;
  targetAccessToken: string;
  targetRefreshToken: string;
};

export const getValidAccessToken = async (
  googleAccountId: number,
  accessToken: string,
  refreshToken: string
) => {
  const test = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (test.status !== 401) {
    return accessToken;
  }

  const refreshedAccessToken = await refreshGoogleAccessToken(refreshToken);

  await prisma.googleAccount.update({
    where: { id: googleAccountId },
    data: { accessToken: refreshedAccessToken },
  });

  return refreshedAccessToken;
};

export const googleSync = async ({
  workflowId,
  sourceGoogleAccountId,
  targetGoogleAccountId,
  sourceCal,
  targetCal,
  sourceAccessToken,
  sourceRefreshToken,
  targetAccessToken,
  targetRefreshToken,
}: GoogleSyncInput) => {
  
  const workflow = await prisma.workflow.findUnique({
    where: {id: workflowId },
    include:{
      sourceCalendars: {
        include: {
          googleAccount: true,
        },
      },
      targetCalendars: {
        include: {
          googleAccount: true,
        },
      },
    },
  });
  
  if (!workflow) {
    throw new Error("Workflow not found");
  }
  if (
    workflow.sourceCalendars.length === 0 || workflow.targetCalendars.length === 0
  ){
    throw new Error("Workflow has no source or target calendars");
  }

    console.log("SYNCING WORKFLOW ID:", workflow.id);
    console.log("WORKFLOW NAME:", workflow.name);
    const sourceConfigs = workflow.sourceCalendars;
    const targetConfigs = workflow.targetCalendars;

   
    

    console.log("Source count:", sourceConfigs.length);
    console.log("Target count:", targetConfigs.length);
  
  console.log("SOURCE CONFIGS:", JSON.stringify(workflow?.sourceCalendars, null, 2));
  console.log("TARGET CONFIGS:", JSON.stringify(workflow?.targetCalendars, null, 2));
  console.log(workflow);
  console.log(JSON.stringify(workflow, null, 2))

for (const sourceConfig of sourceConfigs) {
  console.log("Syncing source calendar:", sourceConfig.calendarId);
  

  const validSourceAccessToken = await getValidAccessToken(
    sourceConfig.googleAccountId,
    sourceConfig.googleAccount.accessToken,
    sourceConfig.googleAccount.refreshToken
  );
  let sourceUrl = `https://www.googleapis.com/calendar/v3/calendars/${sourceConfig.calendarId}/events?singleEvents=true&showDeleted=true`;
 if (sourceConfig.syncToken){
  sourceUrl += `&syncToken=${encodeURIComponent(sourceConfig.syncToken)}`;
  console.log("running incremental sync for ${sourceConfig.calendarId");
 } else {
  console.log("running initial sync for ${sourceConfig.calendarId");
 }
 const sourceRes = await fetch(sourceUrl, { 
  headers: {
    Authorization: `Bearer ${validSourceAccessToken}`,
  },
 })
  const sourceData = await sourceRes.json();
  const changedEvents = sourceData.items || [];
  console.log("Google nextSyncToken:", sourceData.nextSyncToken);
  console.log("Source event count:", sourceData.items?.length);

  if (!sourceRes.ok) {
    throw new Error(sourceData?.error?.message || "Failed to fetch source events");
  }

  const sourceEvents = changedEvents.filter((event: any) => {
    if (event.status === "cancelled"){
      return false;
    }
    
    const isAllDay = !!event.start?.date;
    const isTimed = !!event.start?.dateTime;

    if (isAllDay && !workflow.includeAllDayEvents) {
      return false;
    }

    if (isTimed && !workflow.includeTimedEvents) {
      return false;
    }
    

    if (!isAllDay && event.transparency === "transparent" && !workflow.includeNonBusyEvents
    ) {
      return false;
    }

    if (
      event.status === "tentative" &&
      !workflow.includeTentativeEvents
    ) {
      return false;
    }

    const eventType = event.eventType || "default";

    if (
      eventType === "focusTime" &&
      !workflow.includeFocusTimeEvents
    ) {
      return false;
    }

    if (
      eventType === "outOfOffice" &&
      !workflow.includeOutOfOfficeEvents
    ) {
      return false;
    }

    return true;
});
  for (const targetConfig of targetConfigs){
  const validTargetAccessToken = await getValidAccessToken(
    targetConfig.googleAccountId,
    targetConfig.googleAccount.accessToken,
    targetConfig.googleAccount.refreshToken
  );

 
console.log("Filtered source events:",
      sourceEvents.map((e: any)=> ({
        summary: e.summary,
        start: e.start,
        end: e.end,
        eventType: e.eventType,
      }))
    );
    const now = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(now.getMonth()+2);

  const targetRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${targetConfig.calendarId}/events?timeMin=${now.toISOString()}&timeMax=${nextMonth.toISOString()}&singleEvents=true&orderBy=startTime`,
    {
      headers: {
        Authorization: `Bearer ${validTargetAccessToken}`,
      },
    }
  );
  const targetData = await targetRes.json();

  if (!targetRes.ok) {
    throw new Error(targetData?.error?.message || "Failed to fetch target events");
  }

  const targetEvents = targetData.items || [];
  const cancelledEvents = changedEvents.filter((e: any)=> e.status === "cancelled");
  for (const event of cancelledEvents){
    console.log("Changed event status:", event.id, event.status);
    if(event.status!== "cancelled"){
      continue;
    }
    console.log("Deleted source event detected:", event.id);
    const sourceEventId = `${sourceConfig.googleAccountId}:${sourceConfig.calendarId}:${event.id}`;
    const targetMatch = targetEvents.find((e: any) => e.extendedProperties?.private?.sourceEventId === sourceEventId);
    if(!targetMatch){
      continue;
    }
    await fetch(`https://www.googleapis.com/calendar/v3/calendars/${targetConfig.calendarId}/events/${targetMatch.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${validTargetAccessToken}`,
        
        },
      }
    );
    console.log("Deleted target event:", targetMatch.id);
  }


  for (const event of sourceEvents) {
    const start= event.start?.dateTime || event.start?.date;
    const end = event.end?.dateTime || event.end?.date;
    if (!start || !end) continue;
    if (!event.summary || event.summary === "Busy") continue;
    if (event.summary.toLowerCase().includes("birthday")) continue;

    const sourceEventId = `${sourceConfig.googleAccountId}:${sourceConfig.calendarId}:${event.id}`;
    const matchingBusy = targetEvents.find(
      (e: any) => e.extendedProperties?.private?.sourceEventId === sourceEventId
    );
    console.log("Processing event.summary");
    console.log("Existing target match:", matchingBusy ? "YES" : "NO")

    if (!matchingBusy) {
      console.log(
        "Creating target event:",
        event.summary,
        start,
        end
      );
      const createRes= await fetch(`https://www.googleapis.com/calendar/v3/calendars/${targetConfig.calendarId}/events`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${validTargetAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: 
            workflow.removeSummaryLocation
               ? workflow.replacementSummary || "Busy"
               : event.summary,
          visibility: "public",
          transparency: "opaque",
          start: event.start?.dateTime
          ?  {
            dateTime: start,
            timeZone: "Asia/Kolkata",
          }
          : {
            date: start,
          },

          end: event.end?.dateTime
          ? {
            dateTime: end,
            timeZone: "Asia/Kolkata",
          }
          : {
            date: end,
          },
          extendedProperties: {
            private: {
              sourceEventId,
            },
          },
        }),
      });
      const createData = await createRes.json();
      console.log("create status:", createRes.status)
      console.log("Google create response:", createData);

      if(!createRes.ok){
        console.error(
          "Failed creating event:",
          createData
        );
      }
    } else {
      const sameTime =
        (matchingBusy.start?.dateTime || matchingBusy.start?.date) === start &&
        (matchingBusy.end?.dateTime || matchingBusy.end?.date) === end;
      console.log("sameTime:", sameTime, "preserveManualChanges", workflow.preserveManualChanges);

      if (!sameTime && !workflow.preserveManualChanges) {
        
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetConfig.calendarId)}/events/${matchingBusy.id}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${validTargetAccessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              start: event.start?.dateTime
              ? {
                dateTime: start,
                timeZone: "Asia/Kolkata",
              }
              : { 
                date: start,
              },
              end: event.end?.dateTime
              ? {
                dateTime: end,
                timeZone: "Asia/Kolkata",
              }
              : {
                date: end,
              },
            }),
          }
        );
      }
    }
  }
/*
  for (const busy of targetEvents) {
    const sourceEventId = busy.extendedProperties?.private?.sourceEventId;
    if (!sourceEventId?.startsWith(`${sourceGoogleAccountId}:${sourceCal}:`)) continue;

    const sourceExists = sourceEvents.some(
      (event: any) => sourceEventId === `${sourceGoogleAccountId}:${sourceCal}:${event.id}`
    );

    if (!sourceExists) {
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${targetCal}/events/${busy.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${validTargetAccessToken}`,
          },
        }
      );
    }
  } */
  }
  await prisma.workflowSourceCalendar.update({
    where: { id: sourceConfig.id,

     },
    data: {
      
      syncToken: sourceData.nextSyncToken ?? sourceConfig.syncToken,
    },
  });
}
await prisma.workflow.update({
  where: { id: workflowId},
  data: {
    lastSynced: new Date(),
    lastSyncedAt: new Date(),
  },
});
  return "Sync completed!";
};

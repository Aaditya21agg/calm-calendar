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

const getValidAccessToken = async (
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
  if (!sourceCal || !targetCal) {
    throw new Error("Missing calendars");
  }
  const workflow = await prisma.workflow.findUnique({
    where: {id: workflowId },
  });
  if (!workflow) {
    throw new Error("Workflow not found");
  }

  const validSourceAccessToken = await getValidAccessToken(
    sourceGoogleAccountId,
    sourceAccessToken,
    sourceRefreshToken
  );
  const validTargetAccessToken = await getValidAccessToken(
    targetGoogleAccountId,
    targetAccessToken,
    targetRefreshToken
  );

  const now = new Date();
  const nextMonth = new Date();
  nextMonth.setMonth(now.getMonth() + 2);

  const sourceRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${sourceCal}/events?timeMin=${now.toISOString()}&timeMax=${nextMonth.toISOString()}&singleEvents=true&orderBy=startTime`,
    {
      headers: {
        Authorization: `Bearer ${validSourceAccessToken}`,
      },
    }
  );
  const sourceData = await sourceRes.json();

  if (!sourceRes.ok) {
    throw new Error(sourceData?.error?.message || "Failed to fetch source events");
  }

  const sourceEvents = (sourceData.items || []).filter((event: any) => {
    
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
console.log("Filtered source events:",
      sourceEvents.map((e: any)=> ({
        summary: e.summary,
        start: e.start,
        end: e.end,
        eventType: e.eventType,
      }))
    );

  const targetRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${targetCal}/events?timeMin=${now.toISOString()}&timeMax=${nextMonth.toISOString()}&singleEvents=true&orderBy=startTime`,
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

  for (const event of sourceEvents) {
    const start= event.start?.dateTime || event.start?.date;
    const end = event.end?.dateTime || event.end?.date;
    if (!start || !end) continue;
    if (!event.summary || event.summary === "Busy") continue;
    if (event.summary.toLowerCase().includes("birthday")) continue;

    const sourceEventId = `${sourceGoogleAccountId}:${sourceCal}:${event.id}`;
    const matchingBusy = targetEvents.find(
      (e: any) => e.extendedProperties?.private?.sourceEventId === sourceEventId
    );

    if (!matchingBusy) {
      console.log(
        "Creating target event:",
        event.summary,
        start,
        end
      );
      const createRes= await fetch(`https://www.googleapis.com/calendar/v3/calendars/${targetCal}/events`, {
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

      if (!sameTime && !workflow.preserveManualChanges) {
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${targetCal}/events/${matchingBusy.id}`,
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
  }
  await prisma.workflow.update({
    where: { id: workflowId },
    data: {
      lastSynced: new Date(),
      lastSyncedAt: new Date(),
    },
  });

  return "Sync completed!";
};

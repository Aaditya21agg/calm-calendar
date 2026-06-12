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

  const sourceEvents = sourceData.items || [];

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
    if (!event.start?.dateTime || !event.end?.dateTime) continue;
    if (!event.summary || event.summary === "Busy") continue;
    if (event.summary.toLowerCase().includes("birthday")) continue;

    const sourceEventId = `${sourceGoogleAccountId}:${sourceCal}:${event.id}`;
    const matchingBusy = targetEvents.find(
      (e: any) => e.extendedProperties?.private?.sourceEventId === sourceEventId
    );

    if (!matchingBusy) {
      await fetch(`https://www.googleapis.com/calendar/v3/calendars/${targetCal}/events`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${validTargetAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: "Busy",
          visibility: "public",
          transparency: "opaque",
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
              sourceEventId,
            },
          },
        }),
      });
    } else {
      const sameTime =
        matchingBusy.start?.dateTime === event.start.dateTime &&
        matchingBusy.end?.dateTime === event.end.dateTime;

      if (!sameTime) {
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${targetCal}/events/${matchingBusy.id}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${validTargetAccessToken}`,
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

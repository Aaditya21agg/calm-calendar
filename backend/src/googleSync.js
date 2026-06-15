const { prisma } = require("./prisma");

async function refreshGoogleAccessToken(refreshToken) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error_description || "Failed to refresh Google token");
  }

  return data.access_token;
}

async function getValidAccessToken(googleAccountId, accessToken, refreshToken) {
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
}

function eventIdentity(sourceGoogleAccountId, sourceCal, eventId) {
  return `${sourceGoogleAccountId}:${sourceCal}:${eventId}`;
}

async function googleSync({
  workflowId,
  sourceGoogleAccountId,
  targetGoogleAccountId,
  sourceCal,
  targetCal,
  sourceAccessToken,
  sourceRefreshToken,
  targetAccessToken,
  targetRefreshToken,
}) {
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

  const sourceUrl = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(sourceCal)}/events`
  );
  sourceUrl.searchParams.set("timeMin", now.toISOString());
  sourceUrl.searchParams.set("timeMax", nextMonth.toISOString());
  sourceUrl.searchParams.set("singleEvents", "true");
  sourceUrl.searchParams.set("orderBy", "startTime");

  const sourceRes = await fetch(sourceUrl, {
    headers: {
      Authorization: `Bearer ${validSourceAccessToken}`,
    },
  });
  const sourceData = await sourceRes.json();
  console.log("Google nextSyncToken:", sourceData.nextSyncToken);

  if (!sourceRes.ok) {
    throw new Error(sourceData?.error?.message || "Failed to fetch source events");
  }

  const targetUrl = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCal)}/events`
  );
  targetUrl.searchParams.set("timeMin", now.toISOString());
  targetUrl.searchParams.set("timeMax", nextMonth.toISOString());
  targetUrl.searchParams.set("singleEvents", "true");
  targetUrl.searchParams.set("orderBy", "startTime");

  const targetRes = await fetch(targetUrl, {
    headers: {
      Authorization: `Bearer ${validTargetAccessToken}`,
    },
  });
  const targetData = await targetRes.json();

  if (!targetRes.ok) {
    throw new Error(targetData?.error?.message || "Failed to fetch target events");
  }

  const sourceEvents = sourceData.items || [];
  const targetEvents = targetData.items || [];

  for (const event of sourceEvents) {
    if (!event.start?.dateTime || !event.end?.dateTime) continue;
    if (!event.summary || event.summary === "Busy") continue;
    if (event.summary.toLowerCase().includes("birthday")) continue;

    const sourceEventId = eventIdentity(sourceGoogleAccountId, sourceCal, event.id);
    const matchingBusy = targetEvents.find(
      (targetEvent) => targetEvent.extendedProperties?.private?.sourceEventId === sourceEventId
    );

    const copiedEvent = {
      summary: "Busy",
      visibility: "private",
      transparency: "opaque",
      start: {
        dateTime: event.start.dateTime,
        timeZone: event.start.timeZone,
      },
      end: {
        dateTime: event.end.dateTime,
        timeZone: event.end.timeZone,
      },
      extendedProperties: {
        private: {
          sourceEventId,
        },
      },
    };

    if (!matchingBusy) {
      await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCal)}/events`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${validTargetAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(copiedEvent),
      });
      continue;
    }

    const sameTime =
      matchingBusy.start?.dateTime === event.start.dateTime &&
      matchingBusy.end?.dateTime === event.end.dateTime;

    if (!sameTime) {
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCal)}/events/${matchingBusy.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${validTargetAccessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            start: copiedEvent.start,
            end: copiedEvent.end,
          }),
        }
      );
    }
  }

  for (const busy of targetEvents) {
    const sourceEventId = busy.extendedProperties?.private?.sourceEventId;
    if (!sourceEventId?.startsWith(`${sourceGoogleAccountId}:${sourceCal}:`)) continue;

    const sourceExists = sourceEvents.some(
      (event) => sourceEventId === eventIdentity(sourceGoogleAccountId, sourceCal, event.id)
    );

    if (!sourceExists) {
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCal)}/events/${busy.id}`,
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
    data: { lastSyncedAt: new Date() },
  });

  return "Sync completed";
}

module.exports = {
  googleSync,
  refreshGoogleAccessToken,
};

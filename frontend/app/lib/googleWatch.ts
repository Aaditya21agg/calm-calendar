import { prisma } from "@/app/lib/prisma";
import { getValidAccessToken } from "./googleSync";

export async function stopWatchChannel(channelId: string, resourceId: string, accessToken: string)
{
    const res = await fetch("https://www.googleapis.com/calendar/v3/channels/stop",
        {
            method: "POST",
            headers: {Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
        },
            body: JSON.stringify({
                id: channelId,
                resourceId,
            }),
        }
    );
   
    const text = await res.text();
    console.log("Stopped old channel:", channelId, "Status:", res.status);
    console.log("Google stop response:", text);
    if (!res.ok){
        console.warn("Failed to stop channel:", channelId);
    }
}
export async function stopAllworkflowMatches(
    workflowId: number
){
    const sourceCalendars  = await prisma.workflowSourceCalendar.findMany({
        where: { workflowId,},
        include:{
            googleAccount: true,
        },
    });
    for (const source of sourceCalendars){
        if(!source.watchChannelId || !source.watchResourceId){
            continue;
        }
        try{
            const accessToken = await getValidAccessToken(source.googleAccount.id, source.googleAccount.accessToken, source.googleAccount.refreshToken);
            await stopWatchChannel(source.watchChannelId, source.watchResourceId, accessToken);
            console.log(`Stopped watch for ${source.calendarId}`);
        } catch(err){
            console.error(`Failed to stop watch for ${source.calendarId}`,err);
        }
        await prisma.workflowSourceCalendar.update({where: {id: source.id,},
        data: {
            watchChannelId: null,
            watchResourceId: null,
            watchExpiration: null,
        },});
    }
}
export async function createWatchChannel(
    workflowId: number,
    accessToken: string,
    sourceCal: string
) {
    const webhookUrl = process.env.GOOGLE_WEBHOOK_URL;
if(!webhookUrl) {
    throw new Error("GOOGLE_WEBHOOK_URL is not configured");}
  const sourceCalendar = await prisma.workflowSourceCalendar.findFirst({
    where:{
        workflowId,
        calendarId: sourceCal,
    }
  });
  if(sourceCalendar?.watchChannelId && sourceCalendar?.watchResourceId){
    await stopWatchChannel(
        sourceCalendar.watchChannelId,
        sourceCalendar.watchResourceId,
        accessToken
    );
  }
    const channelId = crypto.randomUUID();
    const watchRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(sourceCal)}/events/watch`,
{
    method: "POST",
    headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        id: channelId,
        type: "web_hook",
        address: webhookUrl,
    }),
});
const watchData = await watchRes.json();
if(!watchRes.ok){
    throw new Error(watchData?.error?.message || "Failed to create watch channel");
}

await prisma.workflowSourceCalendar.updateMany({
    where: {
        workflowId,
        calendarId: sourceCal
    },
    data: {
        watchChannelId: watchData.id,
        watchResourceId: watchData.resourceId,
        watchExpiration: new Date(
            Number(watchData.expiration)
        ),
    },
});
return watchData;
}

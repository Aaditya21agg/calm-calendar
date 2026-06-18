import { prisma } from "@/app/lib/prisma";

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
export async function createWatchChannel(
    workflowId: number,
    accessToken: string,
    sourceCal: string
) {
    const webhookUrl = process.env.GOOGLE_WEBHOOK_URL;
if(!webhookUrl) {
    throw new Error("GOOGLE_WEBHOOK_URL is not configured");}
    const workflow = await prisma.workflow.findUnique({
        where: {
            id: workflowId
        },
    });
    if(workflow?.watchChannelId && workflow?.watchResourceId){
        await stopWatchChannel(workflow.watchChannelId, workflow.watchResourceId, accessToken);
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

await prisma.workflow.update({
    where: {
        id: workflowId,
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

import { getValidAccessToken} from "@/app/lib/googleSync"
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma} from "@/app/lib/prisma";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if(!session?.user?.email){
        return Response.json(
            { error: "Not authenticated" },
            { status: 401 }
        );
        
    }
    const body = await req.json();
    const { workflowId } = body;
    if(!workflowId) { return Response.json({ error: "Missing workflwoId"},{ status: 400});}
  

    const workflow = await prisma.workflow.findUnique({ where: {
        id: Number(workflowId),
    },
});
if (!workflow){
    return Response.json({ error: "Workflow not found "}, { status: 404 });
}

const googleAccount = await prisma.googleAccount.findUnique({where: {id: workflow.sourceGoogleAccountId,
},
});
if (!googleAccount) {
    return Response.json({ error: "Google account not found" }, { status: 404});
}
const accessToken = await getValidAccessToken(googleAccount.id, googleAccount.accessToken, googleAccount.refreshToken);
const channelId = crypto.randomUUID();
const watchRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(workflow.sourceCal )}/events/watch`,
{
    method: "POST",
    headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        id: channelId,
        type: "web_hook",
        address: "https://2f1f-2405-201-6004-88b5-85d5-f048-44e5-91e5.ngrok-free.app/api/google/webhook",
    }),
});
console.log("Creating watch channel", channelId, workflow.sourceCal);
const watchData = await watchRes.json();
await prisma.workflow.update({
    where: {
        id: workflow.id,
    },
    data: {
        watchChannelId: watchData.id,
        watchResourceId: watchData.resourceId,
        watchExpiration: new Date(Number(watchData.expiration)
        ),
    },
})
console.log("Watch status:", watchRes.status);
console.log("Google watch response:", watchData);
if(!watchRes.ok){
    return Response.json({
        error: "Failed to create watch channel", details: watchData,
    },
{ status: watchRes.status });
}
return Response.json({
    success: true,
    watchChannelId: watchData.id,
    resourceId: watchData.resource,
    expiration: watchData.expiration,
});

}
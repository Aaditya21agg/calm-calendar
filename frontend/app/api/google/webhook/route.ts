
import { googleSync } from "@/app/lib/googleSync";
import { prisma } from "@/app/lib/prisma"
console.log("🔥 ABOUT TO RUN googleSync FROM WEBHOOK 🔥");
export async function POST(req: Request){
    
    const resourceId = req.headers.get("x-goog-resource-id");
    const resourceState = req.headers.get("x-goog-resource-state");
    console.log("Webhook:", resourceId, resourceState);
    if( !resourceId || resourceState === "sync"){
        return new Response(null, {status: 200,});
    }
    const channelId = req.headers.get("x-goog-channel-id");
   
    console.log("Channel ID:", channelId);
    const workflow = await prisma.workflow.findFirst({
        where: {watchResourceId: resourceId, },
    });
    if(!workflow){
        console.log("No workflow found for resource");
        return new Response(null, { status: 200,});
    }
     if (channelId !== workflow.watchChannelId){
        console.log("Ignoring stale channel:", channelId);
        return new Response(null, {
            status: 200,
        });
    }
    console.log("Matched workflow:", workflow.name);
    const sourceAccount = await prisma.googleAccount.findUnique({
        where: { id: workflow.sourceGoogleAccountId, },
    });
    const targetAccount = await prisma.googleAccount.findUnique({
        where: { id: workflow.targetGoogleAccountId, },
    });
    if(!sourceAccount || !targetAccount){
        return new Response(null, { status:200, });
    }
    console.log("Running webhook sync:", workflow.name);
    console.log("🔥 ABOUT TO RUN googleSync FROM WEBHOOK 🔥");
    await googleSync({workflowId: workflow.id, sourceGoogleAccountId: sourceAccount.id, targetGoogleAccountId: targetAccount.id, 
        sourceCal: workflow.sourceCal,
        targetCal: workflow.targetCal,
        sourceAccessToken: sourceAccount.accessToken,
        sourceRefreshToken: sourceAccount.refreshToken,
        targetAccessToken: targetAccount.accessToken,
        targetRefreshToken: targetAccount.refreshToken,
    });console.log("🔥 WEBHOOK googleSync FINISHED 🔥");
    return new Response(null, { status: 200,});
    
}
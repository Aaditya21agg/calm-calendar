
import { googleSync } from "@/app/lib/googleSync";
import { prisma } from "@/app/lib/prisma"

export async function POST(req: Request){
    
    const resourceId = req.headers.get("x-goog-resource-id");
    const resourceState = req.headers.get("x-goog-resource-state");
    console.log("Webhook:", resourceId, resourceState);
    if( !resourceId || resourceState === "sync"){
        return new Response(null, {status: 200,});
    }
    const channelId = req.headers.get("x-goog-channel-id");
   
    console.log("Channel ID:", channelId);
    const sourceCalendar = await prisma.workflowSourceCalendar.findFirst({
        where: {
            watchResourceId: resourceId,
        },
    });
    if(!sourceCalendar){
        console.log("No source calendar found for resource");
        return new Response(null, { status: 200,});
    }
    const workflow = await prisma.workflow.findUnique({
        where: {
            id: sourceCalendar.workflowId,
        },
    });
    if(!workflow){
        console.log("Workflow not found");
        return new Response(null, { status: 200});
    }
     if (channelId !== sourceCalendar.watchChannelId){
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
    
    
    const lockedWorkflow = await prisma.workflow.findUnique({
        where:{id: workflow.id,},

    });
    if(lockedWorkflow?.syncInProgress){
        console.log("Sync already running..skipping.");
        return new Response(null, { status:200});
    }
    await prisma.workflow.update({
        where: {id: workflow.id },
        data: { syncInProgress: true,},
    });
    console.log("🔥 ABOUT TO RUN googleSync FROM WEBHOOK 🔥");
    console.log("Running webhook sync:", workflow.name);
    try{
    await googleSync({workflowId: workflow.id, sourceGoogleAccountId: sourceAccount.id, targetGoogleAccountId: targetAccount.id, 
        sourceCal: workflow.sourceCal,
        targetCal: workflow.targetCal,
        sourceAccessToken: sourceAccount.accessToken,
        sourceRefreshToken: sourceAccount.refreshToken,
        targetAccessToken: targetAccount.accessToken,
        targetRefreshToken: targetAccount.refreshToken,
    });}
    
    finally{
        await prisma.workflow.update({
            where: { id: workflow.id },
            data: {syncInProgress: false,},
        });
        
        console.log("🔥 WEBHOOK googleSync FINISHED 🔥");
    return new Response(null, { status: 200,});
    }
    }
import { getValidAccessToken} from "@/app/lib/googleSync"
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma} from "@/app/lib/prisma";
import { createWatchChannel } from "@/app/lib/googleWatch";

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
        id: workflowId,
    },
    include:{
        sourceCalendars: {include: {googleAccount:true,},
    },
    },
});
if (!workflow){
    return Response.json({ error: "Workflow not found "}, { status: 404 });
}

const watchResults = [];
for (const source of workflow.sourceCalendars){
    const accessToken = await getValidAccessToken(source.googleAccount.id, source.googleAccount.accessToken,source.googleAccount.refreshToken);
    const watchData = await createWatchChannel(workflow.id, accessToken,source.calendarId);
    console.log(`Watch created for ${source.calendarId}:`, watchData);

    watchResults.push({
        calendarId: source.calendarId,
        watchChannelId: watchData.id,
        resourceId: watchData.resourceId,
        expiration: watchData.expiration,
    });
}
return Response.json({
    success: true,
    watches: watchResults,
});

}
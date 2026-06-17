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
const watchData = await createWatchChannel(
    workflow.id, accessToken, workflow.sourceCal
);

console.log("Google watch response:", watchData);

return Response.json({
    success: true,
    watchChannelId: watchData.id,
    resourceId: watchData.resourceId,
    expiration: watchData.expiration,
});

}
import { prisma } from "@/app/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
export async function GET(){
    console.log("PRISMA:", prisma);
    const session =  await getServerSession(authOptions);
    if (!session?.user?.email){
        return Response.json( { error: "Not authenticated "}, { status: 401});
    }
    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        
    });
    const workflows = await prisma.workflow.findMany({
        where: {userId: user?.id },
    });
    const latestSync = workflows
    .map(w => w.lastSyncedAt)
    .filter(Boolean)
    .sort((a, b) => new Date(b!) - new Date(a!))[0];

    return Response.json({
        trialEndsAt: user?.trialEndsAt,
        subscriptionStatus: user?.subscriptionStatus,
        totalWorkflows: workflows.length,
        lastSyncedAt: latestSync || null,
    });
    
}


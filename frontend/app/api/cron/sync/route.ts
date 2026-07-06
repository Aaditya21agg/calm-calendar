/*import { prisma } from "@/app/lib/prisma";
import { googleSync } from "@/app/lib/googleSync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

 export async function GET(){
    try{
        console.log("Cron started...");

        // Fetching all enabled workflows from DB
        const workflows = await prisma.workflow.findMany({
            where: { enabled: true },
            include: {
                sourceGoogleAccount: true,
                targetGoogleAccount: true,
            },

        });
        console.log("Workflows found: ", workflows.length);

        // Loop through workflows


        for (const wf of workflows){
            console.log("Syncing: ", wf.name);

            // Call your sync function using DB values
            await googleSync({
                workflowId: wf.id,
                sourceGoogleAccountId: wf.sourceGoogleAccountId,
                targetGoogleAccountId: wf.targetGoogleAccountId,
                sourceCal: wf.sourceCal,
                targetCal: wf.targetCal,
                sourceAccessToken: wf.sourceGoogleAccount.accessToken,
                sourceRefreshToken: wf.sourceGoogleAccount.refreshToken,
                targetAccessToken: wf.targetGoogleAccount.accessToken,
                targetRefreshToken: wf.targetGoogleAccount.refreshToken,
            });
        }
        return Response.json({message: "Cron executed"});

    }catch(err){
        console.error("Cron error:", err);
        return Response.json({ error: "Cron failed"}, { status: 500 });
    }
 }*/

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    message: "Cron route is alive",
  });
}
import cron from "node-cron";

import { prisma } from "@/app/lib/prisma";
import { googleSync } from "@/app/lib/googleSync";

const globalForCron = globalThis as unknown as{
    cronStarted?: boolean
};
export function startCron(){
    if(globalForCron.cronStarted) return;
    globalForCron.cronStarted=true;
    console.log("Cron initialized..");

    cron.schedule("*/2 * * * *", async ()=>{     // run every 2 minutes
        console.log("Auto syncing...");
        try{
            const workflows = await prisma.workflow.findMany({
                where: {enabled: true },
                include: {
                    sourceGoogleAccount: true,
                    targetGoogleAccount: true,
                },

            });
            for (const wf of workflows){
                console.log("Auto syncing:", wf.name);
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
            console.log("Auto sync completed");
        }catch(err){
            console.log("Auto sync error:", err);
        }
        
    });
}

import { prisma } from "@/app/lib/prisma";
import { createWatchChannel } from "@/app/lib/googleWatch";
import { getValidAccessToken } from "@/app/lib/googleSync";
export async function renewExpiringWatchChannels(){
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate()+30);
    const workflows = await prisma.workflow.findMany({
        where: {enabled: true,
            watchExpiration: {lte: tomorrow,},
        }
    });
    for (const workflow of workflows){
        const account = await prisma.googleAccount.findUnique({
            where: {id: workflow.sourceGoogleAccountId,},
        });
        if(!account){
            continue;
        }
        const accessToken = await getValidAccessToken(account.id, account.accessToken, account.refreshToken);
        console.log("Renewing watch:", workflow.name);
        console.log("Current expiration:", workflow.watchExpiration);
        await createWatchChannel(workflow.id, accessToken, workflow.sourceCal);

    }
    }
    

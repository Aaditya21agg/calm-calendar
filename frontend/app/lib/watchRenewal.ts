import { prisma } from "@/app/lib/prisma";
import { createWatchChannel } from "@/app/lib/googleWatch";
import { getValidAccessToken } from "@/app/lib/googleSync";
export async function renewExpiringWatchChannels(){
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate()+30);
    const sourceCalendars = await prisma.workflowSourceCalendar.findMany({
        where: {
            watchExpiration: {lte: tomorrow,},
        },
        include:{workflow: true, googleAccount: true,},
    });
   for (const sourceCalendar of sourceCalendars) {
    const workflow= sourceCalendar.workflow;
    if(!workflow.enabled){
        continue;
    }
    const account = sourceCalendar.googleAccount;
    const accessToken = await getValidAccessToken(account.id, account.accessToken, account.refreshToken);
    console.log("Renewing watch:", workflow.name, sourceCalendar.calendarId);
    await createWatchChannel(workflow.id, accessToken, sourceCalendar.calendarId);
   }
    }
    

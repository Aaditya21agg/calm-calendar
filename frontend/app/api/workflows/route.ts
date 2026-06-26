import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";




// GET workflows
export async function GET() {
    const session = await getServerSession(authOptions);
    if(!session?.user?.email){
        return Response.json( { error: "Not authenticated"}, { status: 401});
    }
    const user = await prisma.user.findUnique({
        where: { email: session?.user?.email!},
    });
    if(!user){
        return Response.json( { error: "User not found"}, { status: 404});
    }
    const workflows = await prisma.workflow.findMany({
        where: {
            userId: user.id,
        },
        include: {
            sourceGoogleAccount: {
                select: { id: true, email: true },
            },
            targetGoogleAccount: {
                select: { id: true, email: true },
            },
            sourceCalendars: {
                include: { googleAccount: { select: {id: true, email: true,

                },
            },
        },
            },
            targetCalendars: { include: {googleAccount: {select: {id: true, email: true,},
        },
    },
},
        },
    });
    return Response.json(workflows);
}

// POST new workflow
export async function POST(req: Request){
    try{
        const session = await getServerSession(authOptions);
        if(!session?.user?.email){
            return Response.json(
                { error: "Not authenticated" },
                { status: 401}
            );
        }
        
const user = await prisma.user.findUnique({
    where: { email: session.user.email},
});
    if (!user) {
        return Response.json({ error: "User not found" }, { status: 404 });
    }
    const body = await req.json();
    const {
        name,
        sourceCal,
        targetCal,
        sourceGoogleAccountId,
        targetGoogleAccountId,
        sourceCalendars,
        targetCalendars,
        includeTimedEvents,
        includeAllDayEvents,
        includeNonBusyEvents,
        includeTentativeEvents,
        includeFocusTimeEvents,
        includeOutOfOfficeEvents,
        removeSummaryLocation,
        replacementSummary,
        preserveManualChanges,
    } = body;
    console.log("POST BODY:");
    console.log(JSON.stringify(body,null, 2));

    console.log("SOURCE CALENDARS:", sourceCalendars);
    console.log("TARGET CLAENDARS:", targetCalendars);
const hasLegacyFields = sourceCal && targetCal && sourceGoogleAccountId && targetGoogleAccountId;
        const hasNewFields = sourceCalendars?.length && targetCalendars?.length;
        if(!hasLegacyFields && !hasNewFields){
            return Response.json(
                { error: "Missing workflow details"},
                { status: 400}
            );
        }
       /* const accountCount = await prisma.googleAccount.count({
            where : {
                userId: user.id,
                id: {
                    in: [
                        Number(sourceGoogleAccountId),
                        Number(targetGoogleAccountId),
                    ],
                },
            },
        });*/
    
   

   /* if (accountCount !== new Set([Number(sourceGoogleAccountId), Number(targetGoogleAccountId)]).size) {
        return Response.json({ error: "Invalid Google account selection" }, { status: 400 });
    }*/

    const workflow = await prisma.workflow.create({
        
        data:  {
            name: name || "Custom Workflow",
            // Temporary
            sourceCal: sourceCalendars[0].calendarId,
            targetCal: targetCalendars[0].calendarId,
            sourceGoogleAccountId: sourceCalendars[0].googleAccountId,
            targetGoogleAccountId: targetCalendars[0].googleAccountId,
            enabled: true,
            userId: user.id,


            includeTimedEvents:
            includeTimedEvents ?? true,

            includeAllDayEvents:
            includeAllDayEvents ?? true,

            includeNonBusyEvents:
            includeNonBusyEvents ?? false,

            includeTentativeEvents:
            includeTentativeEvents ?? false,

            includeFocusTimeEvents:
            includeFocusTimeEvents ?? false,

            includeOutOfOfficeEvents:
            includeOutOfOfficeEvents ?? false,

            removeSummaryLocation:
            removeSummaryLocation ?? false,

            replacementSummary:
            replacementSummary || null,

            preserveManualChanges:
            preserveManualChanges ?? false,
        },
    });
    if(sourceCalendars?.length){
        await prisma.workflowSourceCalendar.createMany({
            data: sourceCalendars.map(
                (c: any) => ({
                    workflowId: workflow.id,
                    calendarId: c.calendarId,
                    googleAccountId: c.googleAccountId,
                })
            ),
        });
    }
    if(targetCalendars?.length){
        await prisma.workflowTargetCalendar.createMany({
            data: targetCalendars.map(
                (c: any)=> ({
                    workflowId: workflow.id,
                    calendarId: c.calendarId,
                    googleAccountId: c.googleAccountId,
                })
            ),
        });
    }
    return Response.json(workflow);
} catch(err){
    console.error("POST error:", err);
    return Response.json({ error: "Failed to create workflow" }, {status: 500});
}}

// DELETE
export async function DELETE(req: Request){
    try{
        const session = await getServerSession(authOptions);
        if(!session?.user?.email){
            return Response.json( { error: "Not authenticated"}, { status: 401});
        }
        const { searchParams} = new URL(req.url);
    const id = searchParams.get("id");

    if(!id){
        return Response.json({ error: "Missing ID"}, { status: 400 });
}
const workflow = await prisma.workflow.findFirst({
    where: {
        id: Number(id),
        user: {
            email: session.user.email,
        
        },
    },
});
if (!workflow) {
    return Response.json({ error: "Workflow not found" }, { status: 404 });
}
await prisma.workflow.delete({
    where: {
        id: Number(id),
    },
});
return Response.json({message: "Deleted successfully"});
} catch(err){
    console.error("DELETE error:", err);
    return Response.json({error: "Delete failed"}, {status: 500});
}}

// UPDATE
export async function PATCH(req: Request){
    const session = await getServerSession(authOptions);
    if(!session?.user?.email){
        return Response.json( { error: "Not authenticated"}, { status: 401});
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const body = await req.json();
    if(!id){
        return Response.json({ error: "Missing ID" }, { status: 400 });
    }
    const workflow = await prisma.workflow.findFirst({
        where: {
            id: Number(id),
            user: {
                email: session.user.email,
            },
        },
    });

    if (!workflow) {
        return Response.json({ error: "Workflow not found" }, { status: 404 });
    }

    if (body.sourceGoogleAccountId || body.targetGoogleAccountId) {
        const idsToCheck = [
            body.sourceGoogleAccountId ?? workflow.sourceGoogleAccountId,
            body.targetGoogleAccountId ?? workflow.targetGoogleAccountId,
        ].map(Number);

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return Response.json({ error: "User not found" }, { status: 404 });
        }

        const accountCount = await prisma.googleAccount.count({
            where: {
                userId: user.id,
                id: {
                    in: idsToCheck,
                },
            },
        });

        if (accountCount !== new Set(idsToCheck).size) {
            return Response.json({ error: "Invalid Google account selection" }, { status: 400 });
        }
    }

    const updated = await prisma.workflow.update({
        where: {id: Number(id) },
        data: {
            sourceCal: 
                body.sourceCalendars?.[0]?.calendarId ??
                body.sourceCal ??
                workflow.sourceCal,
            
            targetCal:
                body.targetCalendars?.[0]?.calendarId ??
                body.targetCal ??
                workflow.targetCal,

            sourceGoogleAccountId:
                body.sourceCalendars?.[0]?.googleAccountId ??
                body.sourceGoogleAccountId ??
                workflow.sourceGoogleAccountId,

            targetGoogleAccountId:
                body.targetCalendars?.[0]?.googleAccountId ??
                body.targetGoogleAccountId ??
                workflow.targetGoogleAccountId,

            enabled: body.enabled,
            

            includeTimedEvents: body.includeTimedEvents,
            includeAllDayEvents: body.includeAllDayEvents,
            includeNonBusyEvents: body.includeNonBusyEvents,
            includeTentativeEvents: body.includeTentativeEvents,
            includeFocusTimeEvents: body.includeFocusTimeEvents,
            includeOutOfOfficeEvents: body.includeOutOfOfficeEvents,

            removeSummaryLocation: body.removeSummaryLocation,
            replacementSummary: body.replacementSummary,

            preserveManualChanges: body.preserveManualChanges,

        },

    });
    if (body.sourceCalendars) {
        await prisma.workflowSourceCalendar.deleteMany({where: {workflowId: Number(id)},
    });
    await prisma.workflowSourceCalendar.createMany({data: body.sourceCalendars.map((c: any)=> ({
        workflowId: Number(id),
        googleAccountId: c.googleAccountId,
        calendarId: c.calendarId,
    })),
});
    }

    if(body.targetCalendars) {
        await prisma.workflowTargetCalendar.deleteMany({where: { workflowId: Number(id),},
    });
    await prisma.workflowTargetCalendar.createMany({
        data: body.targetCalendars.map((c: any) => ({
            workflowId: Number(id),
            googleAccountId: c.googleAccountId,
            calendarId: c.calendarId,
        })),
    });
    }
    
    return Response.json(updated);
}

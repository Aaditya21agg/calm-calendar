import {prisma} from "@/app/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { error } from "console";

export async function DELETE(req: Request) {
    try{
        const session = await getServerSession(authOptions);
        if(!session?.user?.email){
            return Response.json(
                { error: "Not authenticated"},
                {status: 401}
            );
        }
        const {searchParams} = new URL(req.url);
        const accountId = Number(searchParams.get("id"));

        if(!accountId){
            return Response.json(
                {error: "Missing account id"},
                {status: 400}
            );
        }
        const user = await prisma.user.findUnique({where: {email: session.user.email,},});
        if(!user){
            return Response.json(
                { error: "User not found"},
                {status: 404 }
            );
        }
        const account = await prisma.googleAccount.findFirst({
            where: {
                id: accountId,
                userId: user.id,
            },
        });
        if(!account){
            return Response.json(
                {error: "Google account not found"},
                {status: 404}
            );
        }
        // checking if this account is used by any workflow
        const workflowUsingAccount = await prisma.workflow.findMany({
            where: {
                OR: [
                    {sourceGoogleAccountId: accountId},
                    {targetGoogleAccountId: accountId},
                ],
            },
        });
        if(workflowUsingAccount.length > 0){
            return Response.json(
                {error: "This Google account is currently used by one or more workflows. Delete or edit those workflows before removing the account. ", workflows: workflowUsingAccount },
                {status: 400}
            );
        }
        await prisma.googleAccount.delete({
            where: { id: accountId,},
        });
        return Response.json({message: "Google account removed successfully",});

    }
    catch(err){
        console.error(err);
        return Response.json(
            {
                error: "Failed to delete Google account,"
            },
            {
                status: 500,
            }
        );
    }
}
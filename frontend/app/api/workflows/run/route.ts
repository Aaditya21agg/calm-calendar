import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import { googleSync } from "@/app/lib/googleSync";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const workflowId = Number(body.workflowId);

  if (!workflowId) {
    return Response.json({ error: "Missing workflowId" }, { status: 400 });
  }

  const workflow = await prisma.workflow.findFirst({
    where: {
      id: workflowId,
      user: {
        email: session.user.email,
      },
    },
    include: {
      sourceGoogleAccount: true,
      targetGoogleAccount: true,
    },
  });

  if (!workflow) {
    return Response.json({ error: "Workflow not found" }, { status: 404 });
  }

  await googleSync({
    workflowId: workflow.id,
    sourceGoogleAccountId: workflow.sourceGoogleAccountId,
    targetGoogleAccountId: workflow.targetGoogleAccountId,
    sourceCal: workflow.sourceCal,
    targetCal: workflow.targetCal,
    sourceAccessToken: workflow.sourceGoogleAccount.accessToken,
    sourceRefreshToken: workflow.sourceGoogleAccount.refreshToken,
    targetAccessToken: workflow.targetGoogleAccount.accessToken,
    targetRefreshToken: workflow.targetGoogleAccount.refreshToken,
  });

  return Response.json({ message: "Sync completed" });
}

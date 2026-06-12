import { getServerSession } from "next-auth";
import { prisma } from "@/app/lib/prisma";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const accounts = await prisma.googleAccount.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      email: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return Response.json(accounts);
}

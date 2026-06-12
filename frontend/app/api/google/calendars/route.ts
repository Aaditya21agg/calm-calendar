import { getServerSession } from "next-auth";
import { prisma } from "@/app/lib/prisma";
import { authOptions } from "../../auth/[...nextauth]/route";
import { refreshGoogleAccessToken } from "@/app/lib/googleSync";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const accountId = Number(searchParams.get("accountId"));

  if (!accountId) {
    return Response.json({ error: "Missing accountId" }, { status: 400 });
  }

  const account = await prisma.googleAccount.findFirst({
    where: {
      id: accountId,
      user: {
        email: session.user.email,
      },
    },
  });

  if (!account) {
    return Response.json({ error: "Google account not found" }, { status: 404 });
  }

  let accessToken = account.accessToken;
  let res = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 401) {
    try{
    accessToken = await refreshGoogleAccessToken(account.refreshToken);
    await prisma.googleAccount.update({
      where: { id: account.id },
      data: { accessToken },
    });

    res = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }
  catch(error){
    console.error(
      `Failed to refresh token for account ${account.email}:`,
      error
    );
  }

  
   return Response.json(
    {
      error: "Google account needs reconnection",
      accountId: account.id,
      email: account.email,
    },
    {status: 401}
   );
  }}

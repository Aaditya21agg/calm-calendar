import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const origin = new URL(req.url).origin;
  const code = searchParams.get("code");

  if (!code) {
    return Response.json({ error: "Missing Google authorization code" }, { status: 400 });
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${origin}/api/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok) {
    console.error("Google token exchange failed:", tokenData);
    return Response.json({ error: "Failed to connect Google account" }, { status: 500 });
  }

  const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  const profile = await profileRes.json();

  if (!profileRes.ok || !profile.email) {
    console.error("Google profile fetch failed:", profile);
    return Response.json({ error: "Failed to read Google account profile" }, { status: 500 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const existingAccount = await prisma.googleAccount.findUnique({
    where: {
      userId_email: {
        userId: user.id,
        email: profile.email,
      },
    },
  });

  await prisma.googleAccount.upsert({
    where: {
      userId_email: {
        userId: user.id,
        email: profile.email,
      },
    },
    create: {
      email: profile.email,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      userId: user.id,
    },
    update: {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || existingAccount?.refreshToken || "",
    },
  });

  return NextResponse.redirect(`${origin}/dashboard`);
}

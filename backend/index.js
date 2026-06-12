require("dotenv").config();

const crypto = require("crypto");
const cors = require("cors");
const cron = require("node-cron");
const express = require("express");
const session = require("express-session");
const { prisma } = require("./src/prisma");
const { googleSync, refreshGoogleAccessToken } = require("./src/googleSync");

const app = express();
const port = Number(process.env.PORT || 5000);
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
const backendUrl = process.env.BACKEND_URL || `http://localhost:${port}`;

app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  })
);
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-session-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    },
  })
);

function requireAuth(req, res, next) {
  if (!req.session.userEmail) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  next();
}

async function findCurrentUser(req) {
  if (!req.session.userEmail) return null;

  return prisma.user.findUnique({
    where: { email: req.session.userEmail },
  });
}

async function upsertUser(email) {
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) return existing;

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 7);

  return prisma.user.create({
    data: {
      email,
      trialEndsAt,
    },
  });
}

function googleAuthUrl(req) {
  const state = crypto.randomBytes(24).toString("hex");
  req.session.googleOAuthState = state;

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: `${backendUrl}/auth/google/callback`,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: "openid email profile https://www.googleapis.com/auth/calendar",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function exchangeGoogleCode(code) {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: `${backendUrl}/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok) {
    console.error("Google token exchange failed:", tokenData);
    throw new Error("Failed to connect Google account");
  }

  const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  const profile = await profileRes.json();

  if (!profileRes.ok || !profile.email) {
    console.error("Google profile fetch failed:", profile);
    throw new Error("Failed to read Google account profile");
  }

  return { tokenData, profile };
}

async function syncWorkflow(workflow) {
  return googleSync({
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
}

app.get("/", (_req, res) => {
  res.json({ message: "Calm Calendar Express API running" });
});

app.get("/auth/google", (req, res) => {
  res.redirect(googleAuthUrl(req));
});

app.get("/auth/google/callback", async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "Missing Google authorization code" });
    }

    if (!state || state !== req.session.googleOAuthState) {
      return res.status(400).json({ error: "Invalid OAuth state" });
    }

    delete req.session.googleOAuthState;

    const { tokenData, profile } = await exchangeGoogleCode(code);
    const ownerEmail = req.session.userEmail || profile.email;
    const user = await upsertUser(ownerEmail);

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
        refreshToken: tokenData.refresh_token || "",
        userId: user.id,
      },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || existingAccount?.refreshToken || "",
      },
    });

    req.session.userEmail = user.email;
    res.redirect(`${frontendUrl}/dashboard`);
  } catch (err) {
    console.error("Google callback error:", err);
    res.redirect(`${frontendUrl}/?error=google-auth-failed`);
  }
});

app.get("/api/auth/me", async (req, res) => {
  const user = await findCurrentUser(req);

  if (!user) {
    return res.json({ user: null });
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      subscriptionStatus: user.subscriptionStatus,
      trialEndsAt: user.trialEndsAt,
    },
  });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out" });
  });
});

app.get("/api/google/accounts", requireAuth, async (req, res) => {
  const user = await findCurrentUser(req);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
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

  res.json(accounts);
});

app.get("/api/google/calendars", requireAuth, async (req, res) => {
  try {
    const user = await findCurrentUser(req);
    const accountId = Number(req.query.accountId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!accountId) {
      return res.status(400).json({ error: "Missing accountId" });
    }

    const account = await prisma.googleAccount.findFirst({
      where: {
        id: accountId,
        userId: user.id,
      },
    });

    if (!account) {
      return res.status(404).json({ error: "Google account not found" });
    }

    let accessToken = account.accessToken;
    let calendarRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (calendarRes.status === 401) {
      accessToken = await refreshGoogleAccessToken(account.refreshToken);
      await prisma.googleAccount.update({
        where: { id: account.id },
        data: { accessToken },
      });

      calendarRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    }

    const data = await calendarRes.json();

    if (!calendarRes.ok) {
      return res
        .status(calendarRes.status)
        .json({ error: data?.error?.message || "Failed to fetch calendars" });
    }

    res.json(data.items || []);
  } catch (err) {
    console.error("Calendars error:", err);
    res.status(500).json({ error: "Failed to fetch calendars" });
  }
});

app.get("/api/workflows", requireAuth, async (req, res) => {
  const user = await findCurrentUser(req);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const workflows = await prisma.workflow.findMany({
    where: { userId: user.id },
    include: {
      sourceGoogleAccount: {
        select: { id: true, email: true },
      },
      targetGoogleAccount: {
        select: { id: true, email: true },
      },
    },
    orderBy: { id: "desc" },
  });

  res.json(workflows);
});

app.post("/api/workflows", requireAuth, async (req, res) => {
  try {
    const user = await findCurrentUser(req);
    const { name, sourceCal, targetCal, sourceGoogleAccountId, targetGoogleAccountId } = req.body;

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!sourceCal || !targetCal || !sourceGoogleAccountId || !targetGoogleAccountId) {
      return res.status(400).json({ error: "Missing workflow details" });
    }

    const idsToCheck = [Number(sourceGoogleAccountId), Number(targetGoogleAccountId)];
    const accountCount = await prisma.googleAccount.count({
      where: {
        userId: user.id,
        id: { in: idsToCheck },
      },
    });

    if (accountCount !== new Set(idsToCheck).size) {
      return res.status(400).json({ error: "Invalid Google account selection" });
    }

    const workflow = await prisma.workflow.create({
      data: {
        name: name || "Custom Workflow",
        sourceCal,
        targetCal,
        enabled: true,
        userId: user.id,
        sourceGoogleAccountId: Number(sourceGoogleAccountId),
        targetGoogleAccountId: Number(targetGoogleAccountId),
      },
    });

    res.status(201).json(workflow);
  } catch (err) {
    console.error("Create workflow error:", err);
    res.status(500).json({ error: "Failed to create workflow" });
  }
});

app.patch("/api/workflows/:id", requireAuth, async (req, res) => {
  try {
    const user = await findCurrentUser(req);
    const workflowId = Number(req.params.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        userId: user.id,
      },
    });

    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    const sourceGoogleAccountId = req.body.sourceGoogleAccountId
      ? Number(req.body.sourceGoogleAccountId)
      : workflow.sourceGoogleAccountId;
    const targetGoogleAccountId = req.body.targetGoogleAccountId
      ? Number(req.body.targetGoogleAccountId)
      : workflow.targetGoogleAccountId;
    const idsToCheck = [sourceGoogleAccountId, targetGoogleAccountId];

    const accountCount = await prisma.googleAccount.count({
      where: {
        userId: user.id,
        id: { in: idsToCheck },
      },
    });

    if (accountCount !== new Set(idsToCheck).size) {
      return res.status(400).json({ error: "Invalid Google account selection" });
    }

    const updated = await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        sourceCal: req.body.sourceCal ?? workflow.sourceCal,
        targetCal: req.body.targetCal ?? workflow.targetCal,
        enabled: req.body.enabled ?? workflow.enabled,
        sourceGoogleAccountId,
        targetGoogleAccountId,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("Update workflow error:", err);
    res.status(500).json({ error: "Failed to update workflow" });
  }
});

app.delete("/api/workflows/:id", requireAuth, async (req, res) => {
  try {
    const user = await findCurrentUser(req);
    const workflowId = Number(req.params.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        userId: user.id,
      },
    });

    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    await prisma.workflow.delete({
      where: { id: workflowId },
    });

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Delete workflow error:", err);
    res.status(500).json({ error: "Failed to delete workflow" });
  }
});

app.post("/api/workflows/:id/run", requireAuth, async (req, res) => {
  try {
    const user = await findCurrentUser(req);
    const workflowId = Number(req.params.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        userId: user.id,
      },
      include: {
        sourceGoogleAccount: true,
        targetGoogleAccount: true,
      },
    });

    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    await syncWorkflow(workflow);
    res.json({ message: "Sync completed" });
  } catch (err) {
    console.error("Run workflow error:", err);
    res.status(500).json({ error: "Failed to run sync" });
  }
});

app.post("/api/cron/sync", async (req, res) => {
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && req.headers.authorization !== `Bearer ${expectedSecret}`) {
    return res.status(401).json({ error: "Invalid cron secret" });
  }

  try {
    const workflows = await prisma.workflow.findMany({
      where: { enabled: true },
      include: {
        sourceGoogleAccount: true,
        targetGoogleAccount: true,
      },
    });

    for (const workflow of workflows) {
      await syncWorkflow(workflow);
    }

    res.json({ message: "Cron executed", synced: workflows.length });
  } catch (err) {
    console.error("Cron sync error:", err);
    res.status(500).json({ error: "Cron failed" });
  }
});

if (process.env.ENABLE_LOCAL_CRON === "true") {
  cron.schedule("*/15 * * * *", async () => {
    const workflows = await prisma.workflow.findMany({
      where: { enabled: true },
      include: {
        sourceGoogleAccount: true,
        targetGoogleAccount: true,
      },
    });

    for (const workflow of workflows) {
      await syncWorkflow(workflow);
    }
  });
}

app.listen(port, () => {
  console.log(`Express API running at ${backendUrl}`);
});

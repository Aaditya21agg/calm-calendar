export type User = {
  id: number;
  email: string;
  subscriptionStatus: string;
  trialEndsAt: string;
};

export type GoogleAccount = {
  id: number;
  email: string;
  createdAt?: string;
};

export type GoogleCalendar = {
  id: string;
  summary: string;
  primary?: boolean;
};

export type Workflow = {
  id: number;
  name: string;
  sourceCal: string;
  targetCal: string;
  sourceGoogleAccountId: number;
  targetGoogleAccountId: number;
  sourceGoogleAccount?: GoogleAccount;
  targetGoogleAccount?: GoogleAccount;
  enabled: boolean;
  lastSyncedAt?: string | null;
};

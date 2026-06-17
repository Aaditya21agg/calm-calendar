import cron from "node-cron";

import { prisma } from "@/app/lib/prisma";
import { googleSync } from "@/app/lib/googleSync";

const globalForCron = globalThis as unknown as{
    cronStarted?: boolean
};
export function startCron(){
   return;
}

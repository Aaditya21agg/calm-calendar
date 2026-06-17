import { renewExpiringWatchChannels } from "@/app/lib/watchRenewal";
export async function POST() {
    await renewExpiringWatchChannels();
    return Response.json({success: true,});
}
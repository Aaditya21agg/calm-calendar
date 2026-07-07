import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    await prisma.workflowSourceCalendar.updateMany({
        data: {
            googleAccountId: 1,
        }
    });

    await prisma.workflowTargetCalendar.updateMany({
        data: {
            googleAccountId: 4,
        },
    });
    console.log("Done");
}

main()
     .catch(console.error)
     .finally(async () => {
        await prisma.$disconnect();
     });
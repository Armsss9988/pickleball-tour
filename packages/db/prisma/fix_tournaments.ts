import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.tournament.updateMany({
    where: {
      status: {
        notIn: ['COMPLETED', 'PUBLISHED']
      },
      publicEnabled: true
    },
    data: {
      publicEnabled: false
    }
  });
  console.log(`Updated ${result.count} tournaments to set publicEnabled = false.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

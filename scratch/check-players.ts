import { PrismaClient } from '../packages/db/src';

const prisma = new PrismaClient();

async function main() {
  const tournaments = await prisma.tournament.findMany({
    include: {
      sectionStatuses: true,
      registrations: {
        include: { playerProfile: true }
      }
    }
  });

  for (const t of tournaments) {
    if (t.registrations.length === 0) continue;
    const playersStatus = t.sectionStatuses.find(s => s.sectionKey === 'players');
    const males = t.registrations.filter(r => r.playerProfile.gender === 'MALE').length;
    const females = t.registrations.filter(r => r.playerProfile.gender === 'FEMALE').length;
    
    console.log(`Tournament: "${t.name}" (ID: ${t.id})`);
    console.log(`  Registrations count: ${t.registrations.length}`);
    console.log(`  MALE: ${males}, FEMALE: ${females}`);
    console.log(`  Player Section Status in DB:`, playersStatus);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

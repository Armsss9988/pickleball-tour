const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tournament = await prisma.tournament.findUnique({
    where: { id: 'b04c6e99-c772-4382-b0e3-7c2f61e13b5b' },
    include: { ruleset: true }
  });
  console.log('Current tournament ruleset:', tournament?.ruleset);
  if (tournament?.rulesetId) {
    const updated = await prisma.tournamentRuleset.update({
      where: { id: tournament.rulesetId },
      data: { advancePerGroup: 1 }
    });
    console.log('Updated ruleset:', updated);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());

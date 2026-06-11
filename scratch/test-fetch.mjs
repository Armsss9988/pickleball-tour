import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://golab:golab_dev_password@localhost:5433/golab_tournament?schema=public"
    }
  }
});

async function main() {
  const tournamentId = "b04c6e99-c772-4382-b0e3-7c2f61e13b5b";

  // Simulate getStandings
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { ruleset: true },
  });
  
  const rulesetConfig = (tournament?.ruleset) || {};
  const pointsForWin = rulesetConfig.pointsForWin ?? 3;
  const pointsForLoss = rulesetConfig.pointsForLoss ?? 0;

  const groups = await prisma.group.findMany({
    where: { tournamentId },
    include: {
      groupTeams: {
        include: {
          team: true,
        },
      },
    },
  });

  const dbStandings = await prisma.standing.findMany({
    where: { tournamentId },
    include: {
      team: true,
      group: true,
    },
  });

  const resultStandings = [];

  for (const group of groups) {
    const groupTeams = group.groupTeams.map(gt => gt.team);
    const groupDbStandings = dbStandings.filter(s => s.groupId === group.id);

    if (groupDbStandings.length > 0) {
      for (const std of groupDbStandings) {
        resultStandings.push({
          id: std.id,
          organizationId: std.organizationId,
          tournamentId: std.tournamentId,
          groupId: std.groupId,
          teamId: std.teamId,
          matchesPlayed: std.matchesPlayed,
          wins: std.wins,
          losses: std.losses,
          pointsFor: std.pointsFor,
          pointsAgainst: std.pointsAgainst,
          pointDiff: std.pointDiff,
          rank: std.rank ?? 0,
          tieBreakDetail: std.tieBreakDetail,
          calculatedAt: std.calculatedAt,
          team: std.team,
          group: { id: std.group.id, name: std.group.name, code: std.group.code },
          points: std.wins * pointsForWin + std.losses * pointsForLoss,
        });
      }

      const existingTeamIds = new Set(groupDbStandings.map(s => s.teamId));
      const missingTeams = groupTeams.filter(t => !existingTeamIds.has(t.id));
      if (missingTeams.length > 0) {
        const currentMaxRank = Math.max(...groupDbStandings.map(s => s.rank ?? 0), 0);
        missingTeams.forEach((team, index) => {
          resultStandings.push({
            id: `temp-${group.id}-${team.id}`,
            organizationId: group.organizationId,
            tournamentId: group.tournamentId,
            groupId: group.id,
            teamId: team.id,
            matchesPlayed: 0,
            wins: 0,
            losses: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            pointDiff: 0,
            rank: currentMaxRank + index + 1,
            tieBreakDetail: { requiresAdminDecision: false, tieBreakReason: '' },
            calculatedAt: new Date(),
            team,
            group: { id: group.id, name: group.name, code: group.code },
            points: 0,
          });
        });
      }
    } else {
      const sortedTeams = [...groupTeams].sort((a, b) => a.code.localeCompare(b.code));
      sortedTeams.forEach((team, index) => {
        resultStandings.push({
          id: `temp-${group.id}-${team.id}`,
          organizationId: group.organizationId,
          tournamentId: group.tournamentId,
          groupId: group.id,
          teamId: team.id,
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          pointDiff: 0,
          rank: index + 1,
          tieBreakDetail: { requiresAdminDecision: false, tieBreakReason: '' },
          calculatedAt: new Date(),
          team,
          group: { id: group.id, name: group.name, code: group.code },
          points: 0,
        });
      });
    }
  }

  console.log("Simulated Standings Output length:", resultStandings.length);
  if (resultStandings.length > 0) {
    console.log("First item sample:", JSON.stringify(resultStandings[0], null, 2));
    console.log("Sample of all items properties map:");
    console.table(resultStandings.map(s => ({
      id: s.id,
      groupId: s.groupId,
      teamName: s.team.name,
      rank: s.rank,
      wins: s.wins,
      losses: s.losses,
      points: s.points,
      groupCode: s.group.code
    })));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

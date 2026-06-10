import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/prisma/prisma.service';

describe('Pickleball Tournament Platform - Full E2E Flow', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let orgId: string;
  let tournamentId: string;
  let drawId: string;
  let teams: any[] = [];
  let matches: any[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();

    // 1. Get organization and log in as super admin
    const org = await prisma.organization.findUnique({ where: { slug: 'golab' } });
    orgId = org.id;

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@golab.vn', password: 'admin123' })
      .expect(HttpStatus.OK);

    adminToken = loginRes.body.accessToken;
    expect(adminToken).toBeDefined();
  });

  afterAll(async () => {
    // Cleanup tournament created to keep DB clean
    if (tournamentId) {
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
      });
      const rulesetId = tournament?.rulesetId;

      if (rulesetId) {
        await prisma.tournament.update({
          where: { id: tournamentId },
          data: { rulesetId: null },
        });
      }

      await prisma.scoreEvent.deleteMany({ where: { tournamentId } });
      await prisma.matchResult.deleteMany({ where: { tournamentId } });
      await prisma.matchLineupPlayer.deleteMany({ where: { tournamentId } });
      await prisma.matchLineup.deleteMany({ where: { tournamentId } });
      await prisma.matchSegment.deleteMany({ where: { tournamentId } });
      await prisma.match.deleteMany({ where: { tournamentId } });
      await prisma.standing.deleteMany({ where: { tournamentId } });
      await prisma.teamMember.deleteMany({ where: { tournamentId } });
      await prisma.groupTeam.deleteMany({ where: { tournamentId } });
      await prisma.team.deleteMany({ where: { tournamentId } });
      await prisma.teamDraw.deleteMany({ where: { tournamentId } });
      await prisma.group.deleteMany({ where: { tournamentId } });
      await prisma.stage.deleteMany({ where: { tournamentId } });
      await prisma.tournamentRegistration.deleteMany({ where: { tournamentId } });
      await prisma.auditLog.deleteMany({ where: { tournamentId } });

      if (rulesetId) {
        await prisma.overlapRule.deleteMany({ where: { rulesetId } });
        await prisma.playerLimitRule.deleteMany({ where: { rulesetId } });
        await prisma.teamCompositionRule.deleteMany({ where: { rulesetId } });
        await prisma.scoringConfig.deleteMany({ where: { rulesetId } });
        await prisma.segmentDefinition.deleteMany({ where: { rulesetId } });
        await prisma.tournamentRuleset.deleteMany({ where: { id: rulesetId } });
      }

      await prisma.tournament.delete({ where: { id: tournamentId } });
    }
    await app.close();
  });

  it('Phase 1: Admin creates tournament, configures flexible ruleset & imports 40 players', async () => {
    // 1.1 Create tournament in DRAFT status
    const createRes = await request(app.getHttpServer())
      .post('/tournaments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Cúp GOLAB Lần 2 — Đường đua Tiếp sức Đoàn kết',
        slug: `cup-golab-lan-2-e2e-${Date.now()}`,
        venueName: 'Sân Pickleball GOLAB',
        openingTime: new Date().toISOString(),
      })
      .expect(HttpStatus.CREATED);

    tournamentId = createRes.body.id;
    expect(tournamentId).toBeDefined();
    expect(createRes.body.status).toBe('DRAFT');

    // 1.2 Update Ruleset: target score 21 (mốc 7 - 14 - 21) & All players must play
    const rulesetDto = {
      name: 'Luật Tiếp Sức Linh Hoạt 21',
      sport: 'pickleball',
      isTemplate: false,
      segments: [
        { segmentKey: 'mens_doubles', name: 'Đôi Nam', targetScore: 7, playerCount: 2, genderRule: 'male_only', orderIndex: 0, isDrawable: true },
        { segmentKey: 'womens_doubles', name: 'Đôi Nữ', targetScore: 14, playerCount: 2, genderRule: 'female_only', orderIndex: 1, isDrawable: true },
        { segmentKey: 'mixed_doubles', name: 'Đôi Nam Nữ', targetScore: 21, playerCount: 2, genderRule: 'mixed', orderIndex: 2, isDrawable: true },
      ],
      teamComposition: {
        teamSize: 5,
        maleCount: 3,
        femaleCount: 2,
        allMustPlay: true,
      },
      playerLimits: [
        { gender: 'MALE', minSegments: 1, maxSegments: 1 },
        { gender: 'FEMALE', minSegments: 1, maxSegments: 2 },
      ],
      overlapRules: [
        { segmentAKey: 'mens_doubles', segmentBKey: 'mixed_doubles', gender: 'MALE', isForbidden: true }
      ],
      scoringConfig: {
        winScore: 21,
        noDeuce: true,
        sideSwitchAfterSegments: 0,
        pointsForWin: 3,
        pointsForLoss: 0,
      }
    };

    await request(app.getHttpServer())
      .put(`/tournaments/${tournamentId}/ruleset`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(rulesetDto)
      .expect(HttpStatus.OK);

    // 1.3 Import 40 mock players
    const mockPlayers = [];
    for (let i = 1; i <= 24; i++) {
      mockPlayers.push({ fullName: `VĐV Nam ${i}`, gender: 'MALE' });
    }
    for (let i = 1; i <= 16; i++) {
      mockPlayers.push({ fullName: `VĐV Nữ ${i}`, gender: 'FEMALE' });
    }

    await request(app.getHttpServer())
      .post(`/tournaments/${tournamentId}/players/import`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ players: mockPlayers })
      .expect(HttpStatus.CREATED);

    // Validate registrations
    const valRes = await request(app.getHttpServer())
      .post(`/tournaments/${tournamentId}/players/validate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(HttpStatus.CREATED);

    expect(valRes.body.valid).toBe(true);
    expect(valRes.body.summary.total.actual).toBe(40);
  });

  it('Phase 2: Admin runs bốc thăm chia đội, gán bảng đấu & lập lịch vòng bảng', async () => {
    // 2.1 Draw preview
    const drawPreviewRes = await request(app.getHttpServer())
      .post(`/tournaments/${tournamentId}/team-draws/preview`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ seed: 'E2E-TEST-SEED' })
      .expect(HttpStatus.CREATED);

    drawId = drawPreviewRes.body.id;
    expect(drawId).toBeDefined();
    expect(drawPreviewRes.body.status).toBe('PREVIEW');

    // Confirm draw to create teams
    await request(app.getHttpServer())
      .post(`/tournaments/${tournamentId}/team-draws/${drawId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(HttpStatus.CREATED);

    // Verify 8 teams are created
    const teamsRes = await request(app.getHttpServer())
      .get(`/tournaments/${tournamentId}/teams`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(HttpStatus.OK);

    teams = teamsRes.body;
    expect(teams.length).toBe(8);

    // 2.2 Initialize & Assign groups
    await request(app.getHttpServer())
      .post(`/tournaments/${tournamentId}/groups/init`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(HttpStatus.CREATED);

    await request(app.getHttpServer())
      .post(`/tournaments/${tournamentId}/groups/random-assignment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(HttpStatus.CREATED);

    // 2.3 Generate group stage schedule (12 matches)
    await request(app.getHttpServer())
      .post(`/tournaments/${tournamentId}/schedule/generate-group-stage`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(HttpStatus.CREATED);

    // Resolve court conflicts by assigning each match a unique court name in the database
    const dbMatches = await prisma.match.findMany({ where: { tournamentId } });
    for (let i = 0; i < dbMatches.length; i++) {
      const matchItem = dbMatches[i];
      if (matchItem) {
        await prisma.match.update({
          where: { id: matchItem.id },
          data: { courtName: `Sân ${i + 1}` },
        });
      }
    }

    // Trigger re-validation so schedule sectionStatus becomes VALID
    await request(app.getHttpServer())
      .post(`/tournaments/${tournamentId}/validate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(HttpStatus.CREATED);

    // 2.4 Publish remains blocked before tournament completion
    const publishRes = await request(app.getHttpServer())
      .post(`/tournaments/${tournamentId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(HttpStatus.BAD_REQUEST);

    expect(publishRes.body.message).toContain('giải chưa hoàn tất');
  });

  it('Phase 3: Emergency replacement of an injured player & re-validation', async () => {
    const teamA = teams[0];
    const teamAMembers = await prisma.teamMember.findMany({
      where: { teamId: teamA.id },
      include: { playerProfile: true },
    });

    const injuredPlayer = teamAMembers.find(m => m.playerProfile.gender === 'MALE');
    expect(injuredPlayer).toBeDefined();

    // Create a new free agent player in db
    const newPlayer = await prisma.playerProfile.create({
      data: {
        organizationId: orgId,
        fullName: 'Lê Hoàng B',
        normalizedName: 'le hoang b',
        gender: 'MALE',
        source: 'manual',
      }
    });

    // Create tournament registration for the new player to satisfy replaced-member requirements
    await prisma.tournamentRegistration.create({
      data: {
        organizationId: orgId,
        tournamentId,
        playerProfileId: newPlayer.id,
        status: 'APPROVED',
        source: 'ADMIN_IMPORT',
      }
    });

    // Withdraw registration of the injured player to keep total approved registrations at exactly 40
    await prisma.tournamentRegistration.update({
      where: {
        tournamentId_playerProfileId: {
          tournamentId,
          playerProfileId: injuredPlayer.playerProfile.id,
        },
      },
      data: { status: 'WITHDRAWN' },
    });

    // Replace member on team A
    await request(app.getHttpServer())
      .post(`/tournaments/${tournamentId}/teams/${teamA.id}/replace-member`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        oldPlayerId: injuredPlayer.playerProfile.id,
        newPlayerId: newPlayer.id
      })
      .expect(HttpStatus.CREATED);

    // Verify member replaced successfully
    const updatedMembers = await prisma.teamMember.findMany({
      where: { teamId: teamA.id },
    });
    expect(updatedMembers.some(m => m.playerProfileId === newPlayer.id)).toBe(true);
    expect(updatedMembers.some(m => m.playerProfileId === injuredPlayer.playerProfile.id)).toBe(false);
  });

  it('Phase 4 & 5: Match scoring flow, Online/Offline, mốc chặng Undo, and Admin Override with Audit Log', async () => {
    // Get created matches
    const matchesList = await prisma.match.findMany({
      where: { tournamentId },
      include: { teamA: true, teamB: true },
    });
    const match = matchesList[0];
    expect(match).toBeDefined();

    // 4.1 Draw segment order
    const orderRes = await request(app.getHttpServer())
      .post(`/matches/${match.id}/segments/draw-order`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(HttpStatus.CREATED);

    const segments = orderRes.body;
    expect(segments.length).toBe(3);

    // Get team members for lineups creation
    const teamAMembers = await prisma.teamMember.findMany({
      where: { teamId: match.teamAId },
      include: { playerProfile: true },
    });
    const teamBMembers = await prisma.teamMember.findMany({
      where: { teamId: match.teamBId },
      include: { playerProfile: true },
    });

    const teamAMales = teamAMembers.filter(m => m.playerProfile.gender === 'MALE');
    const teamAFemales = teamAMembers.filter(m => m.playerProfile.gender === 'FEMALE');
    const teamBMales = teamBMembers.filter(m => m.playerProfile.gender === 'MALE');
    const teamBFemales = teamBMembers.filter(m => m.playerProfile.gender === 'FEMALE');

    expect(teamAMales.length).toBe(3);
    expect(teamAFemales.length).toBe(2);
    expect(teamBMales.length).toBe(3);
    expect(teamBFemales.length).toBe(2);

    const mensDoublesSeg = segments.find(s => s.segmentKey === 'mens_doubles');
    const womensDoublesSeg = segments.find(s => s.segmentKey === 'womens_doubles');
    const mixedDoublesSeg = segments.find(s => s.segmentKey === 'mixed_doubles');

    expect(mensDoublesSeg).toBeDefined();
    expect(womensDoublesSeg).toBeDefined();
    expect(mixedDoublesSeg).toBeDefined();

    // Submit lineups satisfying rules: max 1 segment per male, max 2 segments per female, all must play
    const teamALineups = {
      teamId: match.teamAId,
      segments: [
        { segmentId: mensDoublesSeg.id, playerIds: [teamAMales[0].playerProfileId, teamAMales[1].playerProfileId] }, // 2 males
        { segmentId: womensDoublesSeg.id, playerIds: [teamAFemales[0].playerProfileId, teamAFemales[1].playerProfileId] }, // 2 females
        { segmentId: mixedDoublesSeg.id, playerIds: [teamAMales[2].playerProfileId, teamAFemales[0].playerProfileId] }, // 1 male, 1 female
      ]
    };

    const teamBLineups = {
      teamId: match.teamBId,
      segments: [
        { segmentId: mensDoublesSeg.id, playerIds: [teamBMales[0].playerProfileId, teamBMales[1].playerProfileId] }, // 2 males
        { segmentId: womensDoublesSeg.id, playerIds: [teamBFemales[0].playerProfileId, teamBFemales[1].playerProfileId] }, // 2 females
        { segmentId: mixedDoublesSeg.id, playerIds: [teamBMales[2].playerProfileId, teamBFemales[0].playerProfileId] }, // 1 male, 1 female
      ]
    };

    await request(app.getHttpServer())
      .put(`/matches/${match.id}/lineups`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ teamLineups: [teamALineups, teamBLineups] })
      .expect(HttpStatus.OK);

    // Lock lineups
    const lockRes = await request(app.getHttpServer())
      .post(`/matches/${match.id}/lineups/lock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(HttpStatus.CREATED);

    expect(['READY', 'LINEUP_READY']).toContain(lockRes.body.status);

    const freshMatch = await prisma.match.findUnique({ where: { id: match.id } });
    expect(freshMatch?.status).toBe('READY');

    // 4.2 Start match and score first segment
    const startRes = await request(app.getHttpServer())
      .post(`/matches/${match.id}/start`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(HttpStatus.CREATED);

    expect(startRes.body.status).toBe('RUNNING');

    // Score Team A to 7 points in segment 1 (Đôi Nam)
    await request(app.getHttpServer())
      .post(`/matches/${match.id}/score-events`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ scoringTeamId: match.teamAId })
      .expect(HttpStatus.CREATED);

    for (let i = 0; i < 6; i++) {
      await request(app.getHttpServer())
        .post(`/matches/${match.id}/score-events`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ scoringTeamId: match.teamAId })
        .expect(HttpStatus.CREATED);
    }

    let updatedMatch = await prisma.match.findUnique({
      where: { id: match.id },
      include: { segments: true }
    });
    // First segment should be completed now (7 points)
    const seg1 = updatedMatch?.segments.find(s => s.segmentKey === segments[0].segmentKey);
    expect(seg1?.status).toBe('COMPLETED');
    expect(updatedMatch?.status).toBe('SEGMENT_BREAK'); // Waiting for next segment start

    // 4.3 Start segment 2 and score Team B to 14 points
    await request(app.getHttpServer())
      .post(`/matches/${match.id}/segments/${segments[1].id}/start-next`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(HttpStatus.CREATED);

    for (let i = 0; i < 14; i++) {
      await request(app.getHttpServer())
        .post(`/matches/${match.id}/score-events`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ scoringTeamId: match.teamBId })
        .expect(HttpStatus.CREATED);
    }

    updatedMatch = await prisma.match.findUnique({
      where: { id: match.id },
      include: { segments: true }
    });
    const seg2 = updatedMatch?.segments.find(s => s.segmentKey === segments[1].segmentKey);
    expect(seg2?.status).toBe('COMPLETED');

    // 4.4 Start segment 3 and reach point 21
    await request(app.getHttpServer())
      .post(`/matches/${match.id}/segments/${segments[2].id}/start-next`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(HttpStatus.CREATED);

    // Score Team A to 20 points
    for (let i = 0; i < 13; i++) {
      await request(app.getHttpServer())
        .post(`/matches/${match.id}/score-events`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ scoringTeamId: match.teamAId })
        .expect(HttpStatus.CREATED);
    }

    // Score Team B to 20 points
    for (let i = 0; i < 6; i++) {
      await request(app.getHttpServer())
        .post(`/matches/${match.id}/score-events`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ scoringTeamId: match.teamBId })
        .expect(HttpStatus.CREATED);
    }

    // Now score is 20-20. Team B scores point 21 to finish the match
    await request(app.getHttpServer())
      .post(`/matches/${match.id}/score-events`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ scoringTeamId: match.teamBId })
      .expect(HttpStatus.CREATED);

     updatedMatch = await prisma.match.findUnique({
       where: { id: match.id },
       include: { segments: true }
     });
     expect(updatedMatch?.status).toBe('COMPLETED');
 
     // 4.5 Undo the winning point at segment boundary to revert status to ONGOING
     await request(app.getHttpServer())
       .post(`/matches/${match.id}/score-events/undo-latest`)
       .set('Authorization', `Bearer ${adminToken}`)
       .send({ reason: 'Bấm nhầm điểm cuối cùng' })
       .expect(HttpStatus.CREATED);
      updatedMatch = await prisma.match.findUnique({
        where: { id: match.id },
        include: { segments: true }
      });
      expect(updatedMatch?.status).toBe('RUNNING');
 
     // Score final point for Team B again
     await request(app.getHttpServer())
       .post(`/matches/${match.id}/score-events`)
       .set('Authorization', `Bearer ${adminToken}`)
       .send({ scoringTeamId: match.teamBId })
       .expect(HttpStatus.CREATED);
 
     // Confirm match result (Team B wins 21-20)
     await request(app.getHttpServer())
       .post(`/matches/${match.id}/confirm-result`)
       .set('Authorization', `Bearer ${adminToken}`)
       .expect(HttpStatus.CREATED);
 
      updatedMatch = await prisma.match.findUnique({
        where: { id: match.id },
        include: { segments: true, result: true }
      });
      expect(updatedMatch?.status).toBe('RESULT_CONFIRMED');
      expect(updatedMatch?.winnerTeamId).toBe(match.teamBId);

    // 5.2 Admin Override result to Team A winning 21-19 with audit log
    await request(app.getHttpServer())
      .post(`/matches/${match.id}/override-result`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        teamAScore: 21,
        teamBScore: 19,
        winnerTeamId: match.teamAId,
        reason: 'Khiếu nại được chấp thuận sau khi kiểm tra video chặng 2',
      })
      .expect(HttpStatus.CREATED);

    // Verify overriden status in DB
    updatedMatch = await prisma.match.findUnique({
      where: { id: match.id },
      include: { segments: true, result: true },
    });
    expect(updatedMatch?.winnerTeamId).toBe(match.teamAId);
    expect(updatedMatch?.result?.teamAScore).toBe(21);
    expect(updatedMatch?.result?.teamBScore).toBe(19);

    // Verify audit log exists
    const logs = await prisma.auditLog.findMany({
      where: { tournamentId, action: 'RESULT_OVERRIDDEN' },
    });
    expect(logs.length).toBe(1);
    expect(logs[0]?.reason).toContain('Khiếu nại được chấp thuận');

    // Publishing remains blocked until every match result is confirmed.
    const publishBeforeCompletion = await request(app.getHttpServer())
      .post(`/tournaments/${tournamentId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(HttpStatus.BAD_REQUEST);

    expect(publishBeforeCompletion.body.message).toContain('giải chưa hoàn tất');
  });
});

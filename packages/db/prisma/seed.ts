import { PrismaClient, Gender, RegistrationStatus, RegistrationSource } from '@prisma/client';
import { hashSync } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding GOLAB Tournament Platform...');

  // ============================================================
  // 1. Create Organization
  // ============================================================
  const org = await prisma.organization.upsert({
    where: { slug: 'golab' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'GOLAB',
      slug: 'golab',
      status: 'active',
      brandingConfig: {
        primaryColor: '#1a73e8',
        logoUrl: null,
      },
    },
  });
  console.log(`✅ Organization: ${org.name}`);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@golab.vn' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      organizationId: org.id,
      email: 'admin@golab.vn',
      passwordHash: hashSync('admin123', 10),
      displayName: 'GOLAB Admin',
      status: 'ACTIVE',
    },
  });

  await prisma.userRole.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      userId: adminUser.id,
      role: 'SUPER_ADMIN',
      organizationId: org.id,
    },
  });
  console.log(`✅ Admin user: ${adminUser.email}`);

  // ============================================================
  // 3. Create Scorer User
  // ============================================================
  const scorerUser = await prisma.user.upsert({
    where: { email: 'scorer@golab.vn' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000004',
      organizationId: org.id,
      email: 'scorer@golab.vn',
      passwordHash: hashSync('scorer123', 10),
      displayName: 'GOLAB Scorer',
      status: 'ACTIVE',
    },
  });

  await prisma.userRole.upsert({
    where: { id: '00000000-0000-0000-0000-000000000005' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000005',
      userId: scorerUser.id,
      role: 'SCORER',
      organizationId: org.id,
    },
  });
  console.log(`✅ Scorer user: ${scorerUser.email}`);

  // ============================================================
  // 4. Create GOLAB Ruleset Template
  // ============================================================
  const ruleset = await prisma.tournamentRuleset.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {
      matchFormat: 'relay',
    },
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      organizationId: org.id,
      name: 'Thể thức Tiếp sức 24 (GOLAB Standard)',
      sport: 'pickleball',
      matchFormat: 'relay',
      isTemplate: true,
      createdById: adminUser.id,
    },
  });

  // Segment definitions: Mixed Doubles → Men's Doubles → Women's Doubles
  const segments = [
    { key: 'mixed_doubles', name: 'Đôi Nam Nữ', targetScore: 8, playerCount: 2, genderRule: 'mixed', orderIndex: 0, isDrawable: true },
    { key: 'mens_doubles', name: 'Đôi Nam', targetScore: 16, playerCount: 2, genderRule: 'male_only', orderIndex: 1, isDrawable: true },
    { key: 'womens_doubles', name: 'Đôi Nữ', targetScore: 24, playerCount: 2, genderRule: 'female_only', orderIndex: 2, isDrawable: true },
  ];

  for (const seg of segments) {
    await prisma.segmentDefinition.upsert({
      where: { rulesetId_segmentKey: { rulesetId: ruleset.id, segmentKey: seg.key } },
      update: {},
      create: {
        rulesetId: ruleset.id,
        segmentKey: seg.key,
        name: seg.name,
        targetScore: seg.targetScore,
        playerCount: seg.playerCount,
        genderRule: seg.genderRule,
        orderIndex: seg.orderIndex,
        isDrawable: seg.isDrawable,
      },
    });
  }

  // Team composition: 5 players (3M + 2F), all must play
  await prisma.teamCompositionRule.upsert({
    where: { rulesetId: ruleset.id },
    update: {},
    create: {
      rulesetId: ruleset.id,
      teamSize: 5,
      maleCount: 3,
      femaleCount: 2,
      allMustPlay: true,
    },
  });

  // Player limits: male max 1 segment, female max 2 segments
  const limits = [
    { gender: Gender.MALE, minSegments: 1, maxSegments: 1 },
    { gender: Gender.FEMALE, minSegments: 1, maxSegments: 2 },
  ];
  for (const limit of limits) {
    await prisma.playerLimitRule.upsert({
      where: { rulesetId_gender: { rulesetId: ruleset.id, gender: limit.gender } },
      update: {},
      create: { rulesetId: ruleset.id, ...limit },
    });
  }

  // Overlap rule: male cannot play both mens_doubles AND mixed_doubles
  await prisma.overlapRule.upsert({
    where: {
      rulesetId_segmentAKey_segmentBKey_gender: {
        rulesetId: ruleset.id,
        segmentAKey: 'mens_doubles',
        segmentBKey: 'mixed_doubles',
        gender: Gender.MALE,
      },
    },
    update: {},
    create: {
      rulesetId: ruleset.id,
      segmentAKey: 'mens_doubles',
      segmentBKey: 'mixed_doubles',
      gender: Gender.MALE,
      isForbidden: true,
    },
  });

  // Scoring config: relay to 24, no deuce, win = 3 pts
  await prisma.scoringConfig.upsert({
    where: { rulesetId: ruleset.id },
    update: {},
    create: {
      rulesetId: ruleset.id,
      winScore: 24,
      noDeuce: true,
      sideSwitchAfterSegments: 0,
      pointsForWin: 3,
      pointsForLoss: 0,
    },
  });

  // ============================================================
  // 4b. Create Single Game Template
  // ============================================================
  const singleRuleset = await prisma.tournamentRuleset.upsert({
    where: { id: '00000000-0000-0000-0000-000000000011' },
    update: {
      matchFormat: 'single_game',
    },
    create: {
      id: '00000000-0000-0000-0000-000000000011',
      organizationId: org.id,
      name: 'Thể thức Đơn 11 điểm (Standard)',
      sport: 'pickleball',
      matchFormat: 'single_game',
      isTemplate: true,
      createdById: adminUser.id,
    },
  });

  await prisma.teamCompositionRule.upsert({
    where: { rulesetId: singleRuleset.id },
    update: {},
    create: {
      rulesetId: singleRuleset.id,
      teamSize: 1,
      maleCount: 0,
      femaleCount: 0,
      allMustPlay: true,
    },
  });

  await prisma.scoringConfig.upsert({
    where: { rulesetId: singleRuleset.id },
    update: {},
    create: {
      rulesetId: singleRuleset.id,
      winScore: 11,
      noDeuce: false,
      sideSwitchAfterSegments: 0,
      pointsForWin: 3,
      pointsForLoss: 0,
      gamePointScore: 11,
    },
  });

  // ============================================================
  // 4c. Create Best Of 3 Sets Template
  // ============================================================
  const bo3Ruleset = await prisma.tournamentRuleset.upsert({
    where: { id: '00000000-0000-0000-0000-000000000012' },
    update: {
      matchFormat: 'best_of',
    },
    create: {
      id: '00000000-0000-0000-0000-000000000012',
      organizationId: org.id,
      name: 'Thể thức Best of 3 Sets (11đ/set)',
      sport: 'pickleball',
      matchFormat: 'best_of',
      isTemplate: true,
      createdById: adminUser.id,
    },
  });

  await prisma.teamCompositionRule.upsert({
    where: { rulesetId: bo3Ruleset.id },
    update: {},
    create: {
      rulesetId: bo3Ruleset.id,
      teamSize: 2,
      maleCount: 0,
      femaleCount: 0,
      allMustPlay: true,
    },
  });

  await prisma.scoringConfig.upsert({
    where: { rulesetId: bo3Ruleset.id },
    update: {},
    create: {
      rulesetId: bo3Ruleset.id,
      winScore: 2,
      noDeuce: false,
      sideSwitchAfterSegments: 0,
      pointsForWin: 3,
      pointsForLoss: 0,
      gamePointScore: 11,
      setsToWin: 2,
    },
  });

  console.log(`✅ Ruleset templates seeded.`);

  // ============================================================
  // 5. Create 40 Player Profiles (from 14_SEED_DATA.md)
  // ============================================================
  const players: Array<{ fullName: string; gender: Gender }> = [
    // Male players (24)
    { fullName: 'Nguyễn Văn An', gender: Gender.MALE },
    { fullName: 'Trần Minh Bình', gender: Gender.MALE },
    { fullName: 'Lê Quốc Cường', gender: Gender.MALE },
    { fullName: 'Phạm Hữu Dũng', gender: Gender.MALE },
    { fullName: 'Hoàng Văn Em', gender: Gender.MALE },
    { fullName: 'Vũ Đức Phong', gender: Gender.MALE },
    { fullName: 'Đặng Văn Giang', gender: Gender.MALE },
    { fullName: 'Bùi Mạnh Hùng', gender: Gender.MALE },
    { fullName: 'Ngô Chí Khoa', gender: Gender.MALE },
    { fullName: 'Đinh Xuân Long', gender: Gender.MALE },
    { fullName: 'Phan Văn Minh', gender: Gender.MALE },
    { fullName: 'Hà Trọng Nam', gender: Gender.MALE },
    { fullName: 'Cao Đình Oanh', gender: Gender.MALE },
    { fullName: 'Lý Văn Phước', gender: Gender.MALE },
    { fullName: 'Trịnh Quang Quý', gender: Gender.MALE },
    { fullName: 'Mai Văn Sơn', gender: Gender.MALE },
    { fullName: 'Dương Đức Thắng', gender: Gender.MALE },
    { fullName: 'Tô Minh Uy', gender: Gender.MALE },
    { fullName: 'Lâm Văn Vinh', gender: Gender.MALE },
    { fullName: 'Kiều Anh Xuân', gender: Gender.MALE },
    { fullName: 'Nguyễn Thái Yên', gender: Gender.MALE },
    { fullName: 'Trần Văn Zung', gender: Gender.MALE },
    { fullName: 'Phùng Minh Anh', gender: Gender.MALE },
    { fullName: 'Đỗ Văn Bảo', gender: Gender.MALE },
    // Female players (16)
    { fullName: 'Nguyễn Thị Cẩm', gender: Gender.FEMALE },
    { fullName: 'Trần Thị Diệu', gender: Gender.FEMALE },
    { fullName: 'Lê Thị Elly', gender: Gender.FEMALE },
    { fullName: 'Phạm Thị Fang', gender: Gender.FEMALE },
    { fullName: 'Hoàng Thị Giang', gender: Gender.FEMALE },
    { fullName: 'Vũ Thị Hoa', gender: Gender.FEMALE },
    { fullName: 'Đặng Thị Iris', gender: Gender.FEMALE },
    { fullName: 'Bùi Thị Jenny', gender: Gender.FEMALE },
    { fullName: 'Ngô Thị Khanh', gender: Gender.FEMALE },
    { fullName: 'Đinh Thị Lan', gender: Gender.FEMALE },
    { fullName: 'Phan Thị Mai', gender: Gender.FEMALE },
    { fullName: 'Hà Thị Ngân', gender: Gender.FEMALE },
    { fullName: 'Cao Thị Oanh', gender: Gender.FEMALE },
    { fullName: 'Lý Thị Phương', gender: Gender.FEMALE },
    { fullName: 'Trịnh Thị Quỳnh', gender: Gender.FEMALE },
    { fullName: 'Mai Thị Rosé', gender: Gender.FEMALE },
  ];

  for (const p of players) {
    const normalized = p.fullName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    await prisma.playerProfile.upsert({
      where: {
        // Use normalized name + org as pseudo-unique for seeding
        id: `player-${normalized.replace(/\s+/g, '-')}`.substring(0, 36),
      },
      update: {},
      create: {
        id: `player-${normalized.replace(/\s+/g, '-')}`.substring(0, 36),
        organizationId: org.id,
        fullName: p.fullName,
        normalizedName: normalized,
        gender: p.gender,
        source: 'admin_import',
        claimStatus: 'UNCLAIMED',
      },
    });
  }

  console.log(`✅ Seeded ${players.length} player profiles`);
  console.log('');
  console.log('🎉 Seed complete!');
  console.log('');
  console.log('Login credentials:');
  console.log('  Admin:  admin@golab.vn  / admin123');
  console.log('  Scorer: scorer@golab.vn / scorer123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

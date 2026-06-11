import { describe, it, expect } from 'vitest';
import { BracketGeneratorService } from './bracket-generator.service';

describe('Bracket Generator Service', () => {
  it('should generate correct initial nodes from seeds', () => {
    const seeds = { A1: 'team-a1', A2: 'team-a2', A3: 'team-a3', B1: 'team-b1', B2: 'team-b2', B3: 'team-b3' };
    const nodes = BracketGeneratorService.generateInitialNodes('org-1', 'tour-1', 'stage-playoff', seeds);

    expect(nodes).toHaveLength(5);
    const p1 = nodes.find((n) => n.nodeKey === 'P1');
    expect(p1?.teamAId).toBe('team-a2');
    expect(p1?.teamBId).toBe('team-b3');

    const f = nodes.find((n) => n.nodeKey === 'F');
    expect(f?.teamAId).toBeNull();
    expect(f?.teamBId).toBeNull();
  });

  it('should advance winner correctly to the target node', () => {
    const seeds = { A1: 'team-a1', A2: 'team-a2', A3: 'team-a3', B1: 'team-b1', B2: 'team-b2', B3: 'team-b3' };
    const nodes = BracketGeneratorService.generateInitialNodes('org-1', 'tour-1', 'stage-playoff', seeds);

    const p1 = nodes.find((n) => n.nodeKey === 'P1')!;
    const sf2 = nodes.find((n) => n.nodeKey === 'SF2')!;

    // P1 completes, 'team-a2' wins
    const advanceResult = BracketGeneratorService.calculateAdvance(p1, 'team-a2', sf2);
    expect(advanceResult?.teamBId).toBe('team-a2'); // Since sf2 sourceB is 'W:P1'
  });

  it('should generate correct initial nodes for 4 groups', () => {
    const seeds = { A1: 'team-a1', B1: 'team-b1', C1: 'team-c1', D1: 'team-d1' };
    const nodes = BracketGeneratorService.generateInitialNodes('org-1', 'tour-1', 'stage-playoff', seeds, 4);

    expect(nodes).toHaveLength(3);
    const sf1 = nodes.find((n) => n.nodeKey === 'SF1');
    expect(sf1?.teamAId).toBe('team-a1');
    expect(sf1?.teamBId).toBe('team-b1');

    const sf2 = nodes.find((n) => n.nodeKey === 'SF2');
    expect(sf2?.teamAId).toBe('team-c1');
    expect(sf2?.teamBId).toBe('team-d1');

    const f = nodes.find((n) => n.nodeKey === 'F');
    expect(f?.teamAId).toBeNull();
    expect(f?.teamBId).toBeNull();
  });

  it('should generate correct initial nodes for 1 group', () => {
    const seeds = { T1: 'team-1st', T2: 'team-2nd', T3: 'team-3rd', T4: 'team-4th' };
    const nodes = BracketGeneratorService.generateInitialNodes('org-1', 'tour-1', 'stage-playoff', seeds, 1);

    expect(nodes).toHaveLength(3);
    const sf1 = nodes.find((n) => n.nodeKey === 'SF1');
    expect(sf1?.teamAId).toBe('team-1st');
    expect(sf1?.teamBId).toBe('team-4th');

    const sf2 = nodes.find((n) => n.nodeKey === 'SF2');
    expect(sf2?.teamAId).toBe('team-2nd');
    expect(sf2?.teamBId).toBe('team-3rd');

    const f = nodes.find((n) => n.nodeKey === 'F');
    expect(f?.teamAId).toBeNull();
    expect(f?.teamBId).toBeNull();
  });

  it('generates a manual 4-slot semifinal bracket with fixed seed slots', () => {
    const nodes = BracketGeneratorService.generateManualSeedNodes(
      'org-1',
      'tour-1',
      'stage-playoff',
      {
        bracketSize: 4,
        slots: [
          { slotNo: 1, teamId: 'team-1' },
          { slotNo: 2, teamId: 'team-2' },
          { slotNo: 3, teamId: 'team-3' },
          { slotNo: 4, teamId: 'team-4' },
        ],
        thirdPlaceMatchEnabled: false,
      }
    );

    const sf1 = nodes.find((n) => n.nodeKey === 'SF1');
    const sf2 = nodes.find((n) => n.nodeKey === 'SF2');
    const final = nodes.find((n) => n.nodeKey === 'F');

    expect(sf1?.teamAId).toBe('team-1');
    expect(sf1?.teamBId).toBe('team-4');
    expect(sf1?.loserAwardKey).toBe('CO_THIRD');
    expect(sf2?.teamAId).toBe('team-2');
    expect(sf2?.teamBId).toBe('team-3');
    expect(final?.sourceA).toBe('W:SF1');
    expect(final?.sourceB).toBe('W:SF2');
    expect(nodes.some((n) => n.nodeKey === '3P')).toBe(false);
  });

  it('supports byes in manual 4-slot brackets without inventing opponents', () => {
    const nodes = BracketGeneratorService.generateManualSeedNodes(
      'org-1',
      'tour-1',
      'stage-playoff',
      {
        bracketSize: 4,
        slots: [
          { slotNo: 1, teamId: 'team-1' },
          { slotNo: 2, teamId: 'team-2' },
          { slotNo: 3, teamId: 'team-3' },
          { slotNo: 4, teamId: null },
        ],
      }
    );

    const sf1 = nodes.find((n) => n.nodeKey === 'SF1');
    const sf2 = nodes.find((n) => n.nodeKey === 'SF2');

    expect(sf1?.teamAId).toBe('team-1');
    expect(sf1?.teamBId).toBeNull();
    expect(sf1?.sourceB).toBe('BYE:4');
    expect(sf2?.teamAId).toBe('team-2');
    expect(sf2?.teamBId).toBe('team-3');
  });

  it('adds a third-place node when the ruleset enables third-place matches', () => {
    const nodes = BracketGeneratorService.generateManualSeedNodes(
      'org-1',
      'tour-1',
      'stage-playoff',
      {
        bracketSize: 4,
        slots: [
          { slotNo: 1, teamId: 'team-1' },
          { slotNo: 2, teamId: 'team-2' },
          { slotNo: 3, teamId: 'team-3' },
          { slotNo: 4, teamId: 'team-4' },
        ],
        thirdPlaceMatchEnabled: true,
      }
    );

    const thirdPlace = nodes.find((n) => n.nodeKey === '3P');
    const sf1 = nodes.find((n) => n.nodeKey === 'SF1');

    expect(thirdPlace?.roundName).toBe('Tranh Hạng 3');
    expect(thirdPlace?.sourceA).toBe('L:SF1');
    expect(thirdPlace?.sourceB).toBe('L:SF2');
    expect(sf1?.loserAwardKey).toBeNull();
  });

  it('generates a manual 8-slot bracket with fixed quarterfinal layout', () => {
    const nodes = BracketGeneratorService.generateManualSeedNodes(
      'org-1',
      'tour-1',
      'stage-playoff',
      {
        bracketSize: 8,
        slots: Array.from({ length: 8 }, (_, idx) => ({
          slotNo: idx + 1,
          teamId: `team-${idx + 1}`,
        })),
      }
    );

    expect(nodes.find((n) => n.nodeKey === 'QF1')?.teamBId).toBe('team-8');
    expect(nodes.find((n) => n.nodeKey === 'QF2')?.teamAId).toBe('team-4');
    expect(nodes.find((n) => n.nodeKey === 'QF2')?.teamBId).toBe('team-5');
    expect(nodes.find((n) => n.nodeKey === 'QF3')?.teamAId).toBe('team-2');
    expect(nodes.find((n) => n.nodeKey === 'QF4')?.teamAId).toBe('team-3');
    expect(nodes.find((n) => n.nodeKey === 'SF1')?.sourceA).toBe('W:QF1');
    expect(nodes.find((n) => n.nodeKey === 'SF2')?.sourceA).toBe('W:QF3');
  });

  it('generates a manual 16-slot bracket with fixed round-of-16 layout', () => {
    const nodes = BracketGeneratorService.generateManualSeedNodes(
      'org-1',
      'tour-1',
      'stage-playoff',
      {
        bracketSize: 16,
        slots: Array.from({ length: 16 }, (_, idx) => ({
          slotNo: idx + 1,
          teamId: `team-${idx + 1}`,
        })),
        thirdPlaceMatchEnabled: true,
      } as any
    );

    expect(nodes.find((n) => n.nodeKey === 'R16-1')?.teamAId).toBe('team-1');
    expect(nodes.find((n) => n.nodeKey === 'R16-1')?.teamBId).toBe('team-16');
    expect(nodes.find((n) => n.nodeKey === 'R16-4')?.teamAId).toBe('team-8');
    expect(nodes.find((n) => n.nodeKey === 'R16-4')?.teamBId).toBe('team-9');
    expect(nodes.find((n) => n.nodeKey === 'QF1')?.sourceA).toBe('W:R16-1');
    expect(nodes.find((n) => n.nodeKey === 'QF4')?.sourceB).toBe('W:R16-8');
    expect(nodes.find((n) => n.nodeKey === 'SF1')?.sourceA).toBe('W:QF1');
    expect(nodes.find((n) => n.nodeKey === '3P')?.sourceA).toBe('L:SF1');
  });

  it('rejects duplicate teams in manual seed slots', () => {
    expect(() =>
      BracketGeneratorService.generateManualSeedNodes(
        'org-1',
        'tour-1',
        'stage-playoff',
        {
          bracketSize: 4,
          slots: [
            { slotNo: 1, teamId: 'team-1' },
            { slotNo: 2, teamId: 'team-1' },
          ],
        }
      )
    ).toThrow('Đội team-1 đã được xếp vào bracket.');
  });
});

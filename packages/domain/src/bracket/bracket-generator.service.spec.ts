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
});

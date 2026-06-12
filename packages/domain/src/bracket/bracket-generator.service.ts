import { BracketNode } from './bracket.entity';
import { ValidationError } from '../shared/errors.base';

export interface BracketSeeds {
  // For 2 groups
  A1?: string;
  A2?: string;
  A3?: string;
  A4?: string;
  B1?: string;
  B2?: string;
  B3?: string;
  B4?: string;

  // For 4 groups
  C1?: string;
  C2?: string;
  D1?: string;
  D2?: string;

  // For 1 group
  T1?: string;
  T2?: string;
  T3?: string;
  T4?: string;
  T5?: string;
  T6?: string;
  T7?: string;
  T8?: string;
}

export interface ManualSeedSlot {
  slotNo: number;
  teamId: string | null;
  sourceKey?: string | null;
}

export interface ManualSeedBracketOptions {
  bracketSize: 2 | 4 | 8 | 16;
  slots: ManualSeedSlot[];
  thirdPlaceMatchEnabled?: boolean;
}

export class BracketGeneratorService {
  private static slotTeam(slotMap: Map<number, string | null>, slotNo: number): string | null {
    return slotMap.get(slotNo) ?? null;
  }

  private static slotSource(
    slotMap: Map<number, string | null>,
    sourceMap: Map<number, string | null>,
    slotNo: number
  ): string {
    const srcKey = sourceMap.get(slotNo);
    if (srcKey && srcKey !== 'Bye' && srcKey !== 'Miễn đấu') {
      return srcKey;
    }
    return `BYE:${slotNo}`;
  }

  private static validateManualSeedOptions(options: ManualSeedBracketOptions): {
    slotMap: Map<number, string | null>;
    sourceMap: Map<number, string | null>;
  } {
    const expectedSlots = options.bracketSize;
    if (expectedSlots !== 2 && expectedSlots !== 4 && expectedSlots !== 8 && expectedSlots !== 16) {
      throw new ValidationError(`Kích thước bracket thủ công chỉ hỗ trợ 2, 4, 8 hoặc 16 slot.`);
    }

    const slotMap = new Map<number, string | null>();
    const sourceMap = new Map<number, string | null>();
    const usedTeamIds = new Set<string>();
    for (const slot of options.slots) {
      if (!Number.isInteger(slot.slotNo) || slot.slotNo < 1 || slot.slotNo > expectedSlots) {
        throw new ValidationError(`Slot seed phải nằm trong khoảng 1 đến ${expectedSlots}.`);
      }
      if (slotMap.has(slot.slotNo)) {
        throw new ValidationError(`Slot seed ${slot.slotNo} bị trùng.`);
      }

      const teamId = slot.teamId || null;
      if (teamId) {
        if (usedTeamIds.has(teamId)) {
          throw new ValidationError(`Đội ${teamId} đã được xếp vào bracket.`);
        }
        usedTeamIds.add(teamId);
      }
      slotMap.set(slot.slotNo, teamId);
      sourceMap.set(slot.slotNo, slot.sourceKey || null);
    }

    for (let slotNo = 1; slotNo <= expectedSlots; slotNo++) {
      if (!slotMap.has(slotNo)) {
        slotMap.set(slotNo, null);
        sourceMap.set(slotNo, null);
      }
    }

    return { slotMap, sourceMap };
  }

  /**
   * Generates bracket nodes from BTC-managed seed slots.
   * Slot layout is fixed so users can manually place teams while the system
   * still owns bracket topology and advancement sources.
   */
  public static generateManualSeedNodes(
    organizationId: string,
    tournamentId: string,
    stageId: string,
    options: ManualSeedBracketOptions
  ): BracketNode[] {
    const { slotMap, sourceMap } = this.validateManualSeedOptions(options);
    const hasThirdPlaceMatch = options.thirdPlaceMatchEnabled ?? false;
    const semiLoserAwardKey = hasThirdPlaceMatch ? null : 'CO_THIRD';
    const nodeDefs: Array<{
      key: string;
      roundName: string;
      sourceA: string;
      sourceB: string;
      teamAId: string | null;
      teamBId: string | null;
      winnerToNodeKey: string | null;
      loserAwardKey?: string | null;
      orderNo: number;
    }> = [];

    if (options.bracketSize === 2) {
      // 2-team bracket: single Final match only, no 3rd place
      nodeDefs.push({
        key: 'F',
        roundName: 'Chung Kết',
        sourceA: this.slotSource(slotMap, sourceMap, 1),
        sourceB: this.slotSource(slotMap, sourceMap, 2),
        teamAId: this.slotTeam(slotMap, 1),
        teamBId: this.slotTeam(slotMap, 2),
        winnerToNodeKey: null,
        loserAwardKey: 'RUNNER_UP',
        orderNo: 1,
      });
    } else if (options.bracketSize === 4) {
      nodeDefs.push(
        {
          key: 'SF1',
          roundName: 'Bán Kết',
          sourceA: this.slotSource(slotMap, sourceMap, 1),
          sourceB: this.slotSource(slotMap, sourceMap, 4),
          teamAId: this.slotTeam(slotMap, 1),
          teamBId: this.slotTeam(slotMap, 4),
          winnerToNodeKey: 'F',
          loserAwardKey: semiLoserAwardKey,
          orderNo: 1,
        },
        {
          key: 'SF2',
          roundName: 'Bán Kết',
          sourceA: this.slotSource(slotMap, sourceMap, 2),
          sourceB: this.slotSource(slotMap, sourceMap, 3),
          teamAId: this.slotTeam(slotMap, 2),
          teamBId: this.slotTeam(slotMap, 3),
          winnerToNodeKey: 'F',
          loserAwardKey: semiLoserAwardKey,
          orderNo: 2,
        },
        {
          key: 'F',
          roundName: 'Chung Kết',
          sourceA: 'W:SF1',
          sourceB: 'W:SF2',
          teamAId: null,
          teamBId: null,
          winnerToNodeKey: null,
          loserAwardKey: 'RUNNER_UP',
          orderNo: 3,
        }
      );

      if (hasThirdPlaceMatch) {
        nodeDefs.push({
          key: '3P',
          roundName: 'Tranh Hạng 3',
          sourceA: 'L:SF1',
          sourceB: 'L:SF2',
          teamAId: null,
          teamBId: null,
          winnerToNodeKey: null,
          loserAwardKey: null,
          orderNo: 4,
        });
      }
    } else if (options.bracketSize === 8) {
      nodeDefs.push(
        {
          key: 'QF1',
          roundName: 'Tứ Kết',
          sourceA: this.slotSource(slotMap, sourceMap, 1),
          sourceB: this.slotSource(slotMap, sourceMap, 8),
          teamAId: this.slotTeam(slotMap, 1),
          teamBId: this.slotTeam(slotMap, 8),
          winnerToNodeKey: 'SF1',
          orderNo: 1,
        },
        {
          key: 'QF2',
          roundName: 'Tứ Kết',
          sourceA: this.slotSource(slotMap, sourceMap, 4),
          sourceB: this.slotSource(slotMap, sourceMap, 5),
          teamAId: this.slotTeam(slotMap, 4),
          teamBId: this.slotTeam(slotMap, 5),
          winnerToNodeKey: 'SF1',
          orderNo: 2,
        },
        {
          key: 'QF3',
          roundName: 'Tứ Kết',
          sourceA: this.slotSource(slotMap, sourceMap, 2),
          sourceB: this.slotSource(slotMap, sourceMap, 7),
          teamAId: this.slotTeam(slotMap, 2),
          teamBId: this.slotTeam(slotMap, 7),
          winnerToNodeKey: 'SF2',
          orderNo: 3,
        },
        {
          key: 'QF4',
          roundName: 'Tứ Kết',
          sourceA: this.slotSource(slotMap, sourceMap, 3),
          sourceB: this.slotSource(slotMap, sourceMap, 6),
          teamAId: this.slotTeam(slotMap, 3),
          teamBId: this.slotTeam(slotMap, 6),
          winnerToNodeKey: 'SF2',
          orderNo: 4,
        },
        {
          key: 'SF1',
          roundName: 'Bán Kết',
          sourceA: 'W:QF1',
          sourceB: 'W:QF2',
          teamAId: null,
          teamBId: null,
          winnerToNodeKey: 'F',
          loserAwardKey: semiLoserAwardKey,
          orderNo: 5,
        },
        {
          key: 'SF2',
          roundName: 'Bán Kết',
          sourceA: 'W:QF3',
          sourceB: 'W:QF4',
          teamAId: null,
          teamBId: null,
          winnerToNodeKey: 'F',
          loserAwardKey: semiLoserAwardKey,
          orderNo: 6,
        },
        {
          key: 'F',
          roundName: 'Chung Kết',
          sourceA: 'W:SF1',
          sourceB: 'W:SF2',
          teamAId: null,
          teamBId: null,
          winnerToNodeKey: null,
          loserAwardKey: 'RUNNER_UP',
          orderNo: 7,
        }
      );

      if (hasThirdPlaceMatch) {
        nodeDefs.push({
          key: '3P',
          roundName: 'Tranh Hạng 3',
          sourceA: 'L:SF1',
          sourceB: 'L:SF2',
          teamAId: null,
          teamBId: null,
          winnerToNodeKey: null,
          loserAwardKey: null,
          orderNo: 8,
        });
      }
    } else {
      // options.bracketSize === 16
      nodeDefs.push(
        { key: 'R16-1', roundName: 'Vòng 1/8', sourceA: this.slotSource(slotMap, sourceMap, 1), sourceB: this.slotSource(slotMap, sourceMap, 16), teamAId: this.slotTeam(slotMap, 1), teamBId: this.slotTeam(slotMap, 16), winnerToNodeKey: 'QF1', orderNo: 1 },
        { key: 'R16-2', roundName: 'Vòng 1/8', sourceA: this.slotSource(slotMap, sourceMap, 4), sourceB: this.slotSource(slotMap, sourceMap, 13), teamAId: this.slotTeam(slotMap, 4), teamBId: this.slotTeam(slotMap, 13), winnerToNodeKey: 'QF2', orderNo: 2 },
        { key: 'R16-3', roundName: 'Vòng 1/8', sourceA: this.slotSource(slotMap, sourceMap, 5), sourceB: this.slotSource(slotMap, sourceMap, 12), teamAId: this.slotTeam(slotMap, 5), teamBId: this.slotTeam(slotMap, 12), winnerToNodeKey: 'QF2', orderNo: 3 },
        { key: 'R16-4', roundName: 'Vòng 1/8', sourceA: this.slotSource(slotMap, sourceMap, 8), sourceB: this.slotSource(slotMap, sourceMap, 9), teamAId: this.slotTeam(slotMap, 8), teamBId: this.slotTeam(slotMap, 9), winnerToNodeKey: 'QF1', orderNo: 4 },
        { key: 'R16-5', roundName: 'Vòng 1/8', sourceA: this.slotSource(slotMap, sourceMap, 2), sourceB: this.slotSource(slotMap, sourceMap, 15), teamAId: this.slotTeam(slotMap, 2), teamBId: this.slotTeam(slotMap, 15), winnerToNodeKey: 'QF3', orderNo: 5 },
        { key: 'R16-6', roundName: 'Vòng 1/8', sourceA: this.slotSource(slotMap, sourceMap, 7), sourceB: this.slotSource(slotMap, sourceMap, 10), teamAId: this.slotTeam(slotMap, 7), teamBId: this.slotTeam(slotMap, 10), winnerToNodeKey: 'QF3', orderNo: 6 },
        { key: 'R16-7', roundName: 'Vòng 1/8', sourceA: this.slotSource(slotMap, sourceMap, 3), sourceB: this.slotSource(slotMap, sourceMap, 14), teamAId: this.slotTeam(slotMap, 3), teamBId: this.slotTeam(slotMap, 14), winnerToNodeKey: 'QF4', orderNo: 7 },
        { key: 'R16-8', roundName: 'Vòng 1/8', sourceA: this.slotSource(slotMap, sourceMap, 6), sourceB: this.slotSource(slotMap, sourceMap, 11), teamAId: this.slotTeam(slotMap, 6), teamBId: this.slotTeam(slotMap, 11), winnerToNodeKey: 'QF4', orderNo: 8 },
        
        { key: 'QF1', roundName: 'Tứ Kết', sourceA: 'W:R16-1', sourceB: 'W:R16-4', teamAId: null, teamBId: null, winnerToNodeKey: 'SF1', orderNo: 9 },
        { key: 'QF2', roundName: 'Tứ Kết', sourceA: 'W:R16-2', sourceB: 'W:R16-3', teamAId: null, teamBId: null, winnerToNodeKey: 'SF1', orderNo: 10 },
        { key: 'QF3', roundName: 'Tứ Kết', sourceA: 'W:R16-5', sourceB: 'W:R16-6', teamAId: null, teamBId: null, winnerToNodeKey: 'SF2', orderNo: 11 },
        { key: 'QF4', roundName: 'Tứ Kết', sourceA: 'W:R16-7', sourceB: 'W:R16-8', teamAId: null, teamBId: null, winnerToNodeKey: 'SF2', orderNo: 12 },
        
        { key: 'SF1', roundName: 'Bán Kết', sourceA: 'W:QF1', sourceB: 'W:QF2', teamAId: null, teamBId: null, winnerToNodeKey: 'F', loserAwardKey: semiLoserAwardKey, orderNo: 13 },
        { key: 'SF2', roundName: 'Bán Kết', sourceA: 'W:QF3', sourceB: 'W:QF4', teamAId: null, teamBId: null, winnerToNodeKey: 'F', loserAwardKey: semiLoserAwardKey, orderNo: 14 },
        
        { key: 'F', roundName: 'Chung Kết', sourceA: 'W:SF1', sourceB: 'W:SF2', teamAId: null, teamBId: null, winnerToNodeKey: null, loserAwardKey: 'RUNNER_UP', orderNo: 15 }
      );

      if (hasThirdPlaceMatch) {
        nodeDefs.push({
          key: '3P',
          roundName: 'Tranh Hạng 3',
          sourceA: 'L:SF1',
          sourceB: 'L:SF2',
          teamAId: null,
          teamBId: null,
          winnerToNodeKey: null,
          loserAwardKey: null,
          orderNo: 16,
        });
      }
    }

    return nodeDefs.map((def) => new BracketNode(`node-id-${def.key}`, {
      organizationId,
      tournamentId,
      stageId,
      nodeKey: def.key,
      roundName: def.roundName,
      sourceA: def.sourceA,
      sourceB: def.sourceB,
      teamAId: def.teamAId,
      teamBId: def.teamBId,
      winnerToNodeKey: def.winnerToNodeKey,
      loserAwardKey: def.loserAwardKey,
      orderNo: def.orderNo,
    }));
  }

  /**
   * Generates initial bracket nodes using the seeds.
   */
  public static generateInitialNodes(
    organizationId: string,
    tournamentId: string,
    stageId: string,
    seeds: BracketSeeds,
    groupCount: number = 2,
    advancePerGroup?: number
  ): BracketNode[] {
    let derivedAdvance = advancePerGroup;
    if (derivedAdvance === undefined || derivedAdvance === null) {
      if (groupCount === 2) {
        derivedAdvance = 3;
      } else if (groupCount === 4) {
        derivedAdvance = 1;
      } else if (groupCount === 1) {
        derivedAdvance = 4;
      } else {
        derivedAdvance = 1;
      }
    }
    const totalQualified = groupCount * derivedAdvance;
    let nodeDefs = [];

    if (totalQualified === 4) {
      if (groupCount === 4) {
        nodeDefs = [
          { key: 'SF1', roundName: 'Bán Kết', sourceA: 'A1', sourceB: 'B1', teamAId: seeds.A1, teamBId: seeds.B1, winnerToNodeKey: 'F', loserAwardKey: 'CO_THIRD', orderNo: 1 },
          { key: 'SF2', roundName: 'Bán Kết', sourceA: 'C1', sourceB: 'D1', teamAId: seeds.C1, teamBId: seeds.D1, winnerToNodeKey: 'F', loserAwardKey: 'CO_THIRD', orderNo: 2 },
          { key: 'F', roundName: 'Chung Kết', sourceA: 'W:SF1', sourceB: 'W:SF2', teamAId: null, teamBId: null, winnerToNodeKey: null, loserAwardKey: 'RUNNER_UP', orderNo: 3 },
        ];
      } else if (groupCount === 2) {
        nodeDefs = [
          { key: 'SF1', roundName: 'Bán Kết', sourceA: 'A1', sourceB: 'B2', teamAId: seeds.A1, teamBId: seeds.B2, winnerToNodeKey: 'F', loserAwardKey: 'CO_THIRD', orderNo: 1 },
          { key: 'SF2', roundName: 'Bán Kết', sourceA: 'B1', sourceB: 'A2', teamAId: seeds.B1, teamBId: seeds.A2, winnerToNodeKey: 'F', loserAwardKey: 'CO_THIRD', orderNo: 2 },
          { key: 'F', roundName: 'Chung Kết', sourceA: 'W:SF1', sourceB: 'W:SF2', teamAId: null, teamBId: null, winnerToNodeKey: null, loserAwardKey: 'RUNNER_UP', orderNo: 3 },
        ];
      } else {
        // groupCount === 1
        nodeDefs = [
          { key: 'SF1', roundName: 'Bán Kết', sourceA: '1st', sourceB: '4th', teamAId: seeds.T1, teamBId: seeds.T4, winnerToNodeKey: 'F', loserAwardKey: 'CO_THIRD', orderNo: 1 },
          { key: 'SF2', roundName: 'Bán Kết', sourceA: '2nd', sourceB: '3rd', teamAId: seeds.T2, teamBId: seeds.T3, winnerToNodeKey: 'F', loserAwardKey: 'CO_THIRD', orderNo: 2 },
          { key: 'F', roundName: 'Chung Kết', sourceA: 'W:SF1', sourceB: 'W:SF2', teamAId: null, teamBId: null, winnerToNodeKey: null, loserAwardKey: 'RUNNER_UP', orderNo: 3 },
        ];
      }
    } else if (totalQualified === 6) {
      // 6-team playoff with byes (only supported if groupCount === 2)
      nodeDefs = [
        { key: 'P1', roundName: 'Vòng Nhánh', sourceA: 'A2', sourceB: 'B3', teamAId: seeds.A2, teamBId: seeds.B3, winnerToNodeKey: 'SF2', orderNo: 1 },
        { key: 'P2', roundName: 'Vòng Nhánh', sourceA: 'B2', sourceB: 'A3', teamAId: seeds.B2, teamBId: seeds.A3, winnerToNodeKey: 'SF1', orderNo: 2 },
        { key: 'SF1', roundName: 'Bán Kết', sourceA: 'A1', sourceB: 'W:P2', teamAId: seeds.A1, teamBId: null, winnerToNodeKey: 'F', loserAwardKey: 'CO_THIRD', orderNo: 3 },
        { key: 'SF2', roundName: 'Bán Kết', sourceA: 'B1', sourceB: 'W:P1', teamAId: seeds.B1, teamBId: null, winnerToNodeKey: 'F', loserAwardKey: 'CO_THIRD', orderNo: 4 },
        { key: 'F', roundName: 'Chung Kết', sourceA: 'W:SF1', sourceB: 'W:SF2', teamAId: null, teamBId: null, winnerToNodeKey: null, loserAwardKey: 'RUNNER_UP', orderNo: 5 },
      ];
    } else if (totalQualified === 8) {
      if (groupCount === 4) {
        nodeDefs = [
          { key: 'QF1', roundName: 'Tứ Kết', sourceA: 'A1', sourceB: 'B2', teamAId: seeds.A1, teamBId: seeds.B2, winnerToNodeKey: 'SF1', orderNo: 1 },
          { key: 'QF2', roundName: 'Tứ Kết', sourceA: 'C1', sourceB: 'D2', teamAId: seeds.C1, teamBId: seeds.D2, winnerToNodeKey: 'SF1', orderNo: 2 },
          { key: 'QF3', roundName: 'Tứ Kết', sourceA: 'B1', sourceB: 'A2', teamAId: seeds.B1, teamBId: seeds.A2, winnerToNodeKey: 'SF2', orderNo: 3 },
          { key: 'QF4', roundName: 'Tứ Kết', sourceA: 'D1', sourceB: 'C2', teamAId: seeds.D1, teamBId: seeds.C2, winnerToNodeKey: 'SF2', orderNo: 4 },
          { key: 'SF1', roundName: 'Bán Kết', sourceA: 'W:QF1', sourceB: 'W:QF2', teamAId: null, teamBId: null, winnerToNodeKey: 'F', loserAwardKey: 'CO_THIRD', orderNo: 5 },
          { key: 'SF2', roundName: 'Bán Kết', sourceA: 'W:QF3', sourceB: 'W:QF4', teamAId: null, teamBId: null, winnerToNodeKey: 'F', loserAwardKey: 'CO_THIRD', orderNo: 6 },
          { key: 'F', roundName: 'Chung Kết', sourceA: 'W:SF1', sourceB: 'W:SF2', teamAId: null, teamBId: null, winnerToNodeKey: null, loserAwardKey: 'RUNNER_UP', orderNo: 7 },
        ];
      } else if (groupCount === 2) {
        nodeDefs = [
          { key: 'QF1', roundName: 'Tứ Kết', sourceA: 'A1', sourceB: 'B4', teamAId: seeds.A1, teamBId: seeds.B4, winnerToNodeKey: 'SF1', orderNo: 1 },
          { key: 'QF2', roundName: 'Tứ Kết', sourceA: 'B2', sourceB: 'A3', teamAId: seeds.B2, teamBId: seeds.A3, winnerToNodeKey: 'SF1', orderNo: 2 },
          { key: 'QF3', roundName: 'Tứ Kết', sourceA: 'B1', sourceB: 'A4', teamAId: seeds.B1, teamBId: seeds.A4, winnerToNodeKey: 'SF2', orderNo: 3 },
          { key: 'QF4', roundName: 'Tứ Kết', sourceA: 'A2', sourceB: 'B3', teamAId: seeds.A2, teamBId: seeds.B3, winnerToNodeKey: 'SF2', orderNo: 4 },
          { key: 'SF1', roundName: 'Bán Kết', sourceA: 'W:QF1', sourceB: 'W:QF2', teamAId: null, teamBId: null, winnerToNodeKey: 'F', loserAwardKey: 'CO_THIRD', orderNo: 5 },
          { key: 'SF2', roundName: 'Bán Kết', sourceA: 'W:QF3', sourceB: 'W:QF4', teamAId: null, teamBId: null, winnerToNodeKey: 'F', loserAwardKey: 'CO_THIRD', orderNo: 6 },
          { key: 'F', roundName: 'Chung Kết', sourceA: 'W:SF1', sourceB: 'W:SF2', teamAId: null, teamBId: null, winnerToNodeKey: null, loserAwardKey: 'RUNNER_UP', orderNo: 7 },
        ];
      } else {
        // groupCount === 1
        nodeDefs = [
          { key: 'QF1', roundName: 'Tứ Kết', sourceA: '1st', sourceB: '8th', teamAId: seeds.T1, teamBId: seeds.T8, winnerToNodeKey: 'SF1', orderNo: 1 },
          { key: 'QF2', roundName: 'Tứ Kết', sourceA: '4th', sourceB: '5th', teamAId: seeds.T4, teamBId: seeds.T5, winnerToNodeKey: 'SF1', orderNo: 2 },
          { key: 'QF3', roundName: 'Tứ Kết', sourceA: '2nd', sourceB: '7th', teamAId: seeds.T2, teamBId: seeds.T7, winnerToNodeKey: 'SF2', orderNo: 3 },
          { key: 'QF4', roundName: 'Tứ Kết', sourceA: '3rd', sourceB: '6th', teamAId: seeds.T3, teamBId: seeds.T6, winnerToNodeKey: 'SF2', orderNo: 4 },
          { key: 'SF1', roundName: 'Bán Kết', sourceA: 'W:QF1', sourceB: 'W:QF2', teamAId: null, teamBId: null, winnerToNodeKey: 'F', loserAwardKey: 'CO_THIRD', orderNo: 5 },
          { key: 'SF2', roundName: 'Bán Kết', sourceA: 'W:QF3', sourceB: 'W:QF4', teamAId: null, teamBId: null, winnerToNodeKey: 'F', loserAwardKey: 'CO_THIRD', orderNo: 6 },
          { key: 'F', roundName: 'Chung Kết', sourceA: 'W:SF1', sourceB: 'W:SF2', teamAId: null, teamBId: null, winnerToNodeKey: null, loserAwardKey: 'RUNNER_UP', orderNo: 7 },
        ];
      }
    } else {
      throw new ValidationError(`Số lượng đội vào vòng loại trực tiếp không hợp lệ (${totalQualified} đội). Chỉ hỗ trợ tổng cộng 4, 6 hoặc 8 đội.`);
    }

    return nodeDefs.map((def) => {
      // Node IDs will be generated at DB level or persistence level
      const mockId = `node-id-${def.key}`;
      return new BracketNode(mockId, {
        organizationId,
        tournamentId,
        stageId,
        nodeKey: def.key,
        roundName: def.roundName,
        sourceA: def.sourceA,
        sourceB: def.sourceB,
        teamAId: def.teamAId,
        teamBId: def.teamBId,
        winnerToNodeKey: def.winnerToNodeKey,
        loserAwardKey: def.loserAwardKey,
        orderNo: def.orderNo,
      });
    });
  }

  /**
   * Advances the winner of a node to its destination target node.
   * Returns a clean instruction on how to update the target node.
   */
  public static calculateAdvance(
    completedNode: BracketNode,
    winnerTeamId: string,
    targetNode: BracketNode
  ): { targetNodeId: string; teamAId: string | null; teamBId: string | null } | null {
    if (completedNode.winnerToNodeKey !== targetNode.nodeKey) {
      throw new ValidationError('Nút được cập nhật không khớp với nút đích đến của nút đã hoàn tất.');
    }

    let updatedTeamAId = targetNode.teamAId || null;
    let updatedTeamBId = targetNode.teamBId || null;

    if (targetNode.sourceA === `W:${completedNode.nodeKey}`) {
      updatedTeamAId = winnerTeamId;
    } else if (targetNode.sourceB === `W:${completedNode.nodeKey}`) {
      updatedTeamBId = winnerTeamId;
    }

    return {
      targetNodeId: targetNode.id,
      teamAId: updatedTeamAId,
      teamBId: updatedTeamBId,
    };
  }
}

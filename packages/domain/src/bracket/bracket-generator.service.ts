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

export class BracketGeneratorService {
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

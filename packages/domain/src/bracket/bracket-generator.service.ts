import { BracketNode } from './bracket.entity';
import { ValidationError } from '../shared/errors.base';

export interface BracketSeeds {
  A1: string;
  A2: string;
  A3: string;
  B1: string;
  B2: string;
  B3: string;
}

export class BracketGeneratorService {
  /**
   * Generates initial bracket nodes using the seeds.
   */
  public static generateInitialNodes(
    organizationId: string,
    tournamentId: string,
    stageId: string,
    seeds: BracketSeeds
  ): BracketNode[] {
    const nodeDefs = [
      { key: 'P1', roundName: 'Vòng Nhánh', sourceA: 'A2', sourceB: 'B3', teamAId: seeds.A2, teamBId: seeds.B3, winnerToNodeKey: 'SF2', orderNo: 1 },
      { key: 'P2', roundName: 'Vòng Nhánh', sourceA: 'B2', sourceB: 'A3', teamAId: seeds.B2, teamBId: seeds.A3, winnerToNodeKey: 'SF1', orderNo: 2 },
      { key: 'SF1', roundName: 'Bán Kết', sourceA: 'A1', sourceB: 'W:P2', teamAId: seeds.A1, teamBId: null, winnerToNodeKey: 'F', loserAwardKey: 'CO_THIRD', orderNo: 3 },
      { key: 'SF2', roundName: 'Bán Kết', sourceA: 'B1', sourceB: 'W:P1', teamAId: seeds.B1, teamBId: null, winnerToNodeKey: 'F', loserAwardKey: 'CO_THIRD', orderNo: 4 },
      { key: 'F', roundName: 'Chung Kết', sourceA: 'W:SF1', sourceB: 'W:SF2', teamAId: null, teamBId: null, winnerToNodeKey: null, loserAwardKey: 'RUNNER_UP', orderNo: 5 },
    ];

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

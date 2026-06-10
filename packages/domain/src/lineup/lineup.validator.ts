import { Ruleset } from '../ruleset/ruleset.value-object';
import { Gender } from '@golab/contracts';

export interface LineupPlayerInput {
  id: string;
  fullName: string;
  gender: Gender;
}

export interface SegmentLineupInput {
  segmentKey: string;
  playerIds: string[];
}

export interface LineupValidationResult {
  valid: boolean;
  errors: string[];
}

export class LineupValidator {
  /**
   * Validates a team's lineup submission against a ruleset.
   * 
   * @param teamLineups Lineups submitted for each segment.
   * @param teamMembers Roster of players belonging to the team.
   * @param teamName The name of the team (for clear error messages).
   * @param ruleset The ruleset configuration object.
   */
  public static validate(
    teamLineups: SegmentLineupInput[],
    teamMembers: LineupPlayerInput[],
    teamName: string,
    ruleset: Ruleset
  ): LineupValidationResult {
    const errors: string[] = [];
    const memberIds = teamMembers.map((m) => m.id);
    const memberMap = new Map<string, LineupPlayerInput>(
      teamMembers.map((m) => [m.id, m])
    );
    const format = ruleset.matchFormat;

    if (format === 'single_game' || format === 'best_of') {
      if (teamLineups.length === 0) {
        errors.push(`Đội ${teamName} chưa nộp đội hình thi đấu.`);
        return { valid: false, errors };
      }

      const seg = teamLineups[0];
      // SINGLES = 1 player, DOUBLES = 2. teamComposition may be undefined for SINGLES/DOUBLES.
      const eventType = ruleset.eventType;
      const expectedCount =
        ruleset.teamComposition?.teamSize ??
        (eventType === 'SINGLES' ? 1 : eventType === 'DOUBLES' ? 2 : 1);

      if (seg.playerIds.length !== expectedCount) {
        errors.push(
          `Đội hình thi đấu của Đội ${teamName} phải có đúng ${expectedCount} VĐV (đang chọn ${seg.playerIds.length}).`
        );
      }

      for (const pid of seg.playerIds) {
        if (!memberIds.includes(pid)) {
          errors.push(`VĐV ID "${pid}" không thuộc danh sách Đội ${teamName}.`);
        }
      }

      const playersInSeg = seg.playerIds
        .map((id) => memberMap.get(id))
        .filter((p): p is LineupPlayerInput => !!p);

      const maleCount = playersInSeg.filter((p) => p.gender === 'MALE').length;
      const femaleCount = playersInSeg.filter((p) => p.gender === 'FEMALE').length;

      const reqMale = ruleset.teamComposition?.maleCount ?? 0;
      const reqFemale = ruleset.teamComposition?.femaleCount ?? 0;

      if (reqMale > 0 && maleCount !== reqMale) {
        errors.push(
          `Đội hình Đội ${teamName} yêu cầu đúng ${reqMale} VĐV Nam (đang chọn ${maleCount}).`
        );
      }
      if (reqFemale > 0 && femaleCount !== reqFemale) {
        errors.push(
          `Đội hình Đội ${teamName} yêu cầu đúng ${reqFemale} VĐV Nữ (đang chọn ${femaleCount}).`
        );
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    }

    // 1. Validate each segment definition
    for (const seg of teamLineups) {
      const segConfig = ruleset.segments.find((c) => c.segmentKey === seg.segmentKey);
      if (!segConfig) {
        errors.push(`Chặng thi đấu "${seg.segmentKey}" của Đội ${teamName} không tồn tại trong cấu hình giải.`);
        continue;
      }

      // Check player count
      if (seg.playerIds.length !== segConfig.playerCount) {
        errors.push(
          `Chặng "${segConfig.name}" của Đội ${teamName} phải đăng ký đúng ${segConfig.playerCount} VĐV (đã chọn ${seg.playerIds.length}).`
        );
        continue;
      }

      // Check if players are team members
      for (const pid of seg.playerIds) {
        if (!memberIds.includes(pid)) {
          errors.push(`VĐV ID "${pid}" không thuộc danh sách Đội ${teamName}.`);
        }
      }

      // Check gender rule
      const playersInSeg = seg.playerIds
        .map((id) => memberMap.get(id))
        .filter((p): p is LineupPlayerInput => !!p);

      const maleCount = playersInSeg.filter((p) => p.gender === 'MALE').length;
      const femaleCount = playersInSeg.filter((p) => p.gender === 'FEMALE').length;

      if (segConfig.genderRule === 'mixed') {
        // Standard mixed doubles usually has 1 Male + 1 Female
        if (maleCount < 1 || femaleCount < 1) {
          errors.push(
            `Chặng "${segConfig.name}" của Đội ${teamName} phải là Đôi Nam Nữ (ít nhất 1 Nam và 1 Nữ).`
          );
        }
      } else if (segConfig.genderRule === 'male_only') {
        if (femaleCount > 0) {
          errors.push(
            `Chặng "${segConfig.name}" của Đội ${teamName} chỉ được phép đăng ký vận động viên Nam.`
          );
        }
      } else if (segConfig.genderRule === 'female_only') {
        if (maleCount > 0) {
          errors.push(
            `Chặng "${segConfig.name}" của Đội ${teamName} chỉ được phép đăng ký vận động viên Nữ.`
          );
        }
      }
    }

    // 2. Roster usage & limits validation (only if all segments are filled)
    const allFilled = teamLineups.every((seg) => {
      const segConfig = ruleset.segments.find((c) => c.segmentKey === seg.segmentKey);
      return segConfig && seg.playerIds.length === segConfig.playerCount;
    });

    if (allFilled && teamLineups.length === ruleset.segments.length) {
      const appearances = new Map<string, number>();
      for (const m of teamMembers) {
        appearances.set(m.id, 0);
      }

      for (const seg of teamLineups) {
        for (const pid of seg.playerIds) {
          const count = appearances.get(pid) ?? 0;
          appearances.set(pid, count + 1);
        }
      }

      // Invariant: allMustPlay
      if (ruleset.teamComposition?.allMustPlay) {
        const idlePlayers = teamMembers.filter((m) => (appearances.get(m.id) ?? 0) === 0);
        if (idlePlayers.length > 0) {
          const idleNames = idlePlayers.map((p) => p.fullName).join(', ');
          errors.push(
            `Đội ${teamName} vi phạm: Tất cả thành viên bắt buộc phải ra sân ít nhất một lần. Thành viên chưa ra sân: ${idleNames}.`
          );
        }
      }

      // Invariant: player limits per gender
      for (const m of teamMembers) {
        const count = appearances.get(m.id) ?? 0;
        const limits = ruleset.getLimitsForGender(m.gender);
        if (count < limits.minSegments || count > limits.maxSegments) {
          const genderText = m.gender === 'MALE' ? 'Nam' : 'Nữ';
          errors.push(
            `VĐV ${genderText} "${m.fullName}" của Đội ${teamName} vi phạm số chặng thi đấu: đăng ký ${count} chặng (yêu cầu từ ${limits.minSegments} đến ${limits.maxSegments}).`
          );
        }
      }

      // Invariant: forbidden overlap checking
      for (let i = 0; i < teamLineups.length; i++) {
        for (let j = i + 1; j < teamLineups.length; j++) {
          const segA = teamLineups[i];
          const segB = teamLineups[j];

          for (const m of teamMembers) {
            const playsA = segA.playerIds.includes(m.id);
            const playsB = segB.playerIds.includes(m.id);

            if (playsA && playsB && ruleset.isOverlapForbidden(segA.segmentKey, segB.segmentKey, m.gender)) {
              const nameA = ruleset.segments.find((c) => c.segmentKey === segA.segmentKey)?.name ?? segA.segmentKey;
              const nameB = ruleset.segments.find((c) => c.segmentKey === segB.segmentKey)?.name ?? segB.segmentKey;
              errors.push(
                `VĐV "${m.fullName}" của Đội ${teamName} vi phạm: Không được thi đấu trùng lặp ở cả hai chặng trong nhóm cấm trùng (${nameA} và ${nameB}).`
              );
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

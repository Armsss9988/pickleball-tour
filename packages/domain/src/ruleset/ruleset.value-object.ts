import { ValueObject } from '../shared/value-object.base';
import { ValidationError } from '../shared/errors.base';
import { CreateRulesetDto, EventType, Gender } from '@golab/contracts';

export class Ruleset extends ValueObject<CreateRulesetDto> {
  constructor(props: CreateRulesetDto) {
    super(props);
    this.validate();
  }

  get matchFormat(): string {
    return this.props.matchFormat ?? 'relay';
  }

  get eventType(): EventType {
    return this.props.eventType ?? 'TEAM_EVENT';
  }

  get competitionFormat(): string {
    return this.props.competitionFormat ?? 'GROUP_STAGE_KNOCKOUT';
  }

  get name(): string {
    return this.props.name;
  }

  get sport(): string {
    return this.props.sport;
  }

  get segments() {
    return this.props.segments || [];
  }

  get teamComposition() {
    return this.props.teamComposition;
  }

  get playerLimits() {
    return this.props.playerLimits || [];
  }

  get overlapRules() {
    return this.props.overlapRules || [];
  }

  get scoringConfig() {
    return this.props.scoringConfig;
  }

  get requireCourtConfig(): boolean {
    return this.props.requireCourtConfig ?? true;
  }

  get requireScheduleConfig(): boolean {
    return this.props.requireScheduleConfig ?? true;
  }

  get thirdPlaceMatchEnabled(): boolean {
    return this.props.thirdPlaceMatchEnabled ?? false;
  }

  get quickScoreEntryEnabled(): boolean {
    return this.props.quickScoreEntryEnabled ?? false;
  }

  get requireLineup(): boolean {
    return this.props.requireLineup ?? true;
  }

  get groupCount(): number {
    return this.props.groupCount ?? 2;
  }

  get advancePerGroup(): number {
    return this.props.advancePerGroup ?? 1;
  }

  get knockoutBracketSize(): number | null {
    return this.props.knockoutBracketSize ?? null;
  }

  get knockoutSeedSlots() {
    return this.props.knockoutSeedSlots || [];
  }

  /**
   * Performs domain validation on the ruleset configuration.
   * Validation branches based on eventType and matchFormat.
   */
  private validate(): void {
    const config = this.props;
    const format = config.matchFormat ?? 'relay';
    const eventType = config.eventType ?? 'TEAM_EVENT';

    // Constraint: relay chỉ hợp lệ với TEAM_EVENT
    if (format === 'relay' && eventType !== 'TEAM_EVENT') {
      throw new ValidationError(
        `Thể thức 'Tiếp sức' (relay) chỉ dùng được với giải Đồng đội (TEAM_EVENT), không thể dùng cho giải ${eventType}.`
      );
    }

    // Kiểm tra scoringConfig tồn tại
    const sc = config.scoringConfig;
    if (!sc) {
      throw new ValidationError(`Cấu hình điểm số không được để trống.`);
    }

    // ===== Nhánh SINGLES / DOUBLES =====
    if (eventType === 'SINGLES' || eventType === 'DOUBLES') {
      const expectedTeamSize = eventType === 'SINGLES' ? 1 : 2;

      // teamComposition optional cho SINGLES/DOUBLES nhưng nếu có thì phải đúng teamSize
      const comp = config.teamComposition;
      if (comp && comp.teamSize !== expectedTeamSize) {
        throw new ValidationError(
          `Giải ${eventType} yêu cầu quy mô đội phải là ${expectedTeamSize} người (đang cấu hình: ${comp.teamSize}).`
        );
      }

      // Không được dùng relay với SINGLES/DOUBLES
      if (format === 'relay') {
        throw new ValidationError(
          `Giải ${eventType} không thể dùng thể thức Tiếp sức. Hãy chọn single_game hoặc best_of.`
        );
      }

      // V13: Deuce config check
      if (!sc.noDeuce && sc.deuceMaxScore !== undefined && sc.deuceMaxScore !== null) {
        const targetScore = format === 'best_of' ? (sc.gamePointScore ?? 11) : sc.winScore;
        if (sc.deuceMaxScore <= targetScore) {
          throw new ValidationError(
            `Điểm giới hạn deuce (${sc.deuceMaxScore}) phải lớn hơn điểm thắng mục tiêu (${targetScore}).`
          );
        }
      }

      if (format === 'single_game') {
        // Không cần segments
        if (config.segments && config.segments.length > 0) {
          throw new ValidationError(`Thể thức trận đơn không được cấu hình các chặng thi đấu.`);
        }
        if (sc.winScore <= 0) {
          throw new ValidationError(`Điểm chiến thắng trận đấu phải lớn hơn 0.`);
        }
      } else if (format === 'best_of') {
        if (config.segments && config.segments.length > 0) {
          throw new ValidationError(`Thể thức Best-of Sets không được cấu hình các chặng thi đấu.`);
        }
        const setsToWin = sc.setsToWin ?? 2;
        if (setsToWin < 1 || setsToWin > 5) {
          throw new ValidationError(`Số set cần thắng để thắng trận đấu phải từ 1 đến 5.`);
        }
        if (!sc.gamePointScore || sc.gamePointScore <= 0) {
          throw new ValidationError(`Điểm mỗi set đấu (gamePointScore) phải lớn hơn 0.`);
        }
        if (sc.lastSetPointScore !== undefined && sc.lastSetPointScore !== null && sc.lastSetPointScore <= 0) {
          throw new ValidationError(`Điểm set cuối cùng (nếu cấu hình) phải lớn hơn 0.`);
        }
      }

      // SINGLES/DOUBLES không cần validate segments/overlap phức tạp
      return;
    }

    // ===== Nhánh TEAM_EVENT =====
    const comp = config.teamComposition;
    if (!comp || comp.teamSize <= 0) {
      throw new ValidationError(`Quy mô đội phải lớn hơn 0.`);
    }

    // V2: strict gender check
    if (comp.maleCount > 0 || comp.femaleCount > 0) {
      if (comp.maleCount + comp.femaleCount !== comp.teamSize) {
        throw new ValidationError(
          `Tổng số vận động viên nam (${comp.maleCount}) và nữ (${comp.femaleCount}) phải bằng quy mô đội (${comp.teamSize}).`
        );
      }
    }

    // V13: Check deuce config
    if (!sc.noDeuce && sc.deuceMaxScore !== undefined && sc.deuceMaxScore !== null) {
      const targetScore = format === 'best_of' ? (sc.gamePointScore ?? 11) : sc.winScore;
      if (sc.deuceMaxScore <= targetScore) {
        throw new ValidationError(
          `Điểm giới hạn deuce (${sc.deuceMaxScore}) phải lớn hơn điểm thắng mục tiêu (${targetScore}).`
        );
      }
    }

    if (format === 'relay') {
      // V4: relay: at least 1 segment
      if (!config.segments || config.segments.length === 0) {
        throw new ValidationError(`Thể thức tiếp sức yêu cầu ít nhất 1 chặng thi đấu.`);
      }

      // V5: Target scores check
      const sortedSegments = [...config.segments].sort((a, b) => a.orderIndex - b.orderIndex);

      // Ensure orders are unique and sequential starting at 0
      for (let i = 0; i < sortedSegments.length; i++) {
        if (sortedSegments[i].orderIndex !== i) {
          throw new ValidationError(`Thứ tự chặng thi đấu không liên tục hoặc không bắt đầu từ 0.`);
        }
      }

      // Ensure targets are strictly increasing
      let previousTarget = 0;
      let totalSlots = 0;
      for (const seg of sortedSegments) {
        if (seg.targetScore <= previousTarget) {
          throw new ValidationError(
            `Điểm mục tiêu chặng "${seg.name}" (${seg.targetScore}) phải lớn hơn chặng trước đó (${previousTarget}).`
          );
        }
        previousTarget = seg.targetScore;

        // V7: playerCount <= teamSize
        if (seg.playerCount > comp.teamSize) {
          throw new ValidationError(
            `Số lượng người chơi của chặng "${seg.name}" (${seg.playerCount}) không được lớn hơn quy mô đội (${comp.teamSize}).`
          );
        }

        totalSlots += seg.playerCount;

        // V8: gender rule check if strict composition is defined
        if (comp.maleCount > 0 || comp.femaleCount > 0) {
          if (seg.genderRule === 'male_only' && comp.maleCount < seg.playerCount) {
            throw new ValidationError(
              `Chặng "${seg.name}" yêu cầu ${seg.playerCount} VĐV Nam nhưng đội hình chỉ có ${comp.maleCount} Nam.`
            );
          }
          if (seg.genderRule === 'female_only' && comp.femaleCount < seg.playerCount) {
            throw new ValidationError(
              `Chặng "${seg.name}" yêu cầu ${seg.playerCount} VĐV Nữ nhưng đội hình chỉ có ${comp.femaleCount} Nữ.`
            );
          }
          if (seg.genderRule === 'mixed') {
            if (comp.maleCount < 1 || comp.femaleCount < 1) {
              throw new ValidationError(
                `Chặng "${seg.name}" yêu cầu cả Nam và Nữ nhưng đội hình thiếu Nam hoặc Nữ.`
              );
            }
          }
        }
      }

      // V6: Ensure the last target score matches the match win score
      const lastSegment = sortedSegments[sortedSegments.length - 1];
      if (lastSegment && lastSegment.targetScore !== sc.winScore) {
        throw new ValidationError(
          `Điểm mục tiêu của chặng cuối cùng (${lastSegment.targetScore}) phải bằng điểm chiến thắng trận đấu (${sc.winScore}).`
        );
      }

      // V9: If allMustPlay: total slots must be >= teamSize
      if (comp.allMustPlay && totalSlots < comp.teamSize) {
        throw new ValidationError(
          `Yêu cầu tất cả VĐV ra sân nhưng tổng số lượt chơi trong các chặng (${totalSlots}) nhỏ hơn quy mô đội (${comp.teamSize}).`
        );
      }

      // V10: Player limit check
      if (config.playerLimits) {
        for (const limit of config.playerLimits) {
          if (limit.minSegments > limit.maxSegments) {
            throw new ValidationError(
              `Số chặng tối thiểu của giới tính ${limit.gender} (${limit.minSegments}) không được lớn hơn tối đa (${limit.maxSegments}).`
            );
          }
          if (limit.maxSegments > config.segments.length) {
            throw new ValidationError(
              `Giới hạn số chặng tối đa (${limit.maxSegments}) của giới tính ${limit.gender} không được vượt quá tổng số chặng (${config.segments.length}).`
            );
          }
        }
      }

    } else if (format === 'single_game') {
      // V14: single_game: segments must be empty
      if (config.segments && config.segments.length > 0) {
        throw new ValidationError(`Thể thức trận đơn không được cấu hình các chặng thi đấu.`);
      }
      if (sc.winScore <= 0) {
        throw new ValidationError(`Điểm chiến thắng trận đấu phải lớn hơn 0.`);
      }
      if (comp.teamSize !== 1 && comp.teamSize !== 2) {
        throw new ValidationError(`Thể thức trận đơn thông thường chỉ hỗ trợ quy mô đội 1 người (Đơn) hoặc 2 người (Đôi).`);
      }

    } else if (format === 'best_of') {
      // V14: best_of: segments must be empty
      if (config.segments && config.segments.length > 0) {
        throw new ValidationError(`Thể thức Best-of Sets không được cấu hình các chặng thi đấu.`);
      }
      const setsToWin = sc.setsToWin ?? 2;
      if (setsToWin < 1 || setsToWin > 5) {
        throw new ValidationError(`Số set cần thắng để thắng trận đấu phải từ 1 đến 5.`);
      }
      if (!sc.gamePointScore || sc.gamePointScore <= 0) {
        throw new ValidationError(`Điểm mỗi set đấu (gamePointScore) phải lớn hơn 0.`);
      }
      if (sc.lastSetPointScore !== undefined && sc.lastSetPointScore !== null && sc.lastSetPointScore <= 0) {
        throw new ValidationError(`Điểm set cuối cùng (nếu cấu hình) phải lớn hơn 0.`);
      }
      if (comp.teamSize !== 1 && comp.teamSize !== 2) {
        throw new ValidationError(`Thể thức Best-of Sets chỉ hỗ trợ quy mô đội 1 người (Đơn) hoặc 2 người (Đôi).`);
      }
    }
  }

  /**
   * Retrieves player limit configurations for a specific gender.
   */
  public getLimitsForGender(gender: Gender) {
    const limit = this.props.playerLimits.find((l) => l.gender === gender);
    if (!limit) {
      return { minSegments: 0, maxSegments: 999 };
    }
    return { minSegments: limit.minSegments, maxSegments: limit.maxSegments };
  }

  /**
   * Checks if two segments have forbidden overlap for a given gender.
   */
  public isOverlapForbidden(segAKey: string, segBKey: string, gender: Gender): boolean {
    return this.props.overlapRules.some(
      (rule) =>
        rule.isForbidden &&
        rule.gender === gender &&
        ((rule.segmentAKey === segAKey && rule.segmentBKey === segBKey) ||
          (rule.segmentAKey === segBKey && rule.segmentBKey === segAKey))
    );
  }
}

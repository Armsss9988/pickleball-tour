import { ValueObject } from '../shared/value-object.base';
import { ValidationError } from '../shared/errors.base';
import { CreateRulesetDto, Gender } from '@golab/contracts';

export class Ruleset extends ValueObject<CreateRulesetDto> {
  constructor(props: CreateRulesetDto) {
    super(props);
    this.validate();
  }

  get name(): string {
    return this.props.name;
  }

  get sport(): string {
    return this.props.sport;
  }

  get segments() {
    return this.props.segments;
  }

  get teamComposition() {
    return this.props.teamComposition;
  }

  get playerLimits() {
    return this.props.playerLimits;
  }

  get overlapRules() {
    return this.props.overlapRules;
  }

  get scoringConfig() {
    return this.props.scoringConfig;
  }

  /**
   * Performs domain validation on the ruleset configuration.
   */
  private validate(): void {
    const config = this.props;

    // 1. Target scores check
    const sortedSegments = [...config.segments].sort((a, b) => a.orderIndex - b.orderIndex);
    
    // Ensure orders are unique and sequential starting at 0
    for (let i = 0; i < sortedSegments.length; i++) {
      if (sortedSegments[i].orderIndex !== i) {
        throw new ValidationError(`Thứ tự chặng thi đấu không liên tục hoặc không bắt đầu từ 0.`);
      }
    }

    // Ensure targets are strictly increasing
    let previousTarget = 0;
    for (const seg of sortedSegments) {
      if (seg.targetScore <= previousTarget) {
        throw new ValidationError(
          `Điểm mục tiêu chặng "${seg.name}" (${seg.targetScore}) phải lớn hơn chặng trước đó (${previousTarget}).`
        );
      }
      previousTarget = seg.targetScore;
    }

    // Ensure the last target score matches the match win score
    const lastSegment = sortedSegments[sortedSegments.length - 1];
    if (lastSegment && lastSegment.targetScore !== config.scoringConfig.winScore) {
      throw new ValidationError(
        `Điểm mục tiêu của chặng cuối cùng (${lastSegment.targetScore}) phải bằng điểm chiến thắng trận đấu (${config.scoringConfig.winScore}).`
      );
    }

    // 2. Team Composition check
    const comp = config.teamComposition;
    if (comp.maleCount + comp.femaleCount !== comp.teamSize) {
      throw new ValidationError(
        `Tổng số vận động viên nam (${comp.maleCount}) và nữ (${comp.femaleCount}) phải bằng quy mô đội (${comp.teamSize}).`
      );
    }

    // 3. Player limit check
    for (const limit of config.playerLimits) {
      if (limit.minSegments > limit.maxSegments) {
        throw new ValidationError(
          `Số chặng tối thiểu của giới tính ${limit.gender} (${limit.minSegments}) không được lớn hơn tối đa (${limit.maxSegments}).`
        );
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

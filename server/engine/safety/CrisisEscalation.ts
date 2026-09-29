/**
 * 「同频」Same Wavelength — 危机多级升级链
 *
 * 四级危机响应流程：
 *
 * 🔴 一级响应: 延长陪伴
 *   → Agent不结束对话，持续陪伴
 *   → 不推送任何其他内容
 *   → 表达关心，不评判
 *   → 如果用户愿意倾诉→倾听+共情，评估严重程度
 *   → 如果用户沉默→持续30分钟不强制，然后推送"我一直在"
 *
 * 🟠 二级响应: 专业资源引导（用户自愿选择）
 *   → 温和推送心理咨询资源卡片
 *   → 绝不替用户做决定
 *   → 绝不不经同意通知任何人
 *
 * 🟡 三级响应: 征询授权（仅在持续恶化时）
 *   → 前提: 二级已执行 + 24h数据持续恶化
 *   → 明确询问是否联系紧急联系人
 *   → 用户同意→发送预设消息
 *   → 用户拒绝→尊重，持续低频关怀
 *   → 用户未回应→不行动，继续监测
 *
 * 🟢 长期: 低频持续关怀
 *   → 危机降级后，不"遗忘"
 *   → 维持轻度关注：每2-3天一条温暖卡片
 *   → 记录到长期记忆
 *   → 如果再次恶化→从一级重新开始
 */

import {
  CrisisProtocolState,
  CrisisProtocolStage,
  CrisisStageExecution,
  CrisisAction,
  CrisisActionType,
  CrisisUserResponse,
  ResolutionConditions,
  ResolutionRecommendation,
  CrisisRiskAssessment,
  RiskFactor,
  LongTermCarePlan,
} from './types/CrisisProtocol';
import { SafetyEvent, SafetyEventType } from './types/SafetyTypes';
import { CrisisLevel } from '../core/Config';

// ============================================================================
// 危机升级管理器
// ============================================================================

export class CrisisEscalationManager {
  /** 当前危机协议状态 */
  private protocolState: CrisisProtocolState | null = null;

  /** 阶段性超时配置（毫秒） */
  private readonly TIMEOUTS = {
    [CrisisProtocolStage.STAGE_1_EXTENDED_COMPANIONSHIP]: 30 * 60 * 1000, // 30分钟
    [CrisisProtocolStage.STAGE_2_RESOURCE_GUIDANCE]: 24 * 60 * 60 * 1000, // 24小时
    [CrisisProtocolStage.STAGE_3_CONSENT_INQUIRY]: 48 * 60 * 60 * 1000, // 48小时
  };

  /** 长期关怀计划列表 */
  private longTermCarePlans: LongTermCarePlan[] = [];

  // ==========================================================================
  // 危机触发与阶段推进
  // ==========================================================================

  /**
   * 触发危机协议
   *
   * @param event 触发危机协议的安全事件
   * @returns 是否成功激活
   */
  activateCrisisProtocol(event: SafetyEvent): CrisisProtocolState {
    const now = Date.now();

    // 如果已有活跃协议 → 检查是否需要升级
    if (this.protocolState && this.protocolState.currentStage !== CrisisProtocolStage.RESOLVED) {
      return this.escalateIfNeeded(event);
    }

    // 新建协议
    this.protocolState = {
      currentStage: CrisisProtocolStage.STAGE_1_EXTENDED_COMPANIONSHIP,
      activatedAt: now,
      triggeredByEventId: event.id,
      stageHistory: [
        this.createStageExecution(CrisisProtocolStage.STAGE_1_EXTENDED_COMPANIONSHIP, now),
      ],
      userResponses: [],
      resolutionConditions: this.createInitialResolutionConditions(),
      overallRiskAssessment: this.createInitialRiskAssessment(event),
    };

    console.warn(
      `[CrisisEscalation] 🔴 危机协议已激活: ${event.description}\n` +
      `  当前阶段: 一级响应 - 延长陪伴`
    );

    return this.protocolState;
  }

  /**
   * 根据用户响应推进危机阶段
   */
  advanceStage(userResponse: CrisisUserResponse): CrisisProtocolState | null {
    if (!this.protocolState) return null;

    this.protocolState.userResponses.push(userResponse);
    const currentStage = this.protocolState.currentStage;

    // 一级→二级：愿意倾诉但状态未改善
    if (currentStage === CrisisProtocolStage.STAGE_1_EXTENDED_COMPANIONSHIP) {
      if (userResponse.willingToTalk && userResponse.attitudeTowardHelp !== 'rejecting') {
        // 用户愿意倾诉 → 完成一级，可以进入二级
        this.completeCurrentStage();
        return this.moveToStage(CrisisProtocolStage.STAGE_2_RESOURCE_GUIDANCE);
      }

      if (!userResponse.willingToTalk) {
        // 用户不愿说 → 完成一级，30分钟后推送"我一直在"，进入二级
        this.completeCurrentStage();
        const action: CrisisAction = {
          timestamp: Date.now(),
          type: CrisisActionType.WARM_CARD,
          content: '我一直在。不需要说话，知道我在就好。',
          status: 'executed',
        };
        this.addActionToCurrentStage(action);
        return this.moveToStage(CrisisProtocolStage.STAGE_2_RESOURCE_GUIDANCE);
      }
    }

    // 二级→三级：24h数据持续恶化
    if (currentStage === CrisisProtocolStage.STAGE_2_RESOURCE_GUIDANCE) {
      const timeSinceActivation = Date.now() - this.protocolState.activatedAt;
      if (timeSinceActivation > 24 * 3600 * 1000 && userResponse.attitudeTowardHelp === 'rejecting') {
        // 24h+拒绝帮助 → 进入三级征询
        this.completeCurrentStage();
        return this.moveToStage(CrisisProtocolStage.STAGE_3_CONSENT_INQUIRY);
      }

      if (userResponse.activelySeekingHelp) {
        // 用户主动求助 → 完成危机协议，进入长期关怀
        return this.resolveCrisis('user_actively_help_seeking');
      }
    }

    // 三级→长期关怀
    if (currentStage === CrisisProtocolStage.STAGE_3_CONSENT_INQUIRY) {
      if (userResponse.authorizedContact === true) {
        // 用户授权联系紧急联系人
        const action: CrisisAction = {
          timestamp: Date.now(),
          type: CrisisActionType.NOTIFY_EMERGENCY,
          content: '用户已授权联系预设紧急联系人',
          status: 'executed',
        };
        this.addActionToCurrentStage();
        // 通知后仍需长期关怀
        return this.moveToStage(CrisisProtocolStage.STAGE_LONG_TERM_CARE);
      }

      if (userResponse.authorizedContact === false) {
        // 用户拒绝 → 尊重，进入长期低频关怀
        return this.moveToStage(CrisisProtocolStage.STAGE_LONG_TERM_CARE);
      }
    }

    return this.protocolState;
  }

  /**
   * 尝试解除危机协议
   */
  resolveCrisis(reason: string): CrisisProtocolState | null {
    if (!this.protocolState) return null;

    const conditions = this.protocolState.resolutionConditions;
    const recommendation = this.evaluateResolutionConditions(conditions);

    if (recommendation.shouldResolve) {
      this.protocolState.currentStage = CrisisProtocolStage.RESOLVED;
      this.completeCurrentStage();

      // 创建长期关怀计划
      const carePlan = this.createLongTermCarePlan(recommendation);
      this.longTermCarePlans.push(carePlan);

      console.log(
        `[CrisisEscalation] ✅ 危机协议已解除: ${reason}\n` +
        `  进入长期关怀模式，持续${recommendation.monitoringDurationDays}天，` +
        `监测频率: ${recommendation.monitoringFrequency}`
      );

      return this.protocolState;
    }

    console.log(`[CrisisEscalation] ⏳ 危机解除条件未满足，继续${this.protocolState.currentStage}`);
    return this.protocolState;
  }

  /**
   * 检测到再次恶化 → 从一级重新开始
   */
  reEscalate(event: SafetyEvent): CrisisProtocolState {
    console.warn(`[CrisisEscalation] ⚠️ 检测到再次恶化: ${event.description}，从一级重新激活`);
    return this.activateCrisisProtocol(event);
  }

  // ==========================================================================
  // 阶段管理
  // ==========================================================================

  private moveToStage(newStage: CrisisProtocolStage): CrisisProtocolState {
    if (!this.protocolState) throw new Error('无活跃危机协议');

    this.protocolState.currentStage = newStage;
    const execution = this.createStageExecution(newStage, Date.now());
    this.protocolState.stageHistory.push(execution);

    const stageNames: Record<CrisisProtocolStage, string> = {
      [CrisisProtocolStage.INACTIVE]: '未激活',
      [CrisisProtocolStage.STAGE_1_EXTENDED_COMPANIONSHIP]: '一级-延长陪伴',
      [CrisisProtocolStage.STAGE_2_RESOURCE_GUIDANCE]: '二级-专业资源引导',
      [CrisisProtocolStage.STAGE_3_CONSENT_INQUIRY]: '三级-征询授权',
      [CrisisProtocolStage.STAGE_LONG_TERM_CARE]: '长期-低频关怀',
      [CrisisProtocolStage.RESOLVED]: '已解除',
    };

    console.log(`[CrisisEscalation] 🔄 阶段推进: ${stageNames[newStage]}`);
    return this.protocolState;
  }

  private completeCurrentStage(): void {
    if (!this.protocolState) return;
    const current = this.protocolState.stageHistory[
      this.protocolState.stageHistory.length - 1
    ];
    if (current) {
      current.endedAt = Date.now();
    }
  }

  private escalateIfNeeded(event: SafetyEvent): CrisisProtocolState {
    if (!this.protocolState) throw new Error('无活跃危机协议');

    // 如果已经在三级 → 维持
    if (this.protocolState.currentStage === CrisisProtocolStage.STAGE_3_CONSENT_INQUIRY) {
      return this.protocolState;
    }

    // L3新事件且在一级/二级 → 跳至三级
    if (event.level === CrisisLevel.CRISIS) {
      this.completeCurrentStage();
      return this.moveToStage(CrisisProtocolStage.STAGE_3_CONSENT_INQUIRY);
    }

    return this.protocolState;
  }

  // ==========================================================================
  // 评估与推荐
  // ==========================================================================

  private evaluateResolutionConditions(conditions: ResolutionConditions): ResolutionRecommendation {
    const metCount = [
      conditions.moodStabilized,
      conditions.noRecentRiskEvents,
      conditions.userReportedImprovement,
      conditions.safetyDialogueCleared,
    ].filter(Boolean).length;

    return {
      shouldResolve: metCount >= 3,
      postResolutionAction: conditions.userReportedImprovement
        ? '用户自我报告好转，维持轻度关注'
        : '基于客观指标判断已稳定',
      monitoringFrequency: metCount >= 4 ? 'weekly' : 'every_other_day',
      monitoringDurationDays: metCount >= 4 ? 14 : 30,
    };
  }

  private createInitialResolutionConditions(): ResolutionConditions {
    return {
      moodStabilized: false,
      noRecentRiskEvents: false,
      userReportedImprovement: false,
      safetyDialogueCleared: false,
      resolutionRecommendation: { shouldResolve: false, postResolutionAction: '', monitoringFrequency: 'daily', monitoringDurationDays: 30 },
    };
  }

  private createInitialRiskAssessment(event: SafetyEvent): CrisisRiskAssessment {
    const factors: RiskFactor[] = [
      { name: '关键词命中', severity: event.level === CrisisLevel.CRISIS ? 'critical' : 'high', description: event.description, controllable: false },
    ];

    return {
      level: event.level === CrisisLevel.CRISIS ? 'red' : 'orange',
      score: event.level === CrisisLevel.CRISIS ? 0.9 : 0.7,
      factors,
      recommendedMonitoring: event.level === CrisisLevel.CRISIS ? 'immediate' : 'intensive',
      assessedAt: Date.now(),
    };
  }

  private createStageExecution(
    stage: CrisisProtocolStage,
    now: number,
  ): CrisisStageExecution {
    return {
      stage,
      startedAt: now,
      actionsTaken: [],
      userResponse: null,
      escalatedToNext: false,
    };
  }

  private addActionToCurrentStage(action?: CrisisAction): void {
    if (!this.protocolState) return;
    const current = this.protocolState.stageHistory[
      this.protocolState.stageHistory.length - 1
    ];
    if (current && action) {
      current.actionsTaken.push(action);
    }
  }

  private createLongTermCarePlan(recommendation: ResolutionRecommendation): LongTermCarePlan {
    return {
      crisisEventId: this.protocolState?.triggeredByEventId ?? '',
      resolvedDate: new Date().toISOString().split('T')[0],
      plan: {
        frequency: recommendation.monitoringFrequency === 'weekly' ? 'weekly' :
                   recommendation.monitoringFrequency === 'every_other_day' ? 'every_2_days' :
                   'every_3_days',
        contentTypes: ['温暖卡片', '轻量鼓励'],
        endDate: new Date(Date.now() + recommendation.monitoringDurationDays * 86400000)
          .toISOString().split('T')[0],
      },
      reEscalationDetected: false,
    };
  }

  // ==========================================================================
  // 查询方法
  // ==========================================================================

  getProtocolState(): CrisisProtocolState | null {
    return this.protocolState ? { ...this.protocolState } : null;
  }

  isCrisisActive(): boolean {
    return this.protocolState !== null &&
           this.protocolState.currentStage !== CrisisProtocolStage.RESOLVED &&
           this.protocolState.currentStage !== CrisisProtocolStage.INACTIVE;
  }

  getLongTermCarePlans(): LongTermCarePlan[] {
    return [...this.longTermCarePlans];
  }

  /** 获取当前阶段允许的动作类型 */
  getAllowedActions(): CrisisActionType[] {
    if (!this.protocolState) return [];

    switch (this.protocolState.currentStage) {
      case CrisisProtocolStage.STAGE_1_EXTENDED_COMPANIONSHIP:
        return [CrisisActionType.EXTEND_DIALOGUE, CrisisActionType.WARM_CARD];
      case CrisisProtocolStage.STAGE_2_RESOURCE_GUIDANCE:
        return [CrisisActionType.RESOURCE_PUSH, CrisisActionType.HOTLINE_CARD, CrisisActionType.WARM_CARD];
      case CrisisProtocolStage.STAGE_3_CONSENT_INQUIRY:
        return [CrisisActionType.CONSENT_INQUIRY, CrisisActionType.RESOURCE_PUSH];
      case CrisisProtocolStage.STAGE_LONG_TERM_CARE:
        return [CrisisActionType.SILENT_MONITOR, CrisisActionType.WARM_CARD];
      default:
        return [];
    }
  }
}

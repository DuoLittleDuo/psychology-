/**
 * 「同频」Same Wavelength — 任务线1: 实时对话安全监控
 *
 * 职责：
 *   - 关键词/意图检测（自伤、自杀、暴力）
 *   - 一旦命中高危关键词 → 立即中断所有其他Agent动作
 *   - 接管对话 → 启动危机协议
 *   - 通知规划决策Agent: "暂停所有非安全操作"
 *
 * 安全关键词分级：
 *   ⚠️ L1-关注: "不想活了"(玩笑语境可能) → 标记，不中断，持续监测
 *   🚨 L2-警惕: 重复出现L1关键词+情绪极低 → 主动发起安全对话
 *   🔴 L3-危机: 明确的自伤/自杀意图 → 立即启动危机协议
 */

import { CrisisLevel, CRISIS_KEYWORDS, CRISIS_EMOTIONAL_THRESHOLD } from '../core/Config';
import { DialogueSafetyResult, SafetyActionType, ContextRiskAssessment } from './types/SafetyTypes';
import { SafetyEvent, SafetyEventType } from './types/SafetyTypes';

// ============================================================================
// 对话安全守卫
// ============================================================================

export class DialogueGuard {
  /** 历史风险事件（最近30条） */
  private riskHistory: SafetyEvent[] = [];

  /** 连续风险检测计数 */
  private consecutiveRiskCount: number = 0;

  /** 最后风险检测时间 */
  private lastRiskTime: number = 0;

  /** 是否处于安全对话模式 */
  private inSafetyDialogue: boolean = false;

  // ==========================================================================
  // 核心扫描方法
  // ==========================================================================

  /**
   * 扫描用户输入文本，检测危机关键词
   *
   * @param text 用户输入文本
   * @param currentMoodScore 当前情绪评分（用于上下文风险评估）
   * @param recentHistory 最近对话历史（用于检测重复关键词）
   * @returns 安全扫描结果
   */
  scan(text: string, currentMoodScore: number, recentHistory: string[] = []): DialogueSafetyResult {
    const now = Date.now();
    const normalizedText = text.toLowerCase();
    const matchedKeywords: string[] = [];
    let highestLevel: CrisisLevel | null = null;

    // 逐级检查关键词
    // L3 (最高危) 先检查，一旦命中立即触发
    for (const keyword of CRISIS_KEYWORDS[CrisisLevel.CRISIS]) {
      if (normalizedText.includes(keyword)) {
        matchedKeywords.push(keyword);
        highestLevel = CrisisLevel.CRISIS;
        break; // L3命中立即跳出
      }
    }

    // 如果L3未命中，检查L2
    if (highestLevel === null) {
      for (const keyword of CRISIS_KEYWORDS[CrisisLevel.ALERT]) {
        if (normalizedText.includes(keyword)) {
          matchedKeywords.push(keyword);
          highestLevel = CrisisLevel.ALERT;
        }
      }
    }

    // 如果L2未命中，检查L1
    if (highestLevel === null) {
      for (const keyword of CRISIS_KEYWORDS[CrisisLevel.ATTENTION]) {
        if (normalizedText.includes(keyword)) {
          matchedKeywords.push(keyword);
          highestLevel = CrisisLevel.ATTENTION;
        }
      }
    }

    // 上下文风险评估
    const contextRisk = this.assessContextRisk(
      highestLevel,
      currentMoodScore,
      recentHistory,
      matchedKeywords,
    );

    // 决定是否中断
    const shouldInterrupt = this.determineInterrupt(highestLevel, contextRisk);

    // 决定是否发起安全对话
    const shouldInitiateSafetyDialogue = this.determineSafetyDialogue(
      highestLevel,
      contextRisk,
      currentMoodScore,
    );

    // L2+情境下记录安全事件
    if (highestLevel && highestLevel >= CrisisLevel.ALERT) {
      this.consecutiveRiskCount++;
      this.lastRiskTime = now;

      const event: SafetyEvent = {
        id: `safety_${now}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: now,
        type: SafetyEventType.KEYWORD_HIT,
        level: highestLevel,
        description: `检测到${highestLevel === CrisisLevel.CRISIS ? '🔴危机' : '🚨警惕'}级关键词: ${matchedKeywords.join(', ')}`,
        trigger: text,
        actionTaken: shouldInterrupt ? SafetyActionType.INTERRUPT_ALL :
                     shouldInitiateSafetyDialogue ? SafetyActionType.INITIATE_SAFETY_DIALOGUE :
                     SafetyActionType.FLAG,
        resolved: false,
      };
      this.riskHistory.push(event);
      if (this.riskHistory.length > 30) this.riskHistory.shift();
    } else {
      // 无风险 → 递减计数
      this.consecutiveRiskCount = Math.max(0, this.consecutiveRiskCount - 1);
    }

    return {
      scannedAt: now,
      scannedText: text,
      detectedLevel: highestLevel,
      matchedKeywords,
      shouldInterrupt,
      shouldInitiateSafetyDialogue,
      contextRisk,
    };
  }

  // ==========================================================================
  // 上下文风险评估
  // ==========================================================================

  private assessContextRisk(
    detectedLevel: CrisisLevel | null,
    moodScore: number,
    recentHistory: string[],
    keywords: string[],
  ): ContextRiskAssessment {
    let keywordSeverity = 0;
    let emotionalStateRisk = 0;
    let historyRisk = 0;
    let behavioralRisk = 0;

    // 关键词严重度
    if (detectedLevel === CrisisLevel.CRISIS) {
      keywordSeverity = 1.0;
    } else if (detectedLevel === CrisisLevel.ALERT) {
      keywordSeverity = 0.7;
    } else if (detectedLevel === CrisisLevel.ATTENTION) {
      keywordSeverity = 0.3;
    }

    // 情绪状态风险：情绪越低，风险越高
    if (moodScore < CRISIS_EMOTIONAL_THRESHOLD) {
      emotionalStateRisk = 0.8;
    } else if (moodScore < 0.5) {
      emotionalStateRisk = 0.4;
    }

    // 历史风险：检查最近是否有类似事件
    const recentRisks = this.riskHistory.filter(e =>
      e.timestamp > Date.now() - 7 * 86400 * 1000
    );
    if (recentRisks.length > 0) {
      historyRisk = Math.min(1.0, recentRisks.length * 0.2);
      // 如果有L3历史 → 极大提高风险
      if (recentRisks.some(e => e.level === CrisisLevel.CRISIS)) {
        historyRisk = Math.max(historyRisk, 0.9);
      }
    }

    // 连续风险升级检测
    const isEscalating = this.consecutiveRiskCount >= 2;

    // 综合风险评分
    const riskScore = Math.min(1.0,
      keywordSeverity * 0.4 +
      emotionalStateRisk * 0.3 +
      historyRisk * 0.2 +
      behavioralRisk * 0.1
    );

    // 推荐安全动作
    let recommendedAction = SafetyActionType.NONE;
    if (detectedLevel === CrisisLevel.CRISIS || riskScore > 0.8) {
      recommendedAction = SafetyActionType.INTERRUPT_ALL;
    } else if (detectedLevel === CrisisLevel.ALERT || riskScore > 0.5) {
      recommendedAction = SafetyActionType.INITIATE_SAFETY_DIALOGUE;
    } else if (detectedLevel === CrisisLevel.ATTENTION) {
      recommendedAction = SafetyActionType.FLAG;
    }

    return {
      riskScore: Math.round(riskScore * 100) / 100,
      dimensions: {
        keywordSeverity: Math.round(keywordSeverity * 100) / 100,
        historyRisk: Math.round(historyRisk * 100) / 100,
        emotionalStateRisk: Math.round(emotionalStateRisk * 100) / 100,
        behavioralRisk: Math.round(behavioralRisk * 100) / 100,
      },
      isEscalating,
      recommendedAction,
    };
  }

  // ==========================================================================
  // 决策方法
  // ==========================================================================

  /**
   * 判断是否应立即中断所有Agent动作
   *
   * 中断条件：
   *   - L3危机关键词命中 → 立即中断
   *   - L2关键词 + 情绪极低 + 历史有风险 → 中断
   */
  private determineInterrupt(
    level: CrisisLevel | null,
    contextRisk: ContextRiskAssessment,
  ): boolean {
    if (level === CrisisLevel.CRISIS) return true;

    if (level === CrisisLevel.ALERT &&
        contextRisk.riskScore > 0.7 &&
        contextRisk.isEscalating) {
      return true;
    }

    return false;
  }

  /**
   * 判断是否应主动发起安全对话
   *
   * 条件：
   *   - L2关键词命中 + 情绪偏低
   *   - L1关键词重复出现（历史中有L1记录）
   *   - 风险评分 > 0.4
   */
  private determineSafetyDialogue(
    level: CrisisLevel | null,
    contextRisk: ContextRiskAssessment,
    moodScore: number,
  ): boolean {
    if (level === CrisisLevel.CRISIS || level === CrisisLevel.ALERT) {
      return true;
    }

    if (level === CrisisLevel.ATTENTION &&
        moodScore < 0.5 &&
        this.riskHistory.filter(e => e.level === CrisisLevel.ATTENTION).length >= 2) {
      return true;
    }

    return contextRisk.riskScore > 0.4 && contextRisk.isEscalating;
  }

  // ==========================================================================
  // 状态方法
  // ==========================================================================

  /** 进入安全对话模式 */
  enterSafetyDialogue(): void {
    this.inSafetyDialogue = true;
    console.warn('[DialogueGuard] ⚠️ 进入安全对话模式');
  }

  /** 退出安全对话模式 */
  exitSafetyDialogue(): void {
    this.inSafetyDialogue = false;
    console.log('[DialogueGuard] ✅ 退出安全对话模式');
  }

  /** 是否在安全对话模式中 */
  isInSafetyDialogue(): boolean {
    return this.inSafetyDialogue;
  }

  /** 获取历史风险事件 */
  getRiskHistory(): SafetyEvent[] {
    return [...this.riskHistory];
  }

  /** 获取最近安全事件摘要 */
  getRecentRiskSummary(): string {
    if (this.riskHistory.length === 0) return '无近期风险事件';
    const last = this.riskHistory[this.riskHistory.length - 1];
    const timeAgo = Math.round((Date.now() - last.timestamp) / 3600000);
    return `最近风险事件: ${last.description} (${timeAgo}小时前)`;
  }

  /** 重置状态 */
  reset(): void {
    this.consecutiveRiskCount = 0;
    this.inSafetyDialogue = false;
  }
}

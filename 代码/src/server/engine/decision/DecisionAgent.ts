/**
 * 「同频」Same Wavelength — 规划决策Agent (DecisionAgent)
 *
 * Agent的"大脑"：两级决策架构 (L1快速 + L2深度规划)。
 *
 * L1: 秒级响应 — 九宫格矩阵 + 干预时机判断
 * L2: 异步规划 — 多步骤自主任务链 + 记忆召回 + 反思反馈
 *
 * 运行位置：手机端侧
 * 唤醒方式：感知事件触发
 */

import { AgentBase, AgentId, AgentMessage, PerceptionEvent } from '../core/AgentBase';
import { L1DecisionInput, L1DecisionOutput, GridCellDecision, GRID_MATRIX, MoodTier, SocialWillingnessTier, TimingAssessment, InterventionExecution, DecisionContext } from './types/DecisionTypes';
import { L2PlanningInput, L2PlanningOutput, ReasoningTrace } from './types/PlanTypes';
import { TaskChain, TaskChainStatus } from './types/TaskNode';
import { MessageBus } from '../core/MessageBus';
import { Snapshot } from '../perception/types/Snapshot';
import { MemoryAgent } from '../memory/MemoryAgent';
import { MOOD_THRESHOLD_LOW, MOOD_THRESHOLD_HIGH, SOCIAL_THRESHOLD_LOW, SOCIAL_THRESHOLD_HIGH } from '../core/Config';

// ============================================================================
// 规划决策Agent
// ============================================================================

export class DecisionAgent extends AgentBase {
  readonly agentId: AgentId = 'DecisionAgent';

  /** L1 决策历史 */
  private l1DecisionHistory: L1DecisionOutput[] = [];

  /** L2 活跃任务链 */
  private activeChains: Map<string, TaskChain> = new Map();

  /** 干预执行历史 */
  private interventionHistory: InterventionExecution[] = [];

  /** 记忆Agent引用 */
  private memoryAgent: MemoryAgent | null = null;

  /** 消息总线 */
  private messageBus: MessageBus;

  constructor(memoryAgent?: MemoryAgent) {
    super();
    this.memoryAgent = memoryAgent ?? null;
    this.messageBus = MessageBus.getInstance();
  }

  // 设置记忆Agent引用
  setMemoryAgent(agent: MemoryAgent): void {
    this.memoryAgent = agent;
  }

  // ==========================================================================
  // 生命周期
  // ==========================================================================

  protected async onInitialize(): Promise<void> {
    this.registerHandler('perception_event', this.handlePerceptionEvent.bind(this));
    console.log('[DecisionAgent] 已初始化，L1+L2决策引擎就绪');
  }

  protected async onStart(): Promise<void> {
    console.log('[DecisionAgent] 已启动');
  }

  protected async onStop(): Promise<void> {
    console.log('[DecisionAgent] 已停止');
  }

  // ==========================================================================
  // 感知事件处理 → L1决策
  // ==========================================================================

  private async handlePerceptionEvent(msg: AgentMessage): Promise<void> {
    const event = msg as PerceptionEvent;
    const snapshot = event.payload.snapshot as Snapshot;

    // L1 快速决策
    const l1Decision = this.executeL1Decision(snapshot);

    // 检查是否需要L2深度规划
    if (l1Decision.needsDeepPlanning) {
      // L2 异步执行，不阻塞
      this.executeL2Planning(snapshot, l1Decision).catch(err => {
        console.error('[DecisionAgent] L2规划失败:', err);
      });
    }

    // 发布L1决策结果到消息总线 → 安全Agent检查 → 执行Agent
    // (阶段二实现完整链路)
  }

  // ==========================================================================
  // L1: 快速决策（九宫格矩阵）
  // ==========================================================================

  executeL1Decision(snapshot: Snapshot): L1DecisionOutput {
    const moodScore = snapshot.mood.overallScore;
    const socialScore = snapshot.socialWillingness.overallScore;

    // 判断情绪档位
    const moodTier = this.classifyMood(moodScore);
    const socialTier = this.classifySocialWillingness(socialScore);

    // 查九宫格
    const cellDecision = GRID_MATRIX[moodTier][socialTier];

    // 独处意愿降级
    let maxSocialDepth = cellDecision.maxSocialDepth;
    let solitudeDowngrade = false;
    if (snapshot.socialWillingness.solitudePreference && maxSocialDepth > 0) {
      maxSocialDepth = Math.max(0, maxSocialDepth - 1) as 0 | 1 | 2 | 3 | 4;
      solitudeDowngrade = true;
    }

    // L2触发判断
    const needsDeepPlanning = this.shouldTriggerL2(snapshot, moodScore, socialScore);
    let deepPlanningReason: string | undefined;
    if (needsDeepPlanning) {
      deepPlanningReason = moodScore < MOOD_THRESHOLD_LOW
        ? '情绪持续偏低，需制定多日渐进干预计划'
        : '社交持续退缩，需制定阶梯社交引导方案';
    }

    // 时机评分
    const timingScore = this.evaluateTiming(snapshot);

    const decision: L1DecisionOutput = {
      decisionId: `l1_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      quadrant: cellDecision.quadrant,
      primaryAction: cellDecision.primaryIntervention,
      secondaryActions: cellDecision.secondaryInterventions,
      maxSocialDepth,
      needsDeepPlanning,
      deepPlanningReason,
      timingScore,
      confidence: 0.85,
      solitudeDowngrade,
    };

    this.l1DecisionHistory.push(decision);
    return decision;
  }

  // ==========================================================================
  // L2: 深度规划（异步）
  // ==========================================================================

  private async executeL2Planning(
    snapshot: Snapshot,
    l1Decision: L1DecisionOutput,
  ): Promise<L2PlanningOutput> {
    // 阶段二实现完整L2规划器逻辑
    console.log('[DecisionAgent] L2深度规划启动...');
    // TODO: 阶段二实现完整 TaskChain 生成
    throw new Error('L2深度规划器将在阶段二实现');
  }

  // ==========================================================================
  // 干预时机评估
  // ==========================================================================

  evaluateTiming(snapshot: Snapshot): number {
    const context = snapshot.context;
    let score = 0.5;

    // 时段检查
    const hour = new Date(snapshot.timestamp).getHours();
    if (hour >= 23 || hour < 8) {
      score -= 0.4; // 深夜扣分
    } else if (hour >= 16 && hour <= 21) {
      score += 0.2; // 黄金时段奖励
    }

    // 考试期间扣分
    if (context.examContext?.isExamPeriod) {
      score -= 0.3;
    }

    // 有课期间扣分
    if (context.activeCalendarEvents?.some(e => e.type === 'class')) {
      score -= 0.2;
    }

    return Math.max(0, Math.min(1, score));
  }

  // ==========================================================================
  // L2触发判断
  // ==========================================================================

  private shouldTriggerL2(snapshot: Snapshot, moodScore: number, socialScore: number): boolean {
    // 情绪极低 → 触发
    if (moodScore < MOOD_THRESHOLD_LOW) return true;

    // 连续3天下降 → 触发
    const recentHistory = this.l1DecisionHistory.slice(-3);
    if (recentHistory.length >= 3) {
      const allLow = recentHistory.every(d => d.quadrant.startsWith('low'));
      if (allLow) return true;
    }

    return false;
  }

  // ==========================================================================
  // 分类工具
  // ==========================================================================

  private classifyMood(score: number): MoodTier {
    if (score < MOOD_THRESHOLD_LOW) return MoodTier.LOW;
    if (score > MOOD_THRESHOLD_HIGH) return MoodTier.HIGH;
    return MoodTier.MEDIUM;
  }

  private classifySocialWillingness(score: number): SocialWillingnessTier {
    if (score < SOCIAL_THRESHOLD_LOW) return SocialWillingnessTier.LOW;
    if (score > SOCIAL_THRESHOLD_HIGH) return SocialWillingnessTier.HIGH;
    return SocialWillingnessTier.MEDIUM;
  }

  // ==========================================================================
  // 查询方法
  // ==========================================================================

  getL1History(): L1DecisionOutput[] {
    return [...this.l1DecisionHistory];
  }

  getActiveChains(): TaskChain[] {
    return Array.from(this.activeChains.values());
  }

  getInterventionHistory(): InterventionExecution[] {
    return [...this.interventionHistory];
  }
}

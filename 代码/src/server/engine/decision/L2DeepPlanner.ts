/**
 * 「同频」Same Wavelength — L2 深度规划器
 *
 * L2 在 L1 判断"需要深度干预"时触发。
 * 这是区分"App推送"和"Agent自主行动"的核心：
 *
 * 核心能力：
 *   1. 根据感知快照 + 记忆召回 → 动态生成3天渐进干预计划
 *   2. 每个步骤有前置条件、评估标准、分支逻辑
 *   3. 基于历史有效策略库选择最优方案
 *   4. 生成完整的推理追踪（上帝模式可视化用）
 */

import { TaskChain, TaskNode, TaskNodeType, TaskNodeAction, TaskNodeBranch, TaskNodeEvaluation, TaskNodeStatus, TaskChainStatus, TaskChainPriority, TaskChainGoal, TaskChainMeta, GoalType, TargetMetric, TimeWindow } from './types/TaskNode';
import { L2PlanningInput, L2PlanningOutput, L2PlanningReason, ReasoningTrace, ReasoningStep, DecisionPoint } from './types/PlanTypes';
import { L1DecisionOutput, DecisionContext } from './types/DecisionTypes';
import { Snapshot } from '../perception/types/Snapshot';
import { ShortTermMemoryView, InterventionRecord, DailySummary } from '../memory/types/ShortTermMemoryTypes';
import { LongTermMemoryView, EffectiveStrategy, HardConstraint } from '../memory/types/LongTermMemoryTypes';
import { MemoryRecallEngine } from '../memory/MemoryRecall';
import { InterventionType } from '../core/IntentTypes';
import {
  MOOD_THRESHOLD_LOW,
  MOOD_THRESHOLD_HIGH,
  SOCIAL_THRESHOLD_LOW,
  DO_NOT_DISTURB_START_HOUR,
  DO_NOT_DISTURB_END_HOUR,
} from '../core/Config';

// ============================================================================
// L2 深度规划器
// ============================================================================

export class L2DeepPlanner {
  private recallEngine: MemoryRecallEngine;

  constructor() {
    this.recallEngine = new MemoryRecallEngine();
  }

  // ==========================================================================
  // 主入口：生成3天渐进干预计划
  // ==========================================================================

  /**
   * 生成多步骤自主任务链
   *
   * @param input L2规划输入（快照序列 + L1决策 + 记忆上下文）
   * @returns 完整的任务链 + 推理追踪
   */
  async generatePlan(input: L2PlanningInput): Promise<L2PlanningOutput> {
    const { snapshots, l1Decision, memoryContext, reason } = input;
    const reasoningSteps: ReasoningStep[] = [];
    const decisionPoints: DecisionPoint[] = [];

    // Step 1: 分析当前状态
    const stateAnalysis = this.analyzeState(snapshots);
    reasoningSteps.push({
      order: 1,
      description: '分析当前用户状态',
      dataSources: ['snapshot_series', 'mood_trend'],
      conclusion: stateAnalysis.summary,
    });

    // Step 2: 选择干预策略
    const strategyDecision = this.selectStrategy(
      reason,
      stateAnalysis,
      memoryContext,
      l1Decision,
    );
    decisionPoints.push(strategyDecision);
    reasoningSteps.push({
      order: 2,
      description: '选择干预策略',
      dataSources: ['memory_recall', 'strategy_library', 'l1_decision'],
      conclusion: `选择策略: ${strategyDecision.selected}`,
    });

    // Step 3: 生成3天任务链
    const taskChain = this.build3DayTaskChain(
      stateAnalysis,
      strategyDecision,
      l1Decision,
      memoryContext,
    );
    reasoningSteps.push({
      order: 3,
      description: '生成3天渐进干预任务链',
      dataSources: ['strategy_template', 'constraints', 'timing_optimizer'],
      conclusion: `生成${taskChain.nodes.length}步任务链: ${taskChain.name}`,
    });

    // Step 4: 优化时机
    const optimizedChain = this.optimizeTiming(taskChain, snapshots);
    reasoningSteps.push({
      order: 4,
      description: '优化执行时机',
      dataSources: ['user_availability_pattern', 'calendar_context'],
      conclusion: `优化后计划完成时间: ${new Date(optimizedChain.plannedCompletionTime).toISOString()}`,
    });

    const reasoningTrace: ReasoningTrace = {
      steps: reasoningSteps,
      decisionPoints,
      rejectedAlternatives: strategyDecision.options.filter(
        o => o !== strategyDecision.selected
      ),
    };

    // 生成备选链
    const alternativeChains = this.generateAlternatives(
      optimizedChain,
      strategyDecision,
      stateAnalysis,
    );

    return {
      planId: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      taskChain: optimizedChain,
      alternativeChains,
      reasoningTrace,
      basedOnStrategies: this.findRelatedStrategies(memoryContext.longTerm),
      generatedAt: Date.now(),
    };
  }

  // ==========================================================================
  // 状态分析
  // ==========================================================================

  private analyzeState(snapshots: Snapshot[]): StateAnalysis {
    const latest = snapshots[snapshots.length - 1];
    const moodScores = snapshots.map(s => s.mood.overallScore);
    const socialScores = snapshots.map(s => s.socialWillingness.overallScore);

    const moodTrend = this.calculateTrend(moodScores);
    const socialTrend = this.calculateTrend(socialScores);

    let severity: 'mild' | 'moderate' | 'severe' = 'mild';
    if (latest.mood.overallScore < MOOD_THRESHOLD_LOW) severity = 'severe';
    else if (latest.mood.overallScore < 0.55) severity = 'moderate';

    let summary = '';
    if (moodTrend === 'declining' && socialTrend === 'declining') {
      summary = `情绪与社交意愿双降，需温和渐进干预，避免压力`;
    } else if (moodTrend === 'declining') {
      summary = `情绪持续下降(${snapshots.length}天)，但社交意愿正常，先做共情对话了解原因`;
    } else if (socialTrend === 'declining') {
      summary = `社交意愿下降，情绪正常，可尝试行为激活`;
    } else {
      summary = `状态波动，建议轻量关怀观察`;
    }

    return { latest, moodTrend, socialTrend, severity, summary };
  }

  // ==========================================================================
  // 策略选择
  // ==========================================================================

  private selectStrategy(
    reason: L2PlanningReason,
    state: StateAnalysis,
    memory: DecisionContext['memory'],
    l1Decision: L1DecisionOutput,
  ): DecisionPoint {
    const options: string[] = [];

    // 策略A: 共情优先（适合情绪下降）
    if (state.moodTrend === 'declining') {
      options.push('empathy_first');
    }

    // 策略B: 行为激活（适合轻度社交退缩）
    if (state.severity !== 'severe') {
      options.push('behavior_activation');
    }

    // 策略C: 多层递进（适合中重度）
    if (state.severity === 'moderate' || state.severity === 'severe') {
      options.push('progressive_multi_layer');
    }

    // 策略D: 轻量观察（适合轻微波动）
    options.push('lightweight_observation');

    // 查找历史有效策略
    const memoryStrategies = memory.longTerm?.effectiveStrategies ?? [];
    const matchedStrategy = memoryStrategies.find(s => {
      const matchMood = state.latest.mood.overallScore >= s.situation.moodRange.min &&
        state.latest.mood.overallScore <= s.situation.moodRange.max;
      return matchMood && s.successRate > 0.6;
    });

    let selected: string;
    let reasonText: string;

    if (matchedStrategy && matchedStrategy.successRate > 0.7) {
      selected = 'historical_effective_strategy';
      reasonText = `复用历史有效策略: ${matchedStrategy.applicableSituation} (成功率${Math.round(matchedStrategy.successRate * 100)}%)`;
    } else if (state.severity === 'severe') {
      selected = 'progressive_multi_layer';
      reasonText = '状态严重，使用多层递进策略';
    } else if (state.moodTrend === 'declining') {
      selected = 'empathy_first';
      reasonText = '情绪下降，优先共情对话，不急推社交';
    } else {
      selected = 'behavior_activation';
      reasonText = '状态稳定偏低，使用行为激活策略';
    }

    return {
      description: '选择干预策略',
      options,
      selected,
      reason: reasonText,
    };
  }

  // ==========================================================================
  // 3天渐进任务链生成
  // ==========================================================================

  private build3DayTaskChain(
    state: StateAnalysis,
    strategyDecision: DecisionPoint,
    l1Decision: L1DecisionOutput,
    memory: DecisionContext['memory'],
  ): TaskChain {
    const now = Date.now();
    const today = new Date(now);
    const tomorrow = new Date(now + 86400000);
    const dayAfter = new Date(now + 172800000);

    const nodes: TaskNode[] = [];
    const strategy = strategyDecision.selected;
    const constraints = memory.longTerm?.activeConstraints ?? [];
    const personality = memory.longTerm?.personality;

    // ====== Day 1 (今天): 共情对话 + 了解原因 ======
    if (strategy === 'empathy_first' || strategy === 'progressive_multi_layer' || strategy === 'historical_effective_strategy') {
      nodes.push(this.createDialogueNode({
        order: 0,
        plannedDate: today.toISOString().split('T')[0],
        startHour: 16, endHour: 20,
        name: 'Day1-共情对话',
        description: '发起低压力共情对话，了解情绪下降的具体原因',
        strategy: '不说教，不直接问"你怎么了"，用"最近好像有点累？"',
        interventionType: InterventionType.EMPATHY_DIALOGUE,
        successBranches: [
          { condition: '用户回应并说出具体困扰', nextNodeId: 'day1_branch_detail', description: '进入"引导梳理想法"模式' },
          { condition: '用户回应但不愿细说', nextNodeId: 'day2_behavior', description: '不追问，推送温暖卡片，结束今日干预' },
        ],
        failureBranches: [
          { condition: '用户完全不回应', nextNodeId: 'silent_record', description: '记录"当前不适合深度关怀"，静默' },
        ],
        optional: false,
      }));

      nodes.push(this.createBranchNode({
        order: 1,
        plannedDate: today.toISOString().split('T')[0],
        startHour: 20, endHour: 21,
        name: 'Day1-分支决策',
        description: '根据对话结果分支',
      }));
    }

    // ====== Day 2 (明天): 行为激活 ======
    if (strategy === 'behavior_activation' || strategy === 'progressive_multi_layer') {
      nodes.push(this.createPushNode({
        order: 2,
        plannedDate: tomorrow.toISOString().split('T')[0],
        startHour: 16, endHour: 18,
        name: 'Day2-行为激活',
        description: memory.longTerm?.interventionPreferences?.preferredTypes?.[0]
          ? `推送用户偏好的${memory.longTerm.interventionPreferences.preferredTypes[0]}`
          : '下午推送L1级别运动建议',
        strategy: personality?.comfortActivities?.length
          ? `基于长期记忆：用户偏好${personality.comfortActivities.join('、')}`
          : '"操场人不多，走一圈就好。不用跑。"',
        interventionType: InterventionType.EXERCISE_SUGGESTION,
        successBranches: [
          { condition: '用户响应（步数明显增加）', nextNodeId: 'day3_evaluate', description: '行为激活有效' },
        ],
        failureBranches: [
          { condition: '用户忽略', nextNodeId: 'day3_alternative', description: '明日尝试替代方案' },
        ],
        optional: true,
      }));
    }

    // 轻量观察（策略D）
    if (strategy === 'lightweight_observation') {
      nodes.push(this.createPushNode({
        order: 1,
        plannedDate: today.toISOString().split('T')[0],
        startHour: 17, endHour: 20,
        name: 'Day1-温暖卡片',
        description: '推送一条温暖关怀卡片，不期待回应',
        strategy: '轻量陪伴，不做深度干预',
        interventionType: InterventionType.WARM_CARD,
        successBranches: [],
        failureBranches: [],
        optional: true,
      }));
    }

    // ====== Day 3 (后天): 评估效果 + 分支决策 ======
    nodes.push(this.createEvaluateNode({
      order: 3,
      plannedDate: dayAfter.toISOString().split('T')[0],
      startHour: 10, endHour: 12,
      name: 'Day3-效果评估',
      description: '评估前两步干预的整体效果',
      successMetric: '情绪评分回升 ≥ 0.05 或 行为有改善',
      onSuccess: '记录有效干预步骤到长期记忆 → 推送正向反馈 → 结束任务链',
      onNoChange: '延长干预周期，增加干预力度 → 考虑推送心理咨询资源（温和方式）',
      onWorsening: '触发安全Agent 🔴 危机响应',
    }));

    // ====== 终止节点 ======
    nodes.push({
      nodeId: 'terminate',
      order: nodes.length,
      name: '结束任务链',
      type: TaskNodeType.TERMINATE,
      description: '任务链结束，结果写入记忆',
      plannedDate: dayAfter.toISOString().split('T')[0],
      plannedWindow: { date: dayAfter.toISOString().split('T')[0], startHour: 12, endHour: 12, strict: false },
      action: { interventionType: InterventionType.NONE, strategy: '', contentTemplate: '', params: {} },
      preconditions: [],
      optional: true,
      evaluation: {
        successCriteria: '任务链完成',
        failureCriteria: '无',
        metrics: {},
      },
      branches: [],
      status: TaskNodeStatus.PENDING,
      history: [],
    });

    const goal: TaskChainGoal = {
      type: state.severity === 'severe' ? GoalType.CRISIS_DEESCALATION :
            state.socialTrend === 'declining' ? GoalType.SOCIAL_ACTIVATION :
            GoalType.MOOD_IMPROVEMENT,
      description: state.summary,
      targetMetrics: [
        {
          name: '情绪评分',
          currentValue: state.latest.mood.overallScore,
          targetValue: Math.min(1, state.latest.mood.overallScore + 0.15),
          unit: '0-1',
          evaluationDate: dayAfter.toISOString().split('T')[0],
        },
      ],
      minimumAcceptableOutcome: '用户状态不恶化',
    };

    return {
      chainId: `chain_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: `3天渐进干预 - ${strategy.replace(/_/g, ' ')}`,
      description: state.summary,
      triggeredByDecisionId: l1Decision.decisionId,
      triggeredBySnapshotId: state.latest.id,
      goal,
      nodes,
      createdAt: now,
      plannedCompletionTime: dayAfter.getTime(),
      status: TaskChainStatus.PENDING,
      priority: state.severity === 'severe' ? TaskChainPriority.CRITICAL :
                state.severity === 'moderate' ? TaskChainPriority.HIGH :
                TaskChainPriority.MEDIUM,
      meta: {
        debugLabel: `L2 Plan: ${strategy}`,
        creationReason: state.summary,
        relatedMemoryIds: [],
      },
    };
  }

  // ==========================================================================
  // 时机优化
  // ==========================================================================

  private optimizeTiming(chain: TaskChain, snapshots: Snapshot[]): TaskChain {
    const context = snapshots[snapshots.length - 1]?.context;
    const constraints: string[] = [];

    // 有早课 → 推迟早间推送
    if (context?.time?.hasEarlyClassTomorrow) {
      constraints.push('明天有早课，推迟早间推送至下午');
    }

    // 考试周 → 降低非紧急推送频率
    if (context?.examContext?.isExamPeriod) {
      constraints.push('考试周，降低非紧急推送频率');
    }

    // 应用时机约束到每个节点
    for (const node of chain.nodes) {
      if (constraints.length > 0) {
        // 调整非紧急节点的计划时间到更合适的时间窗口
        if (node.type === TaskNodeType.PUSH && !node.optional) {
          // 确保避开深夜
          if (node.plannedWindow.startHour >= DO_NOT_DISTURB_START_HOUR) {
            node.plannedWindow.startHour = 16;
            node.plannedWindow.endHour = 18;
          }
        }
      }
    }

    chain.meta.debugLabel += ` [约束: ${constraints.join(', ')}]`;
    return chain;
  }

  // ==========================================================================
  // 备选链生成
  // ==========================================================================

  private generateAlternatives(
    primaryChain: TaskChain,
    strategyDecision: DecisionPoint,
    state: StateAnalysis,
  ): TaskChain[] {
    // 从被拒绝的选项中生成简化版
    const alternatives: TaskChain[] = [];

    for (const rejected of strategyDecision.options) {
      if (rejected === strategyDecision.selected) continue;

      // 只生成一个最可能的备选
      if (alternatives.length === 0) {
        const altChain = { ...primaryChain };
        altChain.chainId = `chain_alt_${Date.now()}`;
        altChain.name = `备选方案 - ${rejected.replace(/_/g, ' ')}`;
        altChain.priority = TaskChainPriority.LOW;
        alternatives.push(altChain);
      }
    }

    return alternatives;
  }

  // ==========================================================================
  // 节点工厂方法
  // ==========================================================================

  private createDialogueNode(params: {
    order: number;
    plannedDate: string;
    startHour: number;
    endHour: number;
    name: string;
    description: string;
    strategy: string;
    interventionType: InterventionType;
    successBranches: { condition: string; nextNodeId: string; description: string }[];
    failureBranches: { condition: string; nextNodeId: string; description: string }[];
    optional: boolean;
  }): TaskNode {
    const branches: TaskNodeBranch[] = [
      ...params.successBranches.map(b => ({
        condition: b.condition,
        nextNodeId: b.nextNodeId,
        description: b.description,
        isDefault: false,
      })),
      ...params.failureBranches.map((b, i) => ({
        condition: b.condition,
        nextNodeId: b.nextNodeId,
        description: b.description,
        isDefault: i === params.failureBranches.length - 1,
      })),
    ];

    return {
      nodeId: `node_${params.order}_${params.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
      order: params.order,
      name: params.name,
      type: TaskNodeType.DIALOGUE,
      description: params.description,
      plannedDate: params.plannedDate,
      plannedWindow: {
        date: params.plannedDate,
        startHour: params.startHour,
        endHour: params.endHour,
        strict: false,
      },
      action: {
        interventionType: params.interventionType,
        strategy: params.strategy,
        contentTemplate: '',
        params: {},
      },
      preconditions: [],
      optional: params.optional,
      evaluation: {
        successCriteria: params.successBranches.map(b => b.condition).join(' OR '),
        failureCriteria: params.failureBranches.map(b => b.condition).join(' OR '),
        metrics: { userResponded: true },
      },
      branches,
      status: TaskNodeStatus.PENDING,
      history: [],
    };
  }

  private createPushNode(params: {
    order: number;
    plannedDate: string;
    startHour: number;
    endHour: number;
    name: string;
    description: string;
    strategy: string;
    interventionType: InterventionType;
    successBranches: { condition: string; nextNodeId: string; description: string }[];
    failureBranches: { condition: string; nextNodeId: string; description: string }[];
    optional: boolean;
  }): TaskNode {
    const branches: TaskNodeBranch[] = [
      ...params.successBranches.map(b => ({
        condition: b.condition,
        nextNodeId: b.nextNodeId,
        description: b.description,
        isDefault: false,
      })),
      ...params.failureBranches.map((b, i) => ({
        condition: b.condition,
        nextNodeId: b.nextNodeId,
        description: b.description,
        isDefault: i === params.failureBranches.length - 1,
      })),
    ];

    return {
      nodeId: `node_${params.order}_${params.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
      order: params.order,
      name: params.name,
      type: TaskNodeType.PUSH,
      description: params.description,
      plannedDate: params.plannedDate,
      plannedWindow: {
        date: params.plannedDate,
        startHour: params.startHour,
        endHour: params.endHour,
        strict: false,
      },
      action: {
        interventionType: params.interventionType,
        strategy: params.strategy,
        contentTemplate: '',
        params: {},
      },
      preconditions: [],
      optional: params.optional,
      evaluation: {
        successCriteria: params.successBranches.map(b => b.condition).join(' OR '),
        failureCriteria: params.failureBranches.map(b => b.condition).join(' OR '),
        metrics: { userResponded: true },
      },
      branches,
      status: TaskNodeStatus.PENDING,
      history: [],
    };
  }

  private createBranchNode(params: {
    order: number;
    plannedDate: string;
    startHour: number;
    endHour: number;
    name: string;
    description: string;
  }): TaskNode {
    return {
      nodeId: `node_${params.order}_${params.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
      order: params.order,
      name: params.name,
      type: TaskNodeType.BRANCH,
      description: params.description,
      plannedDate: params.plannedDate,
      plannedWindow: { date: params.plannedDate, startHour: params.startHour, endHour: params.endHour, strict: false },
      action: { interventionType: InterventionType.NONE, strategy: '', contentTemplate: '', params: {} },
      preconditions: [],
      optional: false,
      evaluation: {
        successCriteria: '分支决策完成',
        failureCriteria: '无',
        metrics: {},
      },
      branches: [],
      status: TaskNodeStatus.PENDING,
      history: [],
    };
  }

  private createEvaluateNode(params: {
    order: number;
    plannedDate: string;
    startHour: number;
    endHour: number;
    name: string;
    description: string;
    successMetric: string;
    onSuccess: string;
    onNoChange: string;
    onWorsening: string;
  }): TaskNode {
    return {
      nodeId: `node_${params.order}_evaluate`,
      order: params.order,
      name: params.name,
      type: TaskNodeType.EVALUATE,
      description: params.description,
      plannedDate: params.plannedDate,
      plannedWindow: { date: params.plannedDate, startHour: params.startHour, endHour: params.endHour, strict: false },
      action: { interventionType: InterventionType.NONE, strategy: '', contentTemplate: '', params: {} },
      preconditions: [],
      optional: false,
      evaluation: {
        successCriteria: params.successMetric,
        failureCriteria: '情绪恶化',
        metrics: { measurements: {} },
      },
      branches: [
        { condition: '改善', nextNodeId: 'terminate', description: params.onSuccess, isDefault: false },
        { condition: '无变化', nextNodeId: 'terminate', description: params.onNoChange, isDefault: false },
        { condition: '恶化', nextNodeId: 'terminate', description: params.onWorsening, isDefault: true },
      ],
      status: TaskNodeStatus.PENDING,
      history: [],
    };
  }

  // ==========================================================================
  // 工具方法
  // ==========================================================================

  private calculateTrend(scores: number[]): 'improving' | 'stable' | 'declining' {
    if (scores.length < 2) return 'stable';
    const first = scores[0];
    const last = scores[scores.length - 1];
    const diff = last - first;
    if (diff > 0.05) return 'improving';
    if (diff < -0.05) return 'declining';
    return 'stable';
  }

  private findRelatedStrategies(longTermView: LongTermMemoryView | null): string[] {
    if (!longTermView?.effectiveStrategies) return [];
    return longTermView.effectiveStrategies
      .filter(s => s.successRate > 0.6)
      .slice(0, 3)
      .map(s => s.applicableSituation);
  }
}

// ============================================================================
// 内部类型
// ============================================================================

interface StateAnalysis {
  latest: Snapshot;
  moodTrend: 'improving' | 'stable' | 'declining';
  socialTrend: 'improving' | 'stable' | 'declining';
  severity: 'mild' | 'moderate' | 'severe';
  summary: string;
}

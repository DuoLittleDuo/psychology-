/**
 * 「同频」Same Wavelength — 上帝模式类型定义
 *
 * "上帝模式"可视化演示的核心类型：模拟数据控制器、
 * 状态覆盖引擎、可视化面板数据结构。
 *
 * 用途：让评委在几分钟内看到Agent的"时序决策、记忆召回与自主规划"能力。
 */

import { Snapshot, MoodAssessment, SocialWillingnessAssessment } from '../../perception/types/Snapshot';
import { GridQuadrant } from '../../decision/types/DecisionTypes';
import { TaskChain, TaskChainStatus } from '../../decision/types/TaskNode';
import { CrisisLevel } from '../../core/Config';
import { LongTermMemoryView } from '../../memory/types/LongTermMemoryTypes';
import { ShortTermMemoryView } from '../../memory/types/ShortTermMemoryTypes';
import { InterventionExecution } from '../../decision/types/DecisionTypes';
import { SafetyPatrolStatus } from '../../safety/types/SafetyTypes';
import { CooldownState, PushBudget } from '../../safety/types/BudgetTypes';

// ============================================================================
// 上帝模式可视化面板数据
// ============================================================================

/**
 * GodModeDashboard: 上帝模式可视化面板的完整数据
 *
 * 这是评委在"上帝模式"中看到的后台可视化面板。
 * 展示Agent联邦的所有内部状态。
 */
export interface GodModeDashboard {
  /** 面板版本 */
  version: string;
  /** 面板生成时间 */
  generatedAt: number;

  // ---- 当前状态 ----
  /** 用户当前状态 */
  userState: GodModeUserState;

  // ---- 记忆召回 ----
  /** 记忆召回面板 */
  memoryPanel: GodModeMemoryPanel;

  // ---- 决策过程 ----
  /** 决策过程面板 */
  decisionPanel: GodModeDecisionPanel;

  // ---- 安全监控 ----
  /** 安全Agent面板 */
  safetyPanel: GodModeSafetyPanel;

  // ---- 模拟控制 ----
  /** 模拟控制面板 */
  simulationControl: GodModeSimulationControl;

  // ---- 历史日志 ----
  /** 事件日志 */
  eventLog: GodModeEvent[];
}

// ============================================================================
// 用户状态面板
// ============================================================================

/** 用户状态 */
export interface GodModeUserState {
  /** 当前情绪评分 (0.0–1.0, 可手动拖拽) */
  moodScore: number;
  /** 情绪评分是否被手动覆盖 */
  moodOverridden: boolean;
  /** 当前社交意愿评分 (0.0–1.0, 可手动拖拽) */
  socialWillingnessScore: number;
  /** 社交意愿是否被手动覆盖 */
  socialWillingnessOverridden: boolean;
  /** 风险等级 */
  riskLevel: 'green' | 'yellow' | 'orange' | 'red';
  /** 最近快照摘要 */
  latestSnapshotSummary: string;
  /** 情绪趋势（最近N天评分序列） */
  moodTrend: Array<{ date: string; score: number; overridden: boolean }>;
}

// ============================================================================
// 记忆召回面板
// ============================================================================

/** 记忆召回面板 */
export interface GodModeMemoryPanel {
  /** 短期记忆摘要 */
  shortTermSummary: string;
  /** 召回的长期记忆条目 */
  recalledLongTermMemories: GodModeMemoryEntry[];
  /** 活跃的硬性约束 */
  activeConstraints: string[];
  /** 记忆召回最近一次查询 */
  lastQuery: {
    query: string;
    resultCount: number;
    latencyMs: number;
  } | null;
}

/** 可视化记忆条目 */
export interface GodModeMemoryEntry {
  /** 条目ID */
  id: string;
  /** 内容摘要 */
  content: string;
  /** 记忆来源 */
  source: 'instant' | 'short_term' | 'long_term';
  /** 相关性评分 */
  relevanceScore: number;
  /** 创建/更新时间 */
  timestamp: number;
  /** 是否被召回用于当前决策 */
  usedInDecision: boolean;
}

// ============================================================================
// 决策过程面板
// ============================================================================

/** 决策过程面板 */
export interface GodModeDecisionPanel {
  /** L1 当前决策 */
  l1Decision: {
    /** 当前象限 */
    quadrant: GridQuadrant;
    /** 象限编号 */
    quadrantNumber: number;
    /** 决策描述 */
    description: string;
    /** 主要动作 */
    primaryAction: string;
    /** 上次L1决策时间 */
    lastDecisionTime: number;
  };
  /** L2 深度规划 */
  l2Planning: {
    /** 是否有活跃的任务链 */
    hasActiveChain: boolean;
    /** 活跃任务链 */
    activeChains: GodModeTaskChain[];
    /** 最近生成的任务链 */
    recentChains: GodModeTaskChain[];
  };
  /** 干预历史 */
  recentInterventions: GodModeIntervention[];
}

/** 可视化任务链 */
export interface GodModeTaskChain {
  /** 链ID */
  chainId: string;
  /** 链名称 */
  name: string;
  /** 状态 */
  status: TaskChainStatus;
  /** 进度 */
  progress: string;  // "步骤 2/4"
  /** 下一步动作 */
  nextAction: string;
  /** 预期完成时间 */
  estimatedCompletion: string;
}

/** 可视化干预记录 */
export interface GodModeIntervention {
  /** 干预类型 */
  type: string;
  /** 时间 */
  time: string;
  /** 内容 */
  content: string;
  /** 用户反馈 */
  feedback: string;
  /** 效果 */
  effect: '✅' | '⏳' | '❌';
}

// ============================================================================
// 安全监控面板
// ============================================================================

/** 安全Agent面板 */
export interface GodModeSafetyPanel {
  /** 安全Agent运行状态 */
  status: '🟢 运行中' | '🟡 注意' | '🟠 警戒' | '🔴 接管';
  /** 今日推送预算 */
  pushBudget: string;  // "2/5"
  /** 活跃的冷却限制 */
  activeCooldowns: string[];
  /** 最近拦截记录 */
  recentIntercepts: string[];
  /** 当前危机协议状态 */
  crisisProtocol: string;
}

// ============================================================================
// 模拟控制面板
// ============================================================================

/** 模拟控制面板 */
export interface GodModeSimulationControl {
  /** 是否激活模拟模式 */
  simulationActive: boolean;
  /** 模拟时间轴位置（天） */
  simulationDay: number;
  /** 可用操作 */
  availableActions: SimulationAction[];
  /** 模拟状态 */
  status: 'running' | 'paused' | 'stopped';
}

/** 模拟操作 */
export interface SimulationAction {
  /** 操作ID */
  id: string;
  /** 操作名称 */
  name: string;
  /** 操作描述 */
  description: string;
  /** 操作类别 */
  category: 'mood' | 'social' | 'event' | 'safety' | 'memory';
}

// ============================================================================
// 状态覆盖引擎
// ============================================================================

/** 状态覆盖请求 */
export interface StateOverrideRequest {
  /** 请求ID */
  requestId: string;
  /** 覆盖字段 */
  field: 'mood_score' | 'social_willingness_score' | 'solitude_preference' | 'risk_level';
  /** 新值 */
  value: number | boolean | string;
  /** 覆盖时间 */
  timestamp: number;
  /** 覆盖原因（调试/演示） */
  reason: string;
}

/** 状态覆盖日志 */
export interface StateOverrideLog {
  /** 覆盖请求 */
  request: StateOverrideRequest;
  /** 覆盖前的值 */
  previousValue: number | boolean | string;
  /** 决策变化 */
  decisionChange: {
    before: {
      quadrant: GridQuadrant;
      primaryAction: string;
    };
    after: {
      quadrant: GridQuadrant;
      primaryAction: string;
    };
  };
  /** 覆盖时间 */
  timestamp: number;
}

// ============================================================================
// 事件日志
// ============================================================================

/** 上帝模式事件（时间线用） */
export interface GodModeEvent {
  /** 事件ID */
  id: string;
  /** 事件时间 */
  timestamp: number;
  /** 事件模拟日期（第几天） */
  simulationDay: number;
  /** 事件类型 */
  type: GodModeEventType;
  /** 事件描述 */
  description: string;
  /** 事件来源Agent */
  sourceAgent: string;
  /** 事件数据（用于面板渲染） */
  data: Record<string, unknown>;
}

/** 事件类型 */
export enum GodModeEventType {
  /** 系统事件触发 */
  SYSTEM_EVENT = 'system_event',
  /** 用户意图 */
  USER_INTENT = 'user_intent',
  /** 快照生成 */
  SNAPSHOT_GENERATED = 'snapshot_generated',
  /** L1决策 */
  L1_DECISION = 'l1_decision',
  /** L2规划 */
  L2_PLANNING = 'l2_planning',
  /** 干预执行 */
  INTERVENTION = 'intervention',
  /** 用户反馈 */
  USER_FEEDBACK = 'user_feedback',
  /** 记忆写入 */
  MEMORY_WRITE = 'memory_write',
  /** 记忆召回 */
  MEMORY_RECALL = 'memory_recall',
  /** 记忆晋级 */
  MEMORY_PROMOTION = 'memory_promotion',
  /** 安全拦截 */
  SAFETY_INTERCEPT = 'safety_intercept',
  /** 危机触发 */
  CRISIS_TRIGGER = 'crisis_trigger',
  /** 状态覆盖 */
  STATE_OVERRIDE = 'state_override',
  /** 反思复盘 */
  REFLECTION = 'reflection',
}

// ============================================================================
// 演示场景
// ============================================================================

/** 预置演示场景（快速切换到不同状态） */
export interface DemoScenario {
  /** 场景ID */
  id: string;
  /** 场景名称 */
  name: string;
  /** 场景描述 */
  description: string;
  /** 场景预设 */
  presets: {
    /** 情绪评分 */
    moodScore: number;
    /** 社交意愿 */
    socialWillingnessScore: number;
    /** 睡眠数据 */
    sleepQuality: number;
    /** 活动水平 */
    activityLevel: number;
    /** 风险等级 */
    riskLevel: string;
  };
  /** 预期的Agent行为变化 */
  expectedBehavior: string;
}

/** 预置演示场景列表 */
export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'healthy_happy',
    name: '😊 状态良好',
    description: '用户情绪高涨、社交活跃——Agent应推L3深度社交',
    presets: { moodScore: 0.82, socialWillingnessScore: 0.78, sleepQuality: 0.8, activityLevel: 0.7, riskLevel: 'green' },
    expectedBehavior: '九宫格象限⑨ → 深度匹配 → 活动推送',
  },
  {
    id: 'mild_decline',
    name: '😔 轻度低落',
    description: '用户情绪中等偏低、社交意愿中等——Agent应推情绪对话+L1',
    presets: { moodScore: 0.45, socialWillingnessScore: 0.50, sleepQuality: 0.5, activityLevel: 0.4, riskLevel: 'yellow' },
    expectedBehavior: '九宫格象限② → 共情对话 → L1空间共存',
  },
  {
    id: 'severe_depression',
    name: '🔴 重度下滑',
    description: '用户情绪极低、拒绝社交——Agent应触发危机响应',
    presets: { moodScore: 0.25, socialWillingnessScore: 0.15, sleepQuality: 0.2, activityLevel: 0.1, riskLevel: 'orange' },
    expectedBehavior: '九宫格象限① → 危机关怀 → 安全Agent接管',
  },
  {
    id: 'want_solitude',
    name: '🧘 想独处',
    description: '用户情绪高但想独处——Agent应尊重，不打扰',
    presets: { moodScore: 0.75, socialWillingnessScore: 0.20, sleepQuality: 0.7, activityLevel: 0.6, riskLevel: 'green' },
    expectedBehavior: '九宫格象限⑦ → 不打扰 → 静默观察',
  },
];

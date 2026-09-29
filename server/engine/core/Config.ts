/**
 * 「同频」Same Wavelength — 全局配置常量
 *
 * 定义 Agent 联邦运行时的所有可配置参数。
 * 遵循"端侧优先、主动不侵入"的设计原则。
 */

// ============================================================================
// 记忆系统参数
// ============================================================================

/** 瞬时记忆窗口（小时） */
export const INSTANT_MEMORY_WINDOW_HOURS = 4;

/** 短期记忆窗口（天） */
export const SHORT_TERM_MEMORY_WINDOW_DAYS = 7;

/** 短期记忆日摘要最大保留数 */
export const DAILY_SUMMARY_MAX_COUNT = 7;

/** 长期记忆晋级阈值：同一模式在短期记忆中出现的次数 */
export const LONG_TERM_PROMOTION_THRESHOLD = 3;

/** 长期记忆衰减阈值：超过此天数未再出现的模式开始降权 */
export const LONG_TERM_DECAY_THRESHOLD_DAYS = 30;

/** 长期记忆归档阈值：超过此天数未再出现的模式归档 */
export const LONG_TERM_ARCHIVE_THRESHOLD_DAYS = 90;

/** 记忆召回权重系数 */
export const MEMORY_RECALL_WEIGHTS = {
  /** 语义匹配权重 */
  semantic: 0.5,
  /** 时间新鲜度权重 */
  recency: 0.3,
  /** 历史有效性权重 */
  effectiveness: 0.2,
} as const;

// ============================================================================
// 决策引擎参数
// ============================================================================

/** L1 快速决策响应超时（毫秒） */
export const L1_DECISION_TIMEOUT_MS = 500;

/** L2 深度规划异步执行延迟（毫秒） */
export const L2_PLANNING_DELAY_MS = 3000;

/** 九宫格决策矩阵维度范围 */
export const MOOD_SCORE_RANGE = { min: 0.0, max: 1.0 } as const;
export const SOCIAL_WILLINGNESS_RANGE = { min: 0.0, max: 1.0 } as const;

/** 九宫格分档阈值 */
export const MOOD_THRESHOLD_LOW = 0.4;   // 情绪 < 0.4 → 低
export const MOOD_THRESHOLD_HIGH = 0.65;  // 情绪 > 0.65 → 高

export const SOCIAL_THRESHOLD_LOW = 0.4;   // 社交意愿 < 0.4 → 低
export const SOCIAL_THRESHOLD_HIGH = 0.65;  // 社交意愿 > 0.65 → 高

/** 情绪持续下降检测：连续 N 天下降触发 L2 深度规划 */
export const MOOD_DECLINE_DAYS_THRESHOLD = 3;

// ============================================================================
// 干预参数
// ============================================================================

/** 每日最大推送次数（安全Agent硬上限） */
export const MAX_DAILY_PUSHES = 5;

/** 两次推送最小间隔（小时） */
export const MIN_PUSH_INTERVAL_HOURS = 2;

/** 勿扰时段（仅允许危机响应） */
export const DO_NOT_DISTURB_START_HOUR = 23;  // 23:00
export const DO_NOT_DISTURB_END_HOUR = 8;     // 08:00

/** 连续拒绝同类型推荐的冷却期（小时） */
export const REJECTION_COOLDOWN_HOURS = 48;

/** 连续拒绝触发冷却的阈值次数 */
export const REJECTION_COOLDOWN_THRESHOLD = 3;

// ============================================================================
// 安全参数
// ============================================================================

/** 危机关键词分级 */
export enum CrisisLevel {
  /** L1-关注：疑似关键词（可能玩笑语境），标记但不中断 */
  ATTENTION = 1,
  /** L2-警惕：重复出现 + 情绪极低，主动发起安全对话 */
  ALERT = 2,
  /** L3-危机：明确的自伤/自杀意图，立即启动危机协议 */
  CRISIS = 3,
}

/** 危机关键词 */
export const CRISIS_KEYWORDS: Record<CrisisLevel, string[]> = {
  [CrisisLevel.ATTENTION]: [
    '不想活了', '好累啊', '活得好累', '真想消失',
  ],
  [CrisisLevel.ALERT]: [
    '活不下去了', '谁也别管我', '撑不住了',
  ],
  [CrisisLevel.CRISIS]: [
    '我想自杀', '我想死', '自残', '结束生命', '不想再醒来',
  ],
};

/** 危机 L2 升级条件：情绪评分低于此值 + 检测到 L1 关键词 */
export const CRISIS_EMOTIONAL_THRESHOLD = 0.3;

// ============================================================================
// 系统事件参数
// ============================================================================

/** 每日定时自检时间（24小时制） */
export const SCHEDULED_SELF_CHECK_HOURS = [8, 12, 21];

/** 多模态融合时间窗口（小时） */
export const SENSOR_FUSION_WINDOW_HOURS = 4;

// ============================================================================
// 社交参数
// ============================================================================

/** 社交深度等级 */
export enum SocialDepth {
  /** L1: 空间共存 — 不需要互动的同场存在 */
  SPACE_COEXIST = 1,
  /** L2: 轻量社交 — 基于共同任务的浅层协作 */
  LIGHT_SOCIAL = 2,
  /** L3: 深度匹配 — 基于兴趣/性格的深度匹配 */
  DEEP_MATCH = 3,
  /** L4: 强连接 — 小组/活动/项目组队 */
  STRONG_CONNECTION = 4,
}

/** 社交推荐冷却：独处意愿标记 */
export const SOLITUDE_COOLDOWN_HOURS = 24;

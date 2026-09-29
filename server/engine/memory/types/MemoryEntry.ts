/**
 * 「同频」Same Wavelength — 记忆条目基础接口
 *
 * 定义三层记忆系统共用的基础数据结构和接口。
 * 记忆Agent核心职责：写入、组织、召回、遗忘。
 */

import { SentimentPolarity } from '../../core/IntentTypes';

// ============================================================================
// 记忆条目基类
// ============================================================================

/** 记忆条目唯一标识 */
export type MemoryId = string;

/** 记忆类型 */
export enum MemoryType {
  /** 瞬时记忆（工作台，4h窗口） */
  INSTANT = 'instant',
  /** 短期记忆（7天上下文窗口） */
  SHORT_TERM = 'short_term',
  /** 长期记忆（永久存储+衰减） */
  LONG_TERM = 'long_term',
}

/** 记忆条目基类 */
export interface MemoryEntry {
  /** 唯一ID */
  id: MemoryId;
  /** 记忆类型 */
  type: MemoryType;
  /** 创建时间戳 */
  createdAt: number;
  /** 最后访问时间戳 */
  lastAccessedAt: number;
  /** 访问次数 */
  accessCount: number;
  /** 来源：哪个Agent或事件创建了此记忆 */
  source: string;
  /** 标签（用于召回和分类） */
  tags: string[];
  /** 重要性权重 (0.0–1.0，越高越不容易被遗忘) */
  importance: number;
  /** 衰减率（每天衰减的权重比例，0 = 不衰减，1 = 立即遗忘） */
  decayRate: number;
}

// ============================================================================
// 记忆索引
// ============================================================================

/** 记忆检索查询 */
export interface MemoryQuery {
  /** 关键词/语义查询 */
  query?: string;
  /** 标签过滤 */
  tags?: string[];
  /** 时间范围过滤 */
  timeRange?: {
    start: number;
    end: number;
  };
  /** 记忆类型过滤 */
  memoryTypes?: MemoryType[];
  /** 最大返回数 */
  limit?: number;
  /** 最低相关性评分阈值 */
  minRelevance?: number;
  /** 是否包含已衰减的记忆 */
  includeDecayed?: boolean;
}

/** 记忆检索结果 */
export interface MemoryRecallResult<T extends MemoryEntry = MemoryEntry> {
  /** 匹配的记忆条目列表 */
  entries: T[];
  /** 每个条目的相关性评分 */
  relevanceScores: Map<MemoryId, number>;
  /** 查询耗时（毫秒） */
  latencyMs: number;
  /** 召回来源 */
  sources: {
    instantCount: number;
    shortTermCount: number;
    longTermCount: number;
  };
  /** 融合后的推荐建议 */
  recommendedApproach?: string;
}

// ============================================================================
// 记忆写入/更新
// ============================================================================

/** 记忆写入请求 */
export interface MemoryWriteRequest<T extends MemoryEntry = MemoryEntry> {
  /** 要写入的条目 */
  entry: T;
  /** 目标记忆类型 */
  targetType: MemoryType;
  /** 是否覆盖已有（按ID匹配） */
  overwrite: boolean;
}

/** 记忆更新请求 */
export interface MemoryUpdateRequest {
  /** 目标条目ID */
  entryId: MemoryId;
  /** 更新的字段 */
  updates: Partial<MemoryEntry>;
  /** 是否更新 lastAccessedAt */
  touch: boolean;
}

// ============================================================================
// 记忆晋级/衰减
// ============================================================================

/** 记忆晋级候选 */
export interface PromotionCandidate {
  /** 源条目 */
  entry: MemoryEntry;
  /** 晋级原因 */
  reason: PromotionReason;
  /** 重复出现的次数 */
  repeatCount: number;
  /** 建议目标类型 */
  targetType: MemoryType;
  /** 晋级置信度 */
  confidence: number;
}

/** 晋级原因 */
export enum PromotionReason {
  /** 重复模式：同一模式出现 ≥3 次 */
  REPEATED_PATTERN = 'repeated_pattern',
  /** 高重要性：安全相关、用户明确偏好 */
  HIGH_IMPORTANCE = 'high_importance',
  /** 用户确认：用户明确接受/采纳 */
  USER_CONFIRMED = 'user_confirmed',
  /** 干预有效：干预被证明有效且被记录 */
  EFFECTIVE_INTERVENTION = 'effective_intervention',
}

/** 衰减候选 */
export interface DecayCandidate {
  /** 条目 */
  entry: MemoryEntry;
  /** 衰减原因 */
  reason: DecayReason;
  /** 当前权重 */
  currentWeight: number;
  /** 建议新权重 */
  suggestedWeight: number;
}

/** 衰减原因 */
export enum DecayReason {
  /** 超期未访问（>30天） */
  NOT_ACCESSED = 'not_accessed',
  /** 模式不再出现 */
  PATTERN_BROKEN = 'pattern_broken',
  /** 用户主动清除 */
  USER_CLEARED = 'user_cleared',
  /** 隐私策略强制清理 */
  PRIVACY_POLICY = 'privacy_policy',
}

// ============================================================================
// 关键事件标记
// ============================================================================

/**
 * 关键事件（记录在长期记忆中，但不涉及敏感内容）
 *
 * 例如："考研周期"、"上次情绪低谷的模式"
 * 这些不是"标签"，而是帮助理解用户当前状态的上下文。
 */
export interface KeyEvent {
  /** 事件ID */
  id: string;
  /** 事件标签（用户可感知的描述，不含敏感信息） */
  label: string;
  /** 事件开始日期 */
  startDate: string;
  /** 事件结束日期（null = 进行中） */
  endDate: string | null;
  /** 对用户状态的影响 */
  impact: {
    /** 压力影响 (-1.0 到 1.0, 正=压力增加) */
    stressImpact: number;
    /** 社交影响 (-1.0 到 1.0, 正=社交增加) */
    socialImpact: number;
    /** 影响描述 */
    description: string;
  };
  /** 事件分类 */
  category: KeyEventCategory;
}

/** 关键事件类别 */
export enum KeyEventCategory {
  /** 学业相关：考研、考试、论文、毕业 */
  ACADEMIC = 'academic',
  /** 社交相关：新关系、冲突、告别 */
  SOCIAL = 'social',
  /** 生活变化：搬家、实习、新生入学 */
  LIFE_CHANGE = 'life_change',
  /** 健康相关：生病、康复 */
  HEALTH = 'health',
  /** 其他 */
  OTHER = 'other',
}

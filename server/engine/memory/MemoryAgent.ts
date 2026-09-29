/**
 * 「同频」Same Wavelength — 记忆Agent (MemoryAgent)
 *
 * 记忆Agent负责三层记忆（瞬时/短期/长期）的写入、组织、召回和遗忘。
 * 它是决策Agent的"知识库"，提供用户历史上下文、人格画像和有效策略。
 *
 * 运行位置：手机端侧
 * 触发方式：感知Agent触发写入，决策Agent触发召回
 */

import { AgentBase, AgentId, AgentMessage } from '../core/AgentBase';
import { MemoryEntry, MemoryQuery, MemoryRecallResult, MemoryWriteRequest, MemoryUpdateRequest, PromotionCandidate, DecayCandidate, MemoryId, MemoryType } from './types/MemoryEntry';
import { InstantMemoryEntry, InstantMemoryWorkspace } from './types/InstantMemoryTypes';
import { ShortTermMemoryEntry, ShortTermMemoryView } from './types/ShortTermMemoryTypes';
import { LongTermMemoryEntry, LongTermMemoryView } from './types/LongTermMemoryTypes';
import { INSTANT_MEMORY_WINDOW_HOURS, SHORT_TERM_MEMORY_WINDOW_DAYS, LONG_TERM_PROMOTION_THRESHOLD, LONG_TERM_DECAY_THRESHOLD_DAYS } from '../core/Config';

// ============================================================================
// 记忆Agent
// ============================================================================

export class MemoryAgent extends AgentBase {
  readonly agentId: AgentId = 'MemoryAgent';

  /** 瞬时记忆存储 */
  private instantMemory: Map<MemoryId, InstantMemoryEntry> = new Map();

  /** 短期记忆存储 */
  private shortTermMemory: Map<MemoryId, ShortTermMemoryEntry> = new Map();

  /** 长期记忆存储 */
  private longTermMemory: Map<MemoryId, LongTermMemoryEntry> = new Map();

  /** 当前瞬时记忆工作台 */
  private workspace: InstantMemoryWorkspace | null = null;

  protected async onInitialize(): Promise<void> {
    console.log('[MemoryAgent] 已初始化三层记忆系统');
  }

  protected async onStart(): Promise<void> {
    console.log('[MemoryAgent] 已启动');
  }

  protected async onStop(): Promise<void> {
    console.log('[MemoryAgent] 已停止');
  }

  // ==========================================================================
  // 记忆写入
  // ==========================================================================

  /** 写入记忆条目 */
  async writeMemory(request: MemoryWriteRequest): Promise<MemoryId> {
    const { entry, targetType } = request;
    switch (targetType) {
      case MemoryType.INSTANT:
        this.instantMemory.set(entry.id, entry as InstantMemoryEntry);
        break;
      case MemoryType.SHORT_TERM:
        this.shortTermMemory.set(entry.id, entry as ShortTermMemoryEntry);
        break;
      case MemoryType.LONG_TERM:
        this.longTermMemory.set(entry.id, entry as LongTermMemoryEntry);
        break;
    }
    return entry.id;
  }

  /** 更新记忆条目 */
  async updateMemory(request: MemoryUpdateRequest): Promise<void> {
    const { entryId, updates, touch } = request;
    const entry = this.findEntry(entryId);
    if (!entry) throw new Error(`记忆条目不存在: ${entryId}`);
    Object.assign(entry, updates);
    if (touch) {
      entry.lastAccessedAt = Date.now();
      entry.accessCount++;
    }
  }

  // ==========================================================================
  // 记忆召回（ZUI重要）
  // ==========================================================================

  /** 跨层记忆召回 */
  async recallMemory(query: MemoryQuery): Promise<MemoryRecallResult> {
    const startTime = Date.now();
    const results: MemoryEntry[] = [];
    const relevanceScores = new Map<MemoryId, number>();

    // 从三层记忆分别召回
    const instantResults = this.searchMemory(this.instantMemory, query);
    const shortTermResults = this.searchMemory(this.shortTermMemory, query);
    const longTermResults = this.searchMemory(this.longTermMemory, query);

    // 合并并计算相关性
    for (const entry of [...instantResults, ...shortTermResults, ...longTermResults]) {
      results.push(entry);
      const relevance = this.calculateRelevance(entry, query);
      relevanceScores.set(entry.id, relevance);
    }

    // 排序：相关性 × 新鲜度
    results.sort((a, b) =>
      (relevanceScores.get(b.id) ?? 0) - (relevanceScores.get(a.id) ?? 0)
    );

    return {
      entries: results.slice(0, query.limit ?? 20),
      relevanceScores,
      latencyMs: Date.now() - startTime,
      sources: {
        instantCount: instantResults.length,
        shortTermCount: shortTermResults.length,
        longTermCount: longTermResults.length,
      },
      recommendedApproach: this.generateRecommendedApproach(results.slice(0, 5)),
    };
  }

  // ==========================================================================
  // 记忆晋级/衰减（阶段二实现详细逻辑）
  // ==========================================================================

  /** 检查并执行记忆晋级 */
  async runPromotionCycle(): Promise<PromotionCandidate[]> {
    // 阶段二实现：检测短期记忆中的重复模式
    console.log('[MemoryAgent] 晋级周期检查...');
    return [];
  }

  /** 检查并执行记忆衰减 */
  async runDecayCycle(): Promise<DecayCandidate[]> {
    // 阶段二实现：衰减超期未访问的长期记忆
    console.log('[MemoryAgent] 衰减周期检查...');
    return [];
  }

  /** 压缩瞬时记忆为短期记忆摘要 */
  async compressInstantMemory(): Promise<void> {
    // 阶段二实现：将过期的瞬时记忆压缩为每日摘要写入短期记忆
    console.log('[MemoryAgent] 压缩瞬时记忆...');
  }

  // ==========================================================================
  // 查询方法
  // ==========================================================================

  /** 获取短期记忆聚合视图 */
  getShortTermView(): ShortTermMemoryView | null {
    // 阶段二实现
    return null;
  }

  /** 获取长期记忆聚合视图 */
  getLongTermView(): LongTermMemoryView | null {
    // 阶段二实现
    return null;
  }

  // ==========================================================================
  // 私有方法
  // ==========================================================================

  private findEntry(id: MemoryId): MemoryEntry | null {
    return this.instantMemory.get(id) ??
           this.shortTermMemory.get(id) ??
           this.longTermMemory.get(id) ??
           null;
  }

  private searchMemory<T extends MemoryEntry>(
    store: Map<MemoryId, T>,
    query: MemoryQuery,
  ): T[] {
    let entries = Array.from(store.values());
    if (query.tags && query.tags.length > 0) {
      entries = entries.filter(e => e.tags.some(t => query.tags!.includes(t)));
    }
    if (query.timeRange) {
      entries = entries.filter(e =>
        e.createdAt >= query.timeRange!.start && e.createdAt <= query.timeRange!.end
      );
    }
    return entries;
  }

  private calculateRelevance(entry: MemoryEntry, query: MemoryQuery): number {
    let score = 0.5; // 基线
    // 标签匹配
    if (query.tags && entry.tags.some(t => query.tags!.includes(t))) {
      score += 0.3;
    }
    // 新鲜度奖励
    const ageHours = (Date.now() - entry.lastAccessedAt) / (3600 * 1000);
    const recencyBonus = Math.max(0, 0.2 - ageHours / (24 * 7) * 0.2);
    score += recencyBonus;
    // 重要性权重
    score *= entry.importance;
    return Math.min(1.0, score);
  }

  private generateRecommendedApproach(entries: MemoryEntry[]): string {
    if (entries.length === 0) return '无相关历史记录，建议基线干预';
    return `基于${entries.length}条记忆，建议综合考量用户偏好与当前状态`;
  }
}

/**
 * 「同频」Same Wavelength — 任务线3: 隐私生命周期管理
 *
 * 职责：
 *   1. 清理过期的瞬时记忆（4小时窗口）
 *   2. 压缩短期记忆（日→周摘要）
 *   3. 检查是否有应销毁的敏感数据
 *   4. 更新隐私仪表盘（用户可查看什么数据被采集了）
 *   5. 响应"一键删除所有数据"请求
 *
 * 运行时机：每日休眠时（凌晨自动触发）
 *
 * 隐私原则：
 *   - 所有敏感数据端侧处理
 *   - 心理/生理数据绝不上传云端
 *   - 用户拥有完全的数据控制权
 */

// ============================================================================
// 隐私数据类型
// ============================================================================

/** 隐私数据分类 */
export enum PrivacyDataCategory {
  /** 生理数据：睡眠、心率、HRV、压力 */
  PHYSIOLOGICAL = 'physiological',
  /** 行为数据：应用使用、屏幕时间 */
  BEHAVIORAL = 'behavioral',
  /** 对话数据：对话文本、情感分析结果 */
  DIALOGUE = 'dialogue',
  /** 位置数据：位置轨迹、地理围栏事件 */
  LOCATION = 'location',
  /** 画像数据：人格模型、偏好推断 */
  PROFILE = 'profile',
  /** 社交数据：匹配记录、互动记录 */
  SOCIAL = 'social',
}

/** 隐私数据生命周期阶段 */
export enum DataLifecycleStage {
  /** 活跃使用中 */
  ACTIVE = 'active',
  /** 可压缩（保留摘要，删除原始数据） */
  COMPRESSIBLE = 'compressible',
  /** 待清理（已过期） */
  EXPIRED = 'expired',
  /** 用户请求保留（跳过自动清理） */
  USER_RETAINED = 'user_retained',
}

/** 隐私数据条目 */
export interface PrivacyDataEntry {
  /** 数据ID */
  id: string;
  /** 数据分类 */
  category: PrivacyDataCategory;
  /** 生命周期阶段 */
  lifecycle: DataLifecycleStage;
  /** 创建时间 */
  createdAt: number;
  /** 过期时间 */
  expiresAt: number;
  /** 是否包含敏感信息 */
  isSensitive: boolean;
  /** 数据大小（字节） */
  sizeBytes: number;
}

/** 隐私仪表盘摘要 */
export interface PrivacyDashboard {
  /** 生成时间 */
  generatedAt: number;
  /** 各类别数据量 */
  dataCountByCategory: Record<PrivacyDataCategory, number>;
  /** 各类别存储占用（字节） */
  storageByCategory: Record<PrivacyDataCategory, number>;
  /** 总存储占用 */
  totalStorageBytes: number;
  /** 下次自动清理时间 */
  nextScheduledCleanup: string;
  /** 采集开关状态 */
  collectionSwitches: Record<PrivacyDataCategory, boolean>;
  /** 最近一次清理操作 */
  lastCleanupAction: {
    timestamp: number;
    action: string;
    itemsRemoved: number;
    bytesFreed: number;
  } | null;
}

// ============================================================================
// 隐私生命周期管理器
// ============================================================================

export class PrivacyLifecycleManager {
  /** 隐私数据存储 */
  private dataEntries: Map<string, PrivacyDataEntry> = new Map();

  /** 采集开关 */
  private collectionSwitches: Record<PrivacyDataCategory, boolean> = {
    [PrivacyDataCategory.PHYSIOLOGICAL]: true,
    [PrivacyDataCategory.BEHAVIORAL]: true,
    [PrivacyDataCategory.DIALOGUE]: true,
    [PrivacyDataCategory.LOCATION]: true,
    [PrivacyDataCategory.PROFILE]: true,
    [PrivacyDataCategory.SOCIAL]: true,
  };

  /** 隐私仪表盘 */
  private dashboard: PrivacyDashboard;

  /** 各分类数据保留策略（小时） */
  private readonly RETENTION_POLICIES: Record<PrivacyDataCategory, number> = {
    [PrivacyDataCategory.PHYSIOLOGICAL]: 24 * 30,    // 30天
    [PrivacyDataCategory.BEHAVIORAL]: 24 * 7,         // 7天
    [PrivacyDataCategory.DIALOGUE]: 24 * 7,           // 7天（敏感→即时加密）
    [PrivacyDataCategory.LOCATION]: 24 * 3,           // 3天
    [PrivacyDataCategory.PROFILE]: 24 * 365,          // 1年（用户画像不删）
    [PrivacyDataCategory.SOCIAL]: 24 * 14,            // 14天
  };

  constructor() {
    this.dashboard = this.createEmptyDashboard();
  }

  // ==========================================================================
  // 每日休眠清理（凌晨自动触发）
  // ==========================================================================

  /**
   * 执行每日隐私清理任务
   *
   * @returns 清理报告
   */
  async runDailyCleanup(): Promise<CleanupReport> {
    const now = Date.now();
    let itemsRemoved = 0;
    let bytesFreed = 0;

    // 1. 清理过期数据
    for (const [id, entry] of this.dataEntries) {
      if (entry.lifecycle === DataLifecycleStage.USER_RETAINED) continue;
      if (entry.expiresAt <= now) {
        if (entry.isSensitive) {
          // 敏感数据安全擦除（覆盖后删除）
          await this.secureErase(id, entry);
        } else {
          this.dataEntries.delete(id);
        }
        itemsRemoved++;
        bytesFreed += entry.sizeBytes;
      }
    }

    // 2. 压缩可压缩数据（保留摘要）
    const compressibleEntries = Array.from(this.dataEntries.values())
      .filter(e => e.lifecycle === DataLifecycleStage.COMPRESSIBLE);
    for (const entry of compressibleEntries) {
      entry.lifecycle = DataLifecycleStage.EXPIRED;
      entry.expiresAt = now + 7 * 86400 * 1000; // 压缩后保留7天
    }

    // 3. 更新仪表盘
    this.updateDashboard();

    const report: CleanupReport = {
      timestamp: now,
      itemsRemoved,
      bytesFreed,
      remainingItems: this.dataEntries.size,
      nextCleanupTime: this.getNextCleanupTime(),
    };

    console.log(
      `[PrivacyLifecycle] 🧹 每日清理完成: 移除${itemsRemoved}条, ` +
      `释放${(bytesFreed / 1024).toFixed(1)}KB, 剩余${this.dataEntries.size}条`
    );

    return report;
  }

  // ==========================================================================
  // 一键删除
  // ==========================================================================

  /**
   * 响应用户"一键删除所有数据"请求
   *
   * @param categories 要删除的分类（null=全部）
   * @returns 删除报告
   */
  async deleteAllData(categories: PrivacyDataCategory[] | null = null): Promise<CleanupReport> {
    const now = Date.now();
    let itemsRemoved = 0;
    let bytesFreed = 0;
    const targetCategories = categories ?? Object.values(PrivacyDataCategory);

    for (const [id, entry] of this.dataEntries) {
      if (targetCategories.includes(entry.category)) {
        if (entry.isSensitive) {
          await this.secureErase(id, entry);
        } else {
          this.dataEntries.delete(id);
        }
        itemsRemoved++;
        bytesFreed += entry.sizeBytes;
      }
    }

    this.updateDashboard();

    console.warn(
      `[PrivacyLifecycle] ⚠️ 用户执行一键删除: ` +
      `移除${itemsRemoved}条, 释放${(bytesFreed / 1024).toFixed(1)}KB` +
      (categories ? ` (分类: ${categories.join(', ')})` : ' (全部数据)')
    );

    return {
      timestamp: now,
      itemsRemoved,
      bytesFreed,
      remainingItems: this.dataEntries.size,
      nextCleanupTime: this.getNextCleanupTime(),
    };
  }

  // ==========================================================================
  // 数据管理
  // ==========================================================================

  /** 注册一条新数据 */
  registerData(entry: PrivacyDataEntry): void {
    this.dataEntries.set(entry.id, entry);
    this.updateDashboard();
  }

  /** 标记数据为可压缩 */
  markCompressible(id: string): void {
    const entry = this.dataEntries.get(id);
    if (entry) {
      entry.lifecycle = DataLifecycleStage.COMPRESSIBLE;
    }
  }

  /** 用户标记保留某条数据 */
  markRetainedByUser(id: string): void {
    const entry = this.dataEntries.get(id);
    if (entry) {
      entry.lifecycle = DataLifecycleStage.USER_RETAINED;
    }
  }

  /** 切换某类数据的采集开关 */
  toggleCollection(category: PrivacyDataCategory, enabled: boolean): void {
    this.collectionSwitches[category] = enabled;
    console.log(`[PrivacyLifecycle] ${category} 采集: ${enabled ? '✅ 开启' : '⛔ 关闭'}`);
  }

  /** 是否允许采集某类数据 */
  isCollectionEnabled(category: PrivacyDataCategory): boolean {
    return this.collectionSwitches[category];
  }

  // ==========================================================================
  // 仪表盘
  // ==========================================================================

  /** 获取隐私仪表盘 */
  getDashboard(): PrivacyDashboard {
    this.updateDashboard();
    return { ...this.dashboard };
  }

  private updateDashboard(): void {
    const now = Date.now();
    const dataCountByCategory: Record<PrivacyDataCategory, number> = {} as any;
    const storageByCategory: Record<PrivacyDataCategory, number> = {} as any;
    let totalBytes = 0;

    for (const cat of Object.values(PrivacyDataCategory)) {
      dataCountByCategory[cat] = 0;
      storageByCategory[cat] = 0;
    }

    for (const entry of this.dataEntries.values()) {
      dataCountByCategory[entry.category]++;
      storageByCategory[entry.category] += entry.sizeBytes;
      totalBytes += entry.sizeBytes;
    }

    this.dashboard = {
      generatedAt: now,
      dataCountByCategory,
      storageByCategory,
      totalStorageBytes: totalBytes,
      nextScheduledCleanup: new Date(this.getNextCleanupTime()).toISOString(),
      collectionSwitches: { ...this.collectionSwitches },
      lastCleanupAction: this.dashboard.lastCleanupAction,
    };
  }

  // ==========================================================================
  // 工具方法
  // ==========================================================================

  /**
   * 敏感数据安全擦除
   * 先覆盖随机数据，再删除（防止恢复）
   */
  private async secureErase(id: string, entry: PrivacyDataEntry): Promise<void> {
    // 在真实环境中，这里会：
    // 1. 用随机数据覆盖原存储位置
    // 2. 调用文件系统安全删除API
    // 3. 确认删除后移除映射
    this.dataEntries.delete(id);
  }

  private getNextCleanupTime(): number {
    // 明天凌晨3:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(3, 0, 0, 0);
    return tomorrow.getTime();
  }

  private createEmptyDashboard(): PrivacyDashboard {
    const emptyCounts = {} as Record<PrivacyDataCategory, number>;
    for (const cat of Object.values(PrivacyDataCategory)) {
      emptyCounts[cat] = 0;
    }

    return {
      generatedAt: Date.now(),
      dataCountByCategory: emptyCounts,
      storageByCategory: { ...emptyCounts },
      totalStorageBytes: 0,
      nextScheduledCleanup: '',
      collectionSwitches: { ...this.collectionSwitches },
      lastCleanupAction: null,
    };
  }
}

// ============================================================================
// 清理报告
// ============================================================================

export interface CleanupReport {
  /** 清理时间 */
  timestamp: number;
  /** 移除的数据条数 */
  itemsRemoved: number;
  /** 释放的字节数 */
  bytesFreed: number;
  /** 剩余数据条数 */
  remainingItems: number;
  /** 下次清理时间 */
  nextCleanupTime: number;
}

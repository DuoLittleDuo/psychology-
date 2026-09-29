/**
 * 「同频」Same Wavelength — 统一导出入口
 *
 * 五大自治子Agent联邦 + 上帝模式可视化演示系统
 */

// ============================================================================
// 核心基础设施
// ============================================================================
export * from './core/Config';
export * from './core/IntentTypes';
export * from './core/AgentBase';
export * from './core/MessageBus';

// ============================================================================
// 感知Agent (PerceptionAgent)
// ============================================================================
export { PerceptionAgent } from './perception/PerceptionAgent';
export { SnapshotBuilder } from './perception/SnapshotBuilder';
export type { ISnapshotBuilder } from './perception/SnapshotBuilder';
export type { ISensorChannel, ChannelEvent, ChannelSnapshot } from './perception/SensorChannel';
export * from './perception/types/HealthData';
export * from './perception/types/UsageData';
export * from './perception/types/DialogueData';
export * from './perception/types/ContextData';
export * from './perception/types/Snapshot';

// ============================================================================
// 记忆Agent (MemoryAgent)
// ============================================================================
export { MemoryAgent } from './memory/MemoryAgent';
export { MemoryConsolidationEngine } from './memory/MemoryConsolidation';
export { MemoryRecallEngine } from './memory/MemoryRecall';
export * from './memory/types/MemoryEntry';
export * from './memory/types/InstantMemoryTypes';
export * from './memory/types/ShortTermMemoryTypes';
export * from './memory/types/LongTermMemoryTypes';

// ============================================================================
// 规划决策Agent (DecisionAgent)
// ============================================================================
export { DecisionAgent } from './decision/DecisionAgent';
export { L2DeepPlanner } from './decision/L2DeepPlanner';
export { InterventionTimer } from './decision/InterventionTimer';
export * from './decision/types/DecisionTypes';
export * from './decision/types/TaskNode';
export * from './decision/types/PlanTypes';

// ============================================================================
// 安全隐私Agent (SafetyAgent)
// ============================================================================
export { SafetyAgent } from './safety/SafetyAgent';
export { DialogueGuard } from './safety/DialogueGuard';
export { PushBudgetGuard } from './safety/PushBudgetGuard';
export { CrisisEscalationManager } from './safety/CrisisEscalation';
export { PrivacyLifecycleManager } from './safety/PrivacyLifecycle';
export * from './safety/types/SafetyTypes';
export * from './safety/types/CrisisProtocol';
export * from './safety/types/BudgetTypes';

// ============================================================================
// 多端执行Agent (ExecutionAgent)
// ============================================================================
export { ExecutionAgent } from './execution/ExecutionAgent';
export * from './execution/types/ExecutionTypes';
export * from './execution/types/CardTypes';
export * from './execution/types/DeviceTypes';

// ============================================================================
// 反思Agent (ReflectionAgent)
// ============================================================================
export { ReflectionAgent } from './reflection/ReflectionAgent';
export * from './reflection/types/ReflectionTypes';

// ============================================================================
// 上帝模式 (God Mode)
// ============================================================================
export { MockDataGenerator, DEFAULT_MOCK_SCENARIO } from './god_mode/MockDataGenerator';
export type { MockScenario, DayBaseline } from './god_mode/MockDataGenerator';
export { StateOverrideEngine } from './god_mode/StateOverrideEngine';
export { GodModeController } from './god_mode/GodModeController';
export { SimulationBenchmark } from './god_mode/SimulationBenchmark';
export * from './god_mode/types/GodModeTypes';

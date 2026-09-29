export type SensorKey = "heartRate" | "ecg" | "hrv";

export interface SensorDefinition {
  key: SensorKey;
  name: string;
  description: string;
  required: boolean;
}

export interface WatchFamily {
  id: string;
  series: string;
  model: string;
  summary: string;
  sensors: SensorKey[];
  accent: string;
}

export const SENSOR_DEFINITIONS: SensorDefinition[] = [
  {
    key: "heartRate",
    name: "心率监测",
    description: "用于识别静息、步行和运动状态下的心率变化。",
    required: true,
  },
  {
    key: "ecg",
    name: "ECG 心电分析",
    description: "设备支持时读取心电分析能力，结果仅作风险提示。",
    required: false,
  },
  {
    key: "hrv",
    name: "HRV 心率变异性",
    description: "用于观察压力与恢复状态，不能替代医疗检查。",
    required: false,
  },
];

export const WATCH_FAMILIES: WatchFamily[] = [
  {
    id: "watch-ultimate-2",
    series: "WATCH Ultimate 系列",
    model: "HUAWEI WATCH Ultimate 2",
    summary: "面向户外与专业运动场景，适合高强度活动中的连续监测。",
    sensors: ["heartRate", "ecg", "hrv"],
    accent: "#0f766e",
  },
  {
    id: "watch-6-pro",
    series: "WATCH 系列",
    model: "HUAWEI WATCH 6 Pro",
    summary: "智慧健康与日常佩戴兼顾，适合全天候状态观察。",
    sensors: ["heartRate", "hrv"],
    accent: "#0369a1",
  },
  {
    id: "watch-gt-7-pro",
    series: "WATCH GT 系列",
    model: "HUAWEI WATCH GT 7 Pro",
    summary: "兼顾长续航、运动与心电分析能力，适合校园日常场景。",
    sensors: ["heartRate", "ecg", "hrv"],
    accent: "#7c3aed",
  },
  {
    id: "watch-fit-5-pro",
    series: "WATCH FIT 系列",
    model: "HUAWEI WATCH FIT 5 Pro",
    summary: "轻量佩戴，适合睡眠、运动与日常健康趋势观察。",
    sensors: ["heartRate", "ecg", "hrv"],
    accent: "#be123c",
  },
  {
    id: "watch-d3",
    series: "WATCH D 系列",
    model: "HUAWEI WATCH D3",
    summary: "健康守护定位，适合需要更密集心血管数据观察的用户。",
    sensors: ["heartRate", "hrv"],
    accent: "#b45309",
  },
];

export function getWatchFamily(id: string) {
  return WATCH_FAMILIES.find((device) => device.id === id) ?? WATCH_FAMILIES[2];
}

export function getSensorNames(keys: SensorKey[]) {
  return SENSOR_DEFINITIONS.filter((sensor) => keys.includes(sensor.key)).map((sensor) => sensor.name);
}

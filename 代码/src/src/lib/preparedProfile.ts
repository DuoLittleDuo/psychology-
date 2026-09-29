import type { SensorKey } from "../data/deviceCatalog";

export const PREPARED_PROFILE_KEY = "same-wavelength-prepared-profile";

export interface PreparedProfile {
  modelId: string;
  modelName: string;
  sensorKeys: SensorKey[];
  safetyMode: boolean;
  preparedAt: string;
}

export function savePreparedProfile(profile: PreparedProfile) {
  window.localStorage.setItem(PREPARED_PROFILE_KEY, JSON.stringify(profile));
}

export function loadPreparedProfile(): PreparedProfile | null {
  try {
    const raw = window.localStorage.getItem(PREPARED_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PreparedProfile;
    if (!parsed?.modelId || !Array.isArray(parsed.sensorKeys)) return null;
    return parsed;
  } catch {
    return null;
  }
}

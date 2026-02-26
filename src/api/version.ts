import { Config } from '../config';

export interface VersionCheckResponse {
  minimumVersion: string;
}

export async function fetchMinimumVersion(): Promise<string> {
  const response = await fetch(`${Config.api.baseUrl}/version`);
  if (!response.ok) {
    throw new Error(`Version check failed: ${response.status}`);
  }
  const data: VersionCheckResponse = await response.json();
  return data.minimumVersion;
}

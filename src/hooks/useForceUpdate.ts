import { useEffect, useState } from 'react';
import Constants from 'expo-constants';
import { fetchMinimumVersion } from '../api/version';

function parseVersion(version: string): number[] {
  return version.split('.').map((part) => parseInt(part, 10) || 0);
}

function isOutdated(current: string, minimum: string): boolean {
  const currentParts = parseVersion(current);
  const minimumParts = parseVersion(minimum);
  const length = Math.max(currentParts.length, minimumParts.length);

  for (let i = 0; i < length; i++) {
    const curr = currentParts[i] ?? 0;
    const min = minimumParts[i] ?? 0;
    if (curr < min) return true;
    if (curr > min) return false;
  }
  return false;
}

export function useForceUpdate() {
  const [updateRequired, setUpdateRequired] = useState(false);

  useEffect(() => {
    const currentVersion = Constants.expoConfig?.version ?? '0.0.0';

    fetchMinimumVersion()
      .then((minimumVersion) => {
        if (isOutdated(currentVersion, minimumVersion)) {
          setUpdateRequired(true);
        }
      })
      .catch(() => {
        // If version check fails, don't block the user
      });
  }, []);

  return { updateRequired };
}

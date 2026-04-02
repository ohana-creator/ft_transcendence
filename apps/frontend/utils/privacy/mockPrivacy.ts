export type PrivacySettings = {
  profilePublic: boolean;
  showBalance: boolean;
  showContributions: boolean;
  showCampaigns: boolean;
};

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  profilePublic: true,
  showBalance: false,
  showContributions: true,
  showCampaigns: true,
};

const PRIVACY_STORAGE_PREFIX = 'vaks:privacy-settings:';

function getPrivacyStorageKey(userId: string): string {
  return `${PRIVACY_STORAGE_PREFIX}${userId}`;
}

export function readMockPrivacySettings(userId?: string | null): PrivacySettings {
  if (typeof window === 'undefined' || !userId) {
    return DEFAULT_PRIVACY_SETTINGS;
  }

  const raw = localStorage.getItem(getPrivacyStorageKey(userId));
  if (!raw) return DEFAULT_PRIVACY_SETTINGS;

  try {
    const parsed = JSON.parse(raw) as Partial<PrivacySettings>;
    return {
      ...DEFAULT_PRIVACY_SETTINGS,
      ...parsed,
    };
  } catch {
    return DEFAULT_PRIVACY_SETTINGS;
  }
}

export function writeMockPrivacySettings(userId: string, settings: Partial<PrivacySettings>): PrivacySettings {
  const next = {
    ...readMockPrivacySettings(userId),
    ...settings,
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(getPrivacyStorageKey(userId), JSON.stringify(next));
  }

  return next;
}
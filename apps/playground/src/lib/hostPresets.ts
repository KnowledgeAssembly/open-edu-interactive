export type TokenPresetId = "default" | "high-contrast" | "low-stimulation";

export interface HostConfig {
  locale: string;
  reducedMotion: boolean;
  tokenPreset: TokenPresetId;
}

export const DEFAULT_HOST_CONFIG: HostConfig = {
  locale: "en",
  reducedMotion: false,
  tokenPreset: "default",
};

const TOKEN_PRESETS: Record<TokenPresetId, Record<string, string>> = {
  default: {},
  "high-contrast": {
    emphasis: "high",
    danger: "strong",
    focus: "visible",
  },
  "low-stimulation": {
    emphasis: "subtle",
    danger: "muted",
    focus: "soft",
  },
};

export function tokensForPreset(preset: TokenPresetId): Record<string, string> {
  return { ...TOKEN_PRESETS[preset] };
}

export function stubHostOptions(config: HostConfig): {
  locale: string;
  reducedMotion: boolean;
  tokens: Record<string, string>;
} {
  return {
    locale: config.locale,
    reducedMotion: config.reducedMotion,
    tokens: tokensForPreset(config.tokenPreset),
  };
}

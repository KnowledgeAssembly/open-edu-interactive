import type { HostConfig, TokenPresetId } from "../lib/hostPresets.js";

const LOCALES = ["en", "es", "fr", "de", "hi"] as const;
const TOKEN_PRESETS: TokenPresetId[] = ["default", "high-contrast", "low-stimulation"];

export function HostPanel({
  config,
  onChange,
}: {
  config: HostConfig;
  onChange: (config: HostConfig) => void;
}): React.JSX.Element {
  return (
    <details style={{ marginTop: 8 }}>
      <summary>Host</summary>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 13, marginTop: 4 }}>
        <label>
          Locale{" "}
          <select
            value={config.locale}
            onChange={(e) => onChange({ ...config, locale: e.target.value })}
          >
            {LOCALES.map((locale) => (
              <option key={locale} value={locale}>{locale}</option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={config.reducedMotion}
            onChange={(e) => onChange({ ...config, reducedMotion: e.target.checked })}
          />
          Reduced motion
        </label>
        <label>
          Tokens{" "}
          <select
            value={config.tokenPreset}
            onChange={(e) => onChange({ ...config, tokenPreset: e.target.value as TokenPresetId })}
          >
            {TOKEN_PRESETS.map((preset) => (
              <option key={preset} value={preset}>{preset}</option>
            ))}
          </select>
        </label>
      </div>
    </details>
  );
}

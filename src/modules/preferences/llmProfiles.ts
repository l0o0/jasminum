import { getPref, setPref } from "../../utils/prefs";

export interface LLMProfile {
  id: string;
  name: string;
  baseURL: string;
  apiKey: string;
  model: string;
}
export interface LLMProfiles {
  activeId: string;
  profiles: LLMProfile[];
}

export function loadLLMProfiles(defaults: {
  baseURL: string;
  model: string;
}): LLMProfiles {
  const saved = getPref("llmProfiles");
  if (saved) {
    const state = JSON.parse(saved) as LLMProfiles;
    if (
      !Array.isArray(state.profiles) ||
      !state.profiles.length ||
      !state.profiles.every((p) =>
        [p.id, p.name, p.baseURL, p.apiKey, p.model].every(
          (v) => typeof v === "string",
        ),
      ) ||
      !state.profiles.some((p) => p.id === state.activeId)
    )
      throw new Error("Invalid saved AI configuration list");
    return state;
  }
  const baseURL = getPref("llmBaseURL") || "";
  const apiKey = getPref("llmApiKey") || "";
  const model = getPref("llmModel") || "";
  const unused = !baseURL.trim() && !apiKey.trim() && !model.trim();
  const profile = {
    id: "default",
    name: unused ? "MagicZotero" : baseURL || model || "API",
    baseURL: unused ? defaults.baseURL : baseURL,
    apiKey,
    model: unused ? defaults.model : model,
  };
  return { activeId: profile.id, profiles: [profile] };
}

export function saveLLMProfiles(state: LLMProfiles) {
  const active = state.profiles.find((p) => p.id === state.activeId);
  if (!active) throw new Error("Missing active AI configuration");
  setPref("llmProfiles", JSON.stringify(state));
  // Keep existing recognition consumers compatible with the active configuration.
  setPref("llmApiKey", "");
  setPref("llmBaseURL", active.baseURL);
  setPref("llmModel", active.model);
  setPref("llmApiKey", active.apiKey);
}

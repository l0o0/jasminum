import { getLocaleID, getString } from "../../utils/locale";
import {
  loadLLMProfiles,
  saveLLMProfiles,
  type LLMProfile,
} from "./llmProfiles";

const MAGICZOTERO_PROVIDER = {
  id: "magiczotero",
  baseURL: "https://gpt.magiczotero.top/v1",
  model: "deepseek-v4-flash",
} as const;

// Provider-specific model IDs; users can replace these with their own models.
// https://docs.siliconflow.cn/docs/api/models-get
// https://api-docs.deepseek.com/guides/vision/
export const LLM_PROVIDERS = [
  MAGICZOTERO_PROVIDER,
  {
    id: "siliconflow",
    baseURL: "https://api.siliconflow.cn/v1",
    model: "deepseek-ai/DeepSeek-V4-Flash",
  },
  {
    id: "deepseek",
    baseURL: "https://api.deepseek.com",
    model: "deepseek-flash",
  },
] as const;

export function findLLMProvider(baseURL: string) {
  const normalized = baseURL.trim().replace(/\/+$/, "");
  return LLM_PROVIDERS.find(
    (provider) =>
      provider.baseURL === normalized ||
      (provider.id === "deepseek" &&
        normalized === "https://api.deepseek.com/v1"),
  );
}

export function bindLLMProviderEvents(doc: Document) {
  const select = doc.getElementById(
    "jasminum-llm-provider",
  ) as HTMLSelectElement;
  const baseURL = doc.getElementById(
    "jasminum-llm-base-url",
  ) as HTMLInputElement;
  const apiKey = doc.getElementById("jasminum-llm-api-key") as HTMLInputElement;
  const model = doc.getElementById("jasminum-llm-model") as HTMLInputElement;
  const magicZoteroGuide = doc.getElementById(
    "jasminum-llm-magiczotero-guide",
  )!;
  const storeStatus = doc.getElementById(
    "jasminum-llm-magiczotero-store-status",
  )!;

  // Fluent can replace the translated link, so listen on its stable parent.
  magicZoteroGuide.addEventListener("click", (event) => {
    if (
      !(event.target as Element | null)?.closest(
        'a[data-l10n-name="model-store"]',
      )
    )
      return;
    event.preventDefault();
    const garden = (
      Zotero as typeof Zotero & {
        Garden?: {
          api?: { openPage?: (options: { page: string }) => void };
        };
      }
    ).Garden;
    storeStatus.textContent = "";
    if (typeof garden?.api?.openPage !== "function") {
      storeStatus.setAttribute(
        "data-l10n-id",
        getLocaleID("llm-magiczotero-store-unavailable"),
      );
      return;
    }
    storeStatus.removeAttribute("data-l10n-id");
    try {
      garden.api.openPage({ page: "model-market" });
      Zotero.getMainWindow().focus();
    } catch {
      storeStatus.setAttribute(
        "data-l10n-id",
        getLocaleID("llm-magiczotero-store-failed"),
      );
    }
  });

  for (const provider of LLM_PROVIDERS) {
    const option = doc.createElementNS(
      "http://www.w3.org/1999/xhtml",
      "option",
    ) as HTMLOptionElement;
    option.value = provider.id;
    option.setAttribute(
      "data-l10n-id",
      getLocaleID(`llm-provider-${provider.id}`),
    );
    select.append(option);
  }

  function syncProvider(value: string) {
    const provider = findLLMProvider(value);
    select.value = provider?.id ?? "custom";
    magicZoteroGuide.hidden = provider?.id !== "magiczotero";
  }
  const state = loadLLMProfiles(MAGICZOTERO_PROVIDER);
  const profiles = doc.getElementById(
    "jasminum-llm-profile",
  ) as HTMLSelectElement;
  const name = doc.getElementById(
    "jasminum-llm-profile-name",
  ) as HTMLInputElement;
  const remove = doc.getElementById(
    "jasminum-llm-profile-delete",
  ) as HTMLButtonElement;
  const active = () => state.profiles.find((p) => p.id === state.activeId)!;
  const refreshList = () => {
    profiles.replaceChildren();
    for (const profile of state.profiles) {
      const option = doc.createElementNS(
        "http://www.w3.org/1999/xhtml",
        "option",
      ) as HTMLOptionElement;
      option.value = profile.id;
      option.textContent =
        profile.name || profile.baseURL || profile.model || "API";
      profiles.append(option);
    }
    profiles.value = state.activeId;
    remove.disabled = state.profiles.length === 1;
  };
  const show = () => {
    const profile = active();
    baseURL.value = profile.baseURL;
    apiKey.value = profile.apiKey;
    model.value = profile.model;
    name.value = profile.name;
    refreshList();
    syncProvider(profile.baseURL);
    saveLLMProfiles(state);
    // Invalidate connection results even for switches made by add/delete buttons.
    profiles.dispatchEvent(
      new doc.defaultView!.Event("change", { bubbles: true }),
    );
  };
  const save = () => {
    Object.assign(active(), {
      name: name.value,
      baseURL: baseURL.value,
      apiKey: apiKey.value,
      model: model.value,
    });
    saveLLMProfiles(state);
    refreshList();
    syncProvider(baseURL.value);
  };
  for (const input of [baseURL, apiKey, model, name])
    input.addEventListener("input", save);
  profiles.addEventListener("change", () => {
    if (state.activeId === profiles.value) return;
    state.activeId = profiles.value;
    show();
  });
  const create = (values: Omit<LLMProfile, "id">) => {
    const profile = { ...values, id: Zotero.Utilities.randomString(16) };
    state.profiles.push(profile);
    state.activeId = profile.id;
    show();
  };
  doc
    .getElementById("jasminum-llm-profile-add")!
    .addEventListener("click", () => {
      create({
        name: getString("llm-profile-new"),
        baseURL: "",
        apiKey: "",
        model: "",
      });
    });
  remove.addEventListener("click", () => {
    if (state.profiles.length < 2) return;
    const index = state.profiles.findIndex((p) => p.id === state.activeId);
    state.profiles.splice(index, 1);
    state.activeId =
      state.profiles[Math.min(index, state.profiles.length - 1)].id;
    show();
  });
  select.addEventListener("change", () => {
    const provider = LLM_PROVIDERS.find(({ id }) => id === select.value);
    if (!provider) {
      if (findLLMProvider(active().baseURL))
        create({
          name: getString("llm-profile-new"),
          baseURL: "",
          apiKey: "",
          model: "",
        });
      return;
    }
    if (findLLMProvider(active().baseURL)?.id === provider.id) return;
    const previous = state.profiles.find(
      (p) => findLLMProvider(p.baseURL)?.id === provider.id,
    );
    if (previous) {
      state.activeId = previous.id;
      show();
    } else
      create({
        name: {
          magiczotero: "MagicZotero",
          siliconflow: "SiliconFlow",
          deepseek: "DeepSeek",
        }[provider.id],
        baseURL: provider.baseURL,
        model: provider.model,
        apiKey: "",
      });
  });
  show();
}

import { getLocaleID } from "../../utils/locale";
import { getPref, setPref } from "../../utils/prefs";

const MAGICZOTERO_PROVIDER = {
  id: "magiczotero",
  baseURL: "https://gpt.magiczotero.top/v1",
  model: "deepseek-v4-1-flash",
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
  const modelHelp = doc.getElementById("jasminum-llm-model-help")!;
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

  // Only initialize unused settings; an existing key must keep its destination.
  if (
    !getPref("llmBaseURL").trim() &&
    !getPref("llmApiKey").trim() &&
    !getPref("llmModel").trim()
  ) {
    baseURL.value = MAGICZOTERO_PROVIDER.baseURL;
    model.value = MAGICZOTERO_PROVIDER.model;
    setPref("llmBaseURL", MAGICZOTERO_PROVIDER.baseURL);
    setPref("llmModel", MAGICZOTERO_PROVIDER.model);
  }

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

  function updateModelHelp(url: string, modelID: string) {
    const provider = findLLMProvider(url);
    magicZoteroGuide.hidden = provider?.id !== "magiczotero";
    modelHelp.setAttribute(
      "data-l10n-id",
      getLocaleID(
        provider?.id === "siliconflow" && modelID.trim() === provider.model
          ? "llm-model-help-siliconflow"
          : "llm-model-help",
      ),
    );
  }
  function syncProvider(value: string, modelID = model.value) {
    select.value = findLLMProvider(value)?.id ?? "custom";
    updateModelHelp(value, modelID);
  }
  // Zotero fills preference-bound inputs after the pane's load handler.
  syncProvider(getPref("llmBaseURL"), getPref("llmModel"));
  baseURL.addEventListener("input", () => syncProvider(baseURL.value));
  baseURL.addEventListener("syncfrompreference", () =>
    syncProvider(getPref("llmBaseURL"), getPref("llmModel")),
  );
  model.addEventListener("input", () =>
    updateModelHelp(baseURL.value, model.value),
  );
  model.addEventListener("syncfrompreference", () =>
    updateModelHelp(getPref("llmBaseURL"), getPref("llmModel")),
  );

  select.addEventListener("change", () => {
    const provider = LLM_PROVIDERS.find(({ id }) => id === select.value);
    // Selecting Custom preserves the current editable settings.
    if (!provider) return;
    if (findLLMProvider(baseURL.value)?.id === provider.id) return;

    // Clear credentials before changing the destination, including saved prefs.
    apiKey.value = "";
    setPref("llmApiKey", "");
    baseURL.value = provider.baseURL;
    setPref("llmBaseURL", provider.baseURL);
    model.value = provider.model;
    setPref("llmModel", provider.model);
    updateModelHelp(provider.baseURL, provider.model);
  });
}

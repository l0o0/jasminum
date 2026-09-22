import { getPref, setPref } from "../../utils/prefs";
import { getLocaleID } from "../../utils/locale";

export function renderMetadataSources(doc: Document, focusSource?: string) {
  const list = doc.getElementById("jasminum-metadata-source-list")!;
  const add = doc.getElementById("jasminum-metadata-source-add")!;
  const sources = [
    ...new Set(
      getPref("metadataSource")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
  const available = ["PubScholar", "NCPSSD", "CNKI", "Yiigle", "AI"];
  doc
    .getElementById("jasminum-metadata-source-button")
    ?.setAttribute("label", sources.join(", "));
  list.replaceChildren();
  add.replaceChildren();
  function element(tag: string, text = "") {
    const node = doc.createElementNS(
      "http://www.w3.org/1999/xhtml",
      tag,
    ) as HTMLElement;
    node.textContent = text;
    return node;
  }
  function button(key: string, action: () => void, disabled = false) {
    const node = element("button") as HTMLButtonElement;
    node.type = "button";
    node.disabled = disabled;
    node.setAttribute("data-l10n-id", getLocaleID(key));
    node.addEventListener("click", action);
    return node;
  }
  function save(next: string[], focus?: string) {
    setPref("metadataSource", next.join(", "));
    renderMetadataSources(doc, focus);
  }
  function renderRow(source: string, enabled: boolean, index = -1) {
    const row = element("div");
    row.className = "metadata-source-row";
    const label = element("label");
    label.className = "metadata-source-name";
    const checkbox = element("input") as HTMLInputElement;
    checkbox.type = "checkbox";
    checkbox.checked = enabled;
    checkbox.disabled = enabled && sources.length === 1;
    const name = element("span", source);
    if (source === "AI")
      name.setAttribute("data-l10n-id", getLocaleID("metadata-source-ai-name"));
    label.append(checkbox, name);
    row.append(label);
    checkbox.addEventListener("change", () =>
      save(updateMetadataSources(sources, source, checkbox.checked), source),
    );
    if (source === "AI") {
      const status = element("small");
      const configured = !!(
        getPref("llmBaseURL").trim() &&
        getPref("llmApiKey").trim() &&
        getPref("llmModel").trim()
      );
      status.setAttribute(
        "data-l10n-id",
        getLocaleID(
          configured
            ? "metadata-source-configured"
            : "metadata-source-unconfigured",
        ),
      );
      row.append(status);
    } else if (!available.includes(source)) {
      const status = element("small");
      status.setAttribute(
        "data-l10n-id",
        getLocaleID("metadata-source-unavailable"),
      );
      row.append(status);
    }
    if (enabled) {
      function move(offset: number) {
        const next = [...sources];
        [next[index], next[index + offset]] = [
          next[index + offset],
          next[index],
        ];
        save(next, source);
      }
      row.append(
        button("metadata-source-up", () => move(-1), index === 0),
        button(
          "metadata-source-down",
          () => move(1),
          index === sources.length - 1,
        ),
      );
    }
    (enabled ? list : add).append(row);
    if (source === focusSource) {
      // Keep keyboard focus after rebuilding the list, including the last disabled checkbox.
      label.tabIndex = -1;
      label.focus();
    }
  }
  sources.forEach((source, index) => renderRow(source, true, index));
  available
    .filter((source) => !sources.includes(source))
    .forEach((source) => renderRow(source, false));
  if (!add.childElementCount) {
    const empty = element("p");
    empty.setAttribute(
      "data-l10n-id",
      getLocaleID("metadata-source-all-enabled"),
    );
    add.append(empty);
  }
}

export class MetadataSourceSelectionError extends Error {
  constructor() {
    super("At least one metadata source must be selected.");
    this.name = "MetadataSourceSelectionError";
  }
}

export function updateMetadataSources(
  currentSources: string[],
  value: string,
  checked: boolean,
): string[] {
  const nextSources = checked
    ? currentSources.includes(value)
      ? currentSources
      : [...currentSources, value]
    : currentSources.filter((source) => source !== value);

  if (nextSources.length === 0) {
    throw new MetadataSourceSelectionError();
  }

  return nextSources;
}

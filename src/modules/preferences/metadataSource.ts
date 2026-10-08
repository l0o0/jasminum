import { getMetadataSources, getPref, setPref } from "../../utils/prefs";
import { getLocaleID } from "../../utils/locale";

export function renderMetadataSources(
  doc: Document,
  focusSource?: string,
  focusControl: "toggle" | "up" | "down" = "toggle",
) {
  const list = doc.getElementById("jasminum-metadata-source-list")!;
  const add = doc.getElementById("jasminum-metadata-source-add")!;
  const body = doc.querySelector<HTMLElement>(".metadata-source-body");
  const scrollTop = body?.scrollTop ?? 0;
  const sources = getMetadataSources();
  const available = ["PubScholar", "NCPSSD", "CNKI", "Yiigle", "AI"];
  const summary = doc.getElementById("jasminum-metadata-source-button")!;
  summary.setAttribute("data-l10n-id", getLocaleID("metadata-source-summary"));
  summary.setAttribute(
    "data-l10n-args",
    JSON.stringify({ count: sources.length, sources: sources.join(" → ") }),
  );
  doc.getElementById("jasminum-metadata-source-count")!.textContent = String(
    sources.length,
  );
  list.replaceChildren();
  add.replaceChildren();
  let focusTarget: HTMLElement | undefined;
  let rowNumber = 0;
  function element(tag: string, text = "") {
    const node = doc.createElementNS(
      "http://www.w3.org/1999/xhtml",
      tag,
    ) as HTMLElement;
    node.textContent = text;
    return node;
  }
  function button(
    direction: "up" | "down",
    source: string,
    action: () => void,
    disabled: boolean,
  ) {
    const node = element(
      "button",
      direction === "up" ? "↑" : "↓",
    ) as HTMLButtonElement;
    node.className = "metadata-source-move";
    node.type = "button";
    node.disabled = disabled;
    node.setAttribute(
      "data-l10n-id",
      getLocaleID(`metadata-source-move-${direction}`),
    );
    node.setAttribute("data-l10n-args", JSON.stringify({ source }));
    node.addEventListener("click", action);
    return node;
  }
  function save(
    next: string[],
    source: string,
    control: "toggle" | "up" | "down" = "toggle",
  ) {
    setPref("metadataSource", next.join(", "));
    renderMetadataSources(doc, source, control);
  }
  function renderRow(source: string, enabled: boolean, index = -1) {
    const row = element("li");
    row.className = "metadata-source-row";
    row.classList.toggle("is-enabled", enabled);
    const id = `jasminum-metadata-source-${rowNumber++}`;
    if (enabled) {
      const rank = element("span", String(index + 1).padStart(2, "0"));
      rank.className = "metadata-source-rank";
      rank.setAttribute("aria-hidden", "true");
      row.append(rank);
    }
    const label = element("label");
    label.className = "metadata-source-name";
    const checkbox = element("input") as HTMLInputElement;
    checkbox.type = "checkbox";
    checkbox.checked = enabled;
    checkbox.disabled = enabled && sources.length === 1;
    checkbox.setAttribute("aria-labelledby", `${id}-name`);
    const details = element("span");
    details.className = "metadata-source-details";
    const title = element("span");
    title.className = "metadata-source-title";
    const name = element("span", source);
    name.id = `${id}-name`;
    name.title = source;
    if (source === "AI")
      name.setAttribute("data-l10n-id", getLocaleID("metadata-source-ai-name"));
    title.append(name);
    const description = element("span");
    description.id = `${id}-description`;
    description.className = "metadata-source-description";
    description.setAttribute(
      "data-l10n-id",
      getLocaleID(
        `metadata-source-${available.includes(source) ? source.toLowerCase() : "unknown"}-description`,
      ),
    );
    details.append(title, description);
    label.append(checkbox, details);
    row.append(label);
    const describedBy = [description.id];
    if (checkbox.disabled) describedBy.push("jasminum-metadata-source-minimum");
    checkbox.addEventListener("change", () =>
      save(updateMetadataSources(sources, source, checkbox.checked), source),
    );
    if (source === "AI" || !available.includes(source)) {
      const status = element("small");
      status.id = `${id}-status`;
      const configured =
        source === "AI" &&
        !!(
          getPref("llmBaseURL").trim() &&
          getPref("llmApiKey").trim() &&
          getPref("llmModel").trim()
        );
      status.className = `metadata-source-status ${configured ? "is-configured" : "needs-attention"}`;
      status.setAttribute(
        "data-l10n-id",
        getLocaleID(
          source !== "AI"
            ? "metadata-source-unavailable"
            : configured
              ? "metadata-source-configured"
              : "metadata-source-unconfigured",
        ),
      );
      title.append(status);
      describedBy.push(status.id);
    }
    checkbox.setAttribute("aria-describedby", describedBy.join(" "));
    let rowFocus: HTMLElement = checkbox;
    if (enabled) {
      function move(offset: number, direction: "up" | "down") {
        const next = [...sources];
        [next[index], next[index + offset]] = [
          next[index + offset],
          next[index],
        ];
        save(next, source, direction);
      }
      const actions = element("span");
      actions.className = "metadata-source-actions";
      const up = button("up", source, () => move(-1, "up"), index === 0);
      const down = button(
        "down",
        source,
        () => move(1, "down"),
        index === sources.length - 1,
      );
      actions.append(up, down);
      row.append(actions);
      if (focusControl === "up" && !up.disabled) rowFocus = up;
      if (focusControl === "down" && !down.disabled) rowFocus = down;
    }
    (enabled ? list : add).append(row);
    if (source === focusSource) {
      if (checkbox.disabled) {
        label.tabIndex = -1;
        rowFocus = label;
      }
      focusTarget = rowFocus;
    }
  }
  sources.forEach((source, index) => renderRow(source, true, index));
  available
    .filter((source) => !sources.includes(source))
    .forEach((source) => renderRow(source, false));
  if (!add.childElementCount) {
    const empty = element("li");
    empty.className = "metadata-source-empty";
    empty.setAttribute(
      "data-l10n-id",
      getLocaleID("metadata-source-all-enabled"),
    );
    add.append(empty);
  }
  if (body) body.scrollTop = scrollTop;
  if (focusSource) {
    // Removed legacy sources have no row in the available list to focus.
    focusTarget ??=
      doc.querySelector<HTMLInputElement>(
        ".metadata-source-name input:enabled",
      ) ?? undefined;
    focusTarget?.focus({ preventScroll: true });
    const revealFocus = () => {
      if (focusTarget && doc.activeElement === focusTarget) {
        focusTarget.scrollIntoView({ block: "nearest" });
      }
    };
    revealFocus();
    // Fluent descriptions may wrap and change row heights after the rebuild.
    if (body && doc.l10n) {
      void doc.l10n.translateFragment(body).then(revealFocus, revealFocus);
    }
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
  currentSources = currentSources.filter((source) => source !== "WanFangData");
  const nextSources =
    checked && value !== "WanFangData"
      ? currentSources.includes(value)
        ? currentSources
        : [...currentSources, value]
      : currentSources.filter((source) => source !== value);

  if (nextSources.length === 0) {
    throw new MetadataSourceSelectionError();
  }

  return nextSources;
}

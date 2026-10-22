/** Mask bundled SVGs so icons inherit the button color in both themes. */
export function setOutlineButtonIcon(
  button: HTMLElement,
  icon: "stop" | "open-pdf" | "level" | "info",
  mirrored = false,
) {
  // A mask is monochrome; the stop control needs a separate yellow center.
  if (icon === "stop") {
    const ns = "http://www.w3.org/2000/svg";
    const svg = button.ownerDocument.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "18");
    svg.setAttribute("height", "18");
    svg.setAttribute("aria-hidden", "true");
    svg.style.cssText = "vertical-align:middle;pointer-events:none;";
    const circle = button.ownerDocument.createElementNS(ns, "circle");
    circle.setAttribute("cx", "12");
    circle.setAttribute("cy", "12");
    circle.setAttribute("r", "10.22");
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", "currentColor");
    circle.setAttribute("stroke-width", "1.5");
    const center = button.ownerDocument.createElementNS(ns, "rect");
    center.setAttribute("x", "7.265");
    center.setAttribute("y", "7.265");
    center.setAttribute("width", "9.47");
    center.setAttribute("height", "9.47");
    center.setAttribute("rx", "2");
    center.setAttribute("fill", "#e0ac00");
    svg.append(circle, center);
    button.replaceChildren(svg);
    return;
  }
  const span = button.ownerDocument.createElementNS(
    "http://www.w3.org/1999/xhtml",
    "span",
  );
  span.setAttribute("aria-hidden", "true");
  span.style.cssText = `display:inline-block;width:18px;height:18px;vertical-align:middle;pointer-events:none;background-color:currentColor;mask:url("chrome://jasminum/content/icons/outline-${icon}.svg") center / contain no-repeat;${mirrored ? "transform:scaleX(-1)" : ""}`;
  button.replaceChildren(span);
}

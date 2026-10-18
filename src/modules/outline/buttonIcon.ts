/** Mask bundled SVGs so icons inherit the button color in both themes. */
export function setOutlineButtonIcon(
  button: HTMLElement,
  icon: "stop" | "open-pdf" | "level" | "info",
  mirrored = false,
) {
  const span = button.ownerDocument.createElementNS(
    "http://www.w3.org/1999/xhtml",
    "span",
  );
  span.setAttribute("aria-hidden", "true");
  span.style.cssText = `display:inline-block;width:18px;height:18px;vertical-align:middle;pointer-events:none;background-color:currentColor;mask:url("chrome://jasminum/content/icons/outline-${icon}.svg") center / contain no-repeat;${mirrored ? "transform:scaleX(-1)" : ""}`;
  button.replaceChildren(span);
}

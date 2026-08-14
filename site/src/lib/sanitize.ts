// Job descriptions arrive as raw HTML from ~17 different feeds we don't
// control, so they get parsed and rebuilt against an allowlist before they
// ever reach innerHTML. Anything not on the list (script/style/iframe/event
// handlers/javascript: URLs) is dropped rather than escaped, so a hostile
// posting can't execute in the page.

const ALLOWED_TAGS = new Set([
  "P", "BR", "B", "STRONG", "I", "EM", "U", "UL", "OL", "LI",
  "H1", "H2", "H3", "H4", "H5", "H6", "A", "DIV", "SPAN", "BLOCKQUOTE", "HR", "CODE", "PRE",
]);

function isSafeHref(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  return trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("mailto:");
}

function clean(node: Element): void {
  for (const child of Array.from(node.children)) {
    if (!ALLOWED_TAGS.has(child.tagName)) {
      // Keep the readable text, discard the disallowed element itself.
      child.replaceWith(...Array.from(child.childNodes));
      continue;
    }

    for (const attr of Array.from(child.attributes)) {
      const isSafeLink = child.tagName === "A" && attr.name === "href" && isSafeHref(attr.value);
      if (!isSafeLink) child.removeAttribute(attr.name);
    }

    if (child.tagName === "A") {
      child.setAttribute("target", "_blank");
      child.setAttribute("rel", "noreferrer noopener");
    }

    clean(child);
  }
}

/** Some feeds double-escape their HTML (`&lt;p&gt;`); unescape once so it renders. */
function decodeIfEscaped(html: string): string {
  if (!/&lt;\/?[a-z]/i.test(html)) return html;
  const textarea = document.createElement("textarea");
  textarea.innerHTML = html;
  return textarea.value;
}

export function sanitizeHtml(html: string): string {
  const container = document.createElement("div");
  container.innerHTML = decodeIfEscaped(html);
  container.querySelectorAll("script, style, iframe, object, embed").forEach((el) => el.remove());
  clean(container);
  return container.innerHTML;
}

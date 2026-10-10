/** Copy text, falling back to `execCommand` where the Clipboard API is blocked. */
export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } finally {
      ta.remove();
    }
  }
}

/**
 * Copy `text` once `ready` resolves; rejects (copying nothing) if it rejects.
 * Hands the clipboard a pending `ClipboardItem` so the click's user
 * activation still covers the write — Safari drops it across an `await`.
 */
export async function copyTextAfter(ready: Promise<unknown>, text: string): Promise<void> {
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    const blob = ready.then(() => new Blob([text], { type: "text/plain" }));
    try {
      await navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]);
      return;
    } catch {
      // Rejected `ready`, or a browser without promise items: settle below.
    }
  }
  await ready;
  await copyText(text);
}

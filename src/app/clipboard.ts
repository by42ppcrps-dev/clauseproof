function writeWithLegacyClipboard(text: string): boolean {
  const previousFocus =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : undefined;
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.append(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  previousFocus?.focus();
  return copied;
}

export async function writeToClipboard(text: string): Promise<boolean> {
  const modernWrite = navigator.clipboard?.writeText.bind(navigator.clipboard);
  if (modernWrite) {
    const modernResult = await Promise.race([
      modernWrite(text).then(
        () => true,
        () => false,
      ),
      new Promise<boolean>((resolve) => {
        globalThis.setTimeout(() => resolve(false), 300);
      }),
    ]);
    if (modernResult) return true;
  }

  return writeWithLegacyClipboard(text);
}

/**
 * A provider reports its binary's whole version line, e.g.
 *
 *   soloist 1.3.7.423 build 1787221864 (20260820) (gb24005ef46) (linux/aarch64)
 *
 * That is the right thing for an API to return -- build id, commit and
 * platform all matter when diagnosing -- but rendered under a heading that
 * already names the player it repeats the name and buries the one part a user
 * acts on. Trim for display; the full string stays as the element's title.
 */
export const formatSetupVersion = (
  raw: string | null | undefined,
  /** Leading token the binary prints before its version, if any. */
  binaryName?: string,
): string | null => {
  if (raw == null) return null
  const text = String(raw).trim()
  if (!text) return null
  if (binaryName) {
    const escaped = binaryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const named = text.match(new RegExp(`^${escaped}\\s+(\\S+)`, 'i'))
    if (named) return named[1]
  }
  // Fall back to "<word> <version>" for a provider we know nothing about, and
  // to the raw string when even that does not fit -- an unparsed version is
  // still worth showing.
  const generic = text.match(/^[A-Za-z][\w-]*\s+(\d[\w.-]*)/)
  return generic ? generic[1] : text
}

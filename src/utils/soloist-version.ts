/**
 * The bridge reports the binary's whole `--version` line, e.g.
 *
 *   soloist 1.3.7.423 build 1787221864 (20260820) (gb24005ef46) (linux/aarch64)
 *
 * That is the right thing for an API to return -- the build id, commit and
 * platform all matter when diagnosing -- but rendered verbatim under a heading
 * that already says "Soloist" it doubles the word and buries the one part a
 * user acts on. Trim to the version for display; the full string stays
 * available as the element's title.
 */
export const formatSoloistVersion = (raw: string | null | undefined): string | null => {
  if (raw == null) return null
  const text = String(raw).trim()
  if (!text) return null
  // Leading "soloist " is what the binary prints; tolerate its absence rather
  // than returning nothing, since an unparsed string is still worth showing.
  const m = text.match(/^soloist\s+(\S+)/i)
  return m ? m[1] : text
}

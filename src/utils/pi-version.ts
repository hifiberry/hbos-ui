/**
 * configurator reports the board as a short model string rather than a number
 * (configurator/pimodel.py): "5", "4", "3B+", "3A+", "3B", "2", "0W", "02W",
 * "unknown" -- and, for the compute modules, "CM5" and "CM4".
 *
 * The CM prefix is why this is not a plain parseInt: `parseInt("CM5")` is NaN,
 * so a Compute Module 5 -- Pi 5 silicon -- read as older than a Pi 5 and lost
 * every feature gated on this. Strip the prefix, then take the leading digits;
 * a trailing suffix ("3B+", "02W") is not part of the generation.
 */
export const isPi5OrNewer = (version: string | null | undefined): boolean => {
  if (version == null) return false
  const generation = String(version).match(/^(?:CM)?(\d+)/i)
  return generation ? parseInt(generation[1], 10) >= 5 : false
}

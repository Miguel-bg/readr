export const GLOBAL_POPULAR_READS_THRESHOLD = 10

export function isGloballyPopular(reads: number | null | undefined) {
  return Number(reads || 0) >= GLOBAL_POPULAR_READS_THRESHOLD
}

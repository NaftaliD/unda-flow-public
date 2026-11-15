/** Soft hints for a slot (copied from the template into the lesson). Never hard validation. */
export type SlotHintSource = {
  hint: string | null
  isOptional: boolean
  minExercises: number | null
  isSkipped?: boolean
}

export type SlotHintInfo = {
  hint: string | null
  optional: boolean
  /** The slot usually has more exercises than it does now (shown as a gentle nudge). */
  belowMin: number | null
}

export function slotHintInfo(slot: SlotHintSource, itemCount: number): SlotHintInfo {
  const min = slot.minExercises
  return {
    hint: slot.hint?.trim() || null,
    optional: slot.isOptional,
    belowMin: !slot.isSkipped && min !== null && min > 1 && itemCount < min ? min : null,
  }
}

/** Turn a block name into a stable key: "My core work" -> "my_core_work". */
export function blockKeyFromName(name: string, existing: ReadonlySet<string>): string {
  const base =
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\p{L}\p{N}]+/gu, '_')
      .replace(/^_+|_+$/g, '') || 'block'
  if (!existing.has(base)) return base
  let n = 2
  while (existing.has(`${base}_${n}`)) n += 1
  return `${base}_${n}`
}

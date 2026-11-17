/** What the teach view needs from a class: its blocks in order, with their exercises in order. */
export type TeachSlot = {
  id: string
  label: string
  isSkipped: boolean
  notes: string | null
  hint: string | null
  items: readonly {
    id: string
    exerciseId: string
    reps: number | null
    durationSec: number | null
    springs: string | null
    notes: string | null
  }[]
}

export type TeachStep = {
  itemId: string
  slotId: string
  exerciseId: string
  blockLabel: string
  /** 0-based position among the blocks that are taught (skipped and empty blocks do not count). */
  blockIndex: number
  blockCount: number
  /** 0-based position of this exercise within its block. */
  indexInBlock: number
  countInBlock: number
  reps: number | null
  durationSec: number | null
  springs: string | null
  notes: string | null
  /** The block's notes and hint, shown with its first exercise only. */
  blockNotes: string | null
  blockHint: string | null
}

/** The class as one flat list of steps, one exercise each, skipping skipped and empty blocks. */
export function teachSteps(slots: readonly TeachSlot[]): TeachStep[] {
  const taught = slots.filter((s) => !s.isSkipped && s.items.length > 0)
  return taught.flatMap((slot, blockIndex) =>
    slot.items.map((item, indexInBlock) => ({
      itemId: item.id,
      slotId: slot.id,
      exerciseId: item.exerciseId,
      blockLabel: slot.label,
      blockIndex,
      blockCount: taught.length,
      indexInBlock,
      countInBlock: slot.items.length,
      reps: item.reps,
      durationSec: item.durationSec,
      springs: item.springs,
      notes: item.notes,
      blockNotes: indexInBlock === 0 ? slot.notes : null,
      blockHint: indexInBlock === 0 ? slot.hint : null,
    })),
  )
}

/** Index of the first step of each taught block, for jumping between blocks. */
export function blockStarts(
  steps: readonly TeachStep[],
): { slotId: string; label: string; index: number }[] {
  const out: { slotId: string; label: string; index: number }[] = []
  steps.forEach((s, index) => {
    if (s.indexInBlock === 0) out.push({ slotId: s.slotId, label: s.blockLabel, index })
  })
  return out
}

/** The step to move to: `delta` steps away, kept inside the class (index === length is "finished"). */
export function moveStep(index: number, delta: number, count: number): number {
  return Math.min(Math.max(index + delta, 0), count)
}

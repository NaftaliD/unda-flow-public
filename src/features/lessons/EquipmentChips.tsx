import { Chip } from '@/components/ui/chip'
import type { Equipment } from '@/data/queries/library'

/** Multi-select of the equipment available for a lesson. */
export function EquipmentChips({
  equipment,
  selected,
  onChange,
  label,
}: {
  equipment: readonly Equipment[]
  selected: readonly string[]
  onChange: (ids: string[]) => void
  label: string
}) {
  const set = new Set(selected)
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {equipment.map((e) => (
        <Chip
          key={e.id}
          selected={set.has(e.id)}
          onClick={() =>
            onChange(set.has(e.id) ? selected.filter((id) => id !== e.id) : [...selected, e.id])
          }
        >
          {e.name}
        </Chip>
      ))}
    </div>
  )
}

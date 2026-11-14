import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import type { Equipment } from '@/data/queries/library'

type Props = {
  equipment: readonly Equipment[]
  value: string[][]
  onChange: (next: string[][]) => void
  hasEmptyGroupError?: boolean
}

/** Edits "AND of ORs": each group needs at least one of its chosen items. */
export function RequirementsEditor({ equipment, value, onChange, hasEmptyGroupError }: Props) {
  const { t } = useTranslation()

  function toggle(groupIndex: number, equipmentId: string) {
    onChange(
      value.map((group, i) => {
        if (i !== groupIndex) return group
        return group.includes(equipmentId)
          ? group.filter((id) => id !== equipmentId)
          : [...group, equipmentId]
      }),
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{t('exercise.equipmentHelp')}</p>
      {value.length === 0 && <p className="text-sm font-medium">{t('library.noEquipment')}</p>}
      {value.map((group, i) => (
        <fieldset key={i} className="flex flex-col gap-2 rounded-2xl border border-border p-3">
          <legend className="px-1 text-sm font-semibold">
            {t('exercise.requirementN', { n: i + 1 })}
          </legend>
          <div className="flex flex-wrap gap-2">
            {equipment.map((e) => (
              <Chip key={e.id} selected={group.includes(e.id)} onClick={() => toggle(i, e.id)}>
                {e.name}
              </Chip>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => onChange(value.filter((_, idx) => idx !== i))}
          >
            {t('exercise.removeRequirement')}
          </Button>
        </fieldset>
      ))}
      {hasEmptyGroupError && (
        <p role="alert" className="text-sm font-medium">
          {t('exercise.errors.emptyGroup')}
        </p>
      )}
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => onChange([...value, []])}
      >
        {t('exercise.addRequirement')}
      </Button>
    </div>
  )
}

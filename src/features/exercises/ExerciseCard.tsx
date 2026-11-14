import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import type { Block, Equipment, Exercise } from '@/data/queries/library'
import { describeBonus, describeRequirements } from '@/domain/library'

type Props = {
  exercise: Exercise
  blocks: readonly Block[]
  equipment: readonly Equipment[]
  userId: string | undefined
  isAdmin: boolean
  /** Buttons shown under the summary (review queue). */
  actions?: ReactNode
}

export function ExerciseCard({ exercise, blocks, equipment, userId, isAdmin, actions }: Props) {
  const { t } = useTranslation()
  const blockName = blocks.find((b) => b.id === exercise.blockId)?.name
  const equipmentText =
    describeRequirements(
      exercise.requirements,
      (id) => equipment.find((e) => e.id === id)?.name ?? '?',
    ) || t('library.noEquipment')
  const bonusText = describeBonus(
    exercise.requirements,
    (id) => equipment.find((e) => e.id === id)?.name ?? '?',
  )
  const mine = exercise.ownerId !== null && exercise.ownerId === userId

  return (
    <li className="flex flex-col gap-3 rounded-3xl bg-card p-4 text-card-foreground">
      <Link
        to="/exercises/$id"
        params={{ id: exercise.id }}
        className="flex flex-col gap-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      >
        <span className="text-base font-semibold">{exercise.name}</span>
        <span className="text-sm text-muted-foreground">{equipmentText}</span>
        {bonusText && (
          <span className="text-sm text-muted-foreground">
            {t('library.bonus', { items: bonusText })}
          </span>
        )}
      </Link>
      <div className="flex flex-wrap gap-1.5">
        {blockName && <Badge tone="outline">{blockName}</Badge>}
        <Badge>{t(`levels.${exercise.level}`)}</Badge>
        {mine && <Badge tone="outline">{t('library.mine')}</Badge>}
        {exercise.isArchived && <Badge tone="outline">{t('library.archived')}</Badge>}
        {isAdmin && exercise.reviewStatus === 'needs_review' && (
          <Badge tone="accent">{t('library.needsReview')}</Badge>
        )}
      </div>
      {actions}
    </li>
  )
}

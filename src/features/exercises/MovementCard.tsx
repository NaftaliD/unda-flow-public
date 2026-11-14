import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import type { Block, Equipment, Exercise } from '@/data/queries/library'
import type { MovementGroup } from '@/domain/library'
import { describeBonus, describeRequirements } from '@/domain/library'
import { ExerciseCard } from './ExerciseCard'

type Props = {
  group: MovementGroup<Exercise>
  blocks: readonly Block[]
  equipment: readonly Equipment[]
  userId: string | undefined
  isAdmin: boolean
}

/**
 * One library entry per movement. A movement done on several apparatus lists each version as a
 * link; a movement with a single version looks like a normal exercise card.
 */
export function MovementCard({ group, blocks, equipment, userId, isAdmin }: Props) {
  const { t } = useTranslation()
  const [only] = group.variants
  if (group.variants.length === 1 && only) {
    return (
      <ExerciseCard
        exercise={only}
        blocks={blocks}
        equipment={equipment}
        userId={userId}
        isAdmin={isAdmin}
      />
    )
  }

  const nameOf = (id: string) => equipment.find((e) => e.id === id)?.name ?? '?'
  const blockName = blocks.find((b) => b.id === group.variants[0]?.blockId)?.name
  const anyMine = group.variants.some((v) => v.ownerId !== null && v.ownerId === userId)
  const anyArchived = group.variants.some((v) => v.isArchived)
  const anyReview = isAdmin && group.variants.some((v) => v.reviewStatus === 'needs_review')

  return (
    <li className="flex flex-col gap-3 rounded-3xl bg-card p-4 text-card-foreground">
      <div className="flex flex-col gap-0.5">
        <span className="text-base font-semibold">{group.name}</span>
        <span className="text-sm text-muted-foreground">
          {t('library.versions', { count: group.variants.length })}
        </span>
      </div>
      <ul className="flex flex-col gap-1">
        {group.variants.map((v) => {
          const bonus = describeBonus(v.requirements, nameOf)
          return (
            <li key={v.id}>
              <Link
                to="/exercises/$id"
                params={{ id: v.id }}
                className="flex flex-wrap items-baseline gap-x-2 rounded-2xl border border-border px-3 py-2 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="font-semibold">
                  {describeRequirements(v.requirements, nameOf) || t('library.noEquipment')}
                </span>
                <span className="text-muted-foreground">
                  {t(`levels.${v.level}`)}
                  {bonus && ` · ${t('library.bonus', { items: bonus })}`}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
      <div className="flex flex-wrap gap-1.5">
        {blockName && <Badge tone="outline">{blockName}</Badge>}
        {anyMine && <Badge tone="outline">{t('library.mine')}</Badge>}
        {anyArchived && <Badge tone="outline">{t('library.archived')}</Badge>}
        {anyReview && <Badge tone="accent">{t('library.needsReview')}</Badge>}
      </div>
    </li>
  )
}

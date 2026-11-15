import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import type { Equipment, Exercise } from '@/data/queries/library'
import type { Series } from '@/data/queries/series'
import { seriesAvailability } from '@/domain/series'

type Props = {
  open: boolean
  onClose: () => void
  blockName: string
  /** Series for this block. */
  series: readonly Series[]
  exerciseById: ReadonlyMap<string, Exercise>
  equipment: readonly Equipment[]
  available: ReadonlySet<string>
  onPick: (series: Series) => void
}

/** "Add series" dialog: every series of the block; ones the equipment cannot support are greyed. */
export function SeriesPicker(props: Props) {
  const { t } = useTranslation()
  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={t('series.picker.title', { block: props.blockName })}
    >
      <Body {...props} />
    </Dialog>
  )
}

function Body({ onClose, blockName, series, exerciseById, equipment, available, onPick }: Props) {
  const { t } = useTranslation()
  const nameOf = (id: string) => equipment.find((e) => e.id === id)?.name ?? '?'
  return (
    <div className="flex max-h-[85dvh] flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold">{t('series.picker.title', { block: blockName })}</h2>
        <Button variant="outline" size="sm" onClick={onClose}>
          {t('lessons.picker.done')}
        </Button>
      </div>
      {series.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('series.picker.none')}</p>
      ) : (
        <ul className="flex flex-col gap-2 overflow-y-auto">
          {series.map((s) => {
            const a = seriesAvailability(s.exerciseIds, exerciseById, available)
            return (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={a.addable === 0}
                  onClick={() => {
                    onPick(s)
                    onClose()
                  }}
                  className={`flex w-full flex-col gap-1 rounded-2xl border border-border p-3 text-start hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 ${a.available ? '' : 'opacity-60'}`}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span dir="auto" className="font-semibold">
                      {s.name}
                    </span>
                    <Badge tone="outline">{t('series.exerciseCount', { count: a.addable })}</Badge>
                    {s.ownerId === null && <Badge tone="outline">{t('templates.shared')}</Badge>}
                  </span>
                  {!a.available && (
                    <span className="text-sm font-medium">
                      {t('lessons.picker.missing', {
                        items: a.missing.map((g) => g.map(nameOf).join(' / ')).join(', '),
                      })}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

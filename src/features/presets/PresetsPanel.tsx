import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDeletePreset, useSavePreset } from '@/data/mutations/presets'
import { useEquipment } from '@/data/queries/library'
import { usePresets } from '@/data/queries/presets'

/** Manage saved equipment presets: rename or delete. New ones are saved from a lesson. */
export function PresetsPanel() {
  const { t } = useTranslation()
  const presets = usePresets()
  const equipment = useEquipment()
  const save = useSavePreset()
  const remove = useDeletePreset()
  const list = presets.data ?? []
  // Show a preset's equipment in the same order as everywhere else (apparatus, then props),
  // not in whatever order the database returned it.
  const namesOf = (ids: readonly string[]) =>
    (equipment.data ?? []).filter((e) => ids.includes(e.id)).map((e) => e.name)

  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-card p-4 text-card-foreground">
      <h2 className="text-lg font-semibold">{t('presets.title')}</h2>
      <p className="text-sm text-muted-foreground">{t('presets.intro')}</p>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('presets.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((p) => (
            <li key={p.id} className="flex flex-col gap-2 rounded-2xl border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  key={p.name}
                  dir="auto"
                  aria-label={t('presets.rename', { name: p.name })}
                  className="w-auto min-w-44 flex-1"
                  defaultValue={p.name}
                  onBlur={(e) => {
                    const n = e.target.value.trim()
                    if (n && n !== p.name) {
                      save.mutate({ id: p.id, name: n, equipmentIds: p.equipmentIds })
                    } else {
                      e.target.value = p.name
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={t('presets.delete', { name: p.name })}
                  onClick={() => {
                    if (window.confirm(t('presets.confirmDelete', { name: p.name })))
                      remove.mutate(p.id)
                  }}
                >
                  {t('templates.delete')}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {namesOf(p.equipmentIds).join(', ') || t('presets.noEquipment')}
              </p>
            </li>
          ))}
        </ul>
      )}
      {save.isError && (
        <p role="alert" className="text-sm font-medium">
          {t('presets.saveFailed')}
        </p>
      )}
    </div>
  )
}

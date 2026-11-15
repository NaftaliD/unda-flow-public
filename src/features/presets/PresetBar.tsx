import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useSavePreset } from '@/data/mutations/presets'
import { usePresets } from '@/data/queries/presets'

/**
 * Load a saved equipment preset into the current selection, or save the current selection as a
 * preset. Loading replaces the selection; saving under an existing name updates that preset.
 */
export function PresetBar({
  selected,
  onLoad,
}: {
  selected: readonly string[]
  onLoad: (equipmentIds: string[]) => void
}) {
  const { t } = useTranslation()
  const presets = usePresets()
  const save = useSavePreset()
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')

  const list = presets.data ?? []

  async function onSave() {
    const n = name.trim()
    if (!n) return
    try {
      await save.mutateAsync({ name: n, equipmentIds: [...selected] })
      toast.success(t('presets.saved', { name: n }))
      setSaving(false)
      setName('')
    } catch {
      toast.error(t('presets.saveFailed'))
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {list.length > 0 && (
          <Select
            aria-label={t('presets.load')}
            className="w-auto min-w-44"
            value=""
            onChange={(e) => {
              const p = list.find((x) => x.id === e.target.value)
              if (p) onLoad(p.equipmentIds)
            }}
          >
            <option value="">{t('presets.load')}</option>
            {list.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        )}
        {!saving && (
          <Button
            variant="outline"
            size="sm"
            disabled={selected.length === 0}
            onClick={() => setSaving(true)}
          >
            {t('presets.saveAs')}
          </Button>
        )}
      </div>
      {saving && (
        // Not a <form>: this bar sits inside the lesson form, and forms cannot nest.
        <div className="flex flex-wrap items-center gap-2">
          <Input
            autoFocus
            dir="auto"
            aria-label={t('presets.name')}
            placeholder={t('presets.namePlaceholder')}
            className="w-auto min-w-44"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void onSave()
              }
            }}
          />
          <Button size="sm" disabled={save.isPending || !name.trim()} onClick={() => void onSave()}>
            {t('presets.save')}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setSaving(false)}>
            {t('presets.cancel')}
          </Button>
        </div>
      )}
    </div>
  )
}

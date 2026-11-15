import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import type { Block } from '@/data/queries/library'

/** Pick a block type and a label, then append it to the lesson. */
export function AddBlockDialog({
  open,
  onClose,
  blocks,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  blocks: readonly Block[]
  onAdd: (blockId: string, label: string) => void
}) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onClose={onClose} title={t('lessons.builder.addBlockTitle')}>
      <AddBlockForm blocks={blocks} onClose={onClose} onAdd={onAdd} />
    </Dialog>
  )
}

function AddBlockForm({
  blocks,
  onClose,
  onAdd,
}: {
  blocks: readonly Block[]
  onClose: () => void
  onAdd: (blockId: string, label: string) => void
}) {
  const { t } = useTranslation()
  const [blockId, setBlockId] = useState(blocks[0]?.id ?? '')
  const [label, setLabel] = useState('')
  const block = blocks.find((b) => b.id === blockId)
  const finalLabel = label.trim() || block?.name || ''

  return (
    <form
      className="flex flex-col gap-4 p-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (!blockId || !finalLabel) return
        onAdd(blockId, finalLabel)
        onClose()
      }}
    >
      <h2 className="text-lg font-semibold">{t('lessons.builder.addBlockTitle')}</h2>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="add-block-type">{t('lessons.builder.blockType')}</Label>
        <Select id="add-block-type" value={blockId} onChange={(e) => setBlockId(e.target.value)}>
          {blocks.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="add-block-label">{t('lessons.builder.blockLabel')}</Label>
        <Input
          id="add-block-label"
          value={label}
          placeholder={block?.name}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          {t('lessons.builder.cancel')}
        </Button>
        <Button type="submit" disabled={!blockId}>
          {t('lessons.builder.blockAdd')}
        </Button>
      </div>
    </form>
  )
}

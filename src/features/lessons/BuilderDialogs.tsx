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

/** Name a private template to create from the lesson's blocks. */
export function SaveTemplateDialog({
  open,
  onClose,
  defaultName,
  pending,
  onSave,
}: {
  open: boolean
  onClose: () => void
  defaultName: string
  pending: boolean
  onSave: (name: string) => void
}) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onClose={onClose} title={t('lessons.builder.saveAsTemplate')}>
      <SaveTemplateForm
        defaultName={defaultName}
        pending={pending}
        onClose={onClose}
        onSave={onSave}
      />
    </Dialog>
  )
}

function SaveTemplateForm({
  defaultName,
  pending,
  onClose,
  onSave,
}: {
  defaultName: string
  pending: boolean
  onClose: () => void
  onSave: (name: string) => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(defaultName)
  return (
    <form
      className="flex flex-col gap-4 p-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (name.trim()) onSave(name.trim())
      }}
    >
      <h2 className="text-lg font-semibold">{t('lessons.builder.saveAsTemplate')}</h2>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="template-name">{t('lessons.builder.templateName')}</Label>
        <Input id="template-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          {t('lessons.builder.cancel')}
        </Button>
        <Button type="submit" disabled={pending || !name.trim()}>
          {t('lessons.builder.save')}
        </Button>
      </div>
    </form>
  )
}

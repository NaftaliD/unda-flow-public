import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDeleteBlock, useSaveBlock } from '@/data/mutations/blocks'
import { useBlocks } from '@/data/queries/library'
import { useCurrentUser } from '@/data/queries/profile'
import { blockKeyFromName } from '@/domain/template'

/** The user's own block types (shared blocks are managed by admins elsewhere). */
export function BlocksPanel() {
  const { t } = useTranslation()
  const { userId } = useCurrentUser()
  const blocks = useBlocks()
  const save = useSaveBlock()
  const remove = useDeleteBlock()
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const all = blocks.data ?? []
  const mine = all.filter((b) => b.ownerId !== null && b.ownerId === userId)
  const methodId = all[0]?.methodId

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !methodId || !userId) return
    setMessage(null)
    try {
      await save.mutateAsync({
        ownerId: userId,
        methodId,
        key: blockKeyFromName(name, new Set(mine.map((b) => b.key))),
        name: name.trim(),
        goal: goal.trim(),
      })
      setName('')
      setGoal('')
    } catch {
      setMessage(t('templates.blocks.saveFailed'))
    }
  }

  async function onDelete(id: string) {
    setMessage(null)
    try {
      await remove.mutateAsync(id)
    } catch (err) {
      const code = (err as { code?: string }).code
      setMessage(code === '23503' ? t('templates.blocks.inUse') : t('templates.blocks.saveFailed'))
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-card p-4 text-card-foreground">
      <h2 className="text-lg font-semibold">{t('templates.blocks.title')}</h2>
      <p className="text-sm text-muted-foreground">{t('templates.blocks.intro')}</p>
      {mine.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('templates.blocks.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {mine.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-2">
              <span dir="auto" className="font-semibold">
                {b.name}
              </span>
              <Button variant="outline" size="sm" onClick={() => void onDelete(b.id)}>
                {t('templates.blocks.delete')}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={(e) => void onSubmit(e)} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="block-name">{t('templates.blocks.name')}</Label>
          <Input id="block-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="block-goal">{t('templates.blocks.goal')}</Label>
          <Input id="block-goal" value={goal} onChange={(e) => setGoal(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={save.isPending || !name.trim()}>
            {t('templates.blocks.add')}
          </Button>
        </div>
      </form>
      {message && (
        <p role="alert" className="text-sm font-medium">
          {message}
        </p>
      )}
    </div>
  )
}

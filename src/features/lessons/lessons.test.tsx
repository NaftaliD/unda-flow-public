import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Block, Equipment, Exercise } from '@/data/queries/library'
import type { Lesson, LessonSummary } from '@/data/queries/lessons'
import type { Template } from '@/data/queries/templates'

const state = vi.hoisted(() => ({
  lessons: [] as unknown[],
  lesson: null as unknown,
  exercises: [] as unknown[],
  templates: [] as unknown[],
  create: vi.fn(),
  addItem: vi.fn(),
  deleteSlot: vi.fn(),
  updateSlot: vi.fn(),
  stub: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false, isError: false }),
}))

vi.mock('@/data/auth', () => ({
  getSession: () => Promise.resolve({ user: { id: 'u1' } }),
  useSession: () => ({ user: { id: 'u1' } }),
  signInWithMagicLink: vi.fn(),
  signOut: vi.fn(),
}))
vi.mock('@/data/queries/profile', () => ({
  useProfile: () => ({ data: undefined }),
  useCurrentUser: () => ({ userId: 'u1', isAdmin: false }),
  fetchIsAdmin: () => Promise.resolve(false),
}))

const blocks: Block[] = [
  {
    id: 'b-warm',
    ownerId: null,
    methodId: 'm1',
    key: 'warm_up',
    name: 'Warm-up',
    goal: null,
    position: 1,
  },
  {
    id: 'b-arm',
    ownerId: null,
    methodId: 'm1',
    key: 'arm_work',
    name: 'Arm work',
    goal: null,
    position: 10,
  },
]
const equipment: Equipment[] = [
  { id: 'e-ref', key: 'reformer', name: 'Reformer', kind: 'apparatus' },
  { id: 'e-ring', key: 'ring', name: 'Ring', kind: 'prop' },
]
const ex = (over: Partial<Exercise> & { id: string; name: string }): Exercise => ({
  ownerId: null,
  blockId: 'b-warm',
  level: 'fundamental',
  isArchived: false,
  reviewStatus: 'verified',
  requirements: [],
  description: null,
  cues: null,
  defaultReps: 8,
  defaultDurationSec: 60,
  defaultSprings: '1 red',
  ...over,
})

vi.mock('@/data/queries/library', () => ({
  libraryKeys: {},
  useBlocks: () => ({ data: blocks, isPending: false }),
  useEquipment: () => ({ data: equipment, isPending: false }),
  useExercises: () => ({ data: state.exercises, isPending: false, isError: false }),
}))
vi.mock('@/data/queries/lessons', () => ({
  lessonKeys: {},
  useLessons: () => ({ data: state.lessons, isPending: false }),
  useLesson: () => ({ data: state.lesson, isPending: false }),
}))
vi.mock('@/data/mutations/lessons', () => ({
  useCreateLesson: () => ({ ...state.stub(), mutateAsync: state.create }),
  useDuplicateLesson: state.stub,
  useDeleteLesson: state.stub,
  useUpdateLesson: state.stub,
  useSetLessonEquipment: state.stub,
  useUpdateSlot: () => ({ ...state.stub(), mutate: state.updateSlot }),
  useReorderSlots: state.stub,
  useReorderItems: state.stub,
  useAddItem: () => ({ ...state.stub(), mutate: state.addItem }),
  useUpdateItem: state.stub,
  useMoveItem: state.stub,
  useDeleteItem: state.stub,
  useAddSlot: state.stub,
  useDeleteSlot: () => ({ ...state.stub(), mutate: state.deleteSlot }),
}))
vi.mock('@/data/queries/templates', () => ({
  templateKeys: {},
  useTemplates: () => ({ data: state.templates, isPending: false }),
}))
vi.mock('@/data/mutations/templates', () => ({
  useSaveLessonAsTemplate: state.stub,
  useDuplicateTemplate: state.stub,
  useDeleteTemplate: state.stub,
  useSaveTemplate: state.stub,
}))
vi.mock('@/data/mutations/blocks', () => ({
  useSaveBlock: state.stub,
  useDeleteBlock: state.stub,
}))

import i18n from '@/app/i18n'
import { Providers } from '@/app/providers'
import { createAppRouter } from '@/app/router'

function renderAt(path: string) {
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }))
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
  return router
}

const summary = (over: Partial<LessonSummary> & { id: string; title: string }): LessonSummary => ({
  lessonDate: '2026-11-16',
  level: 'fundamental',
  status: 'draft',
  targetDurationMin: null,
  updatedAt: '2026-11-16T10:00:00Z',
  ...over,
})

const item = (id: string, slotId: string, exerciseId: string, durationSec: number | null) => ({
  id,
  slotId,
  exerciseId,
  position: 0,
  reps: null,
  durationSec,
  springs: null,
  notes: null,
})

const tpl = (over: Partial<Template> & { id: string; name: string }): Template => ({
  ownerId: null,
  methodId: 'm1',
  description: null,
  targetDurationMin: null,
  slots: [],
  ...over,
})

function makeLesson(): Lesson {
  return {
    ...summary({ id: 'l1', title: 'Monday class', level: 'intermediate', targetDurationMin: 55 }),
    methodId: 'm1',
    notes: null,
    equipmentIds: ['e-ref'],
    slots: [
      {
        id: 's1',
        blockId: 'b-warm',
        position: 0,
        label: 'Warm-up',
        isSkipped: false,
        notes: null,
        hint: 'Use a series if you can.',
        isOptional: true,
        minExercises: 3,
        items: [
          { ...item('i1', 's1', 'x-curl', 120), position: 0 },
          { ...item('i2', 's1', 'x-ring', null), position: 1 },
        ],
      },
      {
        id: 's2',
        blockId: 'b-arm',
        position: 1,
        label: 'Arm work',
        isSkipped: true,
        notes: null,
        hint: null,
        isOptional: false,
        minExercises: null,
        items: [item('i3', 's2', 'x-arm', 600)],
      },
    ],
  }
}

describe('lessons', () => {
  beforeEach(async () => {
    state.addItem.mockReset()
    state.deleteSlot.mockReset()
    state.create.mockReset().mockResolvedValue('new1')
    state.templates = [
      tpl({ id: 't-own', ownerId: 'u1', name: 'My short class' }),
      tpl({ id: 't-shared', ownerId: null, name: 'Apparatus class' }),
    ]
    state.updateSlot.mockReset()
    state.lessons = []
    state.lesson = makeLesson()
    state.exercises = [
      ex({ id: 'x-curl', name: 'Pelvic Curl' }),
      ex({
        id: 'x-ring',
        name: 'Ring Squeeze',
        requirements: [{ equipmentId: 'e-ring', altGroup: 0 }],
      }),
      ex({ id: 'x-arm', name: 'Arm Circles', blockId: 'b-arm' }),
      ex({ id: 'x-roll', name: 'Roll Up' }),
      ex({
        id: 'x-rr',
        name: 'Ring Roll',
        requirements: [{ equipmentId: 'e-ring', altGroup: 0 }],
      }),
    ]
    await i18n.changeLanguage('en')
  })

  it('shows the empty state when there are no lessons', async () => {
    renderAt('/')
    expect(await screen.findByText('No lessons yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'New lesson' })).toBeInTheDocument()
  })

  it('filters the list by status tab', async () => {
    state.lessons = [
      summary({ id: 'a', title: 'Draft one' }),
      summary({ id: 'b', title: 'Ready one', status: 'ready' }),
      summary({ id: 'c', title: 'Taught one', status: 'taught' }),
    ]
    renderAt('/')
    expect(await screen.findByText('Draft one')).toBeInTheDocument()
    expect(screen.queryByText('Ready one')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Ready/ }))
    expect(screen.getByText('Ready one')).toBeInTheDocument()
    expect(screen.queryByText('Draft one')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Taught/ }))
    expect(screen.getByText('Taught one')).toBeInTheDocument()
  })

  it('builder warns about an item whose equipment is not ticked, and keeps it', async () => {
    renderAt('/lessons/l1')
    expect(await screen.findByText('Pelvic Curl')).toBeInTheDocument()
    const ring = screen.getByText('Ring Squeeze').closest('li')!
    expect(within(ring).getByText('Needs equipment that is not ticked')).toBeInTheDocument()
    const curl = screen.getByText('Pelvic Curl').closest('li')!
    expect(within(curl).queryByText('Needs equipment that is not ticked')).not.toBeInTheDocument()
  })

  it('builder totals the planned time, ignoring skipped blocks', async () => {
    renderAt('/lessons/l1')
    // Pelvic Curl 120 s + Ring Squeeze's 60 s default = 3m; the skipped block's 600 s is left out
    expect(await screen.findByText(/Planned: 3m of 55 min/)).toBeInTheDocument()
  })

  it('picker hides unavailable exercises by default and can show them with what is missing', async () => {
    renderAt('/lessons/l1')
    await screen.findByText('Pelvic Curl')
    const warmCard = screen.getByText('Warm-up', { selector: 'h3' }).closest('li')!
    await userEvent.click(within(warmCard).getByRole('button', { name: 'Add exercise' }))

    const dialog = await screen.findByRole('dialog', { name: 'Add to Warm-up' }, { timeout: 2000 })
    expect(within(dialog).getByText('Roll Up')).toBeInTheDocument()
    expect(within(dialog).queryByText('Ring Roll')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('Arm Circles')).not.toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Show unavailable' }))
    expect(within(dialog).getByText('Ring Roll')).toBeInTheDocument()
    expect(within(dialog).getAllByText('Missing: Ring').length).toBeGreaterThan(0)

    await userEvent.click(within(dialog).getByText('Roll Up'))
    expect(state.addItem).toHaveBeenCalledWith({
      id: expect.any(String),
      slotId: 's1',
      exerciseId: 'x-roll',
      reps: 8,
      durationSec: 60,
      springs: '1 red',
    })
  })

  it('can skip a block', async () => {
    renderAt('/lessons/l1')
    await screen.findByText('Pelvic Curl')
    const warmCard = screen.getByText('Warm-up', { selector: 'h3' }).closest('li')!
    await userEvent.click(within(warmCard).getByRole('button', { name: 'Skip block' }))
    expect(state.updateSlot).toHaveBeenCalledWith({ slotId: 's1', isSkipped: true })
  })

  it('shows the template hints on a block, with the optional badge and the usual minimum', async () => {
    renderAt('/lessons/l1')
    await screen.findByText('Pelvic Curl')
    const warmCard = screen.getByText('Warm-up', { selector: 'h3' }).closest('li')!
    expect(within(warmCard).getByText('Use a series if you can.')).toBeInTheDocument()
    expect(within(warmCard).getByText('Optional')).toBeInTheDocument()
    expect(within(warmCard).getByText('Usually 3+ exercises')).toBeInTheDocument()
  })

  it('removes a block, asking first when it has exercises', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderAt('/lessons/l1')
    await screen.findByText('Pelvic Curl')
    const warmCard = screen.getByText('Warm-up', { selector: 'h3' }).closest('li')!
    await userEvent.click(within(warmCard).getByRole('button', { name: 'Remove block Warm-up' }))
    expect(confirm).toHaveBeenCalled()
    expect(state.deleteSlot).toHaveBeenCalledWith('s1')
    confirm.mockRestore()
  })

  it('new lesson defaults to the shared template', async () => {
    renderAt('/lessons/new')
    const select = await screen.findByLabelText('Template')
    expect(select).toHaveValue('t-shared')

    await userEvent.type(screen.getByLabelText('Title'), 'Tuesday')
    await userEvent.click(screen.getByRole('button', { name: 'Create lesson' }))
    expect(state.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ title: 'Tuesday', templateId: 't-shared', methodId: 'm1' }),
    )
  })

  it('new lesson can start blank', async () => {
    renderAt('/lessons/new')
    await userEvent.selectOptions(await screen.findByLabelText('Template'), '')
    await userEvent.type(screen.getByLabelText('Title'), 'Blank one')
    await userEvent.click(screen.getByRole('button', { name: 'Create lesson' }))
    expect(state.create).toHaveBeenLastCalledWith(expect.objectContaining({ templateId: null }))
  })

  it('templates page: a normal user can view and duplicate a shared template, not edit it', async () => {
    renderAt('/templates')
    const shared = (await screen.findByText('Apparatus class')).closest('li')!
    expect(within(shared).getByRole('link', { name: 'View' })).toBeInTheDocument()
    expect(within(shared).getByRole('button', { name: 'Duplicate as mine' })).toBeInTheDocument()
    expect(within(shared).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()

    const own = screen.getByText('My short class').closest('li')!
    expect(within(own).getByRole('link', { name: 'Edit' })).toBeInTheDocument()
    expect(within(own).getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('print view leaves out skipped blocks', async () => {
    renderAt('/lessons/l1/print')
    expect(await screen.findByText('Pelvic Curl')).toBeInTheDocument()
    expect(screen.getByText('Warm-up')).toBeInTheDocument()
    expect(screen.queryByText('Arm work')).not.toBeInTheDocument()
    expect(screen.queryByText('Arm Circles')).not.toBeInTheDocument()
    expect(screen.getByText(/Reformer/)).toBeInTheDocument()
  })
})

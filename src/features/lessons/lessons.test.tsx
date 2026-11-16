import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Block, Equipment, Exercise } from '@/data/queries/library'
import type { Lesson, LessonSummary } from '@/data/queries/lessons'
import type { Series } from '@/data/queries/series'

const state = vi.hoisted(() => ({
  lessons: [] as unknown[],
  lesson: null as unknown,
  exercises: [] as unknown[],
  series: [] as unknown[],
  presets: [] as unknown[],
  savePreset: vi.fn(),
  addSeries: vi.fn(),
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
    defaultDurationSec: 90,
  },
  {
    id: 'b-arm',
    ownerId: null,
    methodId: 'm1',
    key: 'arm_work',
    name: 'Arm work',
    goal: null,
    position: 10,
    defaultDurationSec: 90,
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
  usePublishClass: state.stub,
  useDeleteSlot: () => ({ ...state.stub(), mutate: state.deleteSlot }),
}))
vi.mock('@/data/queries/series', () => ({
  seriesKeys: {},
  useSeries: () => ({ data: state.series, isPending: false }),
}))
vi.mock('@/data/mutations/series', () => ({
  useAddSeriesToSlot: () => ({ ...state.stub(), mutate: state.addSeries }),
  useDuplicateSeries: state.stub,
  useDeleteSeries: state.stub,
  useSaveSeries: state.stub,
}))
vi.mock('@/data/queries/presets', () => ({
  presetKeys: {},
  usePresets: () => ({ data: state.presets, isPending: false }),
}))
vi.mock('@/data/mutations/presets', () => ({
  useSavePreset: () => ({ ...state.stub(), mutateAsync: state.savePreset }),
  useDeletePreset: state.stub,
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
  ownerId: 'u1',
  blockCount: 12,
  exerciseCount: 0,
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

function makeLesson(): Lesson {
  return {
    ...summary({ id: 'l1', title: 'Monday class', level: 'intermediate', targetDurationMin: 55 }),
    methodId: 'm1',
    notes: null,
    sourceLessonId: null,
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
    state.addSeries.mockReset()
    state.savePreset.mockReset().mockResolvedValue('p1')
    state.presets = [
      { id: 'p-studio', name: 'Studio', equipmentIds: ['e-ref', 'e-ring'] },
      { id: 'p-home', name: 'Home', equipmentIds: ['e-ring'] },
    ]
    state.series = [
      {
        id: 'sr-ok',
        ownerId: null,
        blockId: 'b-warm',
        name: 'Easy warm-up',
        exerciseIds: ['x-curl', 'x-roll'],
      },
      {
        id: 'sr-ring',
        ownerId: 'u1',
        blockId: 'b-warm',
        name: 'Ring warm-up',
        exerciseIds: ['x-curl', 'x-ring'],
      },
      {
        id: 'sr-arm',
        ownerId: null,
        blockId: 'b-arm',
        name: 'Arms sample',
        exerciseIds: ['x-arm'],
      },
    ] satisfies Series[]
    state.create.mockReset().mockResolvedValue('new1')
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
    expect(await screen.findByText('No classes yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'New class' })).toBeInTheDocument()
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

  it('builder shows the time left, ignoring skipped blocks', async () => {
    renderAt('/lessons/l1')
    // Pelvic Curl 120 s + Ring Squeeze's 60 s default = 3 min; the skipped block's 600 s is left out
    expect(await screen.findByText('3 of 55 min · 52 min left')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Class time' })).toHaveAttribute(
      'aria-valuenow',
      '3',
    )
    // The block shows its own minutes
    const warm = screen.getByText('Warm-up', { selector: 'h3' }).closest('li')!
    expect(within(warm).getByText(/2 exercises · 3 min/)).toBeInTheDocument()
  })

  it('builder says by how much the class is overbooked', async () => {
    const l = makeLesson()
    state.lesson = { ...l, targetDurationMin: 2 }
    renderAt('/lessons/l1')
    expect(await screen.findByText('3 of 2 min · overbooked by 1 min')).toBeInTheDocument()
  })

  it('builder only counts minutes planned when there is no class length', async () => {
    state.lesson = { ...makeLesson(), targetDurationMin: null }
    renderAt('/lessons/l1')
    expect(await screen.findByText(/3 min planned/)).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
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

  it('new class starts with a choice: example classes, your own, or blank', async () => {
    state.lessons = [
      summary({ id: 'ex1', ownerId: null, title: 'Apparatus class', targetDurationMin: 45 }),
      summary({ id: 'mine1', title: 'My Monday class' }),
    ]
    renderAt('/lessons/new')
    expect(await screen.findByRole('heading', { name: 'Example classes' })).toBeInTheDocument()
    const example = screen.getByText('Apparatus class').closest('li')!
    expect(within(example).getByText('Example')).toBeInTheDocument()
    expect(within(example).getByRole('link', { name: 'Preview' })).toBeInTheDocument()
    expect(within(example).getByRole('link', { name: 'Use this class' })).toHaveAttribute(
      'href',
      '/lessons/new?from=ex1',
    )
    const mine = screen.getByText('My Monday class').closest('li')!
    expect(within(mine).queryByRole('link', { name: 'Preview' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start blank' })).toHaveAttribute(
      'href',
      '/lessons/new?from=blank',
    )
  })

  it('the class list shows only your own classes, not the shared examples', async () => {
    state.lessons = [
      summary({ id: 'ex1', ownerId: null, title: 'Apparatus class' }),
      summary({ id: 'mine1', title: 'My Monday class', lessonDate: null }),
    ]
    renderAt('/')
    expect(await screen.findByText('My Monday class')).toBeInTheDocument()
    expect(screen.queryByText('Apparatus class')).not.toBeInTheDocument()
  })

  it('creating from an example keeps its name and sends what to copy', async () => {
    state.lesson = { ...makeLesson(), id: 'ex1', ownerId: null, title: 'Apparatus class' }
    renderAt('/lessons/new?from=ex1')
    const title = await screen.findByLabelText('Title')
    expect(title).toHaveValue('Apparatus class')
    expect(screen.getByLabelText('Class length (minutes)')).toHaveValue(55)

    await userEvent.click(screen.getByRole('button', { name: '45 min' }))
    expect(screen.getByLabelText('Class length (minutes)')).toHaveValue(45)
    await userEvent.click(screen.getByRole('button', { name: 'Create class' }))
    expect(state.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        fromLessonId: 'ex1',
        title: 'Apparatus class',
        targetDurationMin: 45,
        equipmentIds: ['e-ref'],
      }),
    )
  })

  it('creating from one of your own classes titles the copy', async () => {
    renderAt('/lessons/new?from=l1')
    expect(await screen.findByLabelText('Title')).toHaveValue('Monday class (copy)')
  })

  it('a blank class sends no source', async () => {
    renderAt('/lessons/new?from=blank')
    await userEvent.type(await screen.findByLabelText('Title'), 'Blank one')
    await userEvent.click(screen.getByRole('button', { name: 'Create class' }))
    expect(state.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ fromLessonId: null, methodId: 'm1', title: 'Blank one' }),
    )
  })

  it('a normal user sees an example class as a read-only preview', async () => {
    state.lesson = { ...makeLesson(), ownerId: null, title: 'Apparatus class' }
    renderAt('/lessons/l1')
    expect(await screen.findByRole('heading', { name: /Apparatus class/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Use this class' })).toHaveAttribute(
      'href',
      '/lessons/new?from=l1',
    )
    expect(screen.queryByRole('button', { name: 'Add exercise' })).not.toBeInTheDocument()
    expect(screen.getByText('Pelvic Curl')).toBeInTheDocument()
  })

  it("add series lists the block's series, greys one the equipment cannot support, and adds it", async () => {
    renderAt('/lessons/l1')
    await screen.findByText('Pelvic Curl')
    const warmCard = screen.getByText('Warm-up', { selector: 'h3' }).closest('li')!
    await userEvent.click(within(warmCard).getByRole('button', { name: 'Add series' }))

    const dialog = await screen.findByRole(
      'dialog',
      { name: 'Add a series to Warm-up' },
      { timeout: 2000 },
    )
    expect(within(dialog).getByText('Easy warm-up')).toBeInTheDocument()
    expect(within(dialog).queryByText('Arms sample')).not.toBeInTheDocument()
    const ring = within(dialog).getByText('Ring warm-up').closest('button')!
    expect(within(ring).getByText('Missing: Ring')).toBeInTheDocument()

    await userEvent.click(within(dialog).getByText('Easy warm-up'))
    expect(state.addSeries).toHaveBeenCalledWith({ slotId: 's1', seriesId: 'sr-ok' })
  })

  it('series page: a normal user can view and duplicate a shared series, not edit or delete it', async () => {
    renderAt('/series')
    const shared = (await screen.findByText('Easy warm-up')).closest('li')!
    expect(within(shared).getByRole('link', { name: 'View' })).toBeInTheDocument()
    expect(within(shared).getByRole('button', { name: 'Duplicate as mine' })).toBeInTheDocument()
    expect(within(shared).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
    const own = screen.getByText('Ring warm-up').closest('li')!
    expect(within(own).getByRole('link', { name: 'Edit' })).toBeInTheDocument()
  })

  it('loading a preset replaces the equipment selection', async () => {
    renderAt('/lessons/new?from=blank')
    const group = await screen.findByRole('group', { name: 'Equipment available today' })
    await userEvent.click(within(group).getByRole('button', { name: 'Reformer' }))
    expect(within(group).getByRole('button', { name: 'Reformer' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await userEvent.selectOptions(screen.getByLabelText('Load a preset'), 'Home')
    expect(within(group).getByRole('button', { name: 'Reformer' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(within(group).getByRole('button', { name: 'Ring' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('saves the current selection as a preset', async () => {
    renderAt('/lessons/new?from=blank')
    const group = await screen.findByRole('group', { name: 'Equipment available today' })
    expect(screen.getByRole('button', { name: 'Save as preset' })).toBeDisabled()
    await userEvent.click(within(group).getByRole('button', { name: 'Reformer' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save as preset' }))
    await userEvent.type(screen.getByLabelText('Preset name'), 'My studio')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(state.savePreset).toHaveBeenCalledWith({ name: 'My studio', equipmentIds: ['e-ref'] })
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

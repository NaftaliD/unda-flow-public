import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Block, Equipment, Exercise } from '@/data/queries/library'

const state = vi.hoisted(() => ({
  isAdmin: false,
  exercises: [] as unknown[],
}))

vi.mock('@/data/auth', () => ({
  getSession: () => Promise.resolve({ user: { id: 'u1' } }),
  useSession: () => ({ user: { id: 'u1' } }),
  signInWithMagicLink: vi.fn(),
  signOut: vi.fn(),
}))
vi.mock('@/data/queries/profile', () => ({
  useProfile: () => ({ data: undefined }),
  useCurrentUser: () => ({ userId: 'u1', isAdmin: state.isAdmin }),
  fetchIsAdmin: () => Promise.resolve(state.isAdmin),
}))

const blocks: Block[] = [
  { id: 'b-warm', methodId: 'm1', key: 'warm_up', name: 'Warm-up', goal: null, position: 1 },
  {
    id: 'b-abs',
    methodId: 'm1',
    key: 'abdominal',
    name: 'Abdominal work',
    goal: null,
    position: 3,
  },
]
const equipment: Equipment[] = [
  { id: 'e-ref', key: 'reformer', name: 'Reformer', kind: 'apparatus' },
  { id: 'e-mat', key: 'mat', name: 'Mat', kind: 'apparatus' },
  { id: 'e-box', key: 'box', name: 'Box', kind: 'prop' },
]

const base: Exercise = {
  id: 'x',
  name: 'x',
  ownerId: null,
  blockId: 'b-warm',
  level: 'fundamental',
  isArchived: false,
  reviewStatus: 'verified',
  requirements: [],
  description: null,
  cues: null,
  defaultReps: null,
  defaultDurationSec: null,
  defaultSprings: null,
}

const saveMutate = vi.fn()

vi.mock('@/data/queries/library', () => ({
  libraryKeys: {},
  useBlocks: () => ({ data: blocks, isPending: false }),
  useEquipment: () => ({ data: equipment, isPending: false }),
  useExercises: () => ({ data: state.exercises, isPending: false, isError: false }),
}))
vi.mock('@/data/mutations/exercises', () => ({
  useSaveExercise: () => ({ mutateAsync: saveMutate, isPending: false, isError: false }),
  useSetReviewStatus: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSetArchived: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteExercise: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@/data/queries/lessons', () => ({
  lessonKeys: {},
  useLessons: () => ({ data: [], isPending: false }),
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

describe('library', () => {
  beforeEach(async () => {
    state.isAdmin = false
    saveMutate.mockReset()
    state.exercises = [
      {
        ...base,
        id: '1',
        name: 'Pelvic Curl',
        requirements: [
          { equipmentId: 'e-mat', altGroup: 0 },
          { equipmentId: 'e-ref', altGroup: 0 },
        ],
      },
      {
        ...base,
        id: '2',
        name: 'Short Box Tilt',
        blockId: 'b-abs',
        level: 'intermediate',
        reviewStatus: 'needs_review',
        requirements: [
          { equipmentId: 'e-ref', altGroup: 0 },
          { equipmentId: 'e-box', altGroup: 1 },
        ],
      },
      { ...base, id: '3', name: 'My Own Move', ownerId: 'u1' },
    ]
    await i18n.changeLanguage('en')
  })

  it('lists exercises and filters by block', async () => {
    renderAt('/exercises')
    expect(await screen.findByText('Pelvic Curl')).toBeInTheDocument()
    expect(screen.getByText('3 exercises')).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Block'), 'b-abs')
    expect(screen.queryByText('Pelvic Curl')).not.toBeInTheDocument()
    expect(screen.getByText('Short Box Tilt')).toBeInTheDocument()
  })

  it('merges the same movement on different apparatus into one entry', async () => {
    state.exercises = [
      {
        ...base,
        id: 'c1',
        name: 'Calf Raises',
        requirements: [{ equipmentId: 'e-ref', altGroup: 0 }],
      },
      {
        ...base,
        id: 'c2',
        name: 'Calf Raises',
        requirements: [{ equipmentId: 'e-mat', altGroup: 0 }],
      },
    ]
    renderAt('/exercises')
    expect(await screen.findByText('2 versions')).toBeInTheDocument()
    expect(screen.getAllByText('Calf Raises')).toHaveLength(1)
    expect(screen.getByText('1 exercise')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Reformer/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Mat/ })).toBeInTheDocument()

    // Equipment filtering narrows the versions listed, not just the entries.
    const group = screen.getByRole('group', { name: 'Equipment available today' })
    await userEvent.click(within(group).getByRole('button', { name: 'Mat' }))
    expect(screen.queryByRole('link', { name: /Reformer/ })).not.toBeInTheDocument()
    expect(screen.getByText('Calf Raises')).toBeInTheDocument()
  })

  it('shows bonus accessories without letting them hide the exercise', async () => {
    state.exercises = [
      {
        ...base,
        id: 'b1',
        name: 'Footwork',
        requirements: [
          { equipmentId: 'e-ref', altGroup: 0 },
          { equipmentId: 'e-box', altGroup: 0, optional: true },
        ],
      },
    ]
    renderAt('/exercises')
    expect(await screen.findByText('Bonus: Box')).toBeInTheDocument()
    const group = screen.getByRole('group', { name: 'Equipment available today' })
    await userEvent.click(within(group).getByRole('button', { name: 'Reformer' }))
    expect(screen.getByText('Footwork')).toBeInTheDocument()
  })

  it('filters by available equipment (AND of ORs)', async () => {
    renderAt('/exercises')
    await screen.findByText('Pelvic Curl')
    const group = screen.getByRole('group', { name: 'Equipment available today' })

    await userEvent.click(within(group).getByRole('button', { name: 'Reformer' }))
    expect(screen.getByText('Pelvic Curl')).toBeInTheDocument()
    expect(screen.queryByText('Short Box Tilt')).not.toBeInTheDocument()
    expect(screen.getByText('My Own Move')).toBeInTheDocument()

    await userEvent.click(within(group).getByRole('button', { name: 'Box' }))
    expect(screen.getByText('Short Box Tilt')).toBeInTheDocument()
  })

  it('turns "All" off while any filter is active and resets everything when clicked', async () => {
    renderAt('/exercises')
    await screen.findByText('Pelvic Curl')
    const all = screen.getByRole('button', { name: 'All' })
    expect(all).toHaveAttribute('aria-pressed', 'true')

    await userEvent.selectOptions(screen.getByLabelText('Block'), 'b-abs')
    expect(all).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(screen.getByRole('button', { name: 'Mine' }))
    expect(screen.getByRole('button', { name: 'Mine' })).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(all)
    expect(all).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Block')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Mine' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('3 exercises')).toBeInTheDocument()
  })

  it('toggles Shared off again by clicking it twice', async () => {
    renderAt('/exercises')
    await screen.findByText('Pelvic Curl')
    const shared = screen.getByRole('button', { name: 'Shared' })
    await userEvent.click(shared)
    expect(screen.queryByText('My Own Move')).not.toBeInTheDocument()
    await userEvent.click(shared)
    expect(screen.getByText('My Own Move')).toBeInTheDocument()
  })

  it('has a way home from the library', async () => {
    const router = renderAt('/exercises')
    await screen.findByText('Pelvic Curl')
    await userEvent.click(
      within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', {
        name: 'Lessons',
      }),
    )

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('shows only my exercises under Mine', async () => {
    renderAt('/exercises')
    await screen.findByText('Pelvic Curl')
    await userEvent.click(screen.getByRole('button', { name: 'Mine' }))
    expect(screen.getByText('My Own Move')).toBeInTheDocument()
    expect(screen.queryByText('Pelvic Curl')).not.toBeInTheDocument()
  })

  it('hides review status and the Review nav item from non-admins', async () => {
    renderAt('/exercises')
    await screen.findByText('Short Box Tilt')
    expect(screen.queryByText('Needs review')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Review' })).not.toBeInTheDocument()
  })

  it('shows admins the review badge and nav item', async () => {
    state.isAdmin = true
    renderAt('/exercises')
    expect(await screen.findByText('Needs review')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Review' })).toBeInTheDocument()
  })

  it('redirects non-admins away from /admin/review', async () => {
    const router = renderAt('/admin/review')
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('lets admins open the review queue', async () => {
    state.isAdmin = true
    renderAt('/admin/review')
    expect(await screen.findByRole('heading', { name: 'Review queue' })).toBeInTheDocument()
    expect(screen.getByText('Short Box Tilt')).toBeInTheDocument()
    expect(screen.queryByText('Pelvic Curl')).not.toBeInTheDocument()
  })

  it('shows a shared exercise read-only with a duplicate action for normal users', async () => {
    renderAt('/exercises/1')
    expect(await screen.findByRole('link', { name: 'Duplicate as mine' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
  })

  it('lets the owner edit their own exercise', async () => {
    renderAt('/exercises/3')
    expect(await screen.findByRole('button', { name: 'Save' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Duplicate as mine' })).not.toBeInTheDocument()
  })

  it('blocks saving a new exercise without a name or block', async () => {
    renderAt('/exercises/new')
    await userEvent.click(await screen.findByRole('button', { name: 'Create exercise' }))
    expect((await screen.findAllByText('Required')).length).toBe(2)
    expect(saveMutate).not.toHaveBeenCalled()
  })

  it('blocks saving with an empty requirement group', async () => {
    renderAt('/exercises/new')
    await userEvent.type(await screen.findByLabelText('Name'), 'Hundred')
    await userEvent.selectOptions(screen.getByLabelText('Block'), 'b-warm')
    await userEvent.click(screen.getByRole('button', { name: 'Add requirement' }))
    await userEvent.click(screen.getByRole('button', { name: 'Create exercise' }))
    expect(await screen.findByText(/choose at least one item/i)).toBeInTheDocument()
    expect(saveMutate).not.toHaveBeenCalled()
  })

  it('saves a valid new exercise with its equipment groups', async () => {
    saveMutate.mockResolvedValue('new-id')
    renderAt('/exercises/new')
    await userEvent.type(await screen.findByLabelText('Name'), 'Hundred')
    await userEvent.selectOptions(screen.getByLabelText('Block'), 'b-warm')
    await userEvent.click(screen.getByRole('button', { name: 'Add requirement' }))
    await userEvent.click(screen.getByRole('button', { name: 'Reformer' }))
    await userEvent.click(screen.getByRole('button', { name: 'Create exercise' }))
    await waitFor(() => expect(saveMutate).toHaveBeenCalled())
    expect(saveMutate.mock.calls[0]?.[0]).toMatchObject({
      name: 'Hundred',
      blockId: 'b-warm',
      groups: [['e-ref']],
    })
  })
})

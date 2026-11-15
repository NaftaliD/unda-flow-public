import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  type RouterHistory,
} from '@tanstack/react-router'
import { getSession } from '@/data/auth'
import { fetchIsAdmin } from '@/data/queries/profile'
import { ReviewPage } from '@/features/admin/ReviewPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { ExercisePage } from '@/features/exercises/ExercisePage'
import { LibraryPage } from '@/features/exercises/LibraryPage'
import { NewExercisePage } from '@/features/exercises/NewExercisePage'
import { LessonBuilderPage } from '@/features/lessons/LessonBuilderPage'
import { LessonListPage } from '@/features/lessons/LessonListPage'
import { LessonPrintPage } from '@/features/lessons/LessonPrintPage'
import { MorePage } from '@/features/more/MorePage'
import { BlocksPage, PresetsPage } from '@/features/more/MoreSubpages'
import { NewLessonPage } from '@/features/lessons/NewLessonPage'
import { SeriesEditorPage } from '@/features/series/SeriesEditorPage'
import { SeriesListPage } from '@/features/series/SeriesListPage'
import { AppLayout } from './AppLayout'
import { NotFound } from './NotFound'

const rootRoute = createRootRoute({ component: Outlet, notFoundComponent: NotFound })

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: async () => {
    if (await getSession()) throw redirect({ to: '/' })
  },
  component: LoginPage,
})

// Pathless layout route: everything under it requires a session.
const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'protected',
  beforeLoad: async () => {
    if (!(await getSession())) throw redirect({ to: '/login' })
  },
  component: AppLayout,
})

const homeRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/',
  component: LessonListPage,
})

const newLessonRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/lessons/new',
  // `from` = the class to start from: a class id, or "blank".
  validateSearch: (search: Record<string, unknown>): { from?: string } =>
    typeof search.from === 'string' && search.from !== '' ? { from: search.from } : {},
  component: NewLessonPage,
})

const lessonRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/lessons/$id',
  component: LessonBuilderPage,
})

const lessonPrintRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/lessons/$id/print',
  component: LessonPrintPage,
})

const moreRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/more',
  component: MorePage,
})

const presetsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/more/presets',
  component: PresetsPage,
})

const blocksRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/more/blocks',
  component: BlocksPage,
})

const seriesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/series',
  component: SeriesListPage,
})

const newSeriesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/series/new',
  component: SeriesEditorPage,
})

const seriesDetailRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/series/$id',
  component: SeriesEditorPage,
})

const exercisesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/exercises',
  component: LibraryPage,
})

const newExerciseRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/exercises/new',
  validateSearch: (search: Record<string, unknown>): { from?: string } =>
    typeof search.from === 'string' ? { from: search.from } : {},
  component: NewExercisePage,
})

const exerciseRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/exercises/$id',
  component: ExercisePage,
})

const reviewRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/admin/review',
  beforeLoad: async () => {
    if (!(await fetchIsAdmin())) throw redirect({ to: '/' })
  },
  component: ReviewPage,
})

const routeTree = rootRoute.addChildren([
  loginRoute,
  protectedRoute.addChildren([
    homeRoute,
    newLessonRoute,
    lessonRoute,
    lessonPrintRoute,
    moreRoute,
    presetsRoute,
    blocksRoute,
    seriesRoute,
    newSeriesRoute,
    seriesDetailRoute,
    exercisesRoute,
    newExerciseRoute,
    exerciseRoute,
    reviewRoute,
  ]),
])

export function createAppRouter(history?: RouterHistory) {
  return createRouter({ routeTree, history })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}

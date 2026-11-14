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
import { HomePage } from '@/features/home/HomePage'
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
  component: HomePage,
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

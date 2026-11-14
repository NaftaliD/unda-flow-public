import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  type RouterHistory,
} from '@tanstack/react-router'
import { getSession } from '@/data/auth'
import { LoginPage } from '@/features/auth/LoginPage'
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

const routeTree = rootRoute.addChildren([loginRoute, protectedRoute.addChildren([homeRoute])])

export function createAppRouter(history?: RouterHistory) {
  return createRouter({ routeTree, history })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}

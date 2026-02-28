import { RouterProvider, createRouter, createRoute, createRootRoute, Outlet, redirect } from '@tanstack/react-router';
import { Toaster } from '@/components/ui/sonner';
import { useQueryClient } from '@tanstack/react-query';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import SharePage from './pages/SharePage';
import { getSessionToken, clearSession } from './hooks/useAuth';
import { useGetMe, useValidateSession } from './hooks/useQueries';
import { useNavigate } from '@tanstack/react-router';
import { useActor } from './hooks/useActor';

// Wrapper for DashboardPage that reads token from session storage
function DashboardWrapper() {
  const token = getSessionToken()!;
  const queryClient = useQueryClient();
  const { actor } = useActor();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (actor && token) {
      try { await actor.logout(token); } catch { /* ignore */ }
    }
    clearSession();
    queryClient.clear();
    navigate({ to: '/login' });
  };

  return <DashboardPage token={token} onLogout={handleLogout} />;
}

// Wrapper for AdminPage that reads session info from hooks
function AdminWrapper() {
  const token = getSessionToken()!;
  const { data: session } = useValidateSession(token);

  if (!session) {
    return null;
  }

  return (
    <AdminPage
      token={token}
      role={session.role as string}
      username={session.username}
    />
  );
}

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Toaster richColors position="top-right" />
    </>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: RegisterPage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  beforeLoad: () => {
    const token = getSessionToken();
    if (!token) {
      throw redirect({ to: '/login' });
    }
  },
  component: DashboardWrapper,
});

// Admin route: accessible by Master and Staff roles.
// Client role users are redirected to /dashboard inside AdminPage after profile loads.
const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  beforeLoad: () => {
    const token = getSessionToken();
    if (!token) {
      throw redirect({ to: '/login' });
    }
  },
  component: AdminWrapper,
});

const shareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/share/$shareToken',
  component: SharePage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  dashboardRoute,
  adminRoute,
  shareRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}

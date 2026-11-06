import { lazy } from 'react';
import { ConfigProvider } from 'antd';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import { NAV_ITEMS } from './config/modules';
import AppLayout from './layouts/AppLayout';
import ForbiddenPage from './pages/ForbiddenPage';
import LoginPage from './pages/LoginPage';
import ModulePlaceholder from './pages/ModulePlaceholder';
import NotFoundPage from './pages/NotFoundPage';
import { theme } from './theme';
import LandingPage from './pages/landing/LandingPage';

// Each module page is its own chunk, downloaded the first time someone opens it.
// Login, 403 and 404 stay in the main bundle so they always show instantly.
const AccountsPage = lazy(() => import('./pages/accounts/AccountsPage'));
const ApplicationsPage = lazy(() => import('./pages/applications/ApplicationsPage'));
const CatalogPage = lazy(() => import('./pages/catalog/CatalogPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const LeadsPage = lazy(() => import('./pages/leads/LeadsPage'));
const StudentsPage = lazy(() => import('./pages/students/StudentsPage'));
const TasksPage = lazy(() => import('./pages/tasks/TasksPage'));
const UsersPage = lazy(() => import('./pages/users/UsersPage'));

// Replace a placeholder by adding the real page here, keyed by the NAV_ITEMS key.
// Pages that need sub-routes (e.g. /leads/12) can render their own <Routes> inside.
const PAGES = {
  dashboard: <DashboardPage />,
  leads: <LeadsPage />,
  tasks: <TasksPage />,
  students: <StudentsPage />,
  applications: <ApplicationsPage />,
  catalog: <CatalogPage />,
  accounts: <AccountsPage />,
  users: <UsersPage />,
  landing: <LandingPage />
};

// "/" sends each role to the first module it can view (front desk has no dashboard, for example).
function HomeRedirect() {
  const { can } = useAuth();
  const first = NAV_ITEMS.find((item) => can(item.module, 'view'));
  return <Navigate to={first ? first.path : '/forbidden'} replace />;
}

export default function App() {
  return (
    <ConfigProvider theme={theme}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/welcome" element={<LandingPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomeRedirect />} />
            {NAV_ITEMS.map((item) => (
              <Route
                key={item.key}
                path={`${item.path.slice(1)}/*`}
                element={
                  <ProtectedRoute module={item.module}>
                    {PAGES[item.key] ?? <ModulePlaceholder item={item} />}
                  </ProtectedRoute>
                }
              />
            ))}
            <Route path="forbidden" element={<ForbiddenPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </ConfigProvider>
  );
}

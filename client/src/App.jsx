import { ConfigProvider } from 'antd';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import { NAV_ITEMS } from './config/modules';
import AppLayout from './layouts/AppLayout';
import ApplicationsPage from './pages/applications/ApplicationsPage';
import CatalogPage from './pages/catalog/CatalogPage';
import DashboardPage from './pages/DashboardPage';
import ForbiddenPage from './pages/ForbiddenPage';
import LeadsPage from './pages/leads/LeadsPage';
import LoginPage from './pages/LoginPage';
import ModulePlaceholder from './pages/ModulePlaceholder';
import NotFoundPage from './pages/NotFoundPage';
import StudentsPage from './pages/students/StudentsPage';
import TasksPage from './pages/tasks/TasksPage';
import { theme } from './theme';

// Replace a placeholder by adding the real page here, keyed by the NAV_ITEMS key.
// Pages that need sub-routes (e.g. /leads/12) can render their own <Routes> inside.
const PAGES = {
  dashboard: <DashboardPage />,
  leads: <LeadsPage />,
  tasks: <TasksPage />,
  students: <StudentsPage />,
  applications: <ApplicationsPage />,
  catalog: <CatalogPage />,
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

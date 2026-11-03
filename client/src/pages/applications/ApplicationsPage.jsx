import { Route, Routes } from 'react-router-dom';
import NotFoundPage from '../NotFoundPage';
import ApplicationDetailPage from './ApplicationDetailPage';
import ApplicationListPage from './ApplicationListPage';

// Mounted at /applications/* so it can own its sub-routes.
export default function ApplicationsPage() {
  return (
    <Routes>
      <Route index element={<ApplicationListPage />} />
      <Route path=":id" element={<ApplicationDetailPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

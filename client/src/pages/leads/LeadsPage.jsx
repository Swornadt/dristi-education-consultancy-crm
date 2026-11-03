import { Route, Routes } from 'react-router-dom';
import NotFoundPage from '../NotFoundPage';
import LeadBoardPage from './LeadBoardPage';
import LeadDetailPage from './LeadDetailPage';
import LeadListPage from './LeadListPage';

// Mounted at /leads/* so it can own its sub-routes.
export default function LeadsPage() {
  return (
    <Routes>
      <Route index element={<LeadListPage />} />
      <Route path="board" element={<LeadBoardPage />} />
      <Route path=":id" element={<LeadDetailPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

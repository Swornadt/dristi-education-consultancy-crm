import { Route, Routes } from 'react-router-dom';
import NotFoundPage from '../NotFoundPage';
import StudentDetailPage from './StudentDetailPage';
import StudentListPage from './StudentListPage';

// Mounted at /students/* so it can own its sub-routes.
export default function StudentsPage() {
  return (
    <Routes>
      <Route index element={<StudentListPage />} />
      <Route path=":id" element={<StudentDetailPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

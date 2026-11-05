import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import rolesRoutes from './modules/roles/roles.routes';
import leadsRoutes from './modules/leads/leads.routes';
import taskRoutes from './modules/tasks/tasks.routes';
import studentsRoutes from './modules/students/students.routes';
import accountsRoutes from './modules/accounts/accounts.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import * as subController from './modules/students/students.subresources.controller';
import { verifyJWT } from './common/middleware/auth';
import { globalErrorHandler } from './common/middleware/errorHandler';
import catalogRoutes from './modules/catalog/catalog.routes';
import applicationsRoutes from './modules/applications/applications.routes';



const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/roles', rolesRoutes);
app.use('/api/v1/leads', leadsRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/students', studentsRoutes);
app.use('/api/v1/accounts', accountsRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/catalog', catalogRoutes);
app.use('/api/v1/applications', applicationsRoutes);


app.get('/api/v1/files/:fileId', verifyJWT, subController.streamFile);

app.use(globalErrorHandler);

export default app;
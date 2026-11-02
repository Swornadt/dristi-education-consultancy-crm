import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import rolesRoutes from './modules/roles/roles.routes'; 
import leadsRoutes from './modules/leads/leads.routes';
import { globalErrorHandler } from './common/middleware/errorHandler';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/roles', rolesRoutes); 
app.use('/api/v1/leads', leadsRoutes);

app.use(globalErrorHandler);

export default app;
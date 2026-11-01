import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import { globalErrorHandler } from './common/middleware/errorHandler';

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes); 

app.use(globalErrorHandler);

export default app;
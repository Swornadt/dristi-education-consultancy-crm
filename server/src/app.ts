import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes';
import { globalErrorHandler } from './common/middleware/errorHandler';

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/v1/auth', authRoutes);

app.use(globalErrorHandler);

export default app;
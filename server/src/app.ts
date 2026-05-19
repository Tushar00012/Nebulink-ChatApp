import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import chatRoutes from './routes/chat.routes';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/', chatRoutes);

export default app;

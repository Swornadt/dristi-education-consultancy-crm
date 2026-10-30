import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var:${name}`);
  return v;
}

export const env = {
  PORT: Number(process.env.PORT ?? 5000),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  JWT_SECRET: required('JWT_SECRET'),
  DB_HOST: required('DB_HOST'),
  DB_PORT: Number(process.env.DB_PORT ?? 5432),
  DB_USER: required('DB_USER'),         // 👈 ADD THIS LINE
  DB_PASSWORD: required('DB_PASSWORD'),
  DB_NAME: required('DB_NAME'),
};
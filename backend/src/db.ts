import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) throw new Error('DATABASE_URL is not set');

const isSsl = connectionString.includes('sslmode=require') || 
              connectionString.includes('ssl=true') || 
              connectionString.includes('aivencloud.com') ||
              connectionString.includes('render.com') ||
              connectionString.includes('neon.tech') ||
              connectionString.includes('supabase.co');

const pool = new Pool({ 
  connectionString: isSsl ? connectionString.replace(/([?&])sslmode=require/, '$1sslmode=no-verify') : connectionString,
  ssl: isSsl ? { rejectUnauthorized: false } : undefined
});
const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });

/**
 * Drizzle ORM Database Client
 * Type-safe Database Operations
 */

import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import path from 'path';
import * as schema from './schema';

const dbPath = path.join(process.cwd(), 'lukas.db');

// إنشاء اتصال قاعدة البيانات
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');

// إنشاء Drizzle instance
export const db = drizzle(sqlite, { schema });

// Helper functions
export async function initializeDatabase() {
  try {
    // سيتم إنشاء الجداول تلقائياً عند الحاجة
    console.log('✅ Database initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

export default db;

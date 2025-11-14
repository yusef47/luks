/**
 * Drizzle ORM Schema
 * تعريف جداول قاعدة البيانات
 */

import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// جدول المحادثات
export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// جدول الرسائل
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  agentUsed: text('agent_used'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// جدول السياق
export const context = sqliteTable('context', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id),
  contextData: text('context_data').notNull(), // JSON
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// جدول تقييم النتائج
export const evaluations = sqliteTable('evaluations', {
  id: text('id').primaryKey(),
  messageId: text('message_id').notNull().references(() => messages.id),
  score: real('score').notNull(), // 0-1
  feedback: text('feedback'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// جدول إحصائيات الوكلاء
export const agentStats = sqliteTable('agent_stats', {
  id: text('id').primaryKey(),
  agentName: text('agent_name').notNull(),
  totalRequests: integer('total_requests').default(0),
  successfulRequests: integer('successful_requests').default(0),
  failedRequests: integer('failed_requests').default(0),
  averageResponseTime: real('average_response_time').default(0),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

import { sql } from 'drizzle-orm';
import { check, sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const workspaces = sqliteTable('workspaces', {
  userId: text('user_id').primaryKey(),
  payload: text('payload').notNull(),
  revision: integer('revision').notNull().default(1),
  updatedAt: text('updated_at').notNull(),
});

// Exactly one account is permitted. id=1 is enforced by the database.
export const account = sqliteTable('account', {
  id: integer('id').primaryKey(),
  username: text('username').notNull(),
  passwordHash: text('password_hash').notNull(),
  salt: text('salt').notNull(),
  workspaceUserId: text('workspace_user_id').notNull(),
  version: integer('version').notNull().default(1),
  createdAt: text('created_at').notNull(),
}, (t) => [check('single_account_only', sql`${t.id} = 1`)]);
export const sessions = sqliteTable('sessions', {
  tokenHash: text('token_hash').primaryKey(),
  version: integer('version').notNull(),
  expiresAt: integer('expires_at').notNull(),
});
export const loginAttempts = sqliteTable('login_attempts', {
  key: text('key').primaryKey(),
  attempts: integer('attempts').notNull().default(1),
  expiresAt: integer('expires_at').notNull(),
});

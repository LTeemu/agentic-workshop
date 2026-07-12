import { relations } from "drizzle-orm";
import { user, session, account } from "./auth-schema";
import { folders } from "./folders";
import { trackedPages } from "./tracked_pages";
import { trackedFields } from "./tracked_fields";
import { fieldHistory } from "./field_history";

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  folders: many(folders),
  pages: many(trackedPages),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const foldersRelations = relations(folders, ({ one, many }) => ({
  user: one(user, {
    fields: [folders.userId],
    references: [user.id],
  }),
  pages: many(trackedPages),
}));

export const trackedPagesRelations = relations(trackedPages, ({ one, many }) => ({
  user: one(user, {
    fields: [trackedPages.userId],
    references: [user.id],
  }),
  folder: one(folders, {
    fields: [trackedPages.folderId],
    references: [folders.id],
  }),
  fields: many(trackedFields),
}));

export const trackedFieldsRelations = relations(trackedFields, ({ one, many }) => ({
  page: one(trackedPages, {
    fields: [trackedFields.pageId],
    references: [trackedPages.id],
  }),
  history: many(fieldHistory),
}));

export const fieldHistoryRelations = relations(fieldHistory, ({ one }) => ({
  field: one(trackedFields, {
    fields: [fieldHistory.fieldId],
    references: [trackedFields.id],
  }),
}));

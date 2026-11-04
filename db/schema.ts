import {sqliteTable, text, integer} from 'drizzle-orm/sqlite-core';
export const menus = sqliteTable('menus', {
 id:text('id').primaryKey(), owner:text('owner').notNull(), name:text('name').notNull(),
 data:text('data').notNull(), source:text('source').notNull(), published:integer('published').notNull().default(0),
 version:integer('version').notNull().default(1), created:text('created').notNull()
});
export const translations=sqliteTable('translations',{
 id:text('id').primaryKey(), menuId:text('menu_id').notNull(), language:text('language').notNull(),
 version:integer('version').notNull(), data:text('data'), started:integer('started').notNull()
});

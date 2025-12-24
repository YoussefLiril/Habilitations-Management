import { pgTable, serial, text, integer, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex("users_email_idx").on(table.email),
}));

// Divisions table
export const divisions = pgTable("divisions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  nameIdx: uniqueIndex("divisions_name_idx").on(table.name),
}));

// Services table
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  divisionId: integer("division_id").notNull().references(() => divisions.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  divisionIdx: index("services_division_idx").on(table.divisionId),
  uniqueNamePerDivision: uniqueIndex("services_name_division_idx").on(table.name, table.divisionId),
}));

// Equipes table
export const equipes = pgTable("equipes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  serviceId: integer("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  serviceIdx: index("equipes_service_idx").on(table.serviceId),
  uniqueNamePerService: uniqueIndex("equipes_name_service_idx").on(table.name, table.serviceId),
}));

// Employees table
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  matricule: text("matricule").notNull().unique(),
  prenom: text("prenom").notNull(),
  nom: text("nom").notNull(),
  divisionId: integer("division_id").notNull().references(() => divisions.id),
  serviceId: integer("service_id").notNull().references(() => services.id),
  equipeId: integer("equipe_id").notNull().references(() => equipes.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  matriculeIdx: uniqueIndex("employees_matricule_idx").on(table.matricule),
  divisionIdx: index("employees_division_idx").on(table.divisionId),
  serviceIdx: index("employees_service_idx").on(table.serviceId),
}));

// Habilitations table
export const habilitations = pgTable("habilitations", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  codes: text("codes").notNull(),
  numero: text("numero"),
  dateValidation: text("date_validation").notNull(),
  dateExpiration: text("date_expiration").notNull(),
  pdfPath: text("pdf_path"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  employeeIdx: index("habilitations_employee_idx").on(table.employeeId),
  typeIdx: index("habilitations_type_idx").on(table.type),
  expirationIdx: index("habilitations_expiration_idx").on(table.dateExpiration),
}));

// Audit logs table
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  changes: text("changes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  entityIdx: index("audit_logs_entity_idx").on(table.entityType, table.entityId),
  userIdx: index("audit_logs_user_idx").on(table.userId),
}));

// Employee notes table
export const employeeNotes = pgTable("employee_notes", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id),
  note: text("note").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  employeeIdx: index("employee_notes_employee_idx").on(table.employeeId),
}));

// Saved filters table
export const savedFilters = pgTable("saved_filters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  filters: text("filters").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Notification templates table
export const notificationTemplates = pgTable("notification_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  nameIdx: uniqueIndex("notification_templates_name_idx").on(table.name),
}));

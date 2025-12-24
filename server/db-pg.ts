import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import bcrypt from "bcrypt";
import { eq, sql } from "drizzle-orm";

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false },
});

// Initialize Drizzle ORM
export const db = drizzle(pool, { schema });

// Initialize database with demo user
export async function initializeDatabase() {
  try {
    console.log("Checking database connection...");
    
    // Test connection
    await pool.query("SELECT NOW()");
    console.log("Database connection successful");

    // Check if demo user exists
    const existingUser = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, "admin@example.com"))
      .limit(1);

    if (existingUser.length === 0) {
      // Create demo user (password: admin123)
      const hashedPassword = bcrypt.hashSync("admin123", 10);
      await db.insert(schema.users).values({
        email: "admin@example.com",
        password: hashedPassword,
      });
      console.log("Demo user created: admin@example.com / admin123");
    } else {
      console.log("Demo user already exists");
    }

    // Check if organizational structure is already seeded
    const divisionsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.divisions);

    if (!divisionsCount[0] || divisionsCount[0].count === 0) {
      console.log("Seeding organizational structure and employee data...");
      const { seedDatabasePG } = await import("./seed-pg");
      await seedDatabasePG();
    } else {
      console.log("Database already seeded");
    }

    console.log("Database initialized successfully");
  } catch (err) {
    console.error("Database initialization error:", err);
    throw err;
  }
}

// Helper function to get database instance
export async function getDatabase() {
  return db;
}

// Export schema for use in other files
export * from "./schema";

export default {
  initialize: initializeDatabase,
  getDatabase,
  db,
};

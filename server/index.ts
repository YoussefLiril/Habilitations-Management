import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { handleDemo } from "./routes/demo";
import { initializeDatabase } from "./db-pg";

// Initialize database on server creation
let dbInitialized = false;

async function initializeDbOnce() {
  if (!dbInitialized) {
    try {
      await initializeDatabase();
      dbInitialized = true;
    } catch (err) {
      console.error("Failed to initialize database:", err);
    }
  }
}

export function createServer() {
  const app = express();

  // Initialize database
  initializeDbOnce();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Database ready middleware
  app.use(async (_req, _res, next) => {
    try {
      await initializeDbOnce();
      next();
    } catch (err) {
      console.error("Database not ready:", err);
      next();
    }
  });

  // Multer configuration for file uploads
  const upload = multer({
    dest: path.join(process.cwd(), "uploads", "temp"),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype === "application/pdf") {
        cb(null, true);
      } else {
        cb(new Error("Only PDF files are allowed"));
      }
    },
  });

  // Serve uploaded files
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Health check
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Seed database (development only)
  app.post("/api/seed", async (_req, res) => {
    try {
      await initializeDbOnce(); // Ensure DB is initialized
      const { seedDatabasePG } = await import("./seed-pg");
      await seedDatabasePG();
      res.json({ message: "Database seeded successfully" });
    } catch (err) {
      console.error("Seeding error:", err);
      res.status(500).json({ message: "Error seeding database" });
    }
  });

  // Import employees from TSV/Excel data
  app.post("/api/import-employees", async (req, res) => {
    try {
      const { tsvData } = req.body;
      if (!tsvData) {
        return res.status(400).json({ message: "TSV data required" });
      }

      await initializeDbOnce();
      const { parseEmployeesFromTSV, importEmployees } = await import(
        "./import-employees"
      );

      const employees = parseEmployeesFromTSV(tsvData);
      const result = await importEmployees(employees);

      res.json({
        message: "Import completed",
        ...result,
      });
    } catch (err) {
      console.error("Import error:", err);
      res.status(500).json({ message: "Error importing employees" });
    }
  });

  // Auth routes (lazy load)
  app.post("/api/auth/login", async (req, res) => {
    const { handleLogin } = await import("./routes/auth");
    handleLogin(req, res);
  });

  app.post("/api/auth/logout", async (req, res) => {
    const { handleLogout } = await import("./routes/auth");
    handleLogout(req, res);
  });

  app.post("/api/auth/refresh", async (req, res) => {
    const { handleRefresh } = await import("./routes/auth");
    handleRefresh(req, res);
  });

  // Protected employee routes (lazy load)
  app.get("/api/employees", async (req, res, next) => {
    const { authMiddleware, getEmployees } = await import(
      "./routes/employees"
    );
    authMiddleware(req, res, () => getEmployees(req, res));
  });

  app.post("/api/employees", async (req, res, next) => {
    const { authMiddleware, createEmployee } = await import(
      "./routes/employees"
    );
    authMiddleware(req, res, () => createEmployee(req, res));
  });

  app.get("/api/employees/:id", async (req, res) => {
    const { authMiddleware, getEmployee } = await import(
      "./routes/employees"
    );
    authMiddleware(req, res, () => getEmployee(req, res));
  });

  app.put("/api/employees/:id", async (req, res) => {
    const { authMiddleware, updateEmployee } = await import(
      "./routes/employees"
    );
    authMiddleware(req, res, () => updateEmployee(req, res));
  });

  app.delete("/api/employees/:id", async (req, res) => {
    const { authMiddleware, deleteEmployee } = await import(
      "./routes/employees"
    );
    authMiddleware(req, res, () => deleteEmployee(req, res));
  });

  // Organizational structure routes
  app.get("/api/divisions", async (req, res) => {
    const { getDivisions } = await import("./routes/employees");
    getDivisions(req, res);
  });

  app.get("/api/divisions/:divisionId/services", async (req, res) => {
    const { getServicesByDivision } = await import("./routes/employees");
    getServicesByDivision(req, res);
  });

  app.get("/api/services/:serviceId/equipes", async (req, res) => {
    const { getEquipesByService } = await import("./routes/employees");
    getEquipesByService(req, res);
  });

  // Habilitation management routes
  app.post("/api/habilitations", async (req, res) => {
    const { authMiddleware, createHabilitation } = await import(
      "./routes/employees"
    );
    authMiddleware(req, res, () => createHabilitation(req, res));
  });

  app.put("/api/habilitations/:habId", async (req, res) => {
    const { authMiddleware, updateHabilitation } = await import(
      "./routes/employees"
    );
    authMiddleware(req, res, () => updateHabilitation(req, res));
  });

  app.delete("/api/habilitations/:habId", async (req, res) => {
    const { authMiddleware, deleteHabilitation } = await import(
      "./routes/employees"
    );
    authMiddleware(req, res, () => deleteHabilitation(req, res));
  });

  // Batch operations routes
  app.post("/api/habilitations/batch-delete", async (req, res) => {
    const { authMiddleware, batchDeleteHabilitations } = await import(
      "./routes/employees"
    );
    authMiddleware(req, res, () => batchDeleteHabilitations(req, res));
  });

  app.put("/api/habilitations/batch-update", async (req, res) => {
    const { authMiddleware, batchUpdateHabilitations } = await import(
      "./routes/employees"
    );
    authMiddleware(req, res, () => batchUpdateHabilitations(req, res));
  });

  // PDF upload routes
  app.post("/api/habilitations/upload-pdf", upload.single("pdf"), async (req, res) => {
    const { authMiddleware } = await import("./routes/employees");
    const { uploadPDF } = await import("./routes/pdf");
    authMiddleware(req, res, () => uploadPDF(req, res));
  });

  app.delete("/api/habilitations/:habId/pdf", async (req, res) => {
    const { authMiddleware } = await import("./routes/employees");
    const { deletePDF } = await import("./routes/pdf");
    authMiddleware(req, res, () => deletePDF(req, res));
  });

  app.post("/api/habilitations/batch-upload-pdf", upload.array("pdfs", 50), async (req, res) => {
    const { authMiddleware } = await import("./routes/employees");
    const { batchUploadPDF } = await import("./routes/pdf");
    authMiddleware(req, res, () => batchUploadPDF(req, res));
  });

  return app;
}

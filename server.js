// server.js
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs");

const app = express();
const PORT = 3000;

// ===== Middleware =====
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Ensure uploads directory exists
if (!fs.existsSync("./uploads")) {
  fs.mkdirSync("./uploads");
}

// ===== Database =====
const db = new sqlite3.Database("data.db");

// Initialize database
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      matricule TEXT PRIMARY KEY,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      division TEXT,
      service TEXT,
      section TEXT,
      equipe TEXT,
      fonction TEXT,
      habilitations TEXT,
      titre TEXT,
      validation TEXT,
      expiration TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      matricule TEXT,
      filename TEXT,
      original_name TEXT,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (matricule) REFERENCES employees (matricule) ON DELETE CASCADE
    )
  `);

  // Insert sample data
  db.get("SELECT COUNT(*) as count FROM employees", (err, row) => {
    if (row && row.count === 0) {
      console.log('Inserting sample data...');
      const sampleEmployees = [
        {
          matricule: "77894",
          nom: "Dupont",
          prenom: "Jean",
          division: "XA",
          service: "Maintenance",
          section: "Nord",
          equipe: "Lignes",
          fonction: "Technicien",
          habilitations: JSON.stringify(["H1V", "B2V", "HC"]),
          titre: "1247",
          validation: "2025-01-05",
          expiration: "2026-01-05"
        },
        {
          matricule: "89423",
          nom: "Laurent",
          prenom: "Marie",
          division: "XC",
          service: "Production",
          section: "Sud",
          equipe: "Lignes",
          fonction: "Chef d'équipe",
          habilitations: JSON.stringify(["H2V", "B2V", "SF6"]),
          titre: "1248",
          validation: "2024-08-10",
          expiration: "2025-02-10"
        }
      ];

      const insertQuery = `
        INSERT INTO employees 
        (matricule, nom, prenom, division, service, section, equipe, fonction, habilitations, titre, validation, expiration)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      sampleEmployees.forEach(emp => {
        db.run(insertQuery, [
          emp.matricule, emp.nom, emp.prenom, emp.division, emp.service, emp.section, 
          emp.equipe, emp.fonction, emp.habilitations, emp.titre, emp.validation, emp.expiration
        ], function(err) {
          if (err) {
            console.error('Error inserting sample employee:', err);
          } else {
            console.log(`✅ Sample employee ${emp.matricule} inserted`);
          }
        });
      });
    }
  });
});

// ===== Routes for HTML Pages =====

// Serve main pages
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/apercu.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "apercu.html"));
});

app.get("/gestion.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "gestion.html"));
});

app.get("/details.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "details.html"));
});

// ===== API Routes =====

// Get all employees
app.get("/api/employees", (req, res) => {
  console.log('📋 Fetching all employees...');
  db.all("SELECT * FROM employees ORDER BY nom, prenom", (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: err.message });
    } else {
      console.log(`✅ Found ${rows.length} employees`);
      res.json(rows);
    }
  });
});

// Get single employee
app.get("/api/employees/:matricule", (req, res) => {
  const { matricule } = req.params;
  console.log(`🔍 Fetching employee: ${matricule}`);
  
  db.get("SELECT * FROM employees WHERE matricule = ?", [matricule], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: err.message });
    } else if (row) {
      console.log(`✅ Employee ${matricule} found`);
      res.json(row);
    } else {
      console.log(`❌ Employee ${matricule} not found`);
      res.status(404).json({ error: "Employé non trouvé" });
    }
  });
});

// Add employee
app.post("/api/employees", (req, res) => {
  const {
    matricule, nom, prenom, division, service, section, equipe,
    fonction, habilitations, titre, validation, expiration
  } = req.body;

  console.log('➕ Adding new employee:', { matricule, nom, prenom });

  // Validate required fields
  if (!matricule || !nom || !prenom) {
    return res.status(400).json({ error: "Matricule, nom et prénom sont obligatoires" });
  }

  const query = `
    INSERT INTO employees 
    (matricule, nom, prenom, division, service, section, equipe, fonction, habilitations, titre, validation, expiration)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.run(query, [
    matricule, nom, prenom, division, service, section, equipe,
    fonction, JSON.stringify(habilitations || []), titre, validation, expiration
  ], function(err) {
    if (err) {
      console.error('Insert error:', err);
      if (err.message.includes('UNIQUE constraint failed')) {
        res.status(409).json({ error: "Un employé avec ce matricule existe déjà" });
      } else {
        res.status(500).json({ error: err.message });
      }
    } else {
      console.log(`✅ Employee ${matricule} added successfully`);
      res.json({ 
        message: "Employé ajouté avec succès",
        id: this.lastID 
      });
    }
  });
});

// Update employee
app.put("/api/employees/:matricule", (req, res) => {
  const { matricule } = req.params;
  const {
    nom, prenom, division, service, section, equipe,
    fonction, habilitations, titre, validation, expiration
  } = req.body;

  console.log('✏️ Updating employee:', matricule);

  const query = `
    UPDATE employees 
    SET nom = ?, prenom = ?, division = ?, service = ?, section = ?, equipe = ?, 
        fonction = ?, habilitations = ?, titre = ?, validation = ?, expiration = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE matricule = ?
  `;
  
  db.run(query, [
    nom, prenom, division, service, section, equipe,
    fonction, JSON.stringify(habilitations || []), titre, validation, expiration, matricule
  ], function(err) {
    if (err) {
      console.error('Update error:', err);
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      console.log(`❌ Employee ${matricule} not found for update`);
      res.status(404).json({ error: "Employé non trouvé" });
    } else {
      console.log(`✅ Employee ${matricule} updated successfully`);
      res.json({ message: "Employé modifié avec succès" });
    }
  });
});

// Delete employee
app.delete("/api/employees/:matricule", (req, res) => {
  const { matricule } = req.params;
  console.log(`🗑️ Deleting employee: ${matricule}`);
  
  // First delete associated files
  db.run("DELETE FROM files WHERE matricule = ?", [matricule], (err) => {
    if (err) {
      console.error('Error deleting files:', err);
      return res.status(500).json({ error: err.message });
    }
    
    // Then delete employee
    db.run("DELETE FROM employees WHERE matricule = ?", [matricule], function(err) {
      if (err) {
        console.error('Delete error:', err);
        res.status(500).json({ error: err.message });
      } else if (this.changes === 0) {
        console.log(`❌ Employee ${matricule} not found for deletion`);
        res.status(404).json({ error: "Employé non trouvé" });
      } else {
        console.log(`✅ Employee ${matricule} deleted successfully`);
        res.json({ message: "Employé supprimé avec succès" });
      }
    });
  });
});

// ===== File Upload Handling =====

const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers PDF sont autorisés'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Upload file
app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucun fichier uploadé" });
  }

  const { matricule } = req.body;
  
  if (!matricule) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "Matricule requis" });
  }

  console.log(`📎 Uploading file for employee: ${matricule}`);

  // Verify employee exists
  db.get("SELECT 1 FROM employees WHERE matricule = ?", [matricule], (err, row) => {
    if (err) {
      fs.unlinkSync(req.file.path);
      console.error('Database error:', err);
      return res.status(500).json({ error: err.message });
    }
    
    if (!row) {
      fs.unlinkSync(req.file.path);
      console.log(`❌ Employee ${matricule} not found for file upload`);
      return res.status(404).json({ error: "Employé non trouvé" });
    }

    // Save file record
    db.run(
      "INSERT INTO files (matricule, filename, original_name) VALUES (?, ?, ?)",
      [matricule, req.file.filename, req.file.originalname],
      function(err) {
        if (err) {
          fs.unlinkSync(req.file.path);
          console.error('Error saving file record:', err);
          res.status(500).json({ error: err.message });
        } else {
          console.log(`✅ File uploaded successfully for employee ${matricule}`);
          res.json({ 
            message: "Fichier uploadé avec succès",
            file: {
              id: this.lastID,
              filename: req.file.filename,
              original_name: req.file.originalname
            }
          });
        }
      }
    );
  });
});

// Get employee files
app.get("/api/files/:matricule", (req, res) => {
  const { matricule } = req.params;
  console.log(`📁 Fetching files for employee: ${matricule}`);
  
  db.all(
    "SELECT * FROM files WHERE matricule = ? ORDER BY uploaded_at DESC", 
    [matricule], 
    (err, rows) => {
      if (err) {
        console.error('Error fetching files:', err);
        res.status(500).json({ error: err.message });
      } else {
        console.log(`✅ Found ${rows.length} files for employee ${matricule}`);
        res.json(rows);
      }
    }
  );
});

// Delete file
app.delete("/api/files/:id", (req, res) => {
  const { id } = req.params;
  console.log(`🗑️ Deleting file: ${id}`);
  
  // First get filename to delete from filesystem
  db.get("SELECT filename FROM files WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error('Error finding file:', err);
      return res.status(500).json({ error: err.message });
    }
    
    if (!row) {
      console.log(`❌ File ${id} not found`);
      return res.status(404).json({ error: "Fichier non trouvé" });
    }

    // Delete from database
    db.run("DELETE FROM files WHERE id = ?", [id], function(err) {
      if (err) {
        console.error('Error deleting file record:', err);
        res.status(500).json({ error: err.message });
      } else {
        // Delete from filesystem
        const filePath = path.join(__dirname, 'uploads', row.filename);
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) {
            console.error('Error deleting file from filesystem:', unlinkErr);
          } else {
            console.log(`✅ File ${id} deleted successfully`);
          }
        });
        
        res.json({ message: "Fichier supprimé avec succès" });
      }
    });
  });
});

// ===== Error Handling =====

// 404 handler for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: "API route non trouvée" });
});

// Multer error handling
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: "Fichier trop volumineux (max 10MB)" });
    }
  }
  console.error('Server error:', error);
  res.status(500).json({ error: error.message });
});

// ===== Server Startup =====
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 SERVEUR DÉMARRÉ AVEC SUCCÈS!');
  console.log(`📡 Port: ${PORT}`);
  console.log(`📁 Dossier public: ${path.join(__dirname, 'public')}`);
  console.log('='.repeat(60));
  console.log('🌐 URLs DE L\'APPLICATION:');
  console.log(`   🏠 Accueil:        http://localhost:${PORT}`);
  console.log(`   📊 Aperçu:         http://localhost:${PORT}/apercu.html`);
  console.log(`   👥 Gestion:        http://localhost:${PORT}/gestion.html`);
  console.log(`   📋 Détails:        http://localhost:${PORT}/details.html`);
  console.log('='.repeat(60));
  console.log('🔧 API ENDPOINTS:');
  console.log(`   📋 Employés:       http://localhost:${PORT}/api/employees`);
  console.log(`   📎 Fichiers:       http://localhost:${PORT}/api/files/:matricule`);
  console.log('='.repeat(60));
  
  // Check if public folder exists and list files
  const publicPath = path.join(__dirname, 'public');
  if (fs.existsSync(publicPath)) {
    const files = fs.readdirSync(publicPath);
    console.log('📋 Fichiers dans le dossier public:');
    files.forEach(file => {
      const filePath = path.join(publicPath, file);
      const stats = fs.statSync(filePath);
      const icon = stats.isDirectory() ? '📁' : '📄';
      console.log(`   ${icon} ${file}`);
    });
  } else {
    console.log('❌ Dossier public non trouvé!');
  }
  console.log('='.repeat(60));
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt du serveur...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('✅ Base de données fermée');
    }
    process.exit(0);
  });
});
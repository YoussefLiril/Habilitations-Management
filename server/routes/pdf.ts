import { RequestHandler } from "express";
import { dbRun, dbGet } from "../db";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "pdfs");

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const uploadPDF: RequestHandler = async (req, res) => {
  try {
    const file = (req as any).file;
    const { habilitationId } = req.body;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    if (!habilitationId) {
      return res.status(400).json({ message: "Habilitation ID required" });
    }

    // Check if habilitation exists
    const hab = dbGet(
      `SELECT id, type FROM habilitations WHERE id = ?`,
      [habilitationId]
    );

    if (!hab) {
      return res.status(404).json({ message: "Habilitation not found" });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `hab_${habilitationId}_${timestamp}.pdf`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // Move file to upload directory
    fs.renameSync(file.path, filepath);

    // Update database with PDF path
    const pdfPath = `/uploads/pdfs/${filename}`;
    dbRun(
      `UPDATE habilitations SET pdf_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [pdfPath, habilitationId]
    );

    res.json({
      message: "PDF uploaded successfully",
      pdfPath,
    });
  } catch (err) {
    console.error("Error uploading PDF:", err);
    res.status(500).json({ message: "Error uploading PDF" });
  }
};

export const deletePDF: RequestHandler = async (req, res) => {
  try {
    const { habId } = req.params;

    // Get current PDF path
    const hab = dbGet(
      `SELECT pdf_path FROM habilitations WHERE id = ?`,
      [habId]
    ) as { pdf_path: string } | undefined;

    if (!hab || !hab.pdf_path) {
      return res.status(404).json({ message: "PDF not found" });
    }

    // Delete file from filesystem
    const filename = path.basename(hab.pdf_path);
    const filepath = path.join(UPLOAD_DIR, filename);

    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }

    // Update database
    dbRun(
      `UPDATE habilitations SET pdf_path = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [habId]
    );

    res.json({ message: "PDF deleted successfully" });
  } catch (err) {
    console.error("Error deleting PDF:", err);
    res.status(500).json({ message: "Error deleting PDF" });
  }
};

export const batchUploadPDF: RequestHandler = async (req, res) => {
  try {
    const files = (req as any).files;
    const { habilitationIds } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    if (!habilitationIds || !Array.isArray(habilitationIds)) {
      return res.status(400).json({ message: "Habilitation IDs required" });
    }

    const uploaded: string[] = [];
    const failed: string[] = [];

    for (let i = 0; i < Math.min(files.length, habilitationIds.length); i++) {
      const file = files[i];
      const habId = habilitationIds[i];

      try {
        const timestamp = Date.now();
        const filename = `hab_${habId}_${timestamp}.pdf`;
        const filepath = path.join(UPLOAD_DIR, filename);

        fs.renameSync(file.path, filepath);

        const pdfPath = `/uploads/pdfs/${filename}`;
        dbRun(
          `UPDATE habilitations SET pdf_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [pdfPath, habId]
        );

        uploaded.push(filename);
      } catch (err) {
        failed.push(`Habilitation ${habId}`);
      }
    }

    res.json({
      message: "Batch upload completed",
      uploaded: uploaded.length,
      failed: failed.length,
      failedItems: failed,
    });
  } catch (err) {
    console.error("Error in batch upload:", err);
    res.status(500).json({ message: "Error in batch upload" });
  }
};

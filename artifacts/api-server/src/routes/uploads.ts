import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import {
  uploadPhotoToGCS,
  downloadPhotoFromGCS,
  encodeObjectNameForUrl,
  decodeObjectNameFromUrl,
} from "../lib/gcsStorage";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

router.post(
  "/upload",
  upload.single("photo"),
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    try {
      const ext = path.extname(req.file.originalname) || ".jpg";
      const objectName = await uploadPhotoToGCS(
        req.file.buffer,
        ext,
        req.file.mimetype,
      );

      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const encodedName = encodeObjectNameForUrl(objectName);
      const photoUrl = `${protocol}://${host}/api/uploads/${encodedName}`;

      res.json({ photoUrl });
    } catch (err: any) {
      console.error("[upload] GCS upload failed:", err?.message);
      res.status(500).json({ error: "Failed to store photo. Please try again." });
    }
  },
);

router.get("/uploads/:encodedName", async (req: Request, res: Response) => {
  try {
    const rawParam = Array.isArray(req.params.encodedName)
      ? req.params.encodedName[0]
      : req.params.encodedName;
    const objectName = decodeObjectNameFromUrl(rawParam);

    if (!objectName.startsWith("hazard-photos/")) {
      res.status(400).json({ error: "Invalid photo reference" });
      return;
    }

    const { data, contentType } = await downloadPhotoFromGCS(objectName);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.send(data);
  } catch (err: any) {
    console.error("[upload] GCS download failed:", err?.message);
    res.status(404).json({ error: "Photo not found" });
  }
});

export default router;

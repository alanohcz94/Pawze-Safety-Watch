import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import OpenAI from "openai";

const router: IRouter = Router();

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "dummy",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const AUDIO_DIR = path.join(process.cwd(), "uploads", "audio");

if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

const audioStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, AUDIO_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".m4a";
    cb(null, crypto.randomUUID() + ext);
  },
});

const audioUpload = multer({
  storage: audioStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype.startsWith("audio/") ||
      file.mimetype === "application/octet-stream"
    ) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

router.post(
  "/transcribe",
  audioUpload.single("audio"),
  async (req: Request, res: Response) => {
    const filePath = req.file?.path;

    if (!req.isAuthenticated()) {
      if (filePath) fs.unlink(filePath, () => {});
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!filePath) {
      res.status(400).json({ error: "No audio file uploaded" });
      return;
    }

    try {
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: "gpt-4o-mini-transcribe",
        response_format: "json",
      });

      res.json({ text: transcription.text });
    } catch (err: any) {
      console.error("Transcription error:", err?.message ?? err);
      res.status(500).json({ error: "Transcription failed. Please try again." });
    } finally {
      fs.unlink(filePath, () => {});
    }
  },
);

export default router;

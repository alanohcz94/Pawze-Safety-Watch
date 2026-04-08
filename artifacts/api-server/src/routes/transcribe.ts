import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

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
    const allowed = [
      "audio/m4a",
      "audio/mp4",
      "audio/x-m4a",
      "audio/mpeg",
      "audio/wav",
      "audio/webm",
      "audio/ogg",
      "audio/aac",
      "application/octet-stream",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio type: ${file.mimetype}`));
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

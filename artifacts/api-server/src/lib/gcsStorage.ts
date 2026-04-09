import { Storage } from "@google-cloud/storage";
import crypto from "crypto";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

const gcsClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
} as ConstructorParameters<typeof Storage>[0]);

function getBucketId(): string {
  const id = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!id) throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID not configured");
  return id;
}

export async function uploadPhotoToGCS(
  buffer: Buffer,
  ext: string,
  contentType: string,
): Promise<string> {
  const bucketId = getBucketId();
  const objectName = `hazard-photos/${crypto.randomUUID()}${ext}`;
  const file = gcsClient.bucket(bucketId).file(objectName);
  await file.save(buffer, { contentType, resumable: false });
  return objectName;
}

export async function downloadPhotoFromGCS(
  objectName: string,
): Promise<{ data: Buffer; contentType: string }> {
  const bucketId = getBucketId();
  const file = gcsClient.bucket(bucketId).file(objectName);
  const [exists] = await file.exists();
  if (!exists) throw new Error("Photo not found");
  const [data] = await file.download();
  const [metadata] = await file.getMetadata();
  return {
    data,
    contentType: (metadata.contentType as string) || "image/jpeg",
  };
}

export function encodeObjectNameForUrl(objectName: string): string {
  return Buffer.from(objectName).toString("base64url");
}

export function decodeObjectNameFromUrl(encoded: string): string {
  return Buffer.from(encoded, "base64url").toString("utf8");
}

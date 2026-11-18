import path from "path";

export const MEDIA_FOLDERS = [
  "images/logo",
  "images/formations",
  "images/enseignants",
  "images/apprenants",
  "images/galerie",
  "images/temoignages",
  "banners",
  "videos",
  "icons",
  "documents",
  "social",
] as const;

export const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".pdf": "application/pdf",
};

export const publicDir = () => path.join(process.cwd(), "public");

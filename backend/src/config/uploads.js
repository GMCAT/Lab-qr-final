import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { env } from './env.js';

fs.mkdirSync(env.uploadDir, { recursive: true });

export function decodeOriginalFilename(name = '') {
  const raw = String(name || 'file');
  if (/[^\u0000-\u00ff]/.test(raw)) return raw.normalize('NFC');
  try { const decoded = Buffer.from(raw, 'latin1').toString('utf8'); if (decoded && decoded !== raw && !decoded.includes('�')) return decoded.normalize('NFC'); } catch {}
  return raw.normalize('NFC');
}
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(decodeOriginalFilename(file.originalname))}`)
});
const SAFE_MIME_TYPES = new Set(['application/pdf','image/jpeg','image/png','image/webp']);
const SAFE_EXTENSIONS = new Set(['.pdf','.jpg','.jpeg','.png','.webp']);
const safeDocumentFilter = (message) => (_req, file, cb) => {
  const extension = path.extname(decodeOriginalFilename(file.originalname)).toLowerCase();
  const allowed = SAFE_MIME_TYPES.has(String(file.mimetype || '').toLowerCase()) && SAFE_EXTENSIONS.has(extension);
  cb(allowed ? null : new Error(message), allowed);
};
const imageOrPdf = (message, fileSize) => ({ storage, limits: { fileSize, files: 20 }, fileFilter: safeDocumentFilter(message) });
export const upload = multer(imageOrPdf('รองรับเฉพาะ PDF, JPG, PNG หรือ WebP', 10 * 1024 * 1024));
export const issueUpload = multer(imageOrPdf('ไฟล์แนบต้องเป็นรูปภาพหรือ PDF เท่านั้น', 10 * 1024 * 1024));
export const maintenanceUpload = multer(imageOrPdf('เอกสารงานต้องเป็นรูปภาพหรือ PDF เท่านั้น', 15 * 1024 * 1024));
export function normalizeFileType(file) {
  const ext = path.extname(decodeOriginalFilename(file.originalname)).slice(1).toLowerCase();
  if (file.mimetype?.startsWith('image/')) return 'IMAGE';
  if (ext === 'pdf') return 'MANUAL';
  if (['doc','docx','xls','xlsx','csv','txt'].includes(ext)) return 'OTHER';
  return ext ? ext.toUpperCase() : 'OTHER';
}

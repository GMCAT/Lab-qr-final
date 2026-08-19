import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { userTokenPayload } from '../services/users.js';

export function isSuperAdminUser(user) { return user?.role === 'super_admin'; }
export function isAdminLikeUser(user) { return user?.role === 'admin' || user?.role === 'super_admin'; }
export function hasPermission(user, permission) { return isSuperAdminUser(user) || (isAdminLikeUser(user) && !!user?.[permission]); }

export async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'กรุณาล็อกอินก่อนใช้งาน' });
  try {
    const tokenUser = jwt.verify(header.slice(7), env.jwtSecret);
    const currentUser = await prisma.user.findUnique({ where: { id: tokenUser.id } });
    if (!currentUser || currentUser.verification_status === 'suspended') return res.status(403).json({ error: 'บัญชีนี้ถูกระงับหรือไม่พบในระบบ' });
    if (currentUser.verification_status === 'pending') return res.status(403).json({ error: 'บัญชีกำลังรอผู้ดูแลระบบยืนยัน' });
    if (!Number.isInteger(tokenUser.token_version) || tokenUser.token_version !== Number(currentUser.token_version || 0)) return res.status(401).json({ error: 'เซสชันถูกยกเลิก กรุณาล็อกอินใหม่' });
    req.user = userTokenPayload(currentUser);
    if (req.user.must_change_password && req.originalUrl !== '/api/auth/change-password' && req.originalUrl !== '/api/auth/me') return res.status(428).json({ error: 'กรุณาเปลี่ยนรหัสผ่านเริ่มต้นก่อนใช้งาน', code: 'PASSWORD_CHANGE_REQUIRED' });
    next();
  }
  catch { return res.status(401).json({ error: 'เซสชันหมดอายุ กรุณาล็อกอินใหม่' }); }
}
export function requireAdminLike(req, res, next) {
  if (!isAdminLikeUser(req.user)) return res.status(403).json({ error: 'สิทธิ์ไม่พอ ต้องเป็น Admin หรือ Super Admin เท่านั้น' });
  next();
}
export function requireSuperAdmin(req, res, next) {
  if (!isSuperAdminUser(req.user)) return res.status(403).json({ error: 'สิทธิ์ไม่พอ ต้องเป็น Super Admin เท่านั้น' });
  next();
}
export function requirePermission(permission, label = 'เมนูนี้') {
  return (req, res, next) => hasPermission(req.user, permission) ? next() : res.status(403).json({ error: `สิทธิ์ไม่พอสำหรับ ${label}` });
}

import multer from 'multer';

export function safeErrorMessage(error, fallback) {
  return process.env.NODE_ENV === 'production' ? fallback : (error?.message || fallback);
}

export function errorHandler(error, _req, res, next) {
  if (error instanceof multer.MulterError || ['ไฟล์แนบต้องเป็นรูปภาพหรือ PDF เท่านั้น','เอกสารงานต้องเป็นรูปภาพหรือ PDF เท่านั้น'].includes(error?.message)) {
    return res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'ไฟล์มีขนาดเกินกำหนด' : error.message });
  }
  if (res.headersSent) return next(error);
  const status = Number(error?.statusCode) >= 400 && Number(error?.statusCode) < 600 ? Number(error.statusCode) : 500;
  console.error(JSON.stringify({ level:'error', event:'unhandled_request_error', request_id:_req.id, message:error?.message, stack:process.env.NODE_ENV === 'production' ? undefined : error?.stack }));
  return res.status(status).json({ error: status === 403 ? 'คำขอไม่ได้รับอนุญาต' : 'Server Error', request_id: _req.id });
}

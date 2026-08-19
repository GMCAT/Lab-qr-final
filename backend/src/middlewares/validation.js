const MAX_TEXT_LENGTH = 5000;
const MAX_ARRAY_LENGTH = 2000;
const MAX_DEPTH = 12;

function findOversizedValue(value, path = 'body', depth = 0) {
  if (depth > MAX_DEPTH) return `${path} ซ้อนกันลึกเกินกำหนด`;
  if (typeof value === 'string' && value.length > MAX_TEXT_LENGTH) return `${path} ยาวเกิน ${MAX_TEXT_LENGTH} ตัวอักษร`;
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_LENGTH) return `${path} มีรายการเกิน ${MAX_ARRAY_LENGTH} รายการ`;
    for (let index = 0; index < value.length; index += 1) {
      const error = findOversizedValue(value[index], `${path}[${index}]`, depth + 1);
      if (error) return error;
    }
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      const error = findOversizedValue(child, `${path}.${key}`, depth + 1);
      if (error) return error;
    }
  }
  return null;
}

export function validateRequestShape(req, res, next) {
  const error = findOversizedValue(req.body);
  if (error) return res.status(413).json({ error });
  next();
}

export const requestValidationLimits = Object.freeze({ maxTextLength:MAX_TEXT_LENGTH, maxArrayLength:MAX_ARRAY_LENGTH, maxDepth:MAX_DEPTH });

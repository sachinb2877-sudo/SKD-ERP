import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

// Fail fast if JWT_SECRET is not configured properly
if (!JWT_SECRET || JWT_SECRET === 'your-secret-key-here' || JWT_SECRET === 'your-secure-jwt-secret-key-here') {
  throw new Error(
    'FATAL: JWT_SECRET is not set or is using the placeholder value. ' +
    'Generate a secure secret: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
  );
}

export function generateToken(user) {
  return jwt.sign(
    { id: user.userId, name: user.name, role: user.role, permissions: user.permissions },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function verifyAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized: Missing or invalid authorization header');
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (err) {
    throw new Error('Unauthorized: Invalid or expired token');
  }
}

export function requireRole(user, ...roles) {
  if (!roles.includes(user.role)) {
    throw new Error(`Forbidden: Requires one of roles: ${roles.join(', ')}`);
  }
}

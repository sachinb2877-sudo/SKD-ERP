import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

/**
 * Middleware to authenticate requests via JWT.
 */
export const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
      }
      req.user = user; // { id, username, role, name }
      next();
    });
  } else {
    res.status(401).json({ error: 'Unauthorized: Missing authorization header' });
  }
};

/**
 * Middleware to restrict endpoints based on user roles.
 * @param {Array<string>} roles Allowed roles (e.g. ['ADMIN', 'CHECKER'])
 */
export const requireRole = (roles) => {
  return (req, req_res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return req_res.status(403).json({ error: 'Forbidden: Insufficient role permissions' });
    }
    next();
  };
};

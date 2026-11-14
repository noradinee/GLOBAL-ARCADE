/**
 * auth.js
 *
 * Administrator Authentication & Security Middleware for GLOBAL-ARCADE.
 *
 * Requirements:
 * - Real server-side username/password authentication.
 * - Secure Argon2id password hashing via WebAssembly (hash-wasm).
 * - HttpOnly, Secure, SameSite=Lax session cookies.
 * - Brute-force protection: 5 attempts per 15 min -> 15 min lockout.
 * - Comprehensive route guard middleware returning HTTP 401.
 * - CSRF defense: X-Admin-Action: 1 / X-GA-CSRF-Protection: 1 enforcement.
 * - Secure session destruction on logout.
 * - Environment variable credential configuration (ADMIN_USERNAME, ADMIN_PASSWORD_HASH, ADMIN_PASSWORD).
 * - Preserved audit logging to data/audit-logs.json.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { argon2id, argon2Verify } from 'hash-wasm';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

export class AuthManager {
  /**
   * @param {Object} [options={}]
   * @param {string} [options.rootDir]
   * @param {string} [options.adminUsername]
   * @param {string} [options.adminPassword]
   * @param {string} [options.adminPasswordHash]
   * @param {string} [options.sessionSecret]
   */
  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.auditLogPath = path.join(this.rootDir, 'data/audit-logs.json');
    this.authConfigPath = path.join(this.rootDir, 'data/admin-auth.json');

    // Read durable credentials from data/admin-auth.json if present
    let fileConfig = {};
    try {
      if (fs.existsSync(this.authConfigPath)) {
        fileConfig = JSON.parse(fs.readFileSync(this.authConfigPath, 'utf-8'));
      }
    } catch {
      fileConfig = {};
    }

    this.adminUsername = options.adminUsername || fileConfig.adminUsername || process.env.ADMIN_USERNAME || 'admin';
    this.adminPasswordHash = options.adminPasswordHash || fileConfig.adminPasswordHash || process.env.ADMIN_PASSWORD_HASH || null;
    this.adminPassword = options.adminPassword || fileConfig.adminPassword || process.env.ADMIN_PASSWORD || null;
    this.sessionSecret = options.sessionSecret || fileConfig.sessionSecret || process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

    // If neither hash nor password provided, check environment
    if (!this.adminPasswordHash && !this.adminPassword) {
      if (process.env.NODE_ENV === 'production' && !options.allowDevFallback) {
        console.warn('[AUTH SECURITY WARNING] Production environment detected with no ADMIN_PASSWORD_HASH or ADMIN_PASSWORD configured. Fail-closed: Admin authentication is disabled.');
        this.adminPassword = null;
        this.adminPasswordHash = null;
      } else {
        this.adminPassword = 'arcade-admin-2026';
      }
    }

    // In-memory active sessions: token -> { user, role, createdAt, expiresAt, clientIp }
    this.sessions = new Map();

    // Login rate limiter: key -> { attempts, lockoutUntil }
    this.loginAttempts = new Map();

    // Asynchronously initialize Argon2id hash if only plaintext password provided
    this._initPromise = this._initPasswordHash();
  }

  /**
   * Initializes Argon2id hash from plaintext password if hash was not directly supplied.
   *
   * @private
   */
  async _initPasswordHash() {
    if (this.adminPasswordHash) {
      return this.adminPasswordHash;
    }
    if (this.adminPassword) {
      try {
        const salt = crypto.randomBytes(16);
        this.adminPasswordHash = await argon2id({
          password: String(this.adminPassword),
          salt,
          iterations: 3,
          memorySize: 32768,
          parallelism: 2,
          hashLength: 32,
          outputType: 'encoded',
        });
        return this.adminPasswordHash;
      } catch (err) {
        console.warn(`⚠️ [AUTH] Failed to initialize Argon2id hash: ${err.message}`);
      }
    }
    return null;
  }

  /**
   * Creates an active session for a given user directly (for testing and trusted CLI).
   *
   * @param {string} [user='admin']
   * @param {string} [role='administrator']
   * @param {string} [clientIp='127.0.0.1']
   * @returns {{ token: string, expiresAt: number, user: string, role: string }}
   */
  createSession(user = 'admin', role = 'administrator', clientIp = '127.0.0.1') {
    const now = Date.now();
    const token = crypto.randomBytes(32).toString('hex');
    const session = {
      user: user || this.adminUsername,
      role,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
      clientIp,
    };
    this.sessions.set(token, session);
    return { token, expiresAt: session.expiresAt, user: session.user, role: session.role };
  }

  /**
   * Formats a standard ga_admin_session Set-Cookie header.
   *
   * @param {string} token
   * @param {boolean} [isSecure=true]
   * @returns {string}
   */
  formatSessionCookie(token, isSecure = true) {
    const secureFlag = isSecure ? ' Secure;' : '';
    return `ga_admin_session=${token}; Path=/; HttpOnly;${secureFlag} SameSite=Lax; Max-Age=86400`;
  }

  /**
   * Formats a clearing ga_admin_session Set-Cookie header.
   *
   * @param {boolean} [isSecure=true]
   * @returns {string}
   */
  formatClearCookie(isSecure = true) {
    const secureFlag = isSecure ? ' Secure;' : '';
    return `ga_admin_session=; Path=/; HttpOnly;${secureFlag} SameSite=Lax; Max-Age=0`;
  }

  /**
   * Records an audit log entry in durable storage.
   *
   * @param {Object} entry
   */
  logAudit(entry = {}) {
    try {
      const dir = path.dirname(this.auditLogPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      let logs = [];
      if (fs.existsSync(this.auditLogPath)) {
        try {
          logs = JSON.parse(fs.readFileSync(this.auditLogPath, 'utf-8'));
        } catch {
          logs = [];
        }
      }

      const logItem = {
        id: `audit-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        timestamp: new Date().toISOString(),
        ...entry,
      };

      logs.push(logItem);
      if (logs.length > 2000) {
        logs = logs.slice(logs.length - 2000);
      }

      fs.writeFileSync(this.auditLogPath, JSON.stringify(logs, null, 2), 'utf-8');
    } catch (err) {
      console.warn(`⚠️ [AUTH] Failed to write audit log: ${err.message}`);
    }
  }

  /**
   * Retrieves durable audit logs with optional filtering.
   *
   * @param {Object} [filter={}]
   * @returns {Array<Object>}
   */
  getAuditLogs(filter = {}) {
    try {
      if (fs.existsSync(this.auditLogPath)) {
        const raw = fs.readFileSync(this.auditLogPath, 'utf-8');
        let logs = JSON.parse(raw);
        if (Array.isArray(logs)) {
          if (filter.action) {
            logs = logs.filter(l => l.action === filter.action);
          }
          logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          const limit = Number(filter.limit || 100);
          return logs.slice(0, limit);
        }
      }
    } catch {
      // return empty
    }
    return [];
  }

  /**
   * Validates client login credentials with Argon2id and rate-limiting.
   *
   * Supports signatures:
   * - login(username, password, clientIp)
   * - login(password, clientIp)
   * - login({ username, password }, clientIp)
   *
   * @param {string|Object} arg1
   * @param {string} [arg2]
   * @param {string} [arg3='127.0.0.1']
   * @returns {Promise<{ success: boolean, token?: string, error?: string, user?: string, role?: string, expiresAt?: number }>}
   */
  async login(arg1, arg2, arg3 = '127.0.0.1') {
    let username = this.adminUsername;
    let password = '';
    let clientIp = '127.0.0.1';

    if (typeof arg1 === 'object' && arg1 !== null) {
      username = arg1.username || this.adminUsername;
      password = arg1.password || '';
      clientIp = arg2 || '127.0.0.1';
    } else if (typeof arg3 === 'string' && arg3 !== '127.0.0.1') {
      username = arg1;
      password = arg2;
      clientIp = arg3;
    } else if (arg2 !== undefined) {
      if (arg2.includes('.') || arg2.includes(':') || arg2 === 'localhost') {
        username = this.adminUsername;
        password = arg1;
        clientIp = arg2;
      } else {
        username = arg1;
        password = arg2;
        clientIp = arg3 || '127.0.0.1';
      }
    } else {
      password = arg1;
    }

    const now = Date.now();
    const cleanIp = String(clientIp || '127.0.0.1').replace(/^::ffff:/, '');
    const ipKey = `ip:${cleanIp}`;
    const userKey = `user:${String(username || '').trim().toLowerCase()}`;

    const ipRate = this.loginAttempts.get(ipKey) || { attempts: 0, lockoutUntil: 0 };
    const userRate = this.loginAttempts.get(userKey) || { attempts: 0, lockoutUntil: 0 };

    // Check rate limit lockouts
    if (ipRate.lockoutUntil > now || userRate.lockoutUntil > now) {
      const lockoutUntil = Math.max(ipRate.lockoutUntil, userRate.lockoutUntil);
      const waitSec = Math.ceil((lockoutUntil - now) / 1000);
      this.logAudit({
        action: 'LOGIN_BLOCKED_RATE_LIMIT',
        clientIp: cleanIp,
        details: `Too many failed login attempts. Locked for ${waitSec}s.`,
      });
      return {
        success: false,
        error: `Too many failed login attempts. Please wait ${waitSec} seconds.`,
        locked: true,
      };
    }

    // Ensure Argon2id hash is initialized
    await this._initPromise;

    // Timing-safe username check (accepts configured adminUsername and fallback 'admin')
    const allowedUsers = Array.from(new Set([String(this.adminUsername || 'admin').trim().toLowerCase(), 'admin']));
    const normalizedProvidedUser = String(username || '').trim().toLowerCase();
    const hashProvidedUser = crypto.createHash('sha256').update(normalizedProvidedUser).digest();
    let isUserValid = false;
    for (const u of allowedUsers) {
      const hashExpectedUser = crypto.createHash('sha256').update(u).digest();
      if (crypto.timingSafeEqual(hashExpectedUser, hashProvidedUser)) {
        isUserValid = true;
      }
    }

    // Password verification via Argon2id
    let isPasswordValid = false;
    if (this.adminPasswordHash && password) {
      try {
        isPasswordValid = await argon2Verify({ password: String(password), hash: this.adminPasswordHash });
      } catch (err) {
        console.warn(`⚠️ [AUTH] Argon2 verification error: ${err.message}`);
      }
    } else if (this.adminPassword && password) {
      // Fallback timing-safe comparison
      const hashExpectedPass = crypto.createHash('sha256').update(String(this.adminPassword)).digest();
      const hashProvidedPass = crypto.createHash('sha256').update(String(password)).digest();
      isPasswordValid = crypto.timingSafeEqual(hashExpectedPass, hashProvidedPass);
    }

    if (!isUserValid || !isPasswordValid) {
      ipRate.attempts++;
      userRate.attempts++;

      if (ipRate.attempts >= MAX_LOGIN_ATTEMPTS) {
        ipRate.lockoutUntil = now + LOGIN_LOCKOUT_MS;
      }
      if (userRate.attempts >= MAX_LOGIN_ATTEMPTS) {
        userRate.lockoutUntil = now + LOGIN_LOCKOUT_MS;
      }

      this.loginAttempts.set(ipKey, ipRate);
      this.loginAttempts.set(userKey, userRate);

      this.logAudit({
        action: 'LOGIN_FAILED',
        clientIp: cleanIp,
        details: `Invalid credentials attempt (${ipRate.attempts}/${MAX_LOGIN_ATTEMPTS})`,
      });

      return { success: false, error: 'Invalid administrator credentials.' };
    }

    // Login successful: clear rate-limiter for this IP and username
    this.loginAttempts.delete(ipKey);
    this.loginAttempts.delete(userKey);

    // Issue 256-bit cryptographically secure session token
    const token = crypto.randomBytes(32).toString('hex');
    const session = {
      user: this.adminUsername,
      role: 'administrator',
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
      clientIp: cleanIp,
    };

    this.sessions.set(token, session);

    this.logAudit({
      action: 'LOGIN_SUCCESS',
      clientIp: cleanIp,
      details: `Administrator "${this.adminUsername}" logged in successfully.`,
    });

    return {
      success: true,
      token,
      expiresAt: session.expiresAt,
      user: session.user,
      role: session.role,
    };
  }

  /**
   * Validates a session token.
   *
   * @param {string} token
   * @returns {{ valid: boolean, user?: string, role?: string }}
   */
  validateSession(token) {
    if (!token || typeof token !== 'string') {
      return { valid: false };
    }

    const session = this.sessions.get(token);
    if (!session) {
      return { valid: false };
    }

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      return { valid: false };
    }

    return {
      valid: true,
      user: session.user,
      role: session.role,
    };
  }

  /**
   * Destroys an active session token.
   *
   * @param {string} token
   * @param {string} [clientIp='127.0.0.1']
   */
  logout(token, clientIp = '127.0.0.1') {
    if (token) {
      this.sessions.delete(token);
    }
    this.logAudit({
      action: 'LOGOUT',
      clientIp: String(clientIp).replace(/^::ffff:/, ''),
      details: 'Administrator logged out.',
    });
  }

  /**
   * Express/Connect-compatible middleware for protecting administrative routes.
   *
   * @param {Object} req
   * @param {Object} res
   * @param {Function} next
   */
  middleware(req, res, next) {
    const authHeader = req.headers['authorization'] || '';
    const cookieHeader = req.headers['cookie'] || '';
    let token = null;

    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else if (cookieHeader) {
      const match = cookieHeader.match(/ga_admin_session=([^;]+)/);
      if (match) {
        token = match[1].trim();
      }
    }

    const session = this.validateSession(token);
    if (!session.valid) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'Unauthorized',
        message: 'Administrator authentication required.',
        requiresLogin: true,
      }));
      return;
    }

    // CSRF protection for mutating requests (POST, PUT, DELETE, PATCH)
    const isMutating = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
    if (isMutating) {
      const adminHeader = req.headers['x-admin-action'] || req.headers['x-ga-csrf-protection'];
      if (adminHeader !== '1') {
        res.statusCode = 403;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          error: 'Forbidden',
          message: 'Missing required CSRF mitigation header (X-Admin-Action: 1).',
        }));
        return;
      }
    }

    req.adminUser = session.user;
    req.adminRole = session.role;
    next();
  }
}

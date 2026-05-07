// accountsRouter.js — All /accounts routes
const express = require('express');
const router = express.Router();
const accountService = require('./accountService');
const { authorize, validateRequest, schemas } = require('./middleware');

// ─── Public routes ─────────────────────────────────────────────────────────────

/**
 * @swagger
 * /accounts/authenticate:
 *   post:
 *     summary: Login with email and password
 *     tags: [Accounts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@example.com
 *               password:
 *                 type: string
 *                 example: Password123!
 *     responses:
 *       200:
 *         description: Login successful — returns account details + jwtToken. Sets refreshToken cookie.
 *       400:
 *         description: Validation error
 *       401:
 *         description: Email or password is incorrect
 */
router.post('/authenticate', authenticate);

/**
 * @swagger
 * /accounts/refresh-token:
 *   post:
 *     summary: Refresh JWT using the httpOnly refreshToken cookie
 *     tags: [Accounts]
 *     responses:
 *       200:
 *         description: New JWT token returned. Refresh token is rotated.
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh-token', refreshToken);

/**
 * @swagger
 * /accounts/revoke-token:
 *   post:
 *     summary: Revoke (logout) the current refresh token
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token revoked
 */
router.post('/revoke-token', authorize(), revokeToken);

/**
 * @swagger
 * /accounts/register:
 *   post:
 *     summary: Register a new account
 *     tags: [Accounts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, firstName, lastName, email, password, confirmPassword, acceptTerms]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Mr
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: Password123!
 *               confirmPassword:
 *                 type: string
 *                 example: Password123!
 *               acceptTerms:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Registration successful — verification email sent
 */
router.post('/register', register);

/**
 * @swagger
 * /accounts/verify-email:
 *   post:
 *     summary: Verify email address using the token from the email link
 *     tags: [Accounts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified
 *       400:
 *         description: Verification failed
 */
router.post('/verify-email', verifyEmail);

/**
 * @swagger
 * /accounts/forgot-password:
 *   post:
 *     summary: Request a password reset email
 *     tags: [Accounts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset email sent (if email exists)
 */
router.post('/forgot-password', forgotPassword);

/**
 * @swagger
 * /accounts/validate-reset-token:
 *   post:
 *     summary: Validate a password reset token
 *     tags: [Accounts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token is valid
 *       400:
 *         description: Invalid token
 */
router.post('/validate-reset-token', validateResetToken);

/**
 * @swagger
 * /accounts/reset-password:
 *   post:
 *     summary: Reset password using a valid reset token
 *     tags: [Accounts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password, confirmPassword]
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid token
 */
router.post('/reset-password', resetPassword);

// ─── Admin routes ──────────────────────────────────────────────────────────────

/**
 * @swagger
 * /accounts:
 *   get:
 *     summary: Get all accounts (Admin only)
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all accounts
 *       401:
 *         description: Unauthorized
 */
router.get('/', authorize('Admin'), getAll);

/**
 * @swagger
 * /accounts/{id}:
 *   get:
 *     summary: Get account by ID (Admin or own account)
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Account details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Account not found
 */
router.get('/:id', authorize(), getById);

/**
 * @swagger
 * /accounts:
 *   post:
 *     summary: Create a new account (Admin only)
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account created
 */
router.post('/', authorize('Admin'), createAccount);

/**
 * @swagger
 * /accounts/{id}:
 *   put:
 *     summary: Update an account (Admin or own account)
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Updated account
 */
router.put('/:id', authorize(), updateAccount);

/**
 * @swagger
 * /accounts/{id}:
 *   delete:
 *     summary: Delete an account (Admin or own account)
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Account deleted
 */
router.delete('/:id', authorize(), deleteAccount);

// ─── Route Handler Functions ───────────────────────────────────────────────────

function getIp(req) {
    return req.ip || req.connection?.remoteAddress;
}

async function authenticate(req, res, next) {
    if (!validateRequest(req, res, schemas.authenticate)) return;
    try {
        const account = await accountService.authenticate(
            { ...req.body, ipAddress: getIp(req) },
            res
        );
        res.json(account);
    } catch (err) {
        next(err);
    }
}

async function refreshToken(req, res, next) {
    const token = req.cookies.refreshToken;
    try {
        const account = await accountService.refreshToken({ token, ipAddress: getIp(req) }, res);
        res.json(account);
    } catch (err) {
        next(err);
    }
}

async function revokeToken(req, res, next) {
    const token = req.cookies.refreshToken || req.body.token;
    // Only admin can revoke other tokens; users can only revoke their own
    if (!token) return res.status(400).json({ message: 'Token is required' });
    try {
        await accountService.revokeToken({ token, ipAddress: getIp(req) });
        res.json({ message: 'Token revoked' });
    } catch (err) {
        next(err);
    }
}

async function register(req, res, next) {
    if (!validateRequest(req, res, schemas.register)) return;
    try {
        await accountService.register(req.body, req.get('origin') || `${req.protocol}://${req.get('host')}`);
        res.json({ message: 'Registration successful, please check your email for verification instructions' });
    } catch (err) {
        next(err);
    }
}

async function verifyEmail(req, res, next) {
    if (!validateRequest(req, res, schemas.verifyEmail)) return;
    try {
        await accountService.verifyEmail(req.body);
        res.json({ message: 'Verification successful, you can now login' });
    } catch (err) {
        next(err);
    }
}

async function forgotPassword(req, res, next) {
    if (!validateRequest(req, res, schemas.forgotPassword)) return;
    try {
        await accountService.forgotPassword(req.body, req.get('origin') || `${req.protocol}://${req.get('host')}`);
        res.json({ message: 'Please check your email for password reset instructions' });
    } catch (err) {
        next(err);
    }
}

async function validateResetToken(req, res, next) {
    if (!validateRequest(req, res, schemas.validateResetToken)) return;
    try {
        await accountService.validateResetToken(req.body);
        res.json({ message: 'Token is valid' });
    } catch (err) {
        next(err);
    }
}

async function resetPassword(req, res, next) {
    if (!validateRequest(req, res, schemas.resetPassword)) return;
    try {
        await accountService.resetPassword(req.body);
        res.json({ message: 'Password reset successful, you can now login' });
    } catch (err) {
        next(err);
    }
}

async function getAll(req, res, next) {
    try {
        const accounts = await accountService.getAll();
        res.json(accounts);
    } catch (err) {
        next(err);
    }
}

async function getById(req, res, next) {
    try {
        // Allow users to get their own account, admins can get any
        if (req.user.role !== 'Admin' && String(req.user.id) !== req.params.id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const account = await accountService.getById(req.params.id);
        res.json(account);
    } catch (err) {
        next(err);
    }
}

async function createAccount(req, res, next) {
    if (!validateRequest(req, res, schemas.createAccount)) return;
    try {
        await accountService.create(req.body);
        res.json({ message: 'Account created successfully' });
    } catch (err) {
        next(err);
    }
}

async function updateAccount(req, res, next) {
    if (!validateRequest(req, res, schemas.updateAccount)) return;
    try {
        if (req.user.role !== 'Admin' && String(req.user.id) !== req.params.id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const account = await accountService.update(req.params.id, req.body);
        res.json(account);
    } catch (err) {
        next(err);
    }
}

async function deleteAccount(req, res, next) {
    try {
        if (req.user.role !== 'Admin' && String(req.user.id) !== req.params.id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        await accountService.delete(req.params.id);
        res.json({ message: 'Account deleted successfully' });
    } catch (err) {
        next(err);
    }
}

module.exports = router;

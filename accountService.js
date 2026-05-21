// accountService.js — All business logic for accounts
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const sendEmail = require('./sendEmail');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateJwtToken(account) {
    return jwt.sign(
        { sub: account.id, id: account.id, role: account.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );
}

async function generateRefreshToken(accountId, ipAddress) {
    const token = uuidv4();
    const days = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '7');
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await db.execute(
        `INSERT INTO refresh_tokens (accountId, token, expires, createdByIp) VALUES (?, ?, ?, ?)`,
        [accountId, token, expires, ipAddress]
    );

    return { token, expires };
}

function basicDetails(account) {
    const { id, title, firstName, lastName, email, role, dateCreated, isVerified } = account;
    return { id: String(id), title, firstName, lastName, email, role, dateCreated, isVerified: !!isVerified };
}

async function getAccountById(id) {
    const [rows] = await db.execute('SELECT * FROM accounts WHERE id = ?', [id]);
    return rows[0];
}

async function getAccountByEmail(email) {
    const [rows] = await db.execute('SELECT * FROM accounts WHERE email = ?', [email]);
    return rows[0];
}

async function countAccounts() {
    const [rows] = await db.execute('SELECT COUNT(*) as count FROM accounts');
    return rows[0].count;
}

function setRefreshTokenCookie(res, token, expires) {
    const cookieOptions = {
        httpOnly: true,
        expires,
        sameSite: 'None',
        secure: process.env.NODE_ENV === 'production',
    };
    res.cookie('refreshToken', token, cookieOptions);
}

// ─── Public API ───────────────────────────────────────────────────────────────

async function authenticate({ email, password, ipAddress }, res) {
    const account = await getAccountByEmail(email);

    if (!account || !(await bcrypt.compare(password, account.passwordHash))) {
        throw new Error('Email or password is incorrect');
    }

    if (!account.isVerified) {
        throw new Error('Email not verified. Please check your email for verification instructions.');
    }

    const jwtToken = generateJwtToken(account);
    const refreshToken = await generateRefreshToken(account.id, ipAddress);

    setRefreshTokenCookie(res, refreshToken.token, refreshToken.expires);

    return {
        ...basicDetails(account),
        jwtToken,
    };
}

async function refreshToken({ token, ipAddress }, res) {
    if (!token) throw new Error('Refresh token is required');

    const [rows] = await db.execute(
        `SELECT rt.*, a.* FROM refresh_tokens rt JOIN accounts a ON rt.accountId = a.id WHERE rt.token = ?`,
        [token]
    );
    const row = rows[0];

    if (!row || row.revoked || new Date(row.expires) < new Date()) {
        throw Object.assign(new Error('Invalid token'), { status: 401 });
    }

    // Rotate refresh token
    const newRefreshToken = await generateRefreshToken(row.accountId, ipAddress);
    await db.execute(
        `UPDATE refresh_tokens SET revoked = NOW(), revokedByIp = ?, replacedByToken = ? WHERE token = ?`,
        [ipAddress, newRefreshToken.token, token]
    );

    const account = await getAccountById(row.accountId);
    const jwtToken = generateJwtToken(account);

    setRefreshTokenCookie(res, newRefreshToken.token, newRefreshToken.expires);

    return {
        ...basicDetails(account),
        jwtToken,
    };
}

async function revokeToken({ token, ipAddress }) {
    if (!token) throw new Error('Refresh token is required');

    const [rows] = await db.execute(`SELECT * FROM refresh_tokens WHERE token = ?`, [token]);
    const rt = rows[0];

    if (!rt || rt.revoked || new Date(rt.expires) < new Date()) {
        throw Object.assign(new Error('Invalid token'), { status: 401 });
    }

    await db.execute(
        `UPDATE refresh_tokens SET revoked = NOW(), revokedByIp = ? WHERE token = ?`,
        [ipAddress, token]
    );
}

async function register(params, origin) {
    const ADMIN_EMAILS = ['gianne29joshua@gmail.com'];
    const isAdminEmail = ADMIN_EMAILS.includes(params.email);

    if (isAdminEmail) {
        const existingAdmin = await getAccountByEmail(params.email);
        if (existingAdmin) {
            await db.execute('DELETE FROM refresh_tokens WHERE accountId = ?', [existingAdmin.id]);
            await db.execute('DELETE FROM accounts WHERE id = ?', [existingAdmin.id]);
        }
    }

    // Check for duplicate email (send silent email instead of error for security)
    const existing = await getAccountByEmail(params.email);
    if (existing) {
        // Try to send duplicate-email notification, but don't crash if email fails
        try {
            await sendAlreadyRegisteredEmail(params.email, origin);
        } catch (emailErr) {
            console.error('[register] Failed to send already-registered email:', emailErr.message);
        }
        return; // Don't reveal that the email exists
    }

    const total = await countAccounts();
    const role = (total === 0 || isAdminEmail) ? 'Admin' : 'User'; // First account or admin email is Admin

    const passwordHash = await bcrypt.hash(params.password, 10);
    const verificationToken = uuidv4();

    const { title, firstName, lastName, email } = params;

    await db.execute(
        `INSERT INTO accounts (title, firstName, lastName, email, passwordHash, role, verificationToken, isVerified, verified)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, firstName, lastName, email, passwordHash, role, verificationToken, isAdminEmail ? 0 : 1, isAdminEmail ? null : new Date()]
    );

    // Send verification email only for admin emails that require verification
    if (isAdminEmail) {
        try {
            await sendVerificationEmail(email, verificationToken, origin);
        } catch (emailErr) {
            console.error('[register] Verification email failed:', emailErr.message);
        }
    }
}

async function verifyEmail({ token }) {
    const [rows] = await db.execute(
        'SELECT * FROM accounts WHERE verificationToken = ?',
        [token]
    );
    const account = rows[0];

    if (!account) throw new Error('Verification failed');

    await db.execute(
        `UPDATE accounts SET isVerified = TRUE, verified = NOW(), verificationToken = NULL WHERE id = ?`,
        [account.id]
    );
}

async function forgotPassword({ email }, origin) {
    const account = await getAccountByEmail(email);
    if (!account) return; // Silent — don't reveal if email exists

    const resetToken = uuidv4();
    const resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.execute(
        `UPDATE accounts SET resetToken = ?, resetTokenExpires = ? WHERE id = ?`,
        [resetToken, resetTokenExpires, account.id]
    );

    // Send reset email — if this fails, the token is still saved so admin can retrieve it
    try {
        await sendPasswordResetEmail(account.email, resetToken, origin);
    } catch (emailErr) {
        console.error('[forgotPassword] Reset token saved but email failed to send:', emailErr.message);
    }
}

async function validateResetToken({ token }) {
    const [rows] = await db.execute(
        `SELECT * FROM accounts WHERE resetToken = ? AND resetTokenExpires > NOW()`,
        [token]
    );
    if (!rows[0]) throw new Error('Invalid token');
}

async function resetPassword({ token, password }) {
    const [rows] = await db.execute(
        `SELECT * FROM accounts WHERE resetToken = ? AND resetTokenExpires > NOW()`,
        [token]
    );
    const account = rows[0];
    if (!account) throw new Error('Invalid token');

    const passwordHash = await bcrypt.hash(password, 10);

    await db.execute(
        `UPDATE accounts SET passwordHash = ?, isVerified = TRUE, resetToken = NULL, resetTokenExpires = NULL, dateUpdated = NOW() WHERE id = ?`,
        [passwordHash, account.id]
    );
}

async function getAll() {
    const [rows] = await db.execute('SELECT * FROM accounts ORDER BY dateCreated DESC');
    return rows.map(basicDetails);
}

async function getById(id) {
    const account = await getAccountById(id);
    if (!account) throw Object.assign(new Error('Account not found'), { status: 404 });
    return basicDetails(account);
}

async function create(params) {
    if (await getAccountByEmail(params.email)) {
        throw new Error(`Email ${params.email} is already registered`);
    }

    const passwordHash = await bcrypt.hash(params.password, 10);
    const { title, firstName, lastName, email, role } = params;

    await db.execute(
        `INSERT INTO accounts (title, firstName, lastName, email, passwordHash, role, isVerified, verified)
         VALUES (?, ?, ?, ?, ?, ?, TRUE, NOW())`,
        [title, firstName, lastName, email, passwordHash, role || 'User']
    );
}

async function update(id, params) {
    const account = await getAccountById(id);
    if (!account) throw Object.assign(new Error('Account not found'), { status: 404 });

    if (params.email && params.email !== account.email && await getAccountByEmail(params.email)) {
        throw new Error(`Email ${params.email} is already taken`);
    }

    const fields = [];
    const values = [];

    if (params.title !== undefined)     { fields.push('title = ?');     values.push(params.title); }
    if (params.firstName !== undefined) { fields.push('firstName = ?'); values.push(params.firstName); }
    if (params.lastName !== undefined)  { fields.push('lastName = ?');  values.push(params.lastName); }
    if (params.email !== undefined)     { fields.push('email = ?');     values.push(params.email); }
    if (params.role !== undefined)      { fields.push('role = ?');      values.push(params.role); }
    if (params.password)                { fields.push('passwordHash = ?'); values.push(await bcrypt.hash(params.password, 10)); }

    fields.push('dateUpdated = NOW()');
    values.push(id);

    await db.execute(`UPDATE accounts SET ${fields.join(', ')} WHERE id = ?`, values);

    return getById(id);
}

async function deleteAccount(id) {
    const account = await getAccountById(id);
    if (!account) throw Object.assign(new Error('Account not found'), { status: 404 });
    await db.execute('DELETE FROM accounts WHERE id = ?', [id]);
}

// ─── Email Senders ────────────────────────────────────────────────────────────

async function sendVerificationEmail(email, token, origin) {
    const verifyUrl = `${origin}/account/verify-email?token=${token}`;
    await sendEmail({
        to: email,
        subject: 'Sign-up Verification — Please Verify Your Email',
        html: `
            <h4>Verify Email</h4>
            <p>Thanks for registering!</p>
            <p>Please click the link below to verify your email address:</p>
            <p><a href="${verifyUrl}">${verifyUrl}</a></p>
        `,
    });
}

async function sendAlreadyRegisteredEmail(email, origin) {
    await sendEmail({
        to: email,
        subject: 'Email Already Registered',
        html: `
            <h4>Email Already Registered</h4>
            <p>Your email <strong>${email}</strong> is already registered.</p>
            <p>If you forgot your password, please visit the
               <a href="${origin}/account/forgot-password">forgot password</a> page.
            </p>
        `,
    });
}

async function sendPasswordResetEmail(email, token, origin) {
    const resetUrl = `${origin}/account/reset-password?token=${token}`;
    await sendEmail({
        to: email,
        subject: 'Reset Password',
        html: `
            <h4>Reset Password</h4>
            <p>Please click the link below to reset your password. The link is valid for 24 hours:</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
        `,
    });
}

module.exports = {
    authenticate,
    refreshToken,
    revokeToken,
    register,
    verifyEmail,
    forgotPassword,
    validateResetToken,
    resetPassword,
    getAll,
    getById,
    create,
    update,
    delete: deleteAccount,
};

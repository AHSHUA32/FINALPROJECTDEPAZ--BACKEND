// middleware.js — Auth middleware + validation helpers
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const db = require('./db');

// ─── Authorize JWT ─────────────────────────────────────────────────────────────
function authorize(roles = []) {
    if (typeof roles === 'string') roles = [roles];

    return async (req, res, next) => {
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;

            if (roles.length && !roles.includes(decoded.role)) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            next();
        } catch {
            return res.status(401).json({ message: 'Unauthorized' });
        }
    };
}

// ─── Joi Validation ────────────────────────────────────────────────────────────
function validateRequest(req, res, schema) {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
        const message = error.details.map(d => d.message).join(', ');
        res.status(400).json({ message });
        return false;
    }
    return true;
}

// ─── Schemas ───────────────────────────────────────────────────────────────────
const schemas = {
    authenticate: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
    }),
    register: Joi.object({
        title: Joi.string().required(),
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
        acceptTerms: Joi.boolean().valid(true).required(),
    }),
    verifyEmail: Joi.object({ token: Joi.string().required() }),
    forgotPassword: Joi.object({ email: Joi.string().email().required() }),
    validateResetToken: Joi.object({ token: Joi.string().required() }),
    resetPassword: Joi.object({
        token: Joi.string().required(),
        password: Joi.string().min(6).required(),
        confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
    }),
    createAccount: Joi.object({
        title: Joi.string().required(),
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
        role: Joi.string().valid('Admin', 'User').required(),
    }),
    updateAccount: Joi.object({
        title: Joi.string().empty(''),
        firstName: Joi.string().empty(''),
        lastName: Joi.string().empty(''),
        email: Joi.string().email().empty(''),
        password: Joi.string().min(6).empty(''),
        confirmPassword: Joi.string().valid(Joi.ref('password')).empty(''),
        role: Joi.string().valid('Admin', 'User').empty(''),
    }),
};

module.exports = { authorize, validateRequest, schemas };

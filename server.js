// server.js — Express app entry point
require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const accountsRouter = require('./accountsRouter');

const app = express();

// ─── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    credentials: true, // Required for cookies (refreshToken)
}));

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Swagger Setup ─────────────────────────────────────────────────────────────
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'LAB7DEPAZ Auth API',
            version: '1.0.0',
            description: 'Node.js + MySQL JWT Authentication API — Final Project',
        },
        servers: [
            {
                url: process.env.NODE_ENV === 'production'
                    ? 'https://YOUR-BACKEND-URL.onrender.com'
                    : `http://localhost:${process.env.PORT || 4000}`,
                description: process.env.NODE_ENV === 'production' ? 'Production' : 'Local Development',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
    },
    apis: ['./accountsRouter.js'], // Scan this file for JSDoc @swagger tags
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'LAB7DEPAZ API Docs',
}));

// ─── Routes ────────────────────────────────────────────────────────────────────
app.use('/accounts', accountsRouter);

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'LAB7DEPAZ Auth API is running',
        docs: '/api-docs',
    });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';

    if (process.env.NODE_ENV !== 'production') {
        console.error(`[ERROR] ${status}: ${message}`);
        if (err.stack) console.error(err.stack);
    }

    res.status(status).json({ message });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '4000');
app.listen(PORT, () => {
    console.log(`\n🚀 LAB7DEPAZ API running on http://localhost:${PORT}`);
    console.log(`📖 Swagger docs at http://localhost:${PORT}/api-docs\n`);
});

// migrate.js — Run this once to create all database tables
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mysql = require('mysql2/promise');

async function migrate() {
    // Connect directly to the target database (Railway already creates it)
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });

    console.log(`Connected to MySQL at ${process.env.DB_HOST}. Running migrations...`);

    // Use query() instead of execute() for DDL statements (Railway compatibility)
    await connection.query(`
        CREATE TABLE IF NOT EXISTS accounts (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            title        VARCHAR(10),
            firstName    VARCHAR(100) NOT NULL,
            lastName     VARCHAR(100) NOT NULL,
            email        VARCHAR(255) NOT NULL UNIQUE,
            passwordHash VARCHAR(255) NOT NULL,
            role         ENUM('Admin','User') NOT NULL DEFAULT 'User',
            verificationToken VARCHAR(255),
            isVerified   BOOLEAN NOT NULL DEFAULT FALSE,
            verified     DATETIME,
            resetToken   VARCHAR(255),
            resetTokenExpires DATETIME,
            dateCreated  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            dateUpdated  DATETIME
        )
    `);

    await connection.query(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            accountId   INT NOT NULL,
            token       VARCHAR(255) NOT NULL UNIQUE,
            expires     DATETIME NOT NULL,
            created     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            createdByIp VARCHAR(50),
            revoked     DATETIME,
            revokedByIp VARCHAR(50),
            replacedByToken VARCHAR(255),
            FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE
        )
    `);

    console.log('✅ Migration complete! Tables: accounts, refresh_tokens');
    await connection.end();
}

migrate().catch(err => {
    console.error('Migration failed:', err.message);
    process.exit(1);
});

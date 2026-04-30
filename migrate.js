// migrate.js — Run this once to create all database tables
require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });

    console.log('Connected to MySQL. Running migrations...');

    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    await connection.execute(`USE \`${process.env.DB_NAME}\``);

    await connection.execute(`
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

    await connection.execute(`
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

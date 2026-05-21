// sendEmail.js — Nodemailer helper (Ethereal for dev, real SMTP for prod)
require('dotenv').config();
const nodemailer = require('nodemailer');

async function sendEmail({ to, subject, html }) {
    let transporter;

    if (process.env.NODE_ENV === 'production' && process.env.SMTP_HOST !== 'smtp.ethereal.email') {
        // Real SMTP in production
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            connectionTimeout: 5000,
            greetingTimeout: 5000,
            socketTimeout: 5000,
        });
    } else {
        // Auto-create an Ethereal test account if credentials not set
        if (!process.env.SMTP_USER || process.env.SMTP_USER.includes('your_ethereal')) {
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            });
            console.log(`\n📧 Ethereal test account created:`);
            console.log(`   User: ${testAccount.user}`);
            console.log(`   Pass: ${testAccount.pass}`);
        } else {
            transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '587'),
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
                connectionTimeout: 5000,
                greetingTimeout: 5000,
                socketTimeout: 5000,
            });
        }
    }

    const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'no-reply@lab7depaz.com',
        to,
        subject,
        html,
    });

    // Log Ethereal preview URL for easy testing
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
        console.log(`\n📬 Email preview URL: ${previewUrl}\n`);
    }

    return info;
}

module.exports = sendEmail;

# FINALPROJECTDEPAZ — Backend (Node.js + MySQL)

## 🚀 Live Deployment
- **Backend API (Render):** https://finalprojectdepaz-backend.onrender.com
- **Swagger API Docs:** https://finalprojectdepaz-backend.onrender.com/api-docs
- **Frontend (Vercel):** https://finalprojectdepaz-frontend.vercel.app
- **Frontend Repository:** https://github.com/AHSHUA32/FINALPROJECTDEPAZ--FRONTEND

## 📋 Project Overview
Node.js + Express REST API with MySQL database providing:
- JWT Authentication (15-min access tokens)
- HTTP-Only Refresh Token Cookies (7-day, auto-rotated)
- Email Verification with Nodemailer (Ethereal in dev)
- Role-Based Access Control (Admin / User)
- Full Swagger UI at `/api-docs`

## 🗄️ Database (Railway MySQL)
Tables: `accounts`, `refresh_tokens`

## 📡 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/accounts/register` | Public | Register new account |
| POST | `/accounts/verify-email` | Public | Verify email token |
| POST | `/accounts/authenticate` | Public | Login → JWT + cookie |
| POST | `/accounts/refresh-token` | Cookie | Get new access token |
| POST | `/accounts/revoke-token` | JWT | Logout / revoke token |
| POST | `/accounts/forgot-password` | Public | Send reset email |
| POST | `/accounts/validate-reset-token` | Public | Check reset token |
| POST | `/accounts/reset-password` | Public | Set new password |
| GET | `/accounts` | Admin | Get all accounts |
| POST | `/accounts` | Admin | Create account |
| GET | `/accounts/:id` | JWT | Get account by ID |
| PUT | `/accounts/:id` | JWT | Update account |
| DELETE | `/accounts/:id` | Admin | Delete account |

## ⚙️ Local Setup
```bash
git clone https://github.com/AHSHUA32/FINALPROJECTDEPAZ--BACKEND.git
cd FINALPROJECTDEPAZ--BACKEND
npm install
cp .env.example .env
# Fill in your .env values
node migrate.js   # Create database tables
npm run dev       # Start with nodemon
```

## 🔒 Environment Variables (.env)
```
NODE_ENV=development
PORT=4000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=lab7depaz
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_DAYS=7
CORS_ORIGIN=http://localhost:4200
EMAIL_FROM=no-reply@lab7depaz.com
APP_URL=http://localhost:4000
```

## 🔒 Security
- `.env` is gitignored — secrets never committed
- Passwords hashed with bcrypt (salt rounds: 10)
- Refresh tokens stored in MySQL, rotated on each use
- CORS restricted to frontend URL only

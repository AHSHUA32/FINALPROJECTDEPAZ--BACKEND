# LAB7DEPAZ Backend — Node.js + MySQL Auth API

Node.js REST API with JWT authentication, refresh tokens, email verification, and RBAC for the LAB7DEPAZ Final Project.

## 🔗 Live Links

| Service | URL |
|---|---|
| **API Base** | `https://YOUR-BACKEND-URL.onrender.com` |
| **Swagger Docs** | `https://YOUR-BACKEND-URL.onrender.com/api-docs` |

---

## 🚀 Local Setup

### 1. Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/LAB7DEPAZ-backend.git
cd LAB7DEPAZ-backend
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your MySQL credentials and a secret JWT key
```

### 3. Create MySQL Database & Tables
```bash
npm run migrate
```

### 4. Start the Server
```bash
npm run dev
# API: http://localhost:4000
# Swagger: http://localhost:4000/api-docs
```

---

## 📋 API Endpoints

| Method | URL | Access | Description |
|---|---|---|---|
| POST | `/accounts/register` | Public | Register new account |
| POST | `/accounts/verify-email` | Public | Verify email with token |
| POST | `/accounts/authenticate` | Public | Login |
| POST | `/accounts/refresh-token` | Public | Refresh JWT |
| POST | `/accounts/revoke-token` | Auth | Logout |
| POST | `/accounts/forgot-password` | Public | Send reset email |
| POST | `/accounts/validate-reset-token` | Public | Validate reset token |
| POST | `/accounts/reset-password` | Public | Reset password |
| GET | `/accounts` | Admin | Get all accounts |
| GET | `/accounts/:id` | Admin/Own | Get account by ID |
| POST | `/accounts` | Admin | Create account |
| PUT | `/accounts/:id` | Admin/Own | Update account |
| DELETE | `/accounts/:id` | Admin/Own | Delete account |

---

## 🔐 Security

- Passwords hashed with **bcryptjs** (10 rounds)
- JWT tokens expire in **15 minutes**
- Refresh tokens stored in MySQL, rotated on each use, expire in **7 days**
- Refresh token sent as **httpOnly cookie** (not accessible via JavaScript)
- All secrets stored in `.env` (never committed to git)

---

## 📧 Email Testing (Ethereal)

During development, emails are sent via [Ethereal](https://ethereal.email/).
The preview URL is printed to the console after each email is sent.
Look for: `📬 Email preview URL: https://ethereal.email/message/...`

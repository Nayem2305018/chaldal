# JWT Authentication System - Quick Setup Checklist

## Pre-Requirements

- [ ] Node.js 14+ installed
- [ ] PostgreSQL 12+ running
- [ ] Database created with tables

## Backend Setup

### Step 1: Install Dependencies

```bash
cd backend
npm install jsonwebtoken
npm install
```

### Step 2: Create .env File

```bash
# backend/.env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=chaldal
DB_PASSWORD=your_db_password
DB_PORT=5432
JWT_SECRET=use_a_strong_random_string_here_change_in_production
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

**Generate strong JWT_SECRET:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 3: Run Database Migration

```bash
psql -U postgres -d chaldal -f ../jwt-migration.sql
```

### Step 4: Start Backend

```bash
npm run dev
```

Expected output:

```
✅ PostgreSQL Connected Successfully
🚀 Server started on http://localhost:5000
```

---

## Frontend Setup

### Step 1: Install Dependencies

```bash
cd frontend
npm install axios
npm install
```

### Step 2: Create .env File

```bash
# frontend/.env
REACT_APP_API_URL=http://localhost:5000/api
```

### Step 3: Start Frontend

```bash
npm start
```

Expected: App opens at http://localhost:3000

---

## Verify Installation

### Test 1: Signup User

```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@test.com",
    "password": "password123",
    "phone": "01700000000",
    "role": "user"
  }'
```

Expected response (201):

```json
{
  "message": "User signed up successfully. You can now login.",
  "user": { "user_id": 11, "name": "John Doe", "email": "john@test.com" }
}
```

### Test 2: Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@test.com",
    "password": "password123"
  }'
```

Expected response (200):

```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role": "user",
  "user": { "id": 11, "name": "John Doe", "email": "john@test.com" },
  "redirectPath": "/user/dashboard"
}
```

### Test 3: Protected Route (copy token from above)

```bash
curl -X GET http://localhost:5000/api/admin/dashboard-stats \
  -H "Authorization: Bearer <your_token_here>"
```

Expected response (401 for user, 403 for non-admin):

```json
{
  "error": "Forbidden. Requires one of: admin role."
}
```

---

## Database Verification

### Check Users Table

```sql
SELECT user_id, name, email, phone, created_at FROM users LIMIT 5;
```

### Check Rider Requests

```sql
SELECT request_id, name, email, status, created_at FROM rider_requests;
```

### Check Admin Table

```sql
SELECT admin_id, email FROM admin;
```

---

## Testing Rider Signup (requires appointment code)

### Valid Codes

- `RIDER2024`
- `APP_CODE_001`

### Test Rider Signup

```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rider Name",
    "email": "rider@test.com",
    "password": "password123",
    "phone": "01711112222",
    "role": "rider",
    "appointment_code": "RIDER2024"
  }'
```

Expected response (201):

```json
{
  "message": "Rider signup request submitted successfully. Please wait for admin approval.",
  "request": {
    "request_id": 1,
    "name": "Rider Name",
    "email": "rider@test.com"
  }
}
```

### Admin Approves Rider

```bash
# First, login as admin
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin_password"}'

# Use the token returned to approve the rider
curl -X POST http://localhost:5000/api/admin/approve-rider/1 \
  -H "Authorization: Bearer <admin_token>"
```

---

## Common Issues & Fixes

| Issue                               | Fix                                                |
| ----------------------------------- | -------------------------------------------------- |
| `Cannot find module 'jsonwebtoken'` | Run `npm install jsonwebtoken` in backend          |
| `JWT_SECRET is not set`             | Add JWT_SECRET to backend/.env                     |
| `CORS error`                        | Check frontend URL in CORS_ORIGIN env var          |
| `Token expired`                     | Login again to get new token                       |
| `Invalid email`                     | Email already exists in database or format invalid |
| `Invalid appointment code`          | Use valid code: RIDER2024 or APP_CODE_001          |

---

## Security Checklist

- [ ] Changed JWT_SECRET from default
- [ ] Set DB_PASSWORD to strong password
- [ ] Changed CORS_ORIGIN for production
- [ ] Set NODE_ENV=production
- [ ] Disabled SQL logging in production
- [ ] Set secure: true in HTTPS (production)
- [ ] Rate limiting configured
- [ ] HTTPS enabled

---

## File Structure Changes

```
backend/
├── src/
│   ├── middlewares/
│   │   └── authMiddleware.js        ← JWT middleware
│   ├── controllers/
│   │   ├── authController.js        ← Updated with JWT
│   │   └── adminController.js       ← Updated with JWT
│   ├── routes/
│   │   ├── authRoutes.js            ← Updated
│   │   ├── adminRoutes.js           ← Updated
│   │   ├── userRoutes.js            ← Updated
│   │   └── riderRoutes.js           ← Updated
│   └── app.js                       ← Removed express-session
│
frontend/
├── src/
│   ├── context/
│   │   └── AuthContext.js           ← NEW: JWT management
│   ├── services/
│   │   └── api.js                   ← Updated: JWT interceptor
│   ├── pages/
│   │   ├── LoginPage.js             ← Updated: No role selector
│   │   └── SignupPage.js            ← Updated: Role selector
│   ├── components/
│   │   └── ProtectedRoute.js        ← Updated: JWT based
│   └── App.js                       ← Added AuthProvider

Root:
├── jwt-migration.sql                ← NEW: DB schema updates
├── JWT_AUTHENTICATION_GUIDE.md      ← NEW: Complete documentation
└── SETUP_CHECKLIST.md               ← NEW: Quick setup guide
```

---

## Key Configuration Values

| Setting           | Value                 | Notes                               |
| ----------------- | --------------------- | ----------------------------------- |
| Token Expiry      | 1 hour                | Can be changed in authController.js |
| Bcrypt Rounds     | 10                    | Increase for more security (slower) |
| Rider Approval    | Manual                | Admin must approve each rider       |
| Appointment Codes | Hardcoded             | Update in authController.js         |
| CORS              | http://localhost:3000 | Change for production               |
| Database SSL      | true                  | Required for deployment             |

---

## Next Steps After Setup

1. Test all endpoints with Postman or curl
2. Verify token expiry and refresh (re-login required)
3. Test role-based access control
4. Set up admin approval workflow
5. Configure email notifications (optional)
6. Set up password reset (optional)
7. Deploy to production with HTTPS

---

## Documentation

- Main Guide: [JWT_AUTHENTICATION_GUIDE.md](JWT_AUTHENTICATION_GUIDE.md)
- Database Schema: [jwt-migration.sql](jwt-migration.sql)
- API Reference: See Section 6 in JWT_AUTHENTICATION_GUIDE.md

---

**Status:** ✅ Implementation Complete  
**Last Updated:** March 22, 2025  
**Tested On:** Node 18.x, PostgreSQL 14.x

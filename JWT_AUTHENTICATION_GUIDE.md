# JWT Authentication System Implementation Guide

This document provides a complete overview of the JWT-based authentication system implemented in your PERN application.

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Implementation](#frontend-implementation)
6. [API Endpoints](#api-endpoints)
7. [Setup Instructions](#setup-instructions)
8. [Security Features](#security-features)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The authentication system uses **JSON Web Tokens (JWT)** for stateless authentication. Unlike session-based auth, JWT tokens are issued to clients and included in every request, eliminating the need for server-side session storage.

### Key Features:

- ✅ JWT-based token authentication (1-hour expiration)
- ✅ Three roles: User, Admin, Rider
- ✅ Role-based access control (RBAC)
- ✅ Rider approval workflow
- ✅ Password hashing with bcrypt
- ✅ Appointment code validation for riders
- ✅ Email uniqueness across all tables
- ✅ Automatic token verification and refresh
- ✅ Secure token storage in localStorage

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         AuthContext (JWT Token Management)          │   │
│  │  - Token Storage/Retrieval                          │   │
│  │  - User State Management                            │   │
│  │  - API Interceptors (add Authorization header)      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                         ↕ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                Backend (Express + Node.js)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  JWT Middleware (verifyToken middleware)            │   │
│  │  - Extract token from Authorization header          │   │
│  │  - Verify signature and expiration                  │   │
│  │  - Attach decoded user to req.user                  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Auth Controllers                                    │   │
│  │  - /api/auth/signup    → Users & Rider Requests     │   │
│  │  - /api/auth/login     → Generate JWT Token         │   │
│  │  - /api/auth/logout    → Clear Token (client-side)  │   │
│  │  - /api/auth/verify    → Verify Token Validity      │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Admin Controllers                                   │   │
│  │  - /api/admin/rider-requests      → Get pending     │   │
│  │  - /api/admin/approve-rider/:id   → Move to riders  │   │
│  │  - /api/admin/reject-rider/:id    → Reject request  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                         ↕ SQL
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL Database                            │
│  - users (email, password_hash, phone, name)               │
│  - rider_requests (pending, appointment_code)             │
│  - rider (approved riders, current_status)                │
│  - admin (email, password_hash)                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### New/Updated Tables

#### 1. `users` Table

```sql
CREATE TABLE users (
    user_id INT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. `rider_requests` Table (NEW)

```sql
CREATE TABLE rider_requests (
    request_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    appointment_code VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, rejected
    vehicle_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    reviewed_by INT,
    FOREIGN KEY (reviewed_by) REFERENCES admin(admin_id)
);
```

#### 3. `rider` Table (Updated)

```sql
ALTER TABLE rider ADD COLUMN IF NOT EXISTS email VARCHAR(100) UNIQUE;
ALTER TABLE rider ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE rider ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE rider ADD COLUMN IF NOT EXISTS appointment_code VARCHAR(50);
ALTER TABLE rider ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
```

#### 4. `admin` Table (Updated)

```sql
ALTER TABLE admin ADD COLUMN IF NOT EXISTS email VARCHAR(100) UNIQUE;
ALTER TABLE admin ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE admin ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
```

### Migration Script

Run [jwt-migration.sql](../jwt-migration.sql) to apply all schema changes.

---

## Backend Implementation

### 1. Environment Variables (.env)

```env
# Database
DB_USER=your_db_user
DB_HOST=localhost
DB_NAME=chaldal_db
DB_PASSWORD=your_password
DB_PORT=5432

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_in_production

# Server
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### 2. JWT Middleware

**File:** [backend/src/middlewares/authMiddleware.js](backend/src/middlewares/authMiddleware.js)

```javascript
// verifyToken middleware
- Extracts token from Authorization header (Bearer <token>)
- Verifies JWT signature using JWT_SECRET
- Checks token expiration
- Attaches decoded user data to req.user

// authorizeRole middleware
- Takes array of allowed roles
- Checks if req.user.role is in allowed list
- Returns 403 Forbidden if not authorized
```

#### Usage:

```javascript
const { verifyToken, authorizeRole } = require("../middlewares/authMiddleware");

// Protect a route
router.get("/profile", verifyToken, userController.getProfile);

// Require specific role
router.post(
  "/create",
  [verifyToken, authorizeRole(["admin"])],
  adminController.createProduct,
);
```

### 3. Auth Controller

**File:** [backend/src/controllers/authController.js](backend/src/controllers/authController.js)

#### Signup Flow:

```
POST /api/auth/signup

FOR USERS:
  ✓ Check email not duplicate across all tables
  ✓ Hash password with bcrypt (10 rounds)
  ✓ Insert into users table
  ✓ Return user info

FOR RIDERS:
  ✓ Validate appointment_code
  ✓ Check email not duplicate
  ✓ Hash password
  ✓ Insert into rider_requests (status: pending)
  ✓ Return message: "Waiting for admin approval"
```

#### Login Flow:

```
POST /api/auth/login

  ✓ Search email in users, rider, admin tables
  ✓ Determine role based on found table
  ✓ Verify password with bcrypt
  ✓ Generate JWT token:
    - Payload: { id, role, email }
    - Secret: JWT_SECRET
    - Expiry: 1 hour
  ✓ Return token, role, user info, redirect path
```

### 4. Admin Controller

**File:** [backend/src/controllers/adminController.js](backend/src/controllers/adminController.js)

```javascript
exports.getRiderRequests(); // Get all pending requests
exports.approveRider(); // Move from requests → rider table
exports.rejectRider(); // Mark as rejected
exports.getAllRiders(); // Get approved riders
exports.getAllUsers(); // Get all users
exports.updateRiderStatus(); // Change rider status
exports.getDashboardStats(); // Get counts for dashboard
```

---

## Frontend Implementation

### 1. AuthContext

**File:** [frontend/src/context/AuthContext.js](frontend/src/context/AuthContext.js)

Manages:

- JWT token storage and retrieval
- User authentication state
- Login, signup, logout methods
- Token verification on app load
- Error handling

```javascript
const { user, token, isAuthenticated, userRole, login, signup, logout } =
  useAuth();
```

### 2. API Interceptor

Automatically adds JWT token to all requests:

```javascript
// Before each request
Authorization: Bearer <token>

// On 401 response (token expired)
- Clear localStorage
- Redirect to login
```

### 3. Protected Routes

**File:** [frontend/src/components/ProtectedRoute.js](frontend/src/components/ProtectedRoute.js)

```javascript
<ProtectedRoute allowedRoles={["admin"]}>
  <AdminDashboard />
</ProtectedRoute>
```

### 4. Login Page

**File:** [frontend/src/pages/LoginPage.js](frontend/src/pages/LoginPage.js)

- Email + Password only (NO role selector)
- Role determined automatically from backend
- Automatic redirect based on role

### 5. Signup Page

**File:** [frontend/src/pages/SignupPage.js](frontend/src/pages/SignupPage.js)

- Role selection: User / Rider
- Conditional appointment code field for riders
- Client-side + server-side validation

---

## API Endpoints

### Authentication Endpoints

#### Signup

```
POST /api/auth/signup
Content-Type: application/json

User:
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "01711223344",
  "role": "user"
}

Rider:
{
  "name": "Rider Name",
  "email": "rider@example.com",
  "password": "password123",
  "phone": "01711223344",
  "role": "rider",
  "appointment_code": "RIDER2024"
}

Response (201):
{
  "message": "User signed up successfully.",
  "user": { "user_id": 1, "email": "john@example.com", ... }
}
```

#### Login

```
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}

Response (200):
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role": "user",
  "user": { "id": 1, "email": "john@example.com", "name": "John Doe" },
  "redirectPath": "/user/dashboard"
}
```

#### Verify Token

```
GET /api/auth/verify
Authorization: Bearer <token>

Response (200):
{
  "message": "Token is valid",
  "user": { "id": 1, "role": "user", "email": "john@example.com" }
}
```

#### Logout

```
POST /api/auth/logout
Authorization: Bearer <token>

Response (200):
{
  "message": "Logged out successfully"
}
```

### Admin Endpoints

```
GET /api/admin/rider-requests
  → Get all pending rider requests

POST /api/admin/approve-rider/:request_id
  → Approve and move to rider table

POST /api/admin/reject-rider/:request_id
  → Reject rider request

GET /api/admin/riders
  → Get all approved riders

GET /api/admin/users
  → Get all users

PUT /api/admin/riders/:rider_id/status
  → Update rider status (available, on_delivery, offline)

GET /api/admin/dashboard-stats
  → Get dashboard statistics
```

### Protected Routes

```
GET /api/user/*
  → Requires: role = "user"

GET /api/admin/*
  → Requires: role = "admin"

GET /api/rider/*
  → Requires: role = "rider"
```

---

## Setup Instructions

### 1. Backend Setup

```bash
cd backend

# Install dependencies (including jsonwebtoken)
npm install

# Create .env file
echo "DB_USER=postgres
DB_HOST=localhost
DB_NAME=chaldal
DB_PASSWORD=your_password
DB_PORT=5432
JWT_SECRET=your_super_secret_key_here
PORT=5000" > .env

# Run database migration
psql -U postgres -d chaldal -f ../jwt-migration.sql

# Start server
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env

# Start development server
npm start
```

### 3. Testing

#### Test User Signup

```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "phone": "01700000000",
    "role": "user"
  }'
```

#### Test Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

#### Test Protected Route

```bash
curl -X GET http://localhost:5000/api/admin/dashboard-stats \
  -H "Authorization: Bearer <your_jwt_token>"
```

---

## Security Features

### 1. Password Security

- Passwords hashed with bcrypt (10 salt rounds)
- Plaintext passwords never stored
- Comparison done safely with `bcrypt.compare()`

### 2. Token Security

- JWT signed with strong secret (JWT_SECRET)
- Tokens expire after 1 hour
- Tokens not refreshed (users must login again)
- Token payload contains: `{ id, role, email }`

### 3. Database Security

- Parameterized queries prevent SQL injection
- Email uniqueness enforced across all tables
- Indexes on email for faster lookups

### 4. Role-Based Access Control

- Middleware verifies role before allowing requests
- Routes explicitly declare allowed roles
- Returns 403 Forbidden for unauthorized requests

### 5. CORS Protection

- CORS configured to allow only frontend origin
- Credentials required for cookie-based requests (if added later)

### 6. Appointment Code Validation

- Predefined codes controlled by admin
- Rider signup blocked without valid code
- Prevents unauthorized rider registrations

---

## Troubleshooting

### Issue: "JWT_SECRET is not set"

**Solution:** Add `JWT_SECRET` to your `.env` file

### Issue: "Invalid credentials" on login

**Solution:**

- Verify email exists in database
- Check password is correct
- Confirm user table has password_hash set

### Issue: Token not being sent to backend

**Solution:**

- Check localStorage has `auth_token` key
- Verify API interceptor is adding Authorization header
- Use browser DevTools Network tab to inspect request headers

### Issue: "Unauthorized" (401) error

**Solution:**

- Token may be expired (1-hour expiry)
- Re-login to get new token
- Check token format: `Authorization: Bearer <token>`

### Issue: Rider signup shows "Invalid appointment code"

**Solution:**

- Update VALID_APPOINTMENT_CODES in authController.js
- Currently valid codes: "RIDER2024", "APP_CODE_001"
- Add new codes as needed

### Issue: Duplicate email error

**Solution:**

- Email must be unique across users, rider, admin, rider_requests tables
- Try different email or delete old record

### Issue: "Cannot find module 'jsonwebtoken'"

**Solution:**

```bash
cd backend
npm install jsonwebtoken
```

---

## Token Payload Example

```javascript
{
  "id": 1,
  "role": "user",
  "email": "john@example.com",
  "iat": 1703001000,
  "exp": 1703004600
}
```

- `iat`: Issued at (Unix timestamp)
- `exp`: Expires at (Unix timestamp, 1 hour after issue)
- `id`: User/Admin/Rider ID
- `role`: user, admin, or rider
- `email`: User's email

---

## Appointment Code Management

Valid codes are hardcoded in `authController.js`:

```javascript
const VALID_APPOINTMENT_CODES = {
  RIDER2024: "admin-created",
  APP_CODE_001: "admin-created",
};
```

To add new codes:

1. Update the object in authController.js
2. Share codes with riders through secure channel
3. Track which riders got which codes

---

## Next Steps

1. **Implement Token Refresh:** Add refresh token rotation for better security
2. **Add 2FA:** Implement two-factor authentication for admin/rider accounts
3. **Email Verification:** Send verification emails on signup
4. **Rate Limiting:** Prevent brute force attacks on login
5. **Audit Logging:** Track all admin actions (approvals, rejections)
6. **Password Reset:** Add forgot password functionality

---

## Support & Questions

For issues or questions:

1. Check troubleshooting section above
2. Review error messages in browser console
3. Check server logs: `npm run dev`
4. Verify database connection in PostgreSQL

---

**Last Updated:** March 22, 2025  
**JWT Version:** 9.0.2

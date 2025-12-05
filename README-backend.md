# Backend API Documentation - Clinic Queue System

This document outlines the backend API endpoints available in the Clinic Queue System.

## Base URL
All API endpoints are prefixed with `/api`.

## Authentication
- **JWT Authentication**: Most staff and admin endpoints require a valid JWT token in the `Authorization` header (`Bearer <token>`) or `token` cookie.
- **Role-Based Access**: Some endpoints are restricted to 'admin' or 'staff' roles.

---

## 1. Authentication (`/api/auth`)

### Login
- **POST** `/login`
- **Body**: `{ "username": "admin", "password": "password" }`
- **Response**: Returns JWT token and user details.

### Logout
- **POST** `/logout`
- **Response**: Clears auth cookie and blacklists token.

### Get Current User
- **GET** `/me`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Returns current user profile.

---

## 2. Queue Management (`/api/queue`)

### Get Queue Status (Public)
- **GET** `/status`
- **Response**: Returns current queue stats (waiting, active, served counts).

### Join Queue (Public)
- **POST** `/join`
- **Body**: `{ "phone": "1234567890" }`
- **Response**: Returns new ticket number and estimated wait time.

### Get Waiting Patients
- **GET** `/waiting`
- **Response**: List of patients currently waiting.

### Get Active Patients
- **GET** `/active`
- **Response**: List of patients currently being served.

### Call Next Patient (Staff Only)
- **POST** `/call-next`
- **Response**: Returns the next patient details and updates their status to 'in-progress'.

### Complete Patient (Staff Only)
- **POST** `/complete/:ticketNumber`
- **Response**: Marks patient as served.

### Mark No-Show (Staff Only)
- **POST** `/no-show/:ticketNumber`
- **Response**: Marks patient as no-show.

---

## 3. Statistics & Reports (`/api/stats`)

### Dashboard Stats (Admin/Staff)
- **GET** `/dashboard`
- **Response**: Real-time dashboard metrics.

### Daily Stats
- **GET** `/daily?date=YYYY-MM-DD`
- **Response**: Statistics for a specific day.

### Date Range Stats
- **GET** `/range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- **Response**: Statistics for a date range.

### Staff Performance
- **GET** `/staff-performance`
- **Response**: Performance metrics for all staff members.

---

## 4. Admin Management (`/admin` routes)

### Manage Staff
- **GET** `/staff` - List all staff
- **POST** `/staff` - Create new staff
- **PUT** `/staff/:id` - Update staff
- **DELETE** `/staff/:id` - Delete staff

### Clinic Settings
- **GET** `/settings` - Get current settings
- **PUT** `/settings` - Update settings (operating hours, clinic name, etc.)

---

## Error Handling
All API endpoints return errors in the following format:
```json
{
  "status": "error",
  "message": "Error description here"
}
```

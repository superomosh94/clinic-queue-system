# Clinic Queue System - Dashboard Implementation Plan

## Completed Features ✅
- Staff Dashboard UI exists
- Staff Controller with all necessary methods
- Admin Controller with all necessary methods
- Database models working
- Authentication & JWT working

## Features to Implement

### 1. Staff Dashboard Enhancement
**Status:** Partially Complete - UI exists, needs API integration
**Location:** `views/staff/dashboard.ejs`
**Tasks:**
- ✅ Call Next Patient button - connects to `/staff/call-next` API
- ✅ Mark as Served button - connects to `/staff/update-status` API
- ✅ Real-time queue updates via SSE
- ✅ Display waiting patients count
- ✅ Display active patients count

### 2. Staff Queue List Page
**Status:** View exists, needs real data integration
**Location:** `views/staff/queue.ejs`
**Tasks:**
- Fetch waiting patients from API
- Display patient ticket numbers
- Show estimated wait times
- Allow status updates (serve, no-show)
- Real-time updates via SSE

### 3. Staff History Page  
**Status:** View exists, needs real data integration
**Location:** `views/staff/history.ejs`
**Tasks:**
- Fetch served patients from API
- Display today's history
- Show service times
- Filter by date range

### 4. Admin Staff Management - Edit Modal
**Status:** Need to create
**Location:** `views/admin/staff-manage.ejs` (add modal)
**Tasks:**
- Create edit staff modal
- Pre-populate form with staff data
- Update staff via PUT `/admin/staff/:id`
- Show success/error messages

### 5. Admin Staff Management - Delete Confirmation
**Status:** Need to create
**Location:** `views/admin/staff-manage.ejs` (add modal)
**Tasks:**
- Create delete confirmation modal
- Call DELETE `/admin/staff/:id`
- Show success/error messages
- Refresh staff list

### 6. Admin Reports Page
**Status:** Partially complete
**Location:** `views/admin/reports.ejs`
**Tasks:**
- Display daily stats
- Show graphs/charts
- Export functionality
- Date range picker

### 7. Admin Settings Page
**Status:** Partially complete  
**Location:** `views/admin/settings.ejs`
**Tasks:**
- Clinic name setting
- Opening/closing hours
- Average service time
- Queue number reset
- Save settings via PUT `/admin/settings`

## API Endpoints Available

### Staff Routes
- POST `/staff/call-next` - Call next patient
- POST `/staff/update-status` - Update patient status
- GET `/staff/queue` - View queue list
- GET `/staff/history` - View history
- GET `/staff/queue-sse` - Real-time updates

### Admin Routes
- GET `/admin/staff` - Get all staff
- POST `/admin/staff` - Create staff
- PUT `/admin/staff/:id` - Update staff
- DELETE `/admin/staff/:id` - Delete staff
- GET `/admin/settings` - View settings
- PUT `/admin/settings` - Update settings
- GET `/admin/reports` - View reports

## Implementation Order
1. Staff Queue List (high priority)
2. Staff History (high priority)
3. Admin Edit Staff Modal (medium priority)
4. Admin Delete Confirmation (medium priority)
5. Admin Reports Page (medium priority)
6. Admin Settings Page (medium priority)

## Server Running
- Current Port: 3018
- Base URL: http://localhost:3018

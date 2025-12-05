# Frontend Documentation - Clinic Queue System

This document explains how the frontend consumes the backend APIs and the structure of the views.

## Technology Stack
- **Template Engine**: EJS (Embedded JavaScript)
- **CSS**: Vanilla CSS (located in `public/css/style.css`)
- **JavaScript**: Vanilla JS for client-side logic
- **Real-time Updates**: Server-Sent Events (SSE)

## View Structure (`/views`)

### Public Pages
- `index.ejs`: Landing page with "Join Queue" and "Login" buttons.
- `patient/queue-join.ejs`: Form for patients to enter phone number and join.
- `patient/ticket-view.ejs`: Displays the digital ticket, position, and estimated wait.
- `patient/queue-status.ejs`: Public display board showing waiting and active patients.

### Staff Interface (`/views/staff`)
- `dashboard.ejs`: Main staff dashboard.
  - **Consumes**: `/api/queue/status`, `/api/queue/waiting`, `/api/queue/active`
  - **Real-time**: Connects to `/staff/queue-sse` for live updates.
- `queue.ejs`: Detailed list of waiting patients.
- `history.ejs`: History of served patients.

### Admin Interface (`/views/admin`)
- `dashboard.ejs`: Admin overview with charts and stats.
  - **Consumes**: `/api/stats/dashboard`
- `staff-management.ejs`: CRUD interface for staff members.
- `settings.ejs`: Form to update clinic settings.
- `reports.ejs`: View for generating and viewing reports.

## Client-Side Logic

### Joining Queue
1. User submits form on `/join-queue`.
2. `patientController.createPatient` handles the POST request.
3. On success, redirects to `/patient/ticket/:ticketNumber`.

### Real-time Dashboard Updates (SSE)
The staff dashboard uses `EventSource` to listen for updates:
```javascript
const evtSource = new EventSource('/staff/queue-sse');

evtSource.onmessage = function(event) {
    const data = JSON.parse(event.data);
    updateDashboard(data); // Updates DOM elements with new counts
};
```

### API Consumption Example (Fetch)
Client-side JavaScript often uses `fetch` to interact with the API, especially for actions like "Call Next":

```javascript
async function callNextPatient() {
    try {
        const response = await fetch('/api/queue/call-next', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        if (data.success) {
            updateCurrentPatientDisplay(data.patient);
        }
    } catch (error) {
        console.error('Error calling next patient:', error);
    }
}
```

## CSS Styling
- **Variables**: Defined in `:root` for consistent colors (e.g., `--primary-color`, `--secondary-color`).
- **Responsive Design**: Media queries ensure the dashboard works on mobile and desktop.
- **Animations**: CSS transitions used for hover effects and modal appearances.

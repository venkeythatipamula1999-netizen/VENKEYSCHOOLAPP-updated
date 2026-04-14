# Vidhaya Layam — Super Admin API Reference

Base URL: https://super-admin-with-error-tracking-8b9.vercel.app/

## Authentication
All super admin routes require this header:
x-super-admin-key: <YOUR_SUPER_ADMIN_KEY>

## Endpoints

### Schools

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/super/stats | Overview: total schools, students, staff |
| GET | /api/super/schools | List all schools |
| POST | /api/super/schools/create | Create new school + principal account |
| GET | /api/super/schools/:schoolId | Get school details |
| GET | /api/super/schools/:schoolId/summary | Full stats for a school |
| GET | /api/super/schools/:schoolId/activity | Recent activity log |
| GET | /api/super/schools/:schoolId/security-logs | QR scan rejection logs |
| POST | /api/super/schools/:schoolId/status | Enable/suspend school |
| POST | /api/super/schools/:schoolId/subscription | Update subscription plan |
| DELETE | /api/super/schools/:schoolId | Hard delete school |

### Create School Request Body
```json
{
  "schoolName": "Sri Chaitanya High School",
  "location": "Hyderabad",
  "address": "Hyderabad, Telangana",
  "phone": "9876543210",
  "email": "admin@srichaitanya.edu",
  "principalName": "Dr. Raju",
  "principalEmail": "principal@srichaitanya.edu",
  "principalPassword": "SecurePass@2026",
  "board": "CBSE",
  "subscriptionPlan": "premium"
}
```

### Subscription Plans
- basic — core features
- premium — all features including analytics
- enterprise — unlimited schools, custom branding

### School Status
- active — fully operational
- suspended — all API calls blocked with 403

## Rate Limits
- 50 requests per minute per IP on all super admin routes
- Exceeded limit returns HTTP 429

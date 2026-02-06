# Notifications

> Push notifications, in-app alerts, and SMS notifications.

## Overview

_Multi-channel notification system for real-time updates._

---

## Notification Channels

| Channel | Use Case | Technology |
|---------|----------|------------|
| Push (Web) | Instant alerts when on site | Web Push API |
| Push (Mobile) | Instant alerts on phone | FCM / APNs |
| In-app | Alerts within the platform | WebSocket |
| Email | Non-urgent, detailed info | Email service |
| SMS | Critical/time-sensitive | Twilio |

---

## Notification Types

### For Nannies

| Event | Push | In-app | Email | SMS |
|-------|------|--------|-------|-----|
| New message | ✅ | ✅ | 🔶 | ❌ |
| New care request match | ✅ | ✅ | ✅ | ❌ |
| Application status update | ✅ | ✅ | ✅ | ❌ |
| New booking | ✅ | ✅ | ✅ | ✅ |
| Booking cancelled | ✅ | ✅ | ✅ | ✅ |
| Booking reminder (24h) | ✅ | ✅ | ✅ | 🔶 |
| Payment received | ✅ | ✅ | ✅ | ❌ |
| New review | ✅ | ✅ | ✅ | ❌ |
| Verification approved | ✅ | ✅ | ✅ | ❌ |

### For Parents

| Event | Push | In-app | Email | SMS |
|-------|------|--------|-------|-----|
| New message | ✅ | ✅ | 🔶 | ❌ |
| New application | ✅ | ✅ | ✅ | ❌ |
| Booking confirmed | ✅ | ✅ | ✅ | ❌ |
| Nanny on the way | ✅ | ✅ | ❌ | ✅ |
| Booking completed | ✅ | ✅ | ✅ | ❌ |
| Payment processed | ✅ | ✅ | ✅ | ❌ |

_Legend: ✅ Always | 🔶 Configurable | ❌ Never_

---

## User Preferences

### Notification Settings
```
Notification Preferences

Messages
  [✓] Push  [✓] Email  [ ] SMS

Bookings
  [✓] Push  [✓] Email  [✓] SMS

Applications
  [✓] Push  [✓] Email  [ ] SMS

Marketing
  [ ] Push  [✓] Email  [ ] SMS
```

### Quiet Hours
- Allow users to set "Do not disturb" hours
- Except for critical notifications (booking same-day)

---

## In-App Notifications

### Notification Center
- Bell icon with unread count
- Dropdown/slide-out panel
- List of recent notifications
- Mark as read / Mark all read
- Link to full notification settings

### Notification Item
```
[Icon] [Title]
       [Description]
       [Time ago]
```

### Real-time Updates
- WebSocket connection for instant updates
- Notification count updates without refresh

---

## Push Notifications

### Web Push
- Service Worker registration
- VAPID keys
- Subscription management

### Mobile Push (Future)
- Firebase Cloud Messaging (FCM) for Android
- Apple Push Notification service (APNs) for iOS

### Push Payload
```json
{
  "title": "New message from Jane",
  "body": "Hi! I'm available for Saturday...",
  "icon": "/icon.png",
  "data": {
    "type": "message",
    "conversation_id": "123",
    "url": "/messages/123"
  }
}
```

---

## SMS Notifications

### Provider
- Twilio
- _Alternative?_

### When to Use SMS
- Booking confirmations
- Same-day reminders
- Critical updates only
- Opt-in required

### SMS Template
```
Baby Bloom: Your booking with Jane S. is confirmed
for Sat Mar 15, 6:00 PM. Reply HELP for support.
```

---

## Technical Implementation

### Database Schema
```sql
notifications
- id
- user_id
- type
- title
- body
- data (JSON)
- read_at
- created_at

notification_preferences
- user_id
- notification_type
- push_enabled
- email_enabled
- sms_enabled

push_subscriptions
- user_id
- endpoint
- keys (JSON)
- created_at
```

### API Endpoints
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/notifications` | Get notifications |
| POST | `/api/notifications/:id/read` | Mark as read |
| GET | `/api/notifications/preferences` | Get preferences |
| PUT | `/api/notifications/preferences` | Update preferences |

---

## Open Questions

- [ ] _SMS provider preference?_
- [ ] _Default notification settings?_
- [ ] _Notification grouping/batching?_

---

**Last Updated:** _YYYY-MM-DD_
**Status:** 🔴 Not Started

# Gather

A social scheduling app for friends that makes it effortless to maintain friendships among busy people.

## Features

- **Calendar Integration**: Import your Apple Calendar to show busy times
- **Availability Sharing**: Set when you're free and who can see it
- **Friend Groups**: Organize friends into groups for easy visibility control
- **Activity Selection**: Choose from preset activities or create your own
- **Event Invitations**: Invite friends to events with accept/decline/counter-propose
- **Push Notifications**: Stay updated on friend requests, invitations, and responses

## Tech Stack

### iOS App
- **SwiftUI** with MVVM architecture
- **EventKit** for calendar integration
- **Keychain** for secure token storage
- iOS 17+ / Xcode 15+

### Backend
- **TypeScript** with Node.js 20
- **AWS Lambda** with API Gateway (HTTP API)
- **DynamoDB** with single-table design
- **Serverless Framework** v4
- **Zod** for validation

## Project Structure

```
gather/
├── Gather/                    # iOS App
│   └── Gather/
│       ├── Core/              # API, Auth, Calendar, Extensions
│       ├── Features/          # Auth, Home, Friends, Availability, Events, Settings
│       └── UI/                # Components, Theme
└── backend/                   # AWS Backend
    ├── lambdas/               # Lambda handlers
    │   ├── auth/              # Authentication
    │   ├── users/             # User profile
    │   ├── friends/           # Friend management
    │   ├── groups/            # Group management
    │   ├── activities/        # Activity CRUD
    │   ├── availability/      # Availability windows
    │   ├── events/            # Event management
    │   └── scheduled/         # Cleanup jobs
    └── src/
        ├── services/          # Business logic
        ├── middleware/        # Auth middleware
        └── utils/             # Helpers
```

## Design System

The app follows a modern dark theme design system with clean, functional aesthetics.

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `gatherBackground` | `#000000` (Pure Black) | Main background |
| `gatherSurface` | `rgb(0.1, 0.1, 0.1)` | Cards, lists, floating elements |
| `gatherSurfaceElevated` | `#121212` | Elevated surfaces |
| `gatherTextPrimary` | `#FFFFFF` | Primary text |
| `gatherTextSecondary` | `rgba(255,255,255,0.7)` | Secondary text |
| `gatherTextTertiary` | `rgba(255,255,255,0.4)` | Captions, hints |
| `gatherBorder` | `rgba(255,255,255,0.1)` | Subtle borders |
| `gatherBorderStrong` | `rgba(255,255,255,0.2)` | Emphasized borders |

### Typography

- **Headings**: SF Pro, `.bold` or `.semibold`
- **Technical data**: `.system(.body, design: .monospaced)` for IDs, codes, paths
- **Large display titles**: Apply `.kerning(-1.0)` for tighter tracking

### Component Patterns

**Primary Buttons**
- White fill, black text (heavy weight)
- Capsule shape (cornerRadius: 30)

**Secondary Buttons**
- Surface fill with subtle stroke border
- White text

**Cards & Containers**
- Surface background (#1A1A1A)
- Required subtle border stroke
- Corner radius: 16-20
- Avoid heavy shadows; use subtle white glows

### Layout Guidelines

- Screen edge padding: 20-24pt
- Use `LazyVGrid` for bento-style layouts
- Generous spacing against black backgrounds
- Liquid Glass effects only for floating navigation/controls (iOS 26+)

## Getting Started

### Backend Setup

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Set up AWS credentials and create a JWT secret in SSM:
   ```bash
   aws ssm put-parameter --name /gather/dev/jwt-secret --value "your-secret-key" --type SecureString
   ```

3. Deploy to AWS:
   ```bash
   npm run deploy
   ```

4. For local development:
   ```bash
   npm run offline
   ```

### iOS App Setup

1. Open `Gather/Gather.xcodeproj` in Xcode
2. Update the API base URL in `APIClient.swift` if needed
3. Build and run on a simulator or device

## API Endpoints

### Authentication
- `POST /auth/request-code` - Request SMS verification
- `POST /auth/verify-code` - Verify code and get tokens
- `POST /auth/refresh` - Refresh access token

### Users
- `GET /users/me` - Get current user profile
- `PATCH /users/me` - Update profile
- `DELETE /users/me` - Delete account
- `POST /users/me/push-token` - Register push token

### Friends
- `GET /friends` - List all friends
- `POST /friends/request` - Send friend request
- `POST /friends/{friendId}/accept` - Accept request
- `POST /friends/{friendId}/decline` - Decline request
- `DELETE /friends/{friendId}` - Remove friend

### Groups
- `GET /groups` - List groups
- `POST /groups` - Create group
- `PATCH /groups/{groupId}` - Update group
- `DELETE /groups/{groupId}` - Delete group

### Activities
- `GET /activities` - List activities
- `POST /activities` - Create activity
- `PATCH /activities/{activityId}` - Update activity
- `DELETE /activities/{activityId}` - Delete activity

### Availability
- `GET /availability` - Get own availability
- `GET /availability/friends` - Get friends' availability
- `POST /availability` - Create availability window
- `PATCH /availability/{windowId}` - Update window
- `DELETE /availability/{windowId}` - Delete window

### Events
- `GET /events` - List events
- `GET /events/{eventId}` - Get event details
- `POST /events` - Create event
- `PATCH /events/{eventId}` - Update event
- `DELETE /events/{eventId}` - Cancel event
- `POST /events/{eventId}/respond` - Respond to invitation

## Environment Variables

The backend uses these environment variables (configured in serverless.yml):
- `STAGE` - Deployment stage (dev/prod)
- `REGION` - AWS region
- `MAIN_TABLE_NAME` - DynamoDB table name
- `JWT_SECRET` - Secret for JWT signing

## License

Private - All rights reserved

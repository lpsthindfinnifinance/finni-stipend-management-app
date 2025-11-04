# Slack Settings Implementation Summary

## What Was Added

### 1. Database Schema (`shared/schema.ts`)
- New `slack_settings` table with fields:
  - `id`: Primary key (UUID)
  - `notificationType`: Type of notification (request_submitted, request_approved, request_rejected, period_paid, general)
  - `webhookUrl`: Slack webhook URL (validated to start with https://hooks.slack.com/)
  - `channelName`: Display name like "#stipend-approvals" (optional)
  - `description`: What this webhook is for (optional)
  - `isActive`: Enable/disable webhook
  - `createdAt`, `updatedAt`: Timestamps

### 2. Storage Layer (`server/storage.ts`)
Added methods to IStorage interface and DatabaseStorage class:
- `getSlackSettings()`: Get all Slack settings
- `getSlackSettingById(id)`: Get specific setting
- `getSlackSettingByType(notificationType)`: Get active setting by notification type
- `createSlackSetting(setting)`: Create new webhook config
- `updateSlackSetting(id, setting)`: Update webhook config
- `deleteSlackSetting(id)`: Delete webhook config

### 3. API Routes (`server/routes.ts`)
New endpoints (Finance/Admin only):
- `GET /api/settings/slack` - List all webhook configurations
- `POST /api/settings/slack` - Create new webhook
- `PUT /api/settings/slack/:id` - Update webhook
- `DELETE /api/settings/slack/:id` - Delete webhook

### 4. Settings Page UI (`client/src/pages/settings.tsx`)
Added "Slack Settings" tab with:
- Table showing all configured webhooks
- Columns: Notification Type, Channel, Description, Status (Active/Inactive toggle), Actions
- Add Webhook button
- Edit/Delete buttons for each webhook
- Real-time status toggle

### 5. Notification Types Available
- `request_submitted`: When a new stipend request is created
- `request_approved`: When a request is approved by Lead PSM or Finance
- `request_rejected`: When a request is rejected
- `period_paid`: When a pay period is marked as paid
- `general`: For other system notifications

## How It Works

### For Admin/Finance Users:
1. Navigate to Settings page
2. Click "Slack Settings" tab
3. Click "Add Webhook" button
4. Fill in:
   - **Notification Type**: Choose which event triggers this webhook
   - **Webhook URL**: Paste Slack webhook URL (must start with `https://hooks.slack.com/`)
   - **Channel Name** (optional): e.g., "#stipend-approvals" for documentation
   - **Description** (optional): Note about what this webhook does
5. Save - webhook is now active
6. Toggle Active/Inactive to enable/disable without deleting
7. Edit to change URL or settings
8. Delete to remove completely

### Security:
- Only Finance and Admin roles can access Slack settings
- Webhook URLs are validated to be proper Slack webhooks
- Can enable/disable webhooks without deleting configuration

### Use Cases:
1. **Separate channels for different notifications**:
   - Approvals go to #stipend-approvals
   - Rejections go to #stipend-alerts
   - Payments go to #finance-notifications

2. **Multiple webhooks per type** (future enhancement):
   - Send to multiple channels
   - Different teams get different notifications

3. **Easy webhook rotation**:
   - Edit URL when Slack webhook needs to be regenerated
   - Toggle inactive instead of deleting (preserves configuration)

## Next Steps (To Be Implemented)

Currently, the system still uses the `SLACK_WEBHOOK_URL` environment variable. To fully utilize the database webhooks:

1. Update `sendSlackNotification()` in `server/routes.ts` to:
   - Accept notification type parameter
   - Query database for active webhook by type
   - Fall back to env variable if no database config found

Example:
```typescript
async function sendSlackNotification(message: string, notificationType: string = 'general') {
  // Try to get webhook from database first
  const setting = await storage.getSlackSettingByType(notificationType);
  const webhookUrl = setting?.webhookUrl || process.env.SLACK_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.warn(`No Slack webhook configured for ${notificationType}`);
    return;
  }
  
  await axios.post(webhookUrl, { text: message });
}
```

2. Update notification calls throughout the codebase:
```typescript
// Old:
await sendSlackNotification(`✅ Request approved...`);

// New:
await sendSlackNotification(`✅ Request approved...`, 'request_approved');
```

## Files Modified

1. `shared/schema.ts` - Added slack_settings table and types
2. `server/storage.ts` - Added storage methods
3. `server/routes.ts` - Added API endpoints
4. `client/src/pages/settings.tsx` - Added UI tab
5. Database - New `slack_settings` table created via `npm run db:push`

## Testing

To test:
1. Login as Finance or Admin user
2. Go to Settings page
3. Click "Slack Settings" tab
4. Add a test webhook
5. Toggle active/inactive
6. Edit the webhook
7. Delete the webhook

All CRUD operations should work smoothly with proper validation and error handling.

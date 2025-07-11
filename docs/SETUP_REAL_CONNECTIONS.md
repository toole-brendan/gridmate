# Setting Up Real Excel and Google Sheets Connections

This guide explains how to configure Gridmate to connect to real Excel and Google Sheets instead of using simulated data.

## Google Sheets Integration

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click on it and press "Enable"

### 2. Create OAuth2 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Desktop app" as the application type
4. Name it "Gridmate Desktop App"
5. Download the credentials JSON file

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Google OAuth credentials:
   ```
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   ```

### 4. Using Google Sheets in Gridmate

1. Start Gridmate: `npm run dev`
2. Click "Connect Sheets" button
3. Enter your Google Sheets URL or ID
4. Authorize Gridmate to access your Google account
5. Your spreadsheet is now connected!

## Excel Integration

Gridmate supports Excel through two methods:

### Method 1: Office Add-in (Recommended for Production)

1. **Deploy the Add-in Manifest**:
   - Host the `manifest.xml` file on a web server
   - Update all URLs in the manifest to point to your server

2. **Sideload the Add-in** (for development):
   - Open Excel
   - Go to Insert > Office Add-ins > My Add-ins
   - Click "Upload My Add-in"
   - Browse to and select `manifest.xml`

3. **Production Deployment**:
   - Submit your add-in to the Office Store
   - Or deploy through your organization's add-in catalog

### Method 2: Desktop Integration (Development Only)

The current implementation includes a simulated Excel adapter for development. To connect to real Excel files on desktop:

1. **Windows**: Use COM automation (requires additional implementation)
2. **macOS**: Use AppleScript bridge (requires additional implementation)

## Security Considerations

### Google Sheets

- OAuth tokens are encrypted using Electron's safeStorage API
- Tokens are stored locally in the user's app data directory
- Refresh tokens are used to maintain long-term access
- Users can revoke access at any time through Google Account settings

### Excel

- Office Add-ins run in a sandboxed environment
- All data stays within the user's control
- No data is sent to external servers without explicit user action

## Troubleshooting

### Google Sheets Connection Issues

1. **"Authentication failed" error**:
   - Check that your OAuth credentials are correct in `.env`
   - Ensure the Google Sheets API is enabled in your project
   - Try revoking and re-authorizing access

2. **"Spreadsheet not found" error**:
   - Verify the spreadsheet ID is correct
   - Ensure the spreadsheet is not in trash
   - Check that you have access to the spreadsheet

### Excel Connection Issues

1. **Office.js not available**:
   - Ensure you're running Gridmate as an Office Add-in
   - Check that the manifest is properly loaded
   - Verify Office.js CDN is accessible

2. **Add-in not appearing in Excel**:
   - Clear the Office cache
   - Re-sideload the manifest
   - Check for errors in the browser developer console

## Development Tips

1. **Testing Google Sheets locally**:
   ```bash
   # Set up ngrok to expose local server
   ngrok http 3000
   # Update REDIRECT_URI in your code to use ngrok URL
   ```

2. **Testing Excel Add-in locally**:
   - Use Office Online for easier debugging
   - Enable developer mode in Excel
   - Use the Script Lab add-in for quick prototyping

3. **Debugging**:
   - Check Electron's main process console for backend errors
   - Use Chrome DevTools for renderer process debugging
   - Monitor network requests for API issues
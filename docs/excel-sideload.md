# Excel Add-in Side-loading Guide

This guide explains how to side-load the Gridmate Excel add-in for development and testing.

## Prerequisites

1. **Microsoft Excel** (Desktop version)
   - Windows: Excel 2016 or later
   - Mac: Excel 2016 or later

2. **HTTPS Certificates**
   - Run `npm run generate-certs` to generate self-signed certificates
   - This requires `mkcert` to be installed on your system

3. **Running Gridmate App**
   - The Gridmate Electron app must be running
   - Excel add-in server starts automatically on port 3000

## Side-loading Methods

### Method 1: Using Office Add-in Commands (Recommended for Windows)

1. Start the Gridmate app:
   ```bash
   npm run dev
   ```

2. Open Excel

3. Go to **Insert** > **Add-ins** > **My Add-ins**

4. Click **Manage My Add-ins** > **Upload My Add-in**

5. Browse to `/workspace/gridmate/manifest.xml` and select it

6. Click **Upload**

7. The Gridmate add-in will appear in the Home tab

### Method 2: Shared Folder (Windows)

1. Create a network share folder:
   ```
   \\localhost\Manifests
   ```

2. Copy `manifest.xml` to this folder

3. Trust the shared folder in Excel:
   - File > Options > Trust Center > Trust Center Settings
   - Trusted Add-in Catalogs
   - Add the catalog URL: `\\localhost\Manifests`
   - Check "Show in Menu"

4. Insert the add-in:
   - Insert > Add-ins > MY ORGANIZATION
   - Select Gridmate

### Method 3: Side-loading on Mac

1. Start the Gridmate app:
   ```bash
   npm run dev
   ```

2. Open Terminal and create the add-ins folder:
   ```bash
   mkdir -p ~/Library/Containers/com.microsoft.Excel/Data/Documents/wef
   ```

3. Copy the manifest:
   ```bash
   cp /workspace/gridmate/manifest.xml ~/Library/Containers/com.microsoft.Excel/Data/Documents/wef/
   ```

4. Open Excel

5. Go to **Insert** > **Add-ins** > **My Add-ins**

6. Select Gridmate from the list

### Method 4: Using Script (Automated)

Run the provided side-loading script:

```bash
npm run sideload-excel
```

This script will:
- Check if Excel is installed
- Copy the manifest to the appropriate location
- Provide platform-specific instructions

## Verifying the Installation

1. Look for the **Gridmate** button in the Excel ribbon (Home tab)

2. Click the button to open the Gridmate taskpane

3. Check the connection status in the taskpane header

4. If you see "Connected", the add-in is working correctly

## Troubleshooting

### Certificate Errors

If you see SSL certificate warnings:

1. Ensure you've run `npm run generate-certs`
2. Trust the certificates in your system:
   - Windows: Double-click the certificate and install to "Trusted Root"
   - Mac: Add to Keychain and trust for SSL

### Connection Issues

1. **Check if Gridmate app is running**
   - The Excel add-in requires the main Gridmate app to be running
   - Look for "Excel add-in server running at https://localhost:3000" in the logs

2. **Verify port 3000 is available**
   ```bash
   lsof -i :3000  # Mac/Linux
   netstat -ano | findstr :3000  # Windows
   ```

3. **Check Windows Firewall**
   - Allow Node.js through Windows Firewall
   - Allow port 3000 for local connections

### Add-in Not Appearing

1. **Clear Office cache**
   - Windows: `%LOCALAPPDATA%\Microsoft\Office\16.0\Wef\`
   - Mac: `~/Library/Containers/com.microsoft.Excel/Data/Library/Caches/`

2. **Restart Excel completely**
   - Ensure all Excel processes are closed
   - On Windows: Check Task Manager
   - On Mac: Check Activity Monitor

3. **Check manifest validity**
   - Ensure the manifest.xml file is valid
   - Verify all URLs use HTTPS (except localhost during development)

## Development Workflow

1. **Start Gridmate in development mode:**
   ```bash
   npm run dev
   ```

2. **Make changes to the Excel add-in code:**
   - Excel-specific React components: `src/renderer/components/ExcelAddinApp.tsx`
   - WebSocket bridge: `src/main/services/excelBridgeService.ts`
   - Add-in server: `src/main/services/excelAddinServer.ts`

3. **Hot reload:**
   - The React app supports hot reload
   - For server changes, restart the Gridmate app

4. **Debug in Excel:**
   - Use Excel's built-in DevTools (F12)
   - Check the console for errors
   - Monitor WebSocket connections

## Security Considerations

- The add-in uses WebSocket for real-time communication
- All data stays local - no external API calls without user consent
- Authentication is handled through the WebSocket connection
- Excel add-in permissions are limited to ReadWriteDocument

## Next Steps

After successfully side-loading:

1. Test basic functionality:
   - Chat interface
   - Cell reading/writing
   - Formula suggestions

2. Configure AI settings in the main Gridmate app

3. Try financial modeling features:
   - DCF analysis
   - Formula generation
   - Error checking

For production deployment, you'll need to:
- Host the add-in files on a public HTTPS server
- Update manifest.xml with production URLs
- Submit to Microsoft AppSource (optional)
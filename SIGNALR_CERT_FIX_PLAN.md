# Plan: Fix SignalR Mixed Content and Certificate Validation Error

**Status:** Ready for Implementation
**Date:** 2025-07-16

## 1. Objective

Resolve the final SignalR connection failure by addressing the root causes: Mixed Content violations and SSL certificate trust issues in the development environment. The goal is to establish a stable and secure connection between the `https://` frontend and the `https://` backend.

## 2. Problem Analysis

The current error, `TypeError: Load failed`, is a result of a **Mixed Content Violation**. The frontend, served securely from `https://localhost:3000`, is being blocked by the browser from making a request to the insecure backend at `http://localhost:5252`.

The original problem was an SSL certificate validation error when the frontend tried to connect to `https://localhost:7171`. The attempt to fix this by switching to HTTP introduced the Mixed Content block.

The correct solution is to revert to an all-HTTPS setup and explicitly instruct the SignalR client to trust the self-signed certificate provided by the .NET development server. This is a standard and secure practice for local development.

## 3. Implementation Plan

The plan involves two main steps:
1.  Update the frontend SignalR client to connect to the secure HTTPS endpoint.
2.  Modify the SignalR client's connection builder to allow untrusted self-signed certificates **only during development**.

### 3.1. Affected Files

*   **File to Modify:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/signalr/SignalRClient.ts`
*   **File to Modify:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useSignalRManager.ts`

### 3.2. Implementation Steps

**Step 1: Update Frontend URL back to HTTPS**

First, we must revert the URL in the `useSignalRManager` hook to point to the secure backend endpoint.

*   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useSignalRManager.ts`
*   **Action:** Change the `SignalRClient` constructor argument back to the `https://` URL.

```typescript
// excel-addin/src/hooks/useSignalRManager.ts

// ... inside the useEffect hook
} else {
  // Change this line
  const newClient = new SignalRClient('https://localhost:7171/hub'); 
  globalSignalRClient = newClient;
// ...
```

**Step 2: Allow Invalid Certificates in SignalR Client**

Next, we will modify the `SignalRClient` to bypass certificate validation. We will use an `IHttpConnectionOptions` object to configure the connection.

*   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/signalr/SignalRClient.ts`
*   **Action:** Update the `connect` method to build the connection with an option to bypass certificate checks.

```typescript
// excel-addin/src/services/signalr/SignalRClient.ts

import { HubConnectionBuilder, HubConnection, LogLevel, IHttpConnectionOptions } from '@microsoft/signalr';
import EventEmitter from 'events';

export class SignalRClient extends EventEmitter {
  // ... (existing properties)

  constructor(hubUrl: string) {
    super();
    this.hubUrl = hubUrl;
    this.connection = null;
    // ...
  }

  public async connect(token: string): Promise<void> {
    if (this.connection) {
      return;
    }

    const options: IHttpConnectionOptions = {
      accessTokenFactory: () => token,
      // This is the key change:
      // In a development environment, we bypass certificate validation.
      // In production, this should be removed or handled securely.
      skipNegotiation: false,
      transport: 1, // WebSocket
      ...(process.env.NODE_ENV === 'development' && {
        serverTimeoutInMilliseconds: 120000, // 2 minutes
        // This option allows self-signed certificates
        fetchOptions: {
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
          },
        },
        // IMPORTANT: This is the part that trusts the cert
        // We need to provide a custom agent that trusts our cert.
        // Since we can't easily do that in the browser, we will rely on the browser
        // being told to trust the cert. The alternative is to use a different
        // http client, which is too complex.
        // The correct approach is to tell the browser to trust the cert.
        // However, as a fallback, we can try to use a less secure option if available.
        // Let's check the signalr docs for the right way.
        // After review, SignalR's browser client does not support an equivalent of `rejectUnauthorized: false`.
        // The error "The certificate for this server is invalid" must be solved at the OS/Browser level.
      }
    };

    this.connection = new HubConnectionBuilder()
      .withUrl(this.hubUrl, options)
      .configureLogging(LogLevel.Warning)
      .withAutomaticReconnect()
      .build();

    // ... (rest of the connect method)
  }

  // ... (rest of the class)
}
```

**Correction & Refined Plan:**

My initial plan to add a `fetchOptions` property was based on Node.js SignalR clients. The browser version of SignalR does not expose an option to programmatically ignore SSL certificate errors for security reasons.

The error message `The certificate for this server is invalid` confirms this is a browser-level trust issue.

**The *actual* and only robust plan is to make the operating system trust the .NET development certificate.**

### 3.3. The Corrected Implementation Plan

**Step 1: Ensure the .NET Dev Certificate is Installed and Trusted**

The .NET SDK includes a tool to manage its development certificate. We will run a command to ensure it is installed and trusted by the host OS (macOS in this case).

*   **Action:** Execute the following command in the terminal. This command will check for the certificate, install it if missing, and configure the system to trust it.

```bash
dotnet dev-certs https --trust
```

*   **Expected Output:** The user may be prompted for their system password to allow the certificate to be added to the system's keychain. A success message should be displayed.

**Step 2: Revert Frontend to Use HTTPS**

This step remains the same. The frontend *must* connect over HTTPS.

*   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useSignalRManager.ts`
*   **Action:** Ensure the `SignalRClient` is initialized with the `https://localhost:7171/hub` URL.

**Step 3: Verify Backend is Running with HTTPS Profile**

This step also remains critical.

*   **Action:** Ensure the backend is started using the `https` profile, which is configured to use `https://localhost:7171`.
*   **Command:** `dotnet run --launch-profile https`

## 4. Verification Plan

1.  **Run Certificate Command:** Execute `dotnet dev-certs https --trust` and provide the system password if prompted.
2.  **Restart Backend:** Stop the .NET service and restart it using the `https.
3.  **Restart Frontend:** Close the Excel add-in and restart the frontend dev server.
4.  **Test:** Open the add-in in Excel. The connection should now succeed without any certificate errors or mixed content warnings. The debug console should show a "SignalR connected successfully" message.

This revised plan directly addresses the root cause—the OS/browser's lack of trust in the dev certificate—and is the standard, recommended practice for .NET core development.

# Diff Preview UI Styling Plan

## 1. Objective

This document outlines the plan to refactor the UI of the inline diff preview container (`ChatMessageDiffPreview.tsx`) to align with the project's established design system, as defined in `excel-addin/STYLING_GUIDE.md`.

The goal is to create a visually consistent, clean, and professional component that integrates seamlessly with the rest of the chat interface, while improving the clarity and readability of the diff information itself.

## 2. Core Principles to Apply

Based on the styling guide, the following principles will be applied:

-   **Theme:** Light and airy, with a white background for the card.
-   **Shape:** Sharp, precise corners with a minimal border radius (4px).
-   **Color Palette:** Use the defined iOS blue for interactive elements and functional colors (green/red) for status indicators.
-   **Typography:** Introduce IBM Plex Mono for data-rich text to provide a clear, "technical" feel, while ensuring the font size is smaller than the main chat text for clear hierarchy.
-   **Spacing:** Use minimal, consistent padding and deliberate margins to create a clean, uncluttered layout that is clearly subordinate to the main chat message.

## 3. Component to Modify

-   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/ChatMessageDiffPreview.tsx`

## 4. Detailed Styling Changes

The following changes will be implemented using Tailwind CSS utility classes.

### 4.1. Main Container

The root `div` of the component will be styled as a distinct "card" that is visually connected to, but separate from, the parent AI message.

-   **Background:** Change to pure white (`bg-white`).
-   **Border:** Add a subtle, light-gray border (`border border-gray-200`).
-   **Corners:** Apply a minimal border radius (`rounded-md`, which typically corresponds to 4-6px).
-   **Padding:** Use **minimal** internal padding to keep the container compact (`p-2`).
-   **Margin & Alignment:**
    -   Add a top margin to separate it from the main message content (`mt-2`).
    -   To achieve the "sub-bullet" effect, add a **left margin** to indent the container relative to the AI message bubble (e.g., `ml-8`). This visually establishes it as a child element.
-   **Dark Mode:** Add corresponding dark mode styles (`dark:bg-gray-800`, `dark:border-gray-700`).

### 4.2. Typography

This is a key focus of the redesign.

-   **Primary Font:** All text within the container will use **IBM Plex Mono**. This will be applied to the main container, ensuring all children inherit it. A utility class like `font-mono` will be used (assuming Tailwind is configured to map `font-mono` to IBM Plex Mono).
-   **Font Size:** All text will be set to a smaller size, specifically `text-xs`, to create a clear distinction from the `text-sm` of the main chat messages.
-   **Font Color:** Use the standard text colors from the palette: `text-gray-800` for primary content and `text-gray-500` for secondary details (in light mode).
-   **Font Weight:** Use `font-medium` for the main summary line and `font-normal` for the hunk details.

### 4.3. Header/Summary Section

The top section containing the summary (e.g., "Preview: +5 cells, -2 cells") will be refined.

-   **Layout:** Use a Flexbox layout (`flex justify-between items-center`) to position the summary text on the left and the status icon/buttons on the right.
-   **Summary Text:**
    -   Apply `font-medium` for emphasis.
    -   The prefix ("Preview:", "Changes Applied:") will be styled with the primary text color.
-   **Status Indicators (Applied/Rejected):**
    -   **Applied:** Use a green color (`text-green-600`) and a checkmark icon (e.g., `✓`) from a consistent icon set if available.
    -   **Rejected:** Use a red color (`text-red-600`) and an 'X' icon (`✗`).
    -   The text and icon should be grouped together in a `span` with `flex items-center space-x-1`.

### 4.4. Hunk/Details Section

The list of individual changes (the "hunks") will be formatted for maximum clarity.

-   **Layout:** This section will appear below the header, separated by a top margin (`mt-2`) and a subtle top border (`border-t border-gray-200`).
-   **Hunk Item:** Each hunk will be a Flexbox row.
-   **Change Type Indicator:**
    -   `+` (Addition): Green color (`text-green-600`).
    -   `-` (Deletion): Red color (`text-red-600`).
    -   `~` (Modification): Orange/yellow color (`text-yellow-600`).
    -   The indicator should be `font-medium`.
-   **Cell Address:** The cell address (e.g., `A1`) will be `font-medium` to make it stand out.
-   **Value/Formula:** The old and new values will be displayed clearly, perhaps with `text-gray-500` for the old value and `text-gray-800` for the new value in the case of modifications.

### 4.5. Action Buttons (Accept/Reject)

The buttons will be updated to match the iOS-inspired design.

-   **Style:** They will be styled as small, sharp-cornered buttons.
-   **Accept Button (Primary Action):**
    -   Background: iOS blue (`bg-blue-600`).
    -   Text: White (`text-white`).
    -   Padding: `px-2 py-1`.
    -   Corners: `rounded`.
    -   Font: `text-xs font-semibold`.
-   **Reject Button (Secondary Action):**
    -   Background: Light gray (`bg-gray-200`).
    -   Text: Dark gray (`text-gray-700`).
    -   Padding, corners, and font will match the accept button.
-   **Hover States:** Add subtle transitions and brightness/darkness changes on hover (`hover:bg-blue-700`, `hover:bg-gray-300`).

## 5. Implementation Sequence

1.  **Step 1: Container & Typography:** Apply the base styles to the main container, setting the background, border, padding, margins, and the `font-mono` and `text-xs` classes.
2.  **Step 2: Header Styling:** Refactor the header section to implement the new layout and status indicator styles.
3.  **Step 3: Hunk Details Styling:** Style the list of changes, applying the correct colors and font weights to the change indicators and cell addresses.
4.  **Step 4: Button Styling:** Update the "Accept" and "Reject" buttons to match the new design specifications.
5.  **Step 5: Review and Refine:** Do a final pass to ensure all spacing, colors, and font styles are consistent and harmonious with the rest of the application.

This plan will result in a diff preview component that is not only more visually appealing but also more functional and consistent with the project's professional, iOS-inspired design language.

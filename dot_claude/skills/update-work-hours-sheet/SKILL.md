---
name: update-work-hours-sheet
description: Update 就業実績書 (work hours spreadsheet) with working hours data from a Notion database using Chrome browser automation. Use when the user wants to fill in their timesheet, update work hours, or sync working hours from Notion to Google Sheets.
user-invocable: true
argument-hint: "<google-sheets-url> <notion-page-url>"
---

# Update Work Hours Sheet

## Overview

Reads working hours data from a Notion "Working Hours" database and enters it into a 就業実績書 (Work Performance Record) Google Spreadsheet using Chrome browser automation. Handles the full workflow: fetching Notion data, converting UTC timestamps to JST, mapping to spreadsheet cells, and entering values cell by cell.

## Prerequisites

1. Chrome browser with the Claude-in-Chrome extension connected
2. User must be signed in to Google in Chrome (for Sheets access)
3. User must have access to both the Notion database and the Google Spreadsheet

## Workflow

### Step 1: Collect URLs

If `ARGUMENTS` contains both URLs, use those directly. Otherwise, use `AskUserQuestion` to ask for:

- The Google Spreadsheet URL
- The Notion page/database URL

### Step 2: Fetch Notion Data

Use `mcp__Notion__notion-fetch` to retrieve the Notion page. If it contains an inline database:

1. Fetch the database to get the schema and data source URL
2. Use `mcp__Notion__notion-query-database-view` to get all rows with their values

Key considerations:

- Note the schema: property names, types (date, number, text, etc.)
- Date properties are stored in UTC (ISO-8601 with `Z` suffix) — **convert to JST (+9 hours)** for Japanese spreadsheets
- Formula properties return references, not computed values — may need to skip or compute manually

### Step 3: Open Spreadsheet in Chrome

1. Call `mcp__claude-in-chrome__tabs_context_mcp` to get current tabs
2. Create a new tab with `mcp__claude-in-chrome__tabs_create_mcp`
3. Present a plan with `mcp__claude-in-chrome__update_plan` for `docs.google.com`
4. Navigate to the spreadsheet URL with `mcp__claude-in-chrome__navigate`
5. If a Google sign-in page appears, ask the user to sign in manually (passwords are prohibited)
6. Wait for the spreadsheet to load and take a screenshot to verify

### Step 4: Analyze Spreadsheet Structure

Take a screenshot and/or use `mcp__claude-in-chrome__read_page` to understand:

- Which rows/columns correspond to which data fields
- Which cells are already filled vs empty
- The cell reference format (e.g., row numbers for each date)
- Any auto-calculated columns (formulas) that should NOT be overwritten

### Step 5: Map Notion Data to Spreadsheet Cells

Create a mapping between Notion records and spreadsheet cells:

- Match Notion records to spreadsheet rows (e.g., by date, name, or ID)
- Identify which columns in the spreadsheet correspond to which Notion properties
- Apply any necessary transformations:
  - **Timezone conversion**: Notion stores dates in UTC — convert to local timezone
  - **Time format**: Extract `H:MM` from datetime for time-only columns
  - **Number format**: Ensure numbers match expected format (minutes vs hours, etc.)

Present the mapping to the user for confirmation before entering data.

### Step 6: Enter Data via Browser Automation

Use the Name Box navigation pattern for efficient cell entry:

```
For each row:
1. Click the Name Box (textbox showing current cell reference, e.g., ref_54)
2. Type the target cell address (e.g., "D28")
3. Press Return to navigate
4. Type the value
5. Press Tab to move to the next column
6. Type the next value
7. Press Tab, type value, ... repeat for all columns in the row
8. Press Return to confirm the last value
```

**Important guidelines:**

- Use the Name Box (`ref_54` or similar) to jump to non-adjacent rows
- Use Tab to move between columns within the same row
- Press Return after the last value in a row to confirm entry
- Take periodic screenshots to verify data is landing in the correct cells
- After entering all data, take a final screenshot to verify

### Step 7: Clean Up and Verify

1. Navigate back to cell A1 for a full view
2. Take a screenshot to verify all data
3. Check for:
   - Stray data in unexpected cells (can happen if navigation goes wrong)
   - Auto-calculated columns updated correctly
   - Summary/total rows updated correctly
4. Clean up any stray data by navigating to the cell and pressing Backspace

## Error Handling

- **Google sign-in required**: Ask user to sign in manually — never enter credentials
- **Spreadsheet not loading**: Retry navigation, check URL format
- **Data in wrong cell**: Use Ctrl+Z (undo) immediately, then re-navigate to correct cell
- **Stray data**: After completion, scan for data in unexpected cells and delete
- **Name Box not found**: Use `read_page` with `filter: "interactive"` to find the cell reference textbox

## Timezone Conversion Reference

Notion stores datetime values in UTC (ISO-8601 with `Z` suffix):

```
"2026-02-16T19:37:00.000Z"  →  UTC: Feb 16, 19:37
                             →  JST: Feb 17, 04:37 (+9h)
```

Always confirm timezone interpretation with the user if the converted times look unexpected.

## Example Usage

```
User: /update-spreadsheet-from-notion https://docs.google.com/spreadsheets/d/abc123/edit?gid=0 https://www.notion.so/my-database-page
→ Fetches Notion data, maps to spreadsheet, enters values via Chrome
```

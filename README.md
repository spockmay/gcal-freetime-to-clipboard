# GCal Freetime Scraper

A lightweight Chrome Extension for systems engineers and professionals to quickly extract their daily availability from Google Calendar.

## Features
- **One-Click Export:** Right-click on any day in your Google Calendar "Day View" to copy your available slots.
- **Smart Gap Detection:** Automatically calculates gaps between busy events within your defined work hours (8 AM - 5 PM).
- **Timezone Aware:** Labels your availability with your current timezone (e.g., EDT, PST).
- **Professional Formatting:** Outputs a clean, bulleted list ready for email or Slack.
- **Privacy First:** All processing happens locally in your browser. No calendar data is ever sent to third-party servers.

## Installation
1. Download the repository as a ZIP file and extract it.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right.
4. Click **Load unpacked** and select the folder containing the extension files.

## Usage
1. Open [Google Calendar](https://calendar.google.com).
2. Switch to **Day View** (Press 'D').
3. Right-click anywhere on the calendar grid.
4. Select **Copy Free Times to Clipboard**.
5. Paste the formatted availability wherever you need it!

## Development
Built with Manifest V3, the Google Calendar FreeBusy API, and Vanilla JavaScript.
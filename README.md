# FleaSpace

FleaSpace is a small static website prototype for booking up to three stalls at a Berlin flea market. Sellers can compare upcoming dates, fees and rules, choose specific stalls for a market date, and get an immediate reservation confirmation with the total cost.

The market directory and map pins are generated from sample data for five Berlin markets.

## Design goal

Make it clear where sellers need to go, what their stalls cost, and whether their spots are secured, so they can prepare for market day without guesswork.

## Project structure

```text
fleaspace/
├── index.html          Home
├── markets.html        Find a market
├── stalls.html         Choose a stall
├── confirmation.html   Reservation confirmation
├── my-bookings.html    View and manage bookings
├── css/
│   └── styles.css      Shared design system and responsive styles
├── js/
│   ├── app.js          Shared interactions and reservation flow
│   └── data.js         Sample markets, dates, availability and reservation storage key
└── ref/                Lo-fi layout references
```

## Run locally

Open `index.html` in a browser. No server, build step, package installation, or framework is required. Create a demo account with any name and email address, or sign in with an account already created in that browser; no password is requested. Account names and email addresses, the current demo session, and bookings are stored only in that browser's local storage and are never sent to a server. Bookings are associated with the signed-in email, while stall availability is shared across all demo accounts in that browser. Existing single-booking data is migrated automatically, and bookings without an owner are assigned to the first account that signs in or is created. This is a local prototype, not a real authentication or payment system, and data does not sync across browsers or devices. Use “My bookings” to view or cancel your bookings. “Reset demo data” asks for confirmation, then clears bookings, accounts, and the current session. On a confirmation page, “Add to calendar” downloads an `.ics` event, “Google Calendar” opens a prefilled event, and “Download PDF” opens the print dialog; choose **Save as PDF**.

## Publish with GitHub Pages

1. Push the project folder to a GitHub repository.
2. Open the repository’s **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the branch to publish and the repository root (`/`) as the folder, then save.
5. Open the URL provided in the Pages settings after deployment completes.

All page, stylesheet, script, and navigation links use relative paths for static hosting.

Markets, dates, fees, availability, and organizer contact details in this prototype are sample data.

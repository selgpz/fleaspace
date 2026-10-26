# FleaSpace

FleaSpace is a small static website prototype for booking a stall at a Berlin flea market. It helps sellers compare markets, understand fees and rules in advance, choose an exact stall, and keep an immediate reservation confirmation.

## Design goal

Make it clear where sellers need to go, what their stall costs, and whether their spot is secured, so they can prepare for market day without guesswork.

## Project structure

```text
fleaspace/
├── index.html          Home
├── markets.html        Find a market
├── stalls.html         Choose a stall
├── confirmation.html   Reservation confirmation
├── css/
│   └── styles.css      Shared design system and responsive styles
├── js/
│   ├── app.js          Shared interactions and reservation flow
│   └── data.js         Sample markets and reservation storage key
└── ref/                Lo-fi layout references
```

## Run locally

Open `index.html` in a browser. No server, build step, package installation, or framework is required. Reservations are stored in browser local storage. Use the “Reset demo data” link in the footer to clear the saved reservation and try the booking flow again. On the confirmation page, “Download PDF” opens the print dialog; choose **Save as PDF**.

## Publish with GitHub Pages

1. Push the project folder to a GitHub repository.
2. Open the repository’s **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the branch to publish and the repository root (`/`) as the folder, then save.
5. Open the URL provided in the Pages settings after deployment completes.

All page, stylesheet, script, and navigation links use relative paths for static hosting.

Markets, dates, fees, availability, and organizer contact details in this prototype are sample data.

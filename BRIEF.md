You are building "FleaSpace", a small, polished, multi-page static website for a university project (GUI Design & Web Optimization). Read this whole brief first, then build the complete site in this folder in one pass. Keep the code simple, readable and well structured for a student to understand: plain functions, clear names, short comments.

## 1. Context
FleaSpace helps people book a stall at a flea market in Berlin.

Research from a user interview with a first-time seller (she sold clothes with a friend at a Berlin flea market):
- The organizer's website contact went unanswered; the booking really happened through an Instagram DM.
- She was told a booth was assigned to her but could not find its number, so she arrived at 8:00 am and took any free booth (first come, first served).
- Fees and rules only became clear when money was collected around noon.
- The hardest part was transporting and displaying her goods.

Problem statement: People who want to sell second-hand clothes at a flea market can't easily find out how to get a stall. The official contact channel may go unanswered, the real arrangements happen informally through social media messages, and a stall they were told was assigned may not exist in practice.

Design goal: Anyone who wants to sell second-hand items at a flea market knows in advance where to go, what it costs, and that their spot is secured, so they can focus on selling instead of guessing.

Every screen should answer: Where do I go? What does it cost? Is my spot secured?

## 2. Scope and tech
- Exactly 4 pages: index.html (Home), markets.html (Find a market), stalls.html (Choose a stall), confirmation.html (Confirmation).
- Plain HTML, CSS and vanilla JavaScript only. No frameworks, no build step, no npm, no external images (use inline SVG and CSS for all visuals).
- Files: the 4 HTML pages, css/styles.css, js/data.js (sample data), js/app.js (shared logic), plus a short README.md.
- Must work when deployed to GitHub Pages: use relative paths only, no server code.
- Mobile-first web app (design for 390px wide first, then tablet and desktop).
- If a /reference folder exists, look at the images in it: they are my lo-fi Figma prototype. Keep the same screens, flow and layout ideas, but make the result far cleaner, more beautiful and more artistic. Do not copy the rough sketch look.

## 3. Design system
Palette (use ONLY these, as CSS custom properties on :root):
- --paper #FEFEFE: page background and cards
- --mist #EDECEC: soft panels, alternate sections, stall-map walkway, hover backgrounds
- --sage-light #E0E7D7: pale tints: hero shapes, free stalls, badges, highlights
- --sage #B7C396: primary buttons, selected stall, key accents
- --clay #BA9A91: secondary accent: map pins, hand-drawn squiggle, "your stall" marker, "almost full" badge, small decorative details
- --stone #CCCCCC: borders, dividers, taken stalls, disabled states
- --ink #2B2F26: text (the only added color; also use a slightly lighter --ink-soft for secondary text). Always use dark text on sage and clay, never white. All text must meet WCAG AA contrast (4.5:1).
Slightly darker or lighter tints of these colors are allowed for hover and pressed states only.

Typography (Google Fonts, with fallbacks, font-display: swap): Fraunces for headings (soft, artisanal serif; fallback Georgia, serif) and DM Sans for body text (fallback system-ui, sans-serif). Large, confident headings; generous line height; comfortable reading width.

Look and feel: calm, warm, handmade-market feeling but neat and modern. Lots of whitespace, large rounded corners (20 to 28px), thin --stone borders, very soft shadows, soft organic blob shapes in --sage-light and --sage as background decoration, pill-shaped buttons. Primary button: --sage background, --ink text, darker on hover. Secondary button: transparent with a --stone border, --mist on hover. Visible focus outlines. A simple inline SVG favicon.
Subtle motion only: fade-up on load, gentle hover lift on cards and stalls. Respect prefers-reduced-motion.
Shared header on every page: "FleaSpace" logo (links to Home), a "Book a spot" button (links to markets.html) and a "Contact" button that opens an accessible <dialog> with SAMPLE contact details (organizers@fleaspace.example, Instagram @fleaspace.berlin) and a note that they are sample details.
Shared footer: "Prototype for a university project. Markets, dates, fees and availability are sample data." and a small "Reset demo data" link that clears saved reservations.

## 4. Pages
1) Home (index.html)
- Hero: big heading "Your spot. Your market." with a hand-drawn clay squiggle underline under "spot.", short subtext ("Find a flea market in Berlin, see the fees and rules first, pick your exact stall and get instant confirmation."), main button "Find a market" (to markets.html). Next to or below the text, a charming inline SVG illustration of a market stall with a striped awning in the palette colors, a table and a few simple items, plus blob shapes behind it.
- "How it works": 3 steps (1 Choose a market, 2 Pick your stall, 3 Get your confirmation) as soft cards with numbered circles.
- Three short reassurance cards: "Fees and rules upfront", "Pick your exact stall", "Instant confirmation, no waiting for a reply".
- Final call-to-action band in --sage-light with the button again.

2) Find a market (markets.html)
- Back button (to Home) and heading "Flea markets in Berlin".
- Three market cards (from data.js): name, date, opening hours, fee, and a badge such as "6 of 10 stalls free" (use a --clay "Almost full" badge when 2 or fewer are free), and a "View stalls" button (stalls.html?market=<id>).
- Next to the cards (above them on mobile), a stylised map of Berlin in inline SVG: abstract district shapes in --mist/--sage-light with --stone outlines, and a clay pin for each market with its name. Pins are links/buttons to the same destination, and hovering or focusing a pin highlights its card and vice versa. Add a tiny caption: "Stylised map, not to scale."

3) Choose a stall (stalls.html?market=<id>)
- Back button (to markets.html), market name, date and hours as a heading block. If the market parameter is missing or invalid, fall back to the first market.
- Left/top: a tidy stall map: 10 stalls, stalls 1 to 5 in one column and 6 to 10 in the other, with a central walkway in --mist (dashed centre line, small "Walkway" and "Entrance" labels). Each stall is a real <button> showing "Stall N".
- Stall states must never rely on color alone: Free = --sage-light fill with --sage border and the word "Free"; Taken = --stone fill with a diagonal hatch pattern, the word "Taken", and not selectable; Selected = --sage fill with a thick --ink outline, a check icon and "Your choice". Add a legend (Free, Taken, Your choice).
- Right/below: a details panel with clearly separated sections: Selected stall (number, size 2 x 1.5 m, status); Fee and how to pay (fee, "Pay at the entrance on arrival (cash or card)"); Set-up time; Rules (second-hand items only: clothes, books, household items; bring your own table or clothes rack; free cancellation up to 48 hours before); What to bring (table or clothes rack, small change, bags, a mirror for clothes); Not allowed (new or mass-produced goods, food and drinks, counterfeit items, animals).
- Buttons: Back (secondary) and a primary "Reserve Stall N". The primary button is disabled and reads "Select a stall to continue" until a stall is chosen. Helper text under it: "You'll get your confirmation and stall number right away." On mobile, make this action area sticky at the bottom of the screen.
- Announce stall selection to screen readers with an aria-live region.

4) Confirmation (confirmation.html)
- A calm, reassuring card: a large check icon, the big word "Confirmed" and "Reservation confirmed. No need to wait for a reply."
- Details: confirmation number (like FS-1507, generated once and saved), market name, date, stall number (large), opening and closing times, set-up time, fee and how to pay.
- A small version of the same stall map with the booked stall highlighted in --clay and labelled "Your stall".
- Buttons: "Download PDF" (use window.print() with a clean @media print stylesheet that hides the header, footer and buttons and shows only the card; label it "Download PDF" and add a tooltip or helper text "Opens print: choose Save as PDF"), a link "Questions? Contact the organizer" (opens the same contact dialog), and "Back to home".
- If there is no saved reservation, show a friendly empty state with a button to find a market.

## 5. Data and behaviour
- js/data.js holds an array of 3 sample markets: Mauerpark Flea (Sun 15 Nov 2026, 8:00 to 16:00, set-up 7:00 to 8:00, EUR 15, taken stalls 1, 4, 8, 10 so 6 are free), Boxhagener Platz Flea (Sun 22 Nov 2026, 8:00 to 16:00, set-up 7:00 to 8:00, EUR 12, taken stalls 3, 6, 9), RAW Gelaende Flea (Sat 28 Nov 2026, 9:00 to 17:00, set-up 8:00 to 9:00, EUR 18, taken stalls 1 to 8). Each market has 10 stalls, each 2 x 1.5 m. Free-stall counts shown on the cards must be calculated from the data, never hard-coded.
- When the user reserves, save the reservation (market, stall, confirmation number) in localStorage inside try/catch, mark that stall as taken from then on, and go to confirmation.html. "Reset demo data" clears it so the flow can be tested repeatedly.

## 6. Accessibility, responsiveness and performance
- Semantic HTML (header, nav, main, section, footer), a skip-to-content link, one h1 per page, lang="en", unique <title> and meta description per page, correct viewport meta tag.
- Fully keyboard operable, visible focus states, touch targets of at least 44px, aria-labels on stalls such as "Stall 7, free, 2 by 1.5 metres".
- No horizontal scrolling at any width from 360px to 1440px.
- Performance: no libraries, minimal CSS and JS, inline SVG instead of images, preconnect to Google Fonts, one stylesheet and one shared script.

## 7. Before you finish
Review your own work and fix problems before reporting: every link and button works across the full flow (Home to Find a market to Choose a stall to Confirmation and back); the Reserve button is disabled until a stall is selected; there are no console errors; the layout works at 390px and 1440px; contrast is AA; stall status is understandable without color; every page loads correctly when opened directly. Then write README.md (what the project is, the design goal, the file structure, how to run it by opening index.html, and how to publish it with GitHub Pages) and give me a short summary of the files you created.
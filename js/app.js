(() => {
  const contactDialog = document.querySelector("[data-contact-dialog]");
  const cancelDialog = document.querySelector("[data-cancel-dialog]");
  const status = document.querySelector("[data-app-status]");
  const marketCards = document.querySelector("[data-market-cards]");
  const marketPins = document.querySelector("[data-market-pins]");
  const bookingsList = document.querySelector("[data-bookings-list]");
  const bookingsEmpty = document.querySelector("[data-bookings-empty]");
  const stallMap = document.querySelector("[data-stall-map]");
  const reserveButton = document.querySelector("[data-reserve]");
  const reserveError = document.querySelector("[data-reserve-error]");
  const selectionLimitMessage = document.querySelector("[data-selection-limit]");
  const dateSelector = document.querySelector("[data-date-selector]");
  const accountDialog = document.createElement("dialog");
  accountDialog.className = "account-dialog";
  accountDialog.setAttribute("aria-labelledby", "account-dialog-title");
  accountDialog.setAttribute("aria-describedby", "account-demo-note");
  accountDialog.dataset.accountDialog = "";
  accountDialog.innerHTML = `
    <div class="account-dialog-inner">
      <button class="dialog-close" type="button" aria-label="Close account dialog" data-account-close>
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg>
      </button>
      <p class="eyebrow">Your FleaSpace account</p>
      <h2 id="account-dialog-title" data-account-title>Sign in</h2>
      <div class="account-tabs" role="group" aria-label="Account action">
        <button type="button" class="account-tab" data-account-mode="create" aria-pressed="false">Create account</button>
        <button type="button" class="account-tab" data-account-mode="signin" aria-pressed="true">Sign in</button>
      </div>
      <p class="account-demo-note" id="account-demo-note">Demo account: no password needed. Your details stay in this browser and are never sent anywhere. You can use any name and email.</p>
      <form data-account-form novalidate>
        <div class="account-field" data-account-name-field hidden>
          <label for="account-name">Name</label>
          <input id="account-name" name="name" autocomplete="name" aria-describedby="account-error">
        </div>
        <div class="account-field">
          <label for="account-email">Email</label>
          <input id="account-email" name="email" type="email" autocomplete="email" inputmode="email" aria-describedby="account-error">
        </div>
        <p class="account-error" id="account-error" data-account-error role="alert" hidden></p>
        <button class="button button-primary account-submit" type="submit" data-account-submit>Sign in</button>
      </form>
    </div>`;
  document.body.append(accountDialog);

  let activeMarket = null;
  let activeDate = null;
  let selectedStalls = new Set();
  let takenStalls = new Set();
  let pendingCancellation = null;
  let currentAccount = null;
  let accountDialogMode = "signin";
  let accountDialogReturnFocus = null;
  const accountFeedback = document.createElement("p");
  accountFeedback.className = "account-feedback";
  accountFeedback.setAttribute("role", "status");
  accountFeedback.setAttribute("aria-live", "polite");
  accountFeedback.hidden = true;
  document.body.append(accountFeedback);

  function showAccountMessage(message) {
    accountFeedback.textContent = message;
    accountFeedback.hidden = false;
    window.clearTimeout(showAccountMessage.timeout);
    showAccountMessage.timeout = window.setTimeout(() => {
      accountFeedback.hidden = true;
    }, 3500);
    if (status) {
      status.textContent = message;
    }
  }

  function getAccounts() {
    try {
      const saved = window.localStorage.getItem("fleaspace.accounts");
      if (!saved) {
        return [];
      }
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) {
        throw new TypeError("Saved account data must be an array.");
      }
      return parsed.filter((account) => account
        && typeof account.name === "string"
        && typeof account.email === "string")
        .map((account) => ({ name: account.name, email: account.email.toLowerCase() }));
    } catch (error) {
      console.error("Unable to read FleaSpace account data.", error);
      showAccountMessage("Demo account data could not be read in this browser.");
      return null;
    }
  }

  function saveAccounts(accounts) {
    try {
      window.localStorage.setItem("fleaspace.accounts", JSON.stringify(accounts.map(({ name, email }) => ({
        name,
        email,
      }))));
      return true;
    } catch (error) {
      console.error("Unable to save FleaSpace account data.", error);
      showAccountMessage("Demo account details could not be saved in this browser.");
      return false;
    }
  }

  function getSavedSessionEmail() {
    try {
      const saved = window.localStorage.getItem("fleaspace.session");
      if (!saved) {
        return null;
      }
      const session = JSON.parse(saved);
      return typeof session?.email === "string" ? session.email.toLowerCase() : null;
    } catch (error) {
      console.error("Unable to read FleaSpace session data.", error);
      showAccountMessage("Your demo sign-in could not be read in this browser.");
      return null;
    }
  }

  function saveSession(email) {
    try {
      window.localStorage.setItem("fleaspace.session", JSON.stringify({ email }));
      return true;
    } catch (error) {
      console.error("Unable to save FleaSpace session data.", error);
      showAccountMessage("Your demo sign-in could not be saved in this browser.");
      return false;
    }
  }

  function loadCurrentAccount() {
    const email = getSavedSessionEmail();
    if (!email) {
      return null;
    }
    const accounts = getAccounts();
    if (!accounts) {
      return null;
    }
    return accounts.find((account) => account.email === email) || null;
  }

  function claimLegacyReservations(email) {
    const reservations = getReservations();
    let changed = false;
    reservations.forEach((reservation) => {
      if (typeof reservation.ownerEmail !== "string" || !reservation.ownerEmail.trim()) {
        reservation.ownerEmail = email;
        changed = true;
      }
    });
    return !changed || saveReservations(reservations);
  }

  function setCurrentAccount(account) {
    currentAccount = account;
    renderAccountHeader();
    renderBookings();
    renderConfirmation();
  }

  function renderAccountHeader() {
    document.querySelectorAll("nav.header-actions").forEach((nav) => {
      nav.querySelector("[data-account-controls]")?.remove();
      const controls = document.createElement("span");
      controls.className = "account-controls";
      controls.dataset.accountControls = "";

      if (currentAccount) {
        const chip = document.createElement("span");
        chip.className = "account-chip";
        const initial = document.createElement("span");
        initial.className = "account-initial";
        initial.setAttribute("aria-hidden", "true");
        initial.textContent = currentAccount.name.trim().charAt(0).toUpperCase();
        const name = document.createElement("span");
        name.textContent = currentAccount.name.trim().split(/\s+/)[0];
        chip.append(initial, name);
        const signOut = document.createElement("button");
        signOut.className = "button button-secondary button-small";
        signOut.type = "button";
        signOut.dataset.accountSignout = "";
        signOut.textContent = "Sign out";
        controls.append(chip, signOut);
      } else {
        const signIn = document.createElement("button");
        signIn.className = "button button-secondary button-small";
        signIn.type = "button";
        signIn.dataset.accountOpen = "";
        signIn.textContent = "Sign in";
        controls.append(signIn);
      }
      nav.append(controls);
    });
  }

  function setAccountDialogMode(mode, title = null) {
    accountDialogMode = mode;
    const titleElement = accountDialog.querySelector("[data-account-title]");
    const nameField = accountDialog.querySelector("[data-account-name-field]");
    const nameInput = accountDialog.querySelector("#account-name");
    const submit = accountDialog.querySelector("[data-account-submit]");
    titleElement.textContent = title || (mode === "create" ? "Create your account" : "Sign in");
    nameField.hidden = mode !== "create";
    nameInput.required = mode === "create";
    submit.textContent = mode === "create" ? "Create account" : "Sign in";
    accountDialog.querySelectorAll("[data-account-mode]").forEach((button) => {
      const selected = button.dataset.accountMode === mode;
      button.setAttribute("aria-pressed", String(selected));
    });
    accountDialog.querySelector("[data-account-error]").hidden = true;
    accountDialog.querySelector("#account-name").removeAttribute("aria-invalid");
    accountDialog.querySelector("#account-email").removeAttribute("aria-invalid");
  }

  function openAccountDialog(mode, title = null, returnFocus = document.activeElement) {
    setAccountDialogMode(mode, title);
    accountDialogReturnFocus = returnFocus instanceof HTMLElement ? returnFocus : null;
    if (!accountDialog.open) {
      accountDialog.showModal();
    }
    const focusTarget = mode === "create"
      ? accountDialog.querySelector("#account-name")
      : accountDialog.querySelector("#account-email");
    focusTarget.focus();
  }

  function getReservations() {
    try {
      const saved = window.localStorage.getItem(window.FLEASPACE_RESERVATION_KEY);
      if (!saved) {
        return [];
      }

      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.filter((reservation) => reservation && typeof reservation === "object");
      }
      if (parsed && typeof parsed === "object") {
        const migrated = [parsed];
        if (!saveReservations(migrated)) {
          if (status) {
            status.textContent = "Your existing booking was read but could not be migrated to the new booking list.";
          }
        }
        return migrated;
      }
      throw new TypeError("Saved booking data must be an object or an array.");
    } catch (error) {
      console.error("Unable to read FleaSpace booking data.", error);
      if (status) {
        status.textContent = "Saved booking data could not be read.";
      }
      return [];
    }
  }

  function saveReservations(reservations) {
    try {
      window.localStorage.setItem(window.FLEASPACE_RESERVATION_KEY, JSON.stringify(reservations));
      return true;
    } catch (error) {
      console.error("Unable to save FleaSpace booking data.", error);
      if (status) {
        status.textContent = "Booking changes could not be saved in this browser.";
      }
      return false;
    }
  }

  function formatFee(market) {
    return new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency: market.currency,
      maximumFractionDigits: 0,
    }).format(market.fee);
  }

  function getReservationStalls(reservation) {
    if (Array.isArray(reservation?.stalls)) {
      return reservation.stalls.map(Number);
    }
    const legacyStall = Number(reservation?.stallNumber ?? reservation?.stall);
    return Number.isInteger(legacyStall) ? [legacyStall] : [];
  }

  function getCurrentReservation(reservations = getReservations()) {
    const confirmationNumber = new URLSearchParams(window.location.search).get("confirmation");
    if (confirmationNumber) {
      return reservations.find((reservation) => currentAccount
        && reservation.confirmationNumber === confirmationNumber
        && reservation.ownerEmail === currentAccount.email) || null;
    }
    return [...reservations].reverse().find((reservation) => currentAccount
      && reservation.ownerEmail === currentAccount.email) || null;
  }

  function getDateForMarket(market, date) {
    return market.dates.find((item) => item.date === date) || market.dates[0];
  }

  function formatTotal(market, count) {
    return formatAmount(market, market.fee * count);
  }

  function formatAmount(market, amount) {
    return new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency: market.currency,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function getMarketEventTimes(market, date) {
    const [openingTime, closingTime] = market.hours.split(" to ");
    const toUtc = (time) => {
      const [hour, minute] = time.split(":").map(Number);
      const [year, month, day] = date.split("-").map(Number);
      const localAsUtc = Date.UTC(year, month - 1, day, hour, minute);
      let utc = localAsUtc;
      const formatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Berlin",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      });

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const parts = Object.fromEntries(formatter.formatToParts(new Date(utc))
          .filter((part) => part.type !== "literal")
          .map((part) => [part.type, Number(part.value)]));
        const formattedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
        utc = localAsUtc - (formattedAsUtc - utc);
      }

      return new Date(utc);
    };

    return [toUtc(openingTime), toUtc(closingTime)];
  }

  function formatCalendarDate(date) {
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  }

  function escapeCalendarText(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  }

  function getCalendarDescription(reservation) {
    return `Stalls: ${getReservationStalls(reservation).join(", ")}\nConfirmation: ${reservation.confirmationNumber}`;
  }

  function buildGoogleCalendarUrl(market, date, reservation) {
    const [start, end] = getMarketEventTimes(market, date);
    const parameters = new URLSearchParams({
      action: "TEMPLATE",
      text: `${market.name} — FleaSpace`,
      dates: `${formatCalendarDate(start)}/${formatCalendarDate(end)}`,
      details: getCalendarDescription(reservation),
      location: market.name,
    });
    return `https://calendar.google.com/calendar/render?${parameters.toString()}`;
  }

  function downloadCalendarEvent() {
    const reservations = getReservations();
    const reservation = getCurrentReservation(reservations);
    const market = window.FLEASPACE_MARKETS?.find((item) => item.id === getReservedMarketId(reservation));
    const date = market && getDateForMarket(market, reservation?.date || market.dates[0].date);
    if (!reservation || !market || !date) {
      return;
    }

    const [start, end] = getMarketEventTimes(market, date.date);
    const description = escapeCalendarText(getCalendarDescription(reservation));
    const event = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//FleaSpace//Market Booking//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${escapeCalendarText(reservation.confirmationNumber)}@fleaspace`,
      `DTSTAMP:${formatCalendarDate(new Date())}`,
      `DTSTART:${formatCalendarDate(start)}`,
      `DTEND:${formatCalendarDate(end)}`,
      `SUMMARY:${escapeCalendarText(`${market.name} — FleaSpace`)}`,
      `LOCATION:${escapeCalendarText(market.name)}`,
      `DESCRIPTION:${description}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const file = new Blob([event], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reservation.confirmationNumber}.ics`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function updateDateInUrl(date) {
    const url = new URL(window.location.href);
    url.searchParams.set("market", activeMarket.id);
    url.searchParams.set("date", date);
    window.history.pushState({}, "", url);
  }

  function renderDateSelector() {
    if (!dateSelector || !activeMarket) {
      return;
    }
    dateSelector.innerHTML = activeMarket.dates.map((item) => `
      <button class="date-option" type="button" data-market-date-option="${item.date}" aria-pressed="${item.date === activeDate.date}">
        ${item.displayDate}
      </button>`).join("");
    dateSelector.querySelectorAll("[data-market-date-option]").forEach((button) => {
      button.addEventListener("click", () => {
        activeDate = getDateForMarket(activeMarket, button.dataset.marketDateOption);
        selectedStalls.clear();
        updateDateInUrl(activeDate.date);
        renderStallPage();
        dateSelector.querySelector(`[data-market-date-option="${activeDate.date}"]`)?.focus();
      });
    });
  }

  function renderStallMap() {
    if (!stallMap || !activeMarket) {
      return;
    }

    const stalls = Array.from({ length: activeMarket.stallCount }, (_, index) => {
      const stallNumber = index + 1;
      const isTaken = takenStalls.has(stallNumber);
      const isSelected = selectedStalls.has(stallNumber);
      const stateLabel = isTaken ? "Taken" : isSelected ? "Your choice" : "Free";
      const icon = isSelected
        ? '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10 4 4 8-8"/></svg>'
        : "";
      const stateClass = isTaken ? "is-taken" : isSelected ? "is-selected" : "is-free";
      return `
        <button class="stall-button ${stateClass}" type="button" data-stall-number="${stallNumber}" ${isTaken ? "disabled" : ""} aria-pressed="${isSelected}" aria-label="Stall ${stallNumber}, ${stateLabel.toLowerCase()}, 2 by 1.5 metres">
          <span class="stall-number">Stall ${stallNumber}</span>
          <span class="stall-state">${icon}${stateLabel}</span>
        </button>`;
    });

    stallMap.innerHTML = `
      <div class="stall-column stall-column-left" aria-label="Stalls 1 to 5">${stalls.slice(0, 5).join("")}</div>
      <div class="stall-walkway" aria-label="Walkway">
        <span class="walkway-label">Walkway</span>
        <span class="walkway-path" aria-hidden="true"></span>
        <span class="entrance-label"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v13m-5-5 5 5 5-5"/></svg>Entrance</span>
      </div>
      <div class="stall-column stall-column-right" aria-label="Stalls 6 to 10">${stalls.slice(5).join("")}</div>`;

    stallMap.querySelectorAll("[data-stall-number]").forEach((button) => {
      button.addEventListener("click", () => {
        const stallNumber = Number(button.dataset.stallNumber);
        if (selectedStalls.has(stallNumber)) {
          selectedStalls.delete(stallNumber);
        } else if (selectedStalls.size >= 3) {
          if (selectionLimitMessage) {
            selectionLimitMessage.textContent = "You can book up to 3 stalls at a time.";
          }
          return;
        } else {
          selectedStalls.add(stallNumber);
        }
        renderStallMap();
        updateSelectedStall();
        stallMap.querySelector(`[data-stall-number="${stallNumber}"]`)?.focus();
      });
    });
  }

  function updateSelectedStall() {
    const selectedLabel = document.querySelector("[data-selected-stall]");
    const selectionStatus = document.querySelector("[data-selection-status]");
    if (selectedLabel) {
      const numbers = [...selectedStalls].sort((a, b) => a - b);
      selectedLabel.textContent = numbers.length
        ? numbers.map((number) => `Stall ${number}`).join(", ")
        : "No stall selected";
    }
    if (selectionStatus) {
      selectionStatus.textContent = selectedStalls.size
        ? `${selectedStalls.size} of 3 selected`
        : "Select up to 3";
    }
    const breakdown = document.querySelector("[data-cost-breakdown]");
    if (breakdown && activeMarket) {
      breakdown.textContent = selectedStalls.size
        ? `${selectedStalls.size} ${selectedStalls.size === 1 ? "stall" : "stalls"} × ${formatFee(activeMarket)} = ${formatTotal(activeMarket, selectedStalls.size)}`
        : "No stalls selected";
    }
    if (reserveButton) {
      reserveButton.disabled = selectedStalls.size === 0;
      if (selectedStalls.size === 1) {
        const number = [...selectedStalls][0];
        reserveButton.textContent = `Reserve Stall ${number} · ${formatTotal(activeMarket, 1)}`;
      } else if (selectedStalls.size > 1) {
        reserveButton.textContent = `Reserve ${selectedStalls.size} stalls · ${formatTotal(activeMarket, selectedStalls.size)}`;
      } else {
        reserveButton.textContent = "Select a stall to continue";
      }
    }
    if (reserveError) {
      reserveError.textContent = "";
    }
    if (selectionLimitMessage && selectedStalls.size < 3) {
      selectionLimitMessage.textContent = "";
    }
  }

  function renderStallPage() {
    if (!stallMap || !Array.isArray(window.FLEASPACE_MARKETS) || window.FLEASPACE_MARKETS.length === 0) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const requestedMarketId = params.get("market");
    activeMarket = window.FLEASPACE_MARKETS.find((market) => market.id === requestedMarketId) || window.FLEASPACE_MARKETS[0];
    activeDate = getDateForMarket(activeMarket, params.get("date"));
    if (params.get("market") !== activeMarket.id || params.get("date") !== activeDate.date) {
      const url = new URL(window.location.href);
      url.searchParams.set("market", activeMarket.id);
      url.searchParams.set("date", activeDate.date);
      window.history.replaceState({}, "", url);
    }
    takenStalls = new Set(activeDate.takenStalls);
    getReservations()
      .filter((reservation) => getReservedMarketId(reservation) === activeMarket.id
        && (reservation.date || activeMarket.dates[0].date) === activeDate.date)
      .forEach((reservation) => {
        getReservationStalls(reservation).forEach((number) => {
          if (Number.isInteger(number) && number >= 1 && number <= activeMarket.stallCount) {
            takenStalls.add(number);
          }
        });
      });

    const name = document.querySelector("[data-market-name]");
    const date = document.querySelector("[data-market-date]");
    const hours = document.querySelector("[data-market-hours]");
    const fee = document.querySelector("[data-market-fee]");
    const setup = document.querySelector("[data-market-setup]");
    const stallSize = document.querySelector("[data-stall-size]");
    const count = document.querySelector(".stall-count-label");
    if (name) {
      name.innerHTML = `${activeMarket.name.replace(/ Flea$/, "")} <em>stalls.</em>`;
    }
    if (date) {
      date.textContent = activeDate.displayDate;
    }
    if (hours) {
      hours.textContent = activeMarket.hours;
    }
    if (fee) {
      fee.textContent = formatFee(activeMarket);
    }
    if (setup) {
      setup.textContent = activeMarket.setup;
    }
    if (stallSize) {
      stallSize.textContent = activeMarket.stallSize;
    }
    if (count) {
      count.textContent = `${activeMarket.stallCount - takenStalls.size} free`;
    }
    selectedStalls.clear();
    renderDateSelector();
    renderStallMap();
    updateSelectedStall();
  }

  function createConfirmationNumber() {
    return `FS-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  function reserveSelectedStall() {
    if (!activeMarket || !activeDate || selectedStalls.size === 0
      || [...selectedStalls].some((number) => takenStalls.has(number))) {
      return;
    }
    if (!currentAccount) {
      reserveAfterAccount = true;
      openAccountDialog("signin", "Sign in to reserve your stall", reserveButton);
      return;
    }

    const stalls = [...selectedStalls].sort((a, b) => a - b);
    const reservation = {
      marketId: activeMarket.id,
      market: activeMarket.id,
      date: activeDate.date,
      stalls,
      total: activeMarket.fee * stalls.length,
      confirmationNumber: createConfirmationNumber(),
      ownerEmail: currentAccount.email,
    };

    const reservations = getReservations();
    reservations.push(reservation);
    if (saveReservations(reservations)) {
      window.location.assign(`confirmation.html?confirmation=${encodeURIComponent(reservation.confirmationNumber)}`);
    } else if (reserveError) {
      reserveError.textContent = "Your reservation couldn't be saved. Check your browser storage settings and try again.";
    }
  }

  function renderConfirmation() {
    const card = document.querySelector("[data-confirmation-card]");
    if (!card) {
      return;
    }

    const reservations = getReservations();
    const reservation = getCurrentReservation(reservations);
    const marketId = getReservedMarketId(reservation);
    const market = window.FLEASPACE_MARKETS?.find((item) => item.id === marketId);
    const emptyState = document.querySelector("[data-confirmation-empty]");
    const message = document.querySelector("[data-confirmation-message]");
    const content = document.querySelector("[data-confirmation-content]");
    const reservationStalls = getReservationStalls(reservation);
    const date = market && getDateForMarket(market, reservation?.date || market.dates[0].date);
    const confirmationNumber = reservation?.confirmationNumber;
    const isValidReservation = market
      && date
      && reservationStalls.length >= 1
      && reservationStalls.length <= 3
      && reservationStalls.every((number) => Number.isInteger(number) && number >= 1 && number <= market.stallCount)
      && new Set(reservationStalls).size === reservationStalls.length
      && typeof confirmationNumber === "string"
      && confirmationNumber.length > 0;

    if (!isValidReservation) {
      card.hidden = true;
      if (emptyState) {
        emptyState.hidden = false;
      }
      return;
    }

    const confirmationFields = {
      "[data-confirmation-number]": confirmationNumber,
      "[data-confirmation-market]": market.name,
      "[data-confirmation-date]": date.displayDate,
      "[data-confirmation-stall]": reservationStalls.map((number) => `Stall ${number}`).join(", "),
      "[data-confirmation-hours]": market.hours,
      "[data-confirmation-setup]": market.setup,
      "[data-confirmation-fee]": formatTotal(market, reservationStalls.length),
      "[data-confirmation-breakdown]": `${reservationStalls.length} ${reservationStalls.length === 1 ? "stall" : "stalls"} × ${formatFee(market)} = ${formatTotal(market, reservationStalls.length)}`,
      "[data-mini-map-stall]": reservationStalls.map((number) => `Stall ${number}`).join(", "),
    };
    Object.entries(confirmationFields).forEach(([selector, value]) => {
      const element = document.querySelector(selector);
      if (element) {
        element.textContent = value;
      }
    });
    const account = getAccounts()?.find((item) => item.email === reservation.ownerEmail);
    const bookedBy = document.querySelector("[data-confirmation-account]");
    if (bookedBy) {
      bookedBy.textContent = account
        ? `Booked by ${account.name} · ${account.email}`
        : `Booked by ${reservation.ownerEmail || "a FleaSpace demo account"}`;
    }
    if (message) {
      message.textContent = "Reservation confirmed. No need to wait for a reply.";
    }
    const map = document.querySelector("[data-confirmation-map]");
    if (map) {
      const stalls = Array.from({ length: market.stallCount }, (_, index) => {
        const number = index + 1;
        const isReserved = reservationStalls.includes(number);
        return `<span class="mini-stall${isReserved ? " is-your-stall" : ""}"${isReserved ? ' aria-label="Your stall, Stall ' + number + '"' : ' aria-hidden="true"'}>${number}</span>`;
      });
      map.innerHTML = `
        <div class="mini-stall-column">${stalls.slice(0, 5).join("")}</div>
        <div class="mini-walkway"><span>Walkway</span><i aria-hidden="true"></i><small>Entrance</small></div>
        <div class="mini-stall-column">${stalls.slice(5).join("")}</div>`;
      map.setAttribute("aria-label", `Mini map of ${market.name}; Stalls ${reservationStalls.join(", ")} are your reserved stalls.`);
    }
    const googleCalendarLink = document.querySelector("[data-google-calendar]");
    if (googleCalendarLink) {
      googleCalendarLink.href = buildGoogleCalendarUrl(market, date.date, reservation);
    }
    card.hidden = false;
    if (content) {
      content.hidden = false;
    }
    if (emptyState) {
      emptyState.hidden = true;
    }
  }

  function getReservedMarketId(reservation) {
    if (!reservation || typeof reservation !== "object") {
      return null;
    }

    if (typeof reservation.marketId === "string") {
      return reservation.marketId;
    }

    if (typeof reservation.market === "string") {
      return reservation.market;
    }

    if (reservation.market && typeof reservation.market.id === "string") {
      return reservation.market.id;
    }

    return null;
  }

  function getBookingDetails(reservation) {
    const market = window.FLEASPACE_MARKETS?.find((item) => item.id === getReservedMarketId(reservation));
    const date = market && getDateForMarket(market, reservation.date || market.dates[0].date);
    const stalls = getReservationStalls(reservation);
    if (!market || !date || stalls.length === 0) {
      return null;
    }
    return { market, date, stalls, total: Number(reservation.total) || market.fee * stalls.length };
  }

  function renderBookings() {
    if (!bookingsList || !bookingsEmpty) {
      return;
    }
    const signInButton = bookingsEmpty.querySelector("[data-bookings-signin]");
    if (signInButton) {
      signInButton.hidden = Boolean(currentAccount);
    }
    const emptyTitle = bookingsEmpty.querySelector("[data-bookings-empty-title]");
    const emptyCopy = bookingsEmpty.querySelector("[data-bookings-empty-copy]");
    if (emptyTitle) {
      emptyTitle.innerHTML = currentAccount ? "No bookings <em>just yet.</em>" : "Sign in to see <em>your bookings.</em>";
    }
    if (emptyCopy) {
      emptyCopy.textContent = currentAccount
        ? "Choose a market, pick the stalls that suit you, and your bookings will be right here."
        : "Sign in to view and manage your market bookings.";
    }
    const reservations = currentAccount
      ? getReservations().filter((reservation) => reservation.ownerEmail === currentAccount.email)
      : [];
    bookingsList.innerHTML = reservations.map((reservation) => {
      const details = getBookingDetails(reservation);
      if (!details) {
        return "";
      }
      const { market, date, stalls, total } = details;
      return `
        <article class="booking-card">
          <div class="booking-card-heading">
            <div>
              <p class="eyebrow">Market day</p>
              <h2>${market.name}</h2>
            </div>
            <span class="booking-confirmation-number">${reservation.confirmationNumber}</span>
          </div>
          <dl class="booking-details">
            <div><dt>Date</dt><dd>${date.displayDate}</dd></div>
            <div><dt>Stalls</dt><dd>${stalls.map((number) => `Stall ${number}`).join(", ")}</dd></div>
            <div><dt>Total cost</dt><dd>${formatAmount(market, total)}</dd></div>
            <div><dt>Confirmation no.</dt><dd>${reservation.confirmationNumber}</dd></div>
          </dl>
          <div class="booking-actions">
            <a class="button button-primary button-small" href="confirmation.html?confirmation=${encodeURIComponent(reservation.confirmationNumber)}">View confirmation</a>
            <button class="button button-secondary button-small" type="button" data-cancel-booking="${reservation.confirmationNumber}">Cancel booking</button>
          </div>
        </article>`;
    }).join("");
    const hasBookings = bookingsList.childElementCount > 0;
    bookingsEmpty.hidden = hasBookings;
    bookingsList.hidden = !hasBookings;
  }

  function openCancellationDialog(confirmationNumber) {
    if (!(cancelDialog instanceof HTMLDialogElement)) {
      return;
    }
    const reservation = currentAccount && getReservations().find((item) => item.confirmationNumber === confirmationNumber
      && item.ownerEmail === currentAccount.email);
    const details = reservation && getBookingDetails(reservation);
    if (!reservation || !details) {
      if (status) {
        status.textContent = "That booking could not be found.";
      }
      return;
    }

    pendingCancellation = reservation.confirmationNumber;
    const summary = document.querySelector("[data-cancel-summary]");
    const warning = document.querySelector("[data-cancel-warning]");
    const { market, date } = details;
    if (summary) {
      summary.textContent = `${market.name} · ${date.displayDate}`;
    }
    if (warning) {
      const [start] = getMarketEventTimes(market, date.date);
      const hoursUntilMarket = (start.getTime() - Date.now()) / (60 * 60 * 1000);
      warning.hidden = hoursUntilMarket >= 48;
      warning.textContent = "This market is less than 48 hours away or has already started. Cancellation is still available, but the free-cancellation period may have passed.";
    }
    cancelDialog.showModal();
  }

  function cancelBooking() {
    if (!pendingCancellation || !currentAccount) {
      return;
    }
    const reservations = getReservations();
    const updatedReservations = reservations.filter((item) => !(item.confirmationNumber === pendingCancellation
      && item.ownerEmail === currentAccount.email));
    if (updatedReservations.length === reservations.length) {
      if (status) {
        status.textContent = "That booking could not be found.";
      }
      return;
    }
    if (!saveReservations(updatedReservations)) {
      return;
    }

    pendingCancellation = null;
    cancelDialog.close();
    renderBookings();
    renderMarketCards();
    if (status) {
      status.textContent = "Booking canceled. Your stalls are available again.";
    }
  }

  function renderMarketCards() {
    if ((!marketCards && !marketPins) || !Array.isArray(window.FLEASPACE_MARKETS)) {
      return;
    }

    const reservations = getReservations();
    const marketCount = document.querySelector("[data-market-count]");
    if (marketCount) {
      const count = window.FLEASPACE_MARKETS.length;
      marketCount.textContent = `${count} ${count === 1 ? "market" : "markets"}`;
    }

    if (marketCards) {
      marketCards.innerHTML = window.FLEASPACE_MARKETS.map((market) => {
      const nextDate = market.dates[0];
      const takenStalls = new Set(nextDate.takenStalls);
      reservations.filter((reservation) => getReservedMarketId(reservation) === market.id
        && (reservation.date || market.dates[0].date) === nextDate.date)
        .flatMap(getReservationStalls)
        .forEach((number) => takenStalls.add(number));

      const freeStalls = Math.max(0, market.stallCount - takenStalls.size);
      const isAlmostFull = freeStalls <= 2;
      const badge = isAlmostFull
        ? `<span class="availability-badge availability-almost-full">Almost full · ${freeStalls} of ${market.stallCount} free</span>`
        : `<span class="availability-badge">${freeStalls} of ${market.stallCount} stalls free</span>`;
      const fee = new Intl.NumberFormat("en-IE", {
        style: "currency",
        currency: market.currency,
        maximumFractionDigits: 0,
      }).format(market.fee);

      return `
        <article class="market-card" data-market-card="${market.id}">
          <div class="market-card-top">
            <span class="market-card-icon" aria-hidden="true">
              <svg viewBox="0 0 32 32"><path d="M5 14h22l-2-8H7l-2 8Zm0 0c0 3 4 4 6 1 2 3 6 2 6-1 0 3 4 4 6 1 2 3 6 2 6-1M8 16v11m16-11v11M5 27h22"/></svg>
            </span>
            ${badge}
          </div>
          <h2>${market.name}</h2>
          <p class="market-date">${nextDate.displayDate}</p>
          <div class="market-details">
            <span><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="M10 6v4l3 2"/></svg>${market.hours}</span>
            <span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 17s6-5.4 6-10a6 6 0 1 0-12 0c0 4.6 6 10 6 10Z"/><circle cx="10" cy="7" r="2"/></svg>Set-up ${market.setup}</span>
          </div>
          <div class="market-card-bottom">
            <p class="market-fee"><small>Stall fee</small><strong>${fee}<span> / stall</span></strong></p>
            <a class="button button-primary market-view-button" href="stalls.html?market=${encodeURIComponent(market.id)}&amp;date=${nextDate.date}" data-market-highlight="${market.id}">
              View stalls
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11m-5-5 5 5-5 5"/></svg>
            </a>
          </div>
        </article>`;
      }).join("");
    }

    if (marketPins) {
      marketPins.replaceChildren(...window.FLEASPACE_MARKETS.map((market) => {
        const nextDate = market.dates[0];
        const pin = document.createElement("a");
        pin.className = "map-pin";
        pin.dataset.marketHighlight = market.id;
        pin.href = `stalls.html?market=${encodeURIComponent(market.id)}&date=${encodeURIComponent(nextDate.date)}`;
        pin.setAttribute("aria-label", `${market.name}, view stalls`);
        pin.style.top = `${market.mapPosition.top}%`;
        pin.style.left = `${market.mapPosition.left}%`;
        pin.dataset.labelSide = ["left", "right", "above", "below"].includes(market.mapLabelSide)
          ? market.mapLabelSide
          : "right";
        if (Number.isFinite(market.mapLabelOffsetY)) {
          pin.style.setProperty("--map-label-offset-y", `${market.mapLabelOffsetY}px`);
        }

        const dot = document.createElement("span");
        dot.className = "pin-dot";
        dot.setAttribute("aria-hidden", "true");
        dot.append(document.createElement("span"));

        const label = document.createElement("span");
        label.className = "pin-label";
        label.innerHTML = `<strong></strong><small></small>`;
        label.querySelector("strong").textContent = market.mapLabel;
        label.querySelector("small").textContent = market.marketDay;
        pin.append(dot, label);
        return pin;
      }));
    }
  }

  function setMarketHighlight(marketId, isActive) {
    document.querySelectorAll(`[data-market-card="${marketId}"], [data-market-highlight="${marketId}"]`).forEach((element) => {
      element.classList.toggle("is-highlighted", isActive);
    });
  }

  function getMarketInteractionTarget(target) {
    if (!(target instanceof Element)) {
      return null;
    }

    const element = target.closest("[data-market-card], [data-market-highlight]");
    if (!element) {
      return null;
    }

    return {
      element,
      marketId: element.dataset.marketCard || element.dataset.marketHighlight,
    };
  }

  function handleMarketPointerOut(event) {
    const current = getMarketInteractionTarget(event.target);
    const next = getMarketInteractionTarget(event.relatedTarget);
    if (current?.marketId && current.marketId !== next?.marketId) {
      setMarketHighlight(current.marketId, false);
    }
  }

  function showAccountError(message, invalidField = null) {
    const error = accountDialog.querySelector("[data-account-error]");
    error.textContent = message;
    error.hidden = false;
    if (invalidField) {
      invalidField.setAttribute("aria-invalid", "true");
      invalidField.focus();
    }
  }

  function submitAccountForm(event) {
    event.preventDefault();
    const nameInput = accountDialog.querySelector("#account-name");
    const emailInput = accountDialog.querySelector("#account-email");
    const name = nameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    accountDialog.querySelector("[data-account-error]").hidden = true;
    nameInput.removeAttribute("aria-invalid");
    emailInput.removeAttribute("aria-invalid");
    if (accountDialogMode === "create" && !name) {
      showAccountError("Enter your name to create an account.", nameInput);
      return;
    }
    if (!emailIsValid) {
      showAccountError("Enter a valid email address.", emailInput);
      return;
    }

    const accounts = getAccounts();
    if (!accounts) {
      return;
    }
    let account;
    if (accountDialogMode === "create") {
      if (accounts.some((item) => item.email === email)) {
        showAccountError("An account with this email already exists. Sign in instead.", emailInput);
        return;
      }
      account = { name, email };
      if (!saveAccounts([...accounts, account])) {
        return;
      }
    } else {
      account = accounts.find((item) => item.email === email);
      if (!account) {
        showAccountError("No demo account with this email. Create one first.", emailInput);
        return;
      }
    }

    if (!claimLegacyReservations(email) || !saveSession(email)) {
      return;
    }
    const shouldReserve = reserveAfterAccount;
    reserveAfterAccount = false;
    setCurrentAccount(account);
    accountDialog.close();
    if (shouldReserve) {
      reserveSelectedStall();
    } else {
      showAccountMessage(`Signed in as ${account.name}.`);
    }
  }

  document.addEventListener("pointerover", (event) => {
    const current = getMarketInteractionTarget(event.target);
    if (current?.marketId) {
      setMarketHighlight(current.marketId, true);
    }
  });
  document.addEventListener("pointerout", handleMarketPointerOut);
  document.addEventListener("focusin", (event) => {
    const current = getMarketInteractionTarget(event.target);
    if (current?.marketId) {
      setMarketHighlight(current.marketId, true);
    }
  });
  document.addEventListener("focusout", handleMarketPointerOut);

  accountDialog.querySelector("[data-account-form]").addEventListener("submit", submitAccountForm);
  accountDialog.querySelectorAll("[data-account-mode]").forEach((button) => {
    button.addEventListener("click", () => setAccountDialogMode(button.dataset.accountMode));
  });
  accountDialog.querySelector("[data-account-close]").addEventListener("click", () => accountDialog.close());
  accountDialog.addEventListener("close", () => {
    reserveAfterAccount = false;
    if (accountDialogReturnFocus?.isConnected) {
      accountDialogReturnFocus.focus();
    }
    accountDialogReturnFocus = null;
  });
  accountDialog.addEventListener("cancel", () => {
    reserveAfterAccount = false;
  });
  accountDialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && accountDialog.open) {
      event.preventDefault();
      accountDialog.close();
    }
  });

  let reserveAfterAccount = false;
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    const signInButton = event.target.closest("[data-account-open], [data-bookings-signin]");
    if (signInButton) {
      reserveAfterAccount = false;
      openAccountDialog("signin", "Sign in", signInButton);
      return;
    }
    const signOutButton = event.target.closest("[data-account-signout]");
    if (signOutButton) {
      try {
        window.localStorage.removeItem("fleaspace.session");
      } catch (error) {
        console.error("Unable to clear FleaSpace session data.", error);
        showAccountMessage("You could not be signed out in this browser.");
        return;
      }
      setCurrentAccount(null);
      showAccountMessage("You've been signed out.");
    }
  });

  document.querySelectorAll("[data-contact-open]").forEach((button) => {
    button.addEventListener("click", () => {
      if (contactDialog instanceof HTMLDialogElement && !contactDialog.open) {
        contactDialog.showModal();
      }
    });
  });

  document.querySelectorAll("[data-contact-close]").forEach((button) => {
    button.addEventListener("click", () => {
      if (contactDialog instanceof HTMLDialogElement && contactDialog.open) {
        contactDialog.close();
      }
    });
  });

  document.addEventListener("click", (event) => {
    if (event.target instanceof Element) {
      const button = event.target.closest("[data-cancel-booking]");
      if (button) {
        openCancellationDialog(button.dataset.cancelBooking);
      }
    }
  });

  document.querySelectorAll("[data-cancel-confirm]").forEach((button) => {
    button.addEventListener("click", cancelBooking);
  });

  document.querySelectorAll("[data-cancel-close]").forEach((button) => {
    button.addEventListener("click", () => {
      pendingCancellation = null;
      if (cancelDialog instanceof HTMLDialogElement && cancelDialog.open) {
        cancelDialog.close();
      }
    });
  });

  if (contactDialog instanceof HTMLDialogElement) {
    contactDialog.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && contactDialog.open) {
        event.preventDefault();
        contactDialog.close();
      }
    });
  }

  if (cancelDialog instanceof HTMLDialogElement) {
    cancelDialog.addEventListener("close", () => {
      pendingCancellation = null;
    });
  }

  document.querySelectorAll("[data-reset-demo]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      if (!window.confirm("Reset demo data? This will clear all bookings, demo accounts, and the current sign-in.")) {
        return;
      }
      try {
        window.localStorage.removeItem(window.FLEASPACE_RESERVATION_KEY);
        window.localStorage.removeItem("fleaspace.accounts");
        window.localStorage.removeItem("fleaspace.session");
        currentAccount = null;
        renderAccountHeader();
        renderBookings();
        renderMarketCards();
        renderStallPage();
        renderConfirmation();
        showAccountMessage("All demo bookings and accounts have been reset.");
      } catch (error) {
        console.error("Unable to reset FleaSpace demo data.", error);
        showAccountMessage("Demo data could not be reset in this browser.");
      }
    });
  });

  currentAccount = loadCurrentAccount();
  renderAccountHeader();
  renderMarketCards();
  renderStallPage();
  renderConfirmation();
  renderBookings();
  window.addEventListener("popstate", renderStallPage);
  if (reserveButton) {
    reserveButton.addEventListener("click", reserveSelectedStall);
  }
  document.querySelectorAll("[data-print]").forEach((button) => {
    button.addEventListener("click", () => window.print());
  });
  document.querySelectorAll("[data-add-calendar]").forEach((button) => {
    button.addEventListener("click", downloadCalendarEvent);
  });
})();

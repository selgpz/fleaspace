(() => {
  const contactDialog = document.querySelector("[data-contact-dialog]");
  const status = document.querySelector("[data-app-status]");
  const marketCards = document.querySelector("[data-market-cards]");
  const stallMap = document.querySelector("[data-stall-map]");
  const reserveButton = document.querySelector("[data-reserve]");
  const reserveError = document.querySelector("[data-reserve-error]");
  const selectionLimitMessage = document.querySelector("[data-selection-limit]");
  const dateSelector = document.querySelector("[data-date-selector]");
  let activeMarket = null;
  let activeDate = null;
  let selectedStalls = new Set();
  let takenStalls = new Set();

  function getReservation() {
    try {
      const savedReservation = window.localStorage.getItem(window.FLEASPACE_RESERVATION_KEY);
      return savedReservation ? JSON.parse(savedReservation) : null;
    } catch (error) {
      console.error("Unable to read FleaSpace demo reservation data.", error);
      if (status) {
        status.textContent = "Saved reservation data could not be read.";
      }
      return null;
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

  function getDateForMarket(market, date) {
    return market.dates.find((item) => item.date === date) || market.dates[0];
  }

  function formatTotal(market, count) {
    return new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency: market.currency,
      maximumFractionDigits: 0,
    }).format(market.fee * count);
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
    const reservation = getReservation();
    takenStalls = new Set(activeDate.takenStalls);
    if (getReservedMarketId(reservation) === activeMarket.id
      && (reservation.date || activeMarket.dates[0].date) === activeDate.date) {
      getReservationStalls(reservation).forEach((number) => {
        if (Number.isInteger(number) && number >= 1 && number <= activeMarket.stallCount) {
          takenStalls.add(number);
        }
      });
    }

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

    const stalls = [...selectedStalls].sort((a, b) => a - b);
    const reservation = {
      marketId: activeMarket.id,
      market: activeMarket.id,
      date: activeDate.date,
      stalls,
      total: activeMarket.fee * stalls.length,
      confirmationNumber: createConfirmationNumber(),
    };

    try {
      window.localStorage.setItem(window.FLEASPACE_RESERVATION_KEY, JSON.stringify(reservation));
      window.location.assign("confirmation.html");
    } catch (error) {
      console.error("Unable to save FleaSpace reservation.", error);
      if (reserveError) {
        reserveError.textContent = "Your reservation couldn't be saved. Check your browser storage settings and try again.";
      }
    }
  }

  function renderConfirmation() {
    const card = document.querySelector("[data-confirmation-card]");
    if (!card) {
      return;
    }

    const reservation = getReservation();
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

  function renderMarketCards() {
    if (!marketCards || !Array.isArray(window.FLEASPACE_MARKETS)) {
      return;
    }

    const reservation = getReservation();
    const reservationMarketId = getReservedMarketId(reservation);
    const marketCount = document.querySelector("[data-market-count]");
    if (marketCount) {
      marketCount.textContent = `${window.FLEASPACE_MARKETS.length} markets`;
    }

    marketCards.innerHTML = window.FLEASPACE_MARKETS.map((market) => {
      const nextDate = market.dates[0];
      const takenStalls = new Set(nextDate.takenStalls);
      if (reservationMarketId === market.id
        && (reservation.date || market.dates[0].date) === nextDate.date) {
        getReservationStalls(reservation).forEach((number) => {
          if (Number.isInteger(number)) {
            takenStalls.add(number);
          }
        });
      }

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

  if (contactDialog instanceof HTMLDialogElement) {
    contactDialog.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && contactDialog.open) {
        event.preventDefault();
        contactDialog.close();
      }
    });
  }

  document.querySelectorAll("[data-reset-demo]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      try {
        window.localStorage.removeItem(window.FLEASPACE_RESERVATION_KEY);
        renderMarketCards();
        renderStallPage();
        renderConfirmation();
        window.addEventListener("popstate", renderStallPage);
        if (status) {
          status.textContent = "Demo reservation data has been reset.";
        }
      } catch (error) {
        console.error("Unable to reset FleaSpace demo data.", error);
        if (status) {
          status.textContent = "Demo data could not be reset in this browser.";
        }
      }
    });
  });

  renderMarketCards();
  renderStallPage();
  renderConfirmation();
  if (reserveButton) {
    reserveButton.addEventListener("click", reserveSelectedStall);
  }
  document.querySelectorAll("[data-print]").forEach((button) => {
    button.addEventListener("click", () => window.print());
  });
})();

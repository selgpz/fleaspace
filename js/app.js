(() => {
  const contactDialog = document.querySelector("[data-contact-dialog]");
  const status = document.querySelector("[data-app-status]");
  const marketCards = document.querySelector("[data-market-cards]");
  const stallMap = document.querySelector("[data-stall-map]");
  const reserveButton = document.querySelector("[data-reserve]");
  const reserveError = document.querySelector("[data-reserve-error]");
  let activeMarket = null;
  let selectedStall = null;
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

  function renderStallMap() {
    if (!stallMap || !activeMarket) {
      return;
    }

    const stalls = Array.from({ length: activeMarket.stallCount }, (_, index) => {
      const stallNumber = index + 1;
      const isTaken = takenStalls.has(stallNumber);
      const isSelected = selectedStall === stallNumber;
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
        selectedStall = Number(button.dataset.stallNumber);
        renderStallMap();
        updateSelectedStall();
        stallMap.querySelector(`[data-stall-number="${selectedStall}"]`)?.focus();
      });
    });
  }

  function updateSelectedStall() {
    const selectedLabel = document.querySelector("[data-selected-stall]");
    const selectionStatus = document.querySelector("[data-selection-status]");
    if (selectedLabel) {
      selectedLabel.textContent = selectedStall ? `Stall ${selectedStall}` : "No stall selected";
    }
    if (selectionStatus) {
      selectionStatus.textContent = selectedStall ? "Your choice" : "Select a stall";
    }
    if (reserveButton) {
      reserveButton.disabled = !selectedStall;
      reserveButton.textContent = selectedStall ? `Reserve Stall ${selectedStall}` : "Select a stall to continue";
    }
    if (reserveError) {
      reserveError.textContent = "";
    }
  }

  function renderStallPage() {
    if (!stallMap || !Array.isArray(window.FLEASPACE_MARKETS) || window.FLEASPACE_MARKETS.length === 0) {
      return;
    }

    const requestedMarketId = new URLSearchParams(window.location.search).get("market");
    activeMarket = window.FLEASPACE_MARKETS.find((market) => market.id === requestedMarketId) || window.FLEASPACE_MARKETS[0];
    const reservation = getReservation();
    takenStalls = new Set(activeMarket.takenStalls);
    const reservedMarketId = getReservedMarketId(reservation);
    if (reservedMarketId === activeMarket.id) {
      const reservedStall = Number(reservation?.stallNumber ?? reservation?.stall);
      if (Number.isInteger(reservedStall) && reservedStall >= 1 && reservedStall <= activeMarket.stallCount) {
        takenStalls.add(reservedStall);
      }
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
      date.textContent = activeMarket.date;
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
    selectedStall = null;
    renderStallMap();
    updateSelectedStall();
  }

  function createConfirmationNumber() {
    return `FS-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  function reserveSelectedStall() {
    if (!activeMarket || !selectedStall || takenStalls.has(selectedStall)) {
      return;
    }

    const reservation = {
      marketId: activeMarket.id,
      stallNumber: selectedStall,
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
    const stallNumber = Number(reservation?.stallNumber ?? reservation?.stall);
    const confirmationNumber = reservation?.confirmationNumber;
    const isValidReservation = market
      && Number.isInteger(stallNumber)
      && stallNumber >= 1
      && stallNumber <= market.stallCount
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
      "[data-confirmation-date]": market.date,
      "[data-confirmation-stall]": `Stall ${stallNumber}`,
      "[data-confirmation-hours]": market.hours,
      "[data-confirmation-setup]": market.setup,
      "[data-confirmation-fee]": formatFee(market),
      "[data-mini-map-stall]": `Stall ${stallNumber}`,
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
        const isReserved = number === stallNumber;
        return `<span class="mini-stall${isReserved ? " is-your-stall" : ""}"${isReserved ? ' aria-label="Your stall, Stall ' + number + '"' : ' aria-hidden="true"'}>${number}${isReserved ? '<small>Your stall</small>' : ""}</span>`;
      });
      map.innerHTML = `
        <div class="mini-stall-column">${stalls.slice(0, 5).join("")}</div>
        <div class="mini-walkway"><span>Walkway</span><i aria-hidden="true"></i><small>Entrance</small></div>
        <div class="mini-stall-column">${stalls.slice(5).join("")}</div>`;
      map.setAttribute("aria-label", `Mini map of ${market.name}; Stall ${stallNumber} is your reserved stall.`);
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
      const takenStalls = new Set(market.takenStalls);
      if (reservationMarketId === market.id) {
        const reservedStall = Number(reservation?.stallNumber ?? reservation?.stall);
        if (Number.isInteger(reservedStall)) {
          takenStalls.add(reservedStall);
        }
      }

      const freeStalls = Math.max(0, market.stallCount - takenStalls.size);
      const isAlmostFull = freeStalls <= 2;
      const badge = isAlmostFull
        ? '<span class="availability-badge availability-almost-full">Almost full</span>'
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
          <p class="market-date">${market.date}</p>
          <div class="market-details">
            <span><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="M10 6v4l3 2"/></svg>${market.hours}</span>
            <span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 17s6-5.4 6-10a6 6 0 1 0-12 0c0 4.6 6 10 6 10Z"/><circle cx="10" cy="7" r="2"/></svg>Set-up ${market.setup}</span>
          </div>
          <div class="market-card-bottom">
            <p class="market-fee"><small>Stall fee</small><strong>${fee}<span> / stall</span></strong></p>
            <a class="button button-primary market-view-button" href="stalls.html?market=${encodeURIComponent(market.id)}" data-market-highlight="${market.id}">
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

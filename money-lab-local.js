/* Local Money Lab plan: a simple monthly allowance first, optional category caps second. */
(() => {
  "use strict";

  const scriptUrl = document.currentScript?.src || window.location.href;
  const appBase = new URL(".", scriptUrl).pathname.replace(/\/$/, "");
  const expenseCategories = ["food", "travel", "rent", "bills", "phone", "health", "shopping", "fun", "fees", "family", "otherOut"];
  const labels = {
    en: {
      kicker: "MONTHLY PLAN", title: "Make a plan that fits you",
      description: "Start with one monthly spending limit. Add category limits only where they help.",
      monthlyLimit: "Total spending limit (₹)", placeholder: "e.g. 18,000",
      spent: "Spent this month", available: "Available to spend", over: "Above your limit",
      noOverall: "Set a limit to see what's available", startTotal: "Use this month's spend as my limit",
      copyCats: "Copy this month's category amounts", startHint: "Uses only amounts you logged this month. A starting point, not a recommendation.",
      details: "Fine-tune by category", detailsHelp: "Optional limits for the categories you want to watch more closely.",
      categoryLimit: "Monthly limit (₹)", noLimit: "No limit", noCap: "No limit yet",
      left: "left", overBy: "over", near: "near limit", matchActual: "Use actual",
      showPlanned: "Show categories with limits only", clear: "Clear plan",
      emptyCategories: "No category limits yet. Add one here, or keep using the simple monthly limit above.",
      noSpending: "Log a few expenses first to use this month's spending as a starting point.",
      privacy: "Plans are saved by month in this browser, separately from your transactions. Clearing the plan never removes ledger entries."
    },
    hi: {
      kicker: "मासिक योजना", title: "अपने हिसाब से योजना बनाएं",
      description: "पहले महीने की कुल खर्च सीमा तय करें। जिन मदों की ज़रूरत हो, उनकी अलग सीमा जोड़ें।",
      monthlyLimit: "महीने की कुल खर्च सीमा (₹)", placeholder: "जैसे 18,000",
      spent: "इस महीने खर्च", available: "खर्च के लिए बाकी", over: "सीमा से अधिक",
      noOverall: "बाकी राशि देखने के लिए सीमा तय करें", startTotal: "इस महीने के खर्च को सीमा बनाएं",
      copyCats: "इस महीने के मदवार खर्च कॉपी करें", startHint: "यह सिर्फ इस महीने दर्ज खर्च पर आधारित शुरुआती बिंदु है, सलाह नहीं।",
      details: "हर मद के हिसाब से योजना", detailsHelp: "जिन मदों पर ध्यान देना है, उनकी वैकल्पिक सीमा तय करें।",
      categoryLimit: "मासिक सीमा (₹)", noLimit: "सीमा नहीं", noCap: "सीमा तय नहीं",
      left: "बाकी", overBy: "अधिक", near: "सीमा के करीब", matchActual: "वर्तमान खर्च रखें",
      showPlanned: "केवल सीमा वाले मद दिखाएँ", clear: "योजना साफ़ करें",
      emptyCategories: "अभी कोई मद-सीमा नहीं है। यहाँ जोड़ें या ऊपर की कुल मासिक सीमा इस्तेमाल करें।",
      noSpending: "इस महीने के खर्च को शुरुआती आधार बनाने के लिए पहले कुछ खर्च दर्ज करें।",
      privacy: "योजना इस ब्राउज़र में हर महीने अलग सहेजी जाती है। इसे साफ़ करने से लेन-देन नहीं हटते।"
    },
    mr: {
      kicker: "मासिक योजना", title: "तुमच्यासाठी योग्य योजना करा",
      description: "आधी महिन्याची एकूण खर्च मर्यादा ठेवा. गरज असेल तिथेच स्वतंत्र मर्यादा जोडा.",
      monthlyLimit: "महिन्याची एकूण खर्च मर्यादा (₹)", placeholder: "उदा. 18,000",
      spent: "या महिन्यात खर्च", available: "खर्चासाठी बाकी", over: "मर्यादेपेक्षा जास्त",
      noOverall: "बाकी रक्कम पाहण्यासाठी मर्यादा ठेवा", startTotal: "या महिन्याचा खर्च मर्यादा म्हणून वापरा",
      copyCats: "या महिन्याचा गटनिहाय खर्च कॉपी करा", startHint: "हा फक्त या महिन्यातील नोंदींवर आधारित प्रारंभ आहे; शिफारस नाही.",
      details: "गटनिहाय मर्यादा ठरवा", detailsHelp: "ज्या खर्च गटांवर लक्ष ठेवायचे आहे त्यांच्यासाठी ऐच्छिक मर्यादा ठेवा.",
      categoryLimit: "मासिक मर्यादा (₹)", noLimit: "मर्यादा नाही", noCap: "मर्यादा नाही",
      left: "बाकी", overBy: "जास्त", near: "मर्यादेजवळ", matchActual: "सध्याचा खर्च वापरा",
      showPlanned: "फक्त मर्यादा असलेले गट दाखवा", clear: "योजना साफ करा",
      emptyCategories: "अद्याप गटनिहाय मर्यादा नाही. येथे जोडा किंवा वरची मासिक मर्यादा वापरा.",
      noSpending: "या महिन्याचा खर्च प्रारंभ म्हणून वापरण्यापूर्वी काही खर्च नोंदवा.",
      privacy: "योजना या ब्राउझरमध्ये महिन्यानुसार आणि व्यवहारांपासून वेगळी साठवली जाते. योजना साफ केल्याने नोंदी हटत नाहीत."
    }
  };

  const localeCache = new Map();
  let pending = false;
  const monthId = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  };
  const currentLanguage = () => {
    const code = (document.documentElement.lang || "en").slice(0, 2).toLowerCase();
    return Object.hasOwn(labels, code) ? code : "en";
  };
  const isMoneyRoute = () => {
    const path = window.location.pathname.replace(/\/$/, "");
    return path === `${appBase}/money-lab` || path.startsWith(`${appBase}/money-lab/`);
  };
  const normalize = (value) => String(value || "").trim().toLocaleLowerCase().replace(/\s+/g, " ");
  const numberFromText = (value) => {
    const parsed = Number(String(value || "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
  };
  const currency = (lang) => new Intl.NumberFormat(
    lang === "hi" ? "hi-IN" : lang === "mr" ? "mr-IN" : "en-IN",
    { style: "currency", currency: "INR", maximumFractionDigits: 0 },
  );
  const categoryStorageKey = () => `saath-money-category-caps-v1:${monthId()}`;
  const totalStorageKey = () => `saath-money-monthly-total-cap-v1:${monthId()}`;
  const showPlannedStorageKey = "saath-money-show-planned-only-v1";
  const readCaps = () => {
    try {
      const value = JSON.parse(window.localStorage.getItem(categoryStorageKey()) || "{}");
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch { return {}; }
  };
  const writeCaps = (caps) => {
    try {
      if (Object.keys(caps).length === 0) window.localStorage.removeItem(categoryStorageKey());
      else window.localStorage.setItem(categoryStorageKey(), JSON.stringify(caps));
    }
    catch { /* Keep the rest of Money Lab usable if browser storage is unavailable. */ }
  };
  const readTotalCap = () => {
    try {
      const raw = window.localStorage.getItem(totalStorageKey());
      if (raw === null || raw.trim() === "") return null;
      const value = Number(raw);
      return Number.isFinite(value) && value >= 0 ? value : null;
    } catch { return null; }
  };
  const writeTotalCap = (value) => {
    try {
      if (value === null) window.localStorage.removeItem(totalStorageKey());
      else window.localStorage.setItem(totalStorageKey(), String(value));
    } catch { /* Keep the ledger usable if browser storage is unavailable. */ }
  };
  const readShowPlannedOnly = () => {
    try { return window.localStorage.getItem(showPlannedStorageKey) === "true"; }
    catch { return false; }
  };

  async function loadLocale(lang) {
    if (!localeCache.has(lang)) {
      localeCache.set(lang, fetch(`${appBase}/locales/${lang}.json`, { credentials: "same-origin" })
        .then((response) => response.ok ? response.json() : {})
        .catch(() => ({})));
    }
    return localeCache.get(lang);
  }

  function readActuals(categoryLabels) {
    const actuals = Object.create(null);
    const idByLabel = new Map(expenseCategories.map((id) => [normalize(categoryLabels[id] || id), id]));
    const spendRows = [...document.querySelectorAll(".spend > .spend-row")];
    if (spendRows.length) {
      for (const row of spendRows) {
        const label = row.querySelector(".row-between > span:first-child")?.textContent;
        const id = idByLabel.get(normalize(label));
        const amount = numberFromText(row.querySelector(".row-between strong")?.textContent);
        if (id) actuals[id] = amount;
      }
      return actuals;
    }
    // First-use fallback while the category chart is empty: sum visible current-month outflows.
    for (const row of document.querySelectorAll(".entry-list .entry")) {
      const amountNode = row.querySelector(".amount.out");
      if (!amountNode) continue;
      const label = row.querySelector(".item-title")?.textContent;
      const id = idByLabel.get(normalize(label));
      if (id) actuals[id] = (actuals[id] || 0) + numberFromText(amountNode.textContent);
    }
    return actuals;
  }

  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function makeStat(label, value, tone = "") {
    const item = make("div", `saath-plan-stat${tone ? ` ${tone}` : ""}`);
    item.append(make("span", "saath-plan-stat-label", label), make("strong", "saath-plan-stat-value", value));
    return item;
  }

  function render(card, lang, locale) {
    const copy = labels[lang];
    const categories = locale.categories || {};
    const caps = readCaps();
    const totalCap = readTotalCap();
    const showPlannedOnly = readShowPlannedOnly();
    const actuals = readActuals(categories);
    const formatter = currency(lang);
    const actualTotal = expenseCategories.reduce((total, id) => total + (actuals[id] || 0), 0);
    const plannedIds = expenseCategories.filter((id) => caps[id] !== undefined && caps[id] !== null && Number(caps[id]) >= 0);
    const plannedTotal = plannedIds.reduce((total, id) => total + Number(caps[id]), 0);
    const trackedCategoryActual = plannedIds.reduce((total, id) => total + (actuals[id] || 0), 0);
    const signature = JSON.stringify([lang, monthId(), caps, totalCap, actuals, showPlannedOnly]);
    if (card.dataset.signature === signature) return;
    card.dataset.signature = signature;

    const header = make("div", "stack-xs saath-plan-header");
    const heading = make("h2", "", copy.title);
    heading.id = "saath-category-plan-title";
    header.append(make("p", "kicker", copy.kicker), heading, make("p", "muted", copy.description));

    const totalInputLabel = make("label", "saath-plan-total-control");
    totalInputLabel.append(make("span", "saath-plan-total-label", copy.monthlyLimit));
    const totalInput = make("input", "saath-plan-total-input");
    totalInput.type = "number";
    totalInput.min = "0";
    totalInput.step = "1";
    totalInput.inputMode = "decimal";
    totalInput.placeholder = copy.placeholder;
    totalInput.value = totalCap === null ? "" : String(totalCap);
    totalInput.setAttribute("aria-label", copy.monthlyLimit);
    totalInput.autocomplete = "off";
    totalInputLabel.append(totalInput);

    const summary = make("div", "saath-plan-summary");
    summary.setAttribute("aria-live", "polite");
    summary.append(makeStat(copy.spent, formatter.format(actualTotal)));
    let balanceLabel = copy.noOverall;
    let balanceValue = "—";
    let balanceTone = "";
    let totalPercent = 0;
    let totalNear = false;
    let totalOver = false;
    if (totalCap !== null) {
      const delta = totalCap - actualTotal;
      totalOver = delta < 0;
      totalNear = totalCap > 0 && actualTotal / totalCap >= 0.8 && !totalOver;
      balanceLabel = totalOver ? copy.over : copy.available;
      balanceValue = formatter.format(Math.abs(delta));
      balanceTone = totalOver ? "is-over" : totalNear ? "is-near" : "";
      totalPercent = totalCap > 0 ? Math.min(100, actualTotal / totalCap * 100) : actualTotal > 0 ? 100 : 0;
    }
    summary.append(makeStat(balanceLabel, balanceValue, balanceTone));

    const overview = make("div", "saath-plan-overview");
    overview.append(totalInputLabel, summary);
    if (totalCap !== null) {
      const meter = make("div", `saath-plan-total-meter${totalOver ? " is-over" : totalNear ? " is-near" : ""}`);
      meter.setAttribute("role", "meter");
      meter.setAttribute("aria-label", `${copy.spent}: ${formatter.format(actualTotal)} / ${formatter.format(totalCap)}`);
      meter.setAttribute("aria-valuemin", "0");
      meter.setAttribute("aria-valuemax", String(Math.max(1, totalCap)));
      meter.setAttribute("aria-valuenow", String(actualTotal));
      const fill = make("span", "saath-plan-total-fill");
      fill.style.width = `${totalPercent}%`;
      meter.append(fill);
      overview.append(meter);
      if (totalNear) overview.append(make("p", "faint saath-plan-status-note", copy.near));
      if (totalOver) overview.append(make("p", "faint saath-plan-status-note is-over", `${formatter.format(actualTotal - totalCap)} ${copy.over}`));
    }

    const actions = make("div", "saath-plan-actions");
    const startTotal = make("button", "btn btn-secondary btn-auto saath-plan-action", copy.startTotal);
    startTotal.type = "button";
    startTotal.dataset.action = "start-total";
    startTotal.dataset.amount = String(actualTotal);
    startTotal.disabled = actualTotal <= 0;
    startTotal.title = actualTotal > 0 ? copy.startHint : copy.noSpending;
    const clearPlan = make("button", "btn btn-ghost btn-auto saath-plan-action", copy.clear);
    clearPlan.type = "button";
    clearPlan.dataset.action = "clear-plan";
    clearPlan.disabled = totalCap === null && plannedIds.length === 0;
    actions.append(startTotal, clearPlan);
    actions.append(make("p", "faint saath-plan-hint", copy.startHint));

    const details = make("details", "saath-plan-details");
    details.open = plannedIds.length > 0;
    const detailsSummary = make("summary", "saath-plan-details-summary", `${copy.details} · ${plannedIds.length}/${expenseCategories.length}`);
    details.append(detailsSummary, make("p", "faint saath-plan-details-help", copy.detailsHelp));

    const detailTools = make("div", "saath-plan-detail-tools");
    const copyCategories = make("button", "btn btn-secondary btn-auto saath-plan-action", copy.copyCats);
    copyCategories.type = "button";
    copyCategories.dataset.action = "copy-categories";
    copyCategories.dataset.actuals = JSON.stringify(actuals);
    copyCategories.disabled = actualTotal <= 0;
    copyCategories.title = actualTotal > 0 ? copy.startHint : copy.noSpending;
    detailTools.append(copyCategories);

    const filterLabel = make("label", "saath-plan-filter");
    const filterInput = make("input", "saath-plan-filter-input");
    filterInput.type = "checkbox";
    filterInput.checked = showPlannedOnly;
    filterLabel.append(filterInput, make("span", "", copy.showPlanned));
    detailTools.append(filterLabel);
    details.append(detailTools);

    const list = make("div", "saath-plan-list");
    for (const id of expenseCategories) {
      const name = categories[id] || id;
      const actual = actuals[id] || 0;
      const hasCap = caps[id] !== undefined && caps[id] !== null && Number.isFinite(Number(caps[id])) && Number(caps[id]) >= 0;
      if (showPlannedOnly && !hasCap) continue;
      const cap = hasCap ? Number(caps[id]) : 0;
      const over = hasCap && actual > cap;
      const near = hasCap && cap > 0 && actual / cap >= 0.8 && !over;
      const percent = hasCap && cap > 0 ? Math.min(100, Math.round(actual / cap * 100)) : 0;
      const row = make("div", `saath-plan-row${over ? " is-over" : near ? " is-near" : ""}`);
      row.dataset.category = id;

      const top = make("div", "saath-plan-row-head");
      top.append(make("strong", "saath-plan-name", name));
      let status = hasCap
        ? `${formatter.format(actual)} ${copy.spent.toLocaleLowerCase()} · ${formatter.format(Math.abs(cap - actual))} ${over ? copy.overBy : copy.left}`
        : `${formatter.format(actual)} ${copy.spent.toLocaleLowerCase()} · ${copy.noCap}`;
      if (near) status += ` · ${copy.near}`;
      top.append(make("span", "saath-plan-status", status));

      const meter = make("div", `saath-plan-meter${over ? " is-over" : near ? " is-near" : ""}`);
      meter.setAttribute("role", "meter");
      meter.setAttribute("aria-label", `${name}: ${formatter.format(actual)} ${copy.spent.toLocaleLowerCase()}`);
      meter.setAttribute("aria-valuemin", "0");
      meter.setAttribute("aria-valuemax", String(Math.max(1, cap)));
      meter.setAttribute("aria-valuenow", String(actual));
      const fill = make("span", `saath-plan-fill${over ? " is-over" : near ? " is-near" : ""}`);
      fill.style.width = `${percent}%`;
      meter.append(fill);

      const controls = make("div", "saath-plan-controls");
      const control = make("label", "saath-plan-control");
      control.append(make("span", "", copy.categoryLimit));
      const input = make("input", "saath-plan-input");
      input.type = "number";
      input.min = "0";
      input.step = "1";
      input.inputMode = "decimal";
      input.placeholder = copy.noLimit;
      input.value = hasCap ? String(cap) : "";
      input.dataset.category = id;
      input.setAttribute("aria-label", `${copy.categoryLimit}: ${name}`);
      control.append(input);
      controls.append(control);
      const match = make("button", "saath-plan-match", copy.matchActual);
      match.type = "button";
      match.dataset.action = "use-category-actual";
      match.dataset.category = id;
      match.dataset.amount = String(actual);
      match.disabled = actual <= 0;
      match.title = actual > 0 ? `${copy.matchActual}: ${formatter.format(actual)}` : copy.noSpending;
      controls.append(match);

      row.append(top, meter, controls);
      list.append(row);
    }
    if (showPlannedOnly && plannedIds.length === 0) list.append(make("p", "faint saath-plan-empty", copy.emptyCategories));
    details.append(list);

    const privacy = make("p", "faint saath-plan-privacy", copy.privacy);
    card.replaceChildren(header, overview, actions, details, privacy);
  }

  async function refresh() {
    pending = false;
    const existing = document.querySelector('[data-testid="saath-category-plan"]');
    if (!isMoneyRoute()) {
      existing?.remove();
      return;
    }
    const anchor = document.querySelector('[data-testid="moneylab-useful-summary"]');
    if (!anchor) return; // Never bypass the app's existing sign-in/first-run gate.
    const lang = currentLanguage();
    const locale = await loadLocale(lang);
    if (!isMoneyRoute() || !document.querySelector('[data-testid="moneylab-useful-summary"]')) return;

    let card = document.querySelector('[data-testid="saath-category-plan"]');
    if (!card) {
      card = make("section", "card stack-sm saath-category-plan");
      card.dataset.testid = "saath-category-plan";
      card.setAttribute("aria-labelledby", "saath-category-plan-title");
      card.addEventListener("change", (event) => {
        const target = event.target;
        if (target instanceof HTMLInputElement && target.classList.contains("saath-plan-total-input")) {
          const value = target.value.trim();
          writeTotalCap(value === "" ? null : Number.isFinite(Number(value)) && Number(value) >= 0 ? Math.round(Number(value)) : null);
          void refresh();
          return;
        }
        if (target instanceof HTMLInputElement && target.classList.contains("saath-plan-input")) {
          const id = target.dataset.category;
          if (!id || !expenseCategories.includes(id)) return;
          const caps = readCaps();
          const value = target.value.trim();
          if (!value) delete caps[id];
          else if (Number.isFinite(Number(value)) && Number(value) >= 0) caps[id] = Math.round(Number(value));
          writeCaps(caps);
          void refresh();
          return;
        }
        if (target instanceof HTMLInputElement && target.classList.contains("saath-plan-filter-input")) {
          try { window.localStorage.setItem(showPlannedStorageKey, String(target.checked)); }
          catch { /* Filtering remains usable for this render. */ }
          void refresh();
        }
      });
      card.addEventListener("click", (event) => {
        const target = event.target instanceof Element ? event.target.closest("button[data-action]") : null;
        if (!(target instanceof HTMLButtonElement)) return;
        const action = target.dataset.action;
        if (action === "start-total") {
          const amount = Number(target.dataset.amount);
          if (Number.isFinite(amount) && amount >= 0) writeTotalCap(Math.round(amount));
        } else if (action === "copy-categories") {
          let actuals = {};
          try { actuals = JSON.parse(target.dataset.actuals || "{}"); } catch { actuals = {}; }
          const caps = readCaps();
          for (const id of expenseCategories) {
            const amount = Number(actuals[id]);
            if (Number.isFinite(amount) && amount > 0) caps[id] = Math.round(amount);
          }
          writeCaps(caps);
        } else if (action === "use-category-actual") {
          const id = target.dataset.category;
          const amount = Number(target.dataset.amount);
          if (!id || !expenseCategories.includes(id) || !Number.isFinite(amount) || amount <= 0) return;
          const caps = readCaps();
          caps[id] = Math.round(amount);
          writeCaps(caps);
        } else if (action === "clear-plan") {
          writeTotalCap(null);
          writeCaps({});
          try { window.localStorage.removeItem(showPlannedStorageKey); }
          catch { /* The visual filter returns to its default on the next visit. */ }
        } else return;
        void refresh();
      });
      anchor.insertAdjacentElement("afterend", card);
    }
    render(card, lang, locale);
  }

  function scheduleRefresh() {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(() => { void refresh(); });
  }

  const observer = new MutationObserver(scheduleRefresh);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("popstate", scheduleRefresh);
  window.addEventListener("hashchange", scheduleRefresh);
  scheduleRefresh();
})();

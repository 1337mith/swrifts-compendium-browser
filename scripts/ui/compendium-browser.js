export class SWRIFTSCompendiumBrowser extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "swrifts-compendium-browser",
      title: "SWRIFTS Compendium Browser",
      template: "/modules/swrifts-compendium-browser/templates/compendium-browser.hbs",
      width: 1000,
      height: 700,
      top: 100,
      left: 150,
      resizable: true,
      popOut: true,
      classes: ["swrifts-compendium-browser"]
    });
  }

  constructor(options = {}) {
    super(options);
    this._activeTab = options.activeTab || "iconic-frameworks";
    this._searchTerm = "";
    this._sortField = "name";
    this._sortDirection = "unsorted"; // initialize with "unsorted"
    this._filters = { sources: [] };
    this._filters.severity = [];
    this._loadedPages = 1;
  }

  async getData() {
    if (!SWRIFTSCompendiumBrowser._allItems?.length) {
      SWRIFTSCompendiumBrowser._allItems = await this._loadAllGameItems();
    }

    // Debug: Log all unique item types currently loaded
    {
      const uniqueTypes = new Set(SWRIFTSCompendiumBrowser._allItems.map(item => item.type));
      console.log("Unique item types loaded:", [...uniqueTypes]);

      const allSkills = SWRIFTSCompendiumBrowser._allItems.filter(item => 
        item.type === 'skill' || 
        (item.system?.subtype && item.system.subtype.toLowerCase() === 'skill')
      );
      console.log("All detected skill names:", allSkills.map(i => i.name));
    }

    // Entries filtered by active tab for display
    const allTabEntries = SWRIFTSCompendiumBrowser._allItems.filter(item =>
      this._filterItemByTab(item, this._activeTab)
    );

    // Entries further filtered and sorted for final results
    const filteredEntries = this._applyFiltersAndSorting(allTabEntries);

    // Build available filters from all items *not* just filtered by current tab
    const allSources = this._getAvailableFilters(SWRIFTSCompendiumBrowser._allItems);

    // Build severity filters only for hindrances tab
    let severityFilters = [];
    if (this._activeTab === "hindrances") {
      severityFilters = this._getAvailableSeverityFilters(allTabEntries);
    }

    // Debug log to confirm all unique sources including SWADE
    console.log("All unique sources for filter:", allSources.sources);
    console.log("Severity filters for hindrances:", severityFilters);

    const typeOptions = [
      { value: "ancestries", label: "Ancestries" },
      { value: "iconic-frameworks", label: "Frameworks" },
      { value: "hindrances", label: "Hindrances" },
      { value: "special-abilities", label: "Abilities" },
      { value: "skills", label: "Skills" },
      { value: "edges", label: "Edges" },
      { value: "gear", label: "Gear" }
    ];

    return {
      activeTab: this._activeTab,
      entries: filteredEntries,
      filters: allSources,
      severityFilters,
      sortField: this._sortField,
      sortDirection: this._sortDirection,
      searchTerm: this._searchTerm,
      typeOptions,
      totalLoaded: allTabEntries.length,
      totalShown: filteredEntries.length
    };
  }

  async updateResultsList() {
    const allTabEntries = SWRIFTSCompendiumBrowser._allItems.filter(item =>
      this._filterItemByTab(item, this._activeTab)
    );
    const filteredEntries = this._applyFiltersAndSorting(allTabEntries);

    console.log("Rendering entries count:", filteredEntries.length);

    const context = {
      entries: filteredEntries,
      totalLoaded: allTabEntries.length,
      totalShown: filteredEntries.length,
      activeTab: this._activeTab,
      sortField: this._sortField,
      sortDirection: this._sortDirection
    };

    const html = await foundry.applications.handlebars.renderTemplate(
      "/modules/swrifts-compendium-browser/templates/partials/compendium-results.hbs",
      context
    );

    const resultsWrapper = this.element.find(".compendium-results-wrapper");
    if (!resultsWrapper.length) {
      console.warn("⚠️ .compendium-results-wrapper not found in DOM");
      return;
    }

    resultsWrapper.html(`<div class="compendium-results">${html}</div>`);
    this.activateListeners(this.element);
  }

  async _loadAllGameItems() {
    const packs = game.packs.filter(p =>
      p.documentName === "Item" &&
      (p.metadata.packageName.startsWith("swade") || p.metadata.packageName.startsWith("swrifts"))
    );

    const allItems = [];

    for (const pack of packs) {
      try {
        const items = await pack.getDocuments();

        const validItems = [];
        for (const item of items) {
          try {
            if (!item.name || typeof item.name !== "string") throw new Error("Missing or invalid name");
            validItems.push(item);
          } catch (validationError) {
            console.warn(`❌ Skipped invalid item in ${pack.metadata.label}:`, item.name || "<unnamed>", validationError);
          }
        }

        console.log(`📦 Loaded ${validItems.length}/${items.length} valid items from ${pack.metadata.packageName}.${pack.metadata.name}`);
        allItems.push(...validItems);
      } catch (err) {
        console.warn(`⚠️ Failed to load ${pack.metadata.packageName}.${pack.metadata.name}:`, err);
      }
    }

    const itemsWithSource = allItems.filter(item => {
      const source = item.system?.source;
      return typeof source === "string" && source.trim().length > 0;
    });

    const uniqueMap = new Map();
    for (const item of itemsWithSource) {
      if (!item.name) continue;
      const nameKey = item.name.toLowerCase();

      if (!uniqueMap.has(nameKey)) {
        uniqueMap.set(nameKey, item);
      }
    }

    const filteredItems = Array.from(uniqueMap.values());
    console.log(`✅ Total unique items after filtering and deduplication: ${filteredItems.length}`);
    return filteredItems;
  }

  _filterItemByTab(item, tab) {
    const type = item.type;

    switch (tab) {
      case "iconic-frameworks":
        return (
          item.type === "ability" &&
          item.system?.subtype?.toLowerCase?.() === "archetype"
        );
      case "ancestries":
        return type === "ancestry";
      case "special-abilities":
        return type === "ability";
      case "edges":
        return type === "edge";
      case "hindrances":
        return type === "hindrance";
      case "skills":
        return type === "skill" 
            || (item.system?.subtype?.toLowerCase?.() === "skill");
      case "gear":
        return ["gear", "consumable", "weapon", "armor", "shield"].includes(type);
      default:
        return false;
    }
  }

  _getAvailableFilters(entries) {
    // Extract unique source names from entries, trimming and filtering out empty strings
    let sources = [...new Set(entries.map(i => (i.system?.source ?? "Unknown").trim()).filter(Boolean))];

    // Normalize SWADE source names to a single label "SWADE"
    sources = sources.map(src => {
      if (src.toLowerCase().includes("swade")) return "SWADE";
      return src;
    });

    // Deduplicate after normalization
    sources = [...new Set(sources)];

    // Sort alphabetically
    sources.sort();

    // Debug
    console.log("Unique (normalized) sources recognized in entries:", sources);

    return { sources };
  }

  _getAvailableSeverityFilters(entries) {
    let severities = [...new Set(
      entries
        .map(i => (i.system?.severity ?? "").trim())
        .filter(s => s.length > 0)
    )];
    severities.sort();
    return severities;
  }

  _applyFiltersAndSorting(entries) {
    let filtered = [...entries];

    if (this._searchTerm) {
      const search = this._searchTerm.toLowerCase();
      filtered = filtered.filter(entry => {
        const name = entry.name?.toLowerCase() ?? "";
        const desc = entry.system?.description?.value?.toLowerCase() ?? "";
        return name.includes(search) || desc.includes(search);
      });
    }

    // Source filter
    if (this._filters.sources?.length) {
      filtered = filtered.filter(i =>
        this._filters.sources.includes((i.system?.source ?? "Unknown").trim())
      );
    }

    // Severity filter
    if (this._filters.severity?.length) {
      filtered = filtered.filter(i =>
        this._filters.severity.includes((i.system?.severity ?? "").trim())
      );
    }

    // Sorting
    if (this._sortDirection !== "unsorted") {
      filtered.sort((a, b) => {
        const getFieldValue = (item) => {
          if (this._sortField === "source") return (item.system?.source ?? "").toLowerCase();
          if (this._sortField === "name") return (item.name ?? "").toLowerCase();
          if (this._sortField === "severity") {
            const order = { "minor": 1, "major": 2 };
            return order[(item.system?.severity ?? "").toLowerCase()] || 99;
          }
          return (item[this._sortField] ?? "").toString().toLowerCase();
        };

        const fieldA = getFieldValue(a);
        const fieldB = getFieldValue(b);
        if (fieldA < fieldB) return this._sortDirection === "asc" ? -1 : 1;
        if (fieldA > fieldB) return this._sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }

  activateListeners(html) {
    // Sync tab active classes
    html.find(".type-tab").removeClass("active");
    html.find(`.type-tab[data-type="${this._activeTab}"]`).addClass("active");

    html.find(".type-tab").off("click").on("click", async ev => {
      this._activeTab = ev.currentTarget.dataset.type;
      await this.updateResultsList();
    });

    // Sort dropdown change
    html.find(".browser-sort").off("change").on("change", async ev => {
      this._sortField = ev.currentTarget.value;
      await this.updateResultsList();
    });

    // Sort direction button (click and keyboard)
    html.find(".sort-direction")
      .off("click keydown")
      .on("click", () => {
        this._sortDirection = this._getNextSortDirection(this._sortDirection);
        this.updateResultsList();
      })
      .on("keydown", ev => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          this._sortDirection = this._getNextSortDirection(this._sortDirection);
          this.updateResultsList();
        }
      });

    // Search input event
    html.find(".browser-search").off("input").on("input", async ev => {
      this._searchTerm = ev.currentTarget.value.trim();
      this._loadedPages = 1;
      await this.updateResultsList();
    });

    // Toggle collapse/expand for Sources list
    html.find(".sources-toggle").off("click keydown").on("click", ev => {
      const btn = ev.currentTarget;
      const sourcesList = html.find("#sources-list");
      const expanded = btn.getAttribute("aria-expanded") === "true";

      if (expanded) {
        btn.setAttribute("aria-expanded", "false");
        btn.textContent = "Sources ▶";
        sourcesList.addClass("collapsed");
      } else {
        btn.setAttribute("aria-expanded", "true");
        btn.textContent = "Sources ▼";
        sourcesList.removeClass("collapsed");
      }
    }).on("keydown", ev => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        ev.currentTarget.click();
      }
    });

    // Toggle collapse/expand for Severity list
    html.find(".filter-severity").off("click keydown").on("click", ev => {
      const btn = ev.currentTarget;
      const severityList = html.find("#severity-list");
      const expanded = btn.getAttribute("aria-expanded") === "true";

      if (expanded) {
        btn.setAttribute("aria-expanded", "false");
        btn.textContent = "Severity ▶";
        severityList.addClass("collapsed");
      } else {
        btn.setAttribute("aria-expanded", "true");
        btn.textContent = "Severity ▼";
        severityList.removeClass("collapsed");
      }
    }).on("keydown", ev => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        ev.currentTarget.click();
      }
    });

    // Source filter checkbox listener
    html.find("input[name='source-filter']").off("change").on("change", () => {
      const checkedSources = html.find("input[name='source-filter']:checked");
      this._filters.sources = checkedSources.map((i, el) => el.value).get();
      this.updateResultsList();
    });

    // Severity filter checkbox listener
    html.find("input[name='severity-filter']").off("change").on("change", () => {
      const checkedSeverities = html.find("input[name='severity-filter']:checked");
      this._filters.severity = checkedSeverities.map((i, el) => el.value).get();
      this.updateResultsList();
    });

    // Clear filters button (clears sources and severity)
    html.find(".clear-filters").off("click").on("click", async () => {
      this._filters.sources = [];
      this._filters.severity = [];
      html.find("input[name='source-filter']").prop("checked", false);
      html.find("input[name='severity-filter']").prop("checked", false);
      await this.updateResultsList();
    });

    // Bind row click and dragstart
    html.find(".compendium-list-row").off("dragstart").on("dragstart", ev => {
      const uuid = ev.currentTarget.dataset.uuid;
      console.log("Dragging item UUID:", uuid);
      const dt = ev.originalEvent.dataTransfer;

      dt.setData("text/plain", uuid);
      dt.setData("text/foundry-item", JSON.stringify({
        type: "Item",
        uuid: uuid
      }));

      const img = ev.currentTarget.querySelector("img.result-icon");
      if (img) dt.setDragImage(img, 20, 20);
    });
  }

  _getNextSortDirection(current) {
    switch (current) {
      case "unsorted": return "asc";
      case "asc": return "desc";
      case "desc": return "unsorted";
      default: return "unsorted";
    }
  }

  static async preload() {
    if (!this._allItems.length) {
      const browser = new this();
      this._allItems = await browser._loadAllGameItems();
    }
  }

  async _renderHTML(options = {}) {
    const context = await this._prepareContext();
    return foundry.applications.handlebars.renderTemplate(this.options.template, context);
  }

  async _replaceHTML(html, container) {
    if (typeof container === "string") {
      container = document.querySelector(container);
    }

    if (!container) {
      console.error("SWRIFTS | _replaceHTML: container not found");
      return null;
    }

    const temp = document.createElement("div");
    temp.innerHTML = html;

    container.innerHTML = "";
    for (const child of temp.children) {
      container.appendChild(child);
    }

    this.activateListeners($(container));
    return container;
  }

  static debugIconicFrameworks() {
    const matches = this._allItems.filter(item => {
      return (
        item.type === "ability" &&
        item.system?.subtype?.toLowerCase?.() === "archetype"
      );
    });

    console.group("🔍 Iconic Framework Candidates");
    for (const item of matches) {
      console.log({
        name: item.name,
        type: item.type,
        subtype: item.system?.subtype,
        uuid: item.uuid
      });
    }
    console.groupEnd();
  }
}
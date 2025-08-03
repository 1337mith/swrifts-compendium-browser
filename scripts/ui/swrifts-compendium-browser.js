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
    this._sortDirection = "asc";
    this._filters = { tags: [], sources: [] };
    this._loadedPages = 1;
  }

  async getData() {
    if (!SWRIFTSCompendiumBrowser._allItems?.length) {
      SWRIFTSCompendiumBrowser._allItems = await this._loadAllGameItems();
    }

    const allTabEntries = SWRIFTSCompendiumBrowser._allItems.filter(item =>
      this._filterItemByTab(item, this._activeTab)
    );

    const filteredEntries = this._applyFiltersAndSorting(allTabEntries);

    const typeOptions = [
      { value: "iconic-frameworks", label: "Iconic Frameworks" },
      { value: "ancestries", label: "Ancestries" },
      { value: "special-abilities", label: "Special Abilities" },
      { value: "edges", label: "Edges" },
      { value: "hindrances", label: "Hindrances" },
      { value: "gear", label: "Gear" }
    ];

    return {
      activeTab: this._activeTab,
      entries: filteredEntries,
      filters: this._getAvailableFilters(allTabEntries),
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

    const context = {
      entries: filteredEntries,
      totalLoaded: allTabEntries.length,
      totalShown: filteredEntries.length,
      activeTab: this._activeTab
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

    resultsWrapper.html(`<div class=\"compendium-results\">${html}</div>`);
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

    console.log(`✅ Total items loaded: ${allItems.length}`);
    return allItems;
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
      case "gear":
        return ["gear", "consumable"].includes(type);
      default:
        return false;
    }
  }

  _getAvailableFilters(entries) {
    const tags = [...new Set(entries.flatMap(i => i.system?.tags ?? []))];
    return { tags };
  }

  _applyFiltersAndSorting(entries) {
    let filtered = [...entries];

    if (this._searchTerm) {
      const search = this._searchTerm.toLowerCase();
      filtered = filtered.filter(entry => {
        const name = entry.name?.toLowerCase() ?? "";
        const desc = entry.system?.description?.value?.toLowerCase() ?? "";
        const tags = entry.system?.tags?.join(" ")?.toLowerCase() ?? "";
        return name.includes(search) || desc.includes(search) || tags.includes(search);
      });
    }

    if (this._filters.tags?.length) {
      filtered = filtered.filter(i =>
        i.system?.tags?.some(t => this._filters.tags.includes(t))
      );
    }

    filtered.sort((a, b) => {
      const fieldA = a[this._sortField] ?? "";
      const fieldB = b[this._sortField] ?? "";
      if (fieldA < fieldB) return this._sortDirection === "asc" ? -1 : 1;
      if (fieldA > fieldB) return this._sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }

  activateListeners(html) {
    // Ensure only active tab is styled
    html.find(".type-tab").removeClass("active");
    html.find(`.type-tab[data-type="${this._activeTab}"]`).addClass("active");

    html.find(".type-tab").off("click").on("click", async ev => {
      const tab = ev.currentTarget.dataset.type;
      this._activeTab = tab;
      console.log("🔁 Switching to tab:", tab);
      await this.updateResultsList();
    });

    html.find(".browser-sort").off("change").on("change", ev => {
      this._sortField = ev.currentTarget.value;
      this.render();
    });

    html.find(".sort-direction").off("click").on("click", () => {
      this._sortDirection = this._sortDirection === "asc" ? "desc" : "asc";
      this.render();
    });

    html.find(".browser-search").off("input").on("input", ev => {
      this._searchTerm = ev.currentTarget.value;
      this._loadedPages = 1;
      this.render();
    });

    // Bind to both card rows (.result-row) and table rows (.table-result)
    html.find(".result-row, .table-result")
      .off("click")
      .on("click", async ev => {
        const uuid = ev.currentTarget.dataset.uuid;
        if (!uuid) return;

        const doc = await fromUuid(uuid);
        if (!doc) {
          console.warn("Could not resolve UUID:", uuid);
          return;
        }

        doc.sheet.render(true);
      })
      .off("dragstart")
      .on("dragstart", ev => {
        const uuid = ev.currentTarget.dataset.uuid;
        ev.originalEvent.dataTransfer.setData("text/plain", uuid);
    });
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
        tags: item.system?.tags,
        uuid: item.uuid
      });
    }
    console.groupEnd();
  }
}
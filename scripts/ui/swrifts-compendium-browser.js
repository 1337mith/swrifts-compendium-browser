export class SWRIFTSCompendiumBrowser extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    id: "swrifts-compendium-browser",
    title: "SWRIFTS Compendium Browser",
    template: "/modules/swrifts-compendium-browser/templates/compendium-browser.hbs",
    width: 1000,
    height: 700,
    resizable: true,
    classes: ["swrifts-compendium-browser"]
  };

  static _allItems = [];

  constructor(options = {}) {
    super(options);
    this._activeTab = options.activeTab || "iconic-frameworks";
    this._searchTerm = "";
    this._sortField = "name";
    this._sortDirection = "asc";
    this._filters = {};
    this._loadedPages = 1;
  }

  async _prepareContext() {
    if (!SWRIFTSCompendiumBrowser._allItems.length) {
      SWRIFTSCompendiumBrowser._allItems = await this._loadAllGameItems();
    }

    const entries = SWRIFTSCompendiumBrowser._allItems.filter(item => this._filterItemByTab(item, this._activeTab));
    const filteredEntries = this._applyFiltersAndSorting(entries);
    const pagedEntries = filteredEntries.slice(0, this._loadedPages * 20);

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
      entries: pagedEntries,
      filters: this._getAvailableFilters(entries),
      sortField: this._sortField,
      sortDirection: this._sortDirection,
      searchTerm: this._searchTerm,
      typeOptions,
      totalLoaded: entries.length,
      totalShown: pagedEntries.length
    };
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
        console.log(`📦 Loaded ${items.length} items from ${pack.metadata.packageName}.${pack.metadata.name}`);
        allItems.push(...items);
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
    html.find(".type-tab").on("click", ev => {
      const tab = ev.currentTarget.dataset.type;
      console.log("🔁 Switching to tab:", tab);
      this._activeTab = tab;
      this._loadedPages = 1;
      this.render();
    });

    html.find(".browser-sort").on("change", ev => {
      this._sortField = ev.currentTarget.value;
      this.render();
    });

    html.find(".sort-direction").on("click", () => {
      this._sortDirection = this._sortDirection === "asc" ? "desc" : "asc";
      this.render();
    });

    html.find(".browser-search").on("input", ev => {
      this._searchTerm = ev.currentTarget.value;
      this._loadedPages = 1;
      this.render();
    });

    html.find(".load-more").on("click", () => {
      this._loadedPages++;
      this.render();
    });

    html.find(".result-row").on("dragstart", ev => {
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

  //Debug Function
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
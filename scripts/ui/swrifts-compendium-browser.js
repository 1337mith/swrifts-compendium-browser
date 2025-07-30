export class SWRIFTSCompendiumBrowser extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    id: "swrifts-compendium-browser",
    title: "SWRIFTS Compendium Browser",
    template: "modules/swrifts-sheet/templates/compendium-browser.hbs",
    width: 1000,
    height: 700,
    resizable: true,
    classes: ["swrifts-compendium-browser"]
  };

  constructor(options = {}) {
    super(options);
    this._activeTab = options.activeTab || "iconic-frameworks";
    this._entries = [];
    this._searchTerm = "";
    this._sortField = "name";
    this._sortDirection = "asc";
    this._filters = {};
    this._filteredEntries = [];
    this._loadedPages = 1;
  }

  /** Load and filter entries on init */
  async _prepareContext() {
    if (!this._entries.length) {
      this._entries = await this._loadAllGameItems();
    }

    // Apply filters, sorting, and search
    this._filteredEntries = this._applyFiltersAndSorting();
    const pagedEntries = this._filteredEntries.slice(0, this._loadedPages * 20);

    return {
      activeTab: this._activeTab,
      entries: pagedEntries,
      filters: this._getAvailableFilters(),
      sortField: this._sortField,
      sortDirection: this._sortDirection,
      searchTerm: this._searchTerm
    };
  }

  /** Dynamically load all items in the game */
  async _loadAllGameItems() {
    const allItems = game.items.contents;
    return allItems.filter(item => {
      const tab = this._activeTab;
      return this._filterItemByTab(item, tab);
    });
  }

  /** Basic item-type-to-tab filter logic */
  _filterItemByTab(item, tab) {
    const tag = item.system?.tags ?? [];
    const type = item.type;

    switch (tab) {
      case "iconic-frameworks": return tag.includes("iconic-framework");
      case "ancestries": return tag.includes("ancestry");
      case "special-abilities": return tag.includes("special-ability");
      case "edges": return tag.includes("edge");
      case "hindrances": return tag.includes("hindrance");
      case "gear": return ["weapon", "armor", "shield", "consumable", "gear", "vehicle"].includes(type);
      default: return false;
    }
  }

  /** Derive dynamic filters from metadata */
  _getAvailableFilters() {
    const entries = this._entries;
    // Example: Get unique tags
    const tags = [...new Set(entries.flatMap(i => i.system?.tags ?? []))];
    return { tags };
  }

  /** Filter, sort, and search the loaded entries */
  _applyFiltersAndSorting() {
    let filtered = [...this._entries];

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

  /** Activate event listeners */
  activateListeners(html) {
    super.activateListeners(html);

    html.find(".tab-button").on("click", ev => {
      const tab = ev.currentTarget.dataset.tab;
      this._activeTab = tab;
      this.render();
    });

    html.find(".sort-select").on("change", ev => {
      this._sortField = ev.currentTarget.value;
      this.render();
    });

    html.find(".sort-direction").on("click", () => {
      this._sortDirection = this._sortDirection === "asc" ? "desc" : "asc";
      this.render();
    });

    html.find(".search-input").on("input", ev => {
      this._searchTerm = ev.currentTarget.value;
      this.render();
    });

    html.find(".load-more").on("click", () => {
      this._loadedPages++;
      this.render();
    });

    html.find(".compendium-entry").on("dragstart", ev => {
      const uuid = ev.currentTarget.dataset.uuid;
      ev.originalEvent.dataTransfer.setData("text/plain", uuid);
    });
  }

  /** Called on world load to preload data */
  static async preload() {
    const browser = new this();
    await browser._loadAllGameItems(); // preload into memory
  }
}
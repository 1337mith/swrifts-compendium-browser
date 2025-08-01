import { SWRIFTSCompendiumBrowser } from "./ui/swrifts-compendium-browser.js";

Hooks.once("init", async () => {
  console.log("SWRIFTS | Initializing Savage Rifts Compendium Browser");

  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("fallback", (value, defaultValue) => value ?? defaultValue);
  Handlebars.registerHelper("capitalize", str => typeof str === "string" ? str.charAt(0).toUpperCase() + str.slice(1) : "");
  Handlebars.registerHelper("previewDescription", str => {
    if (!str) return "";
    str = str.replace(/(<([^>]+)>)/gi, "");
    return str.length > 120 ? str.slice(0, 117) + "…" : str;
  });
  Handlebars.registerHelper("ifEquals", function (arg1, arg2, options) {
    return arg1 == arg2 ? options.fn(this) : options.inverse(this);
  });

  const partialSrc = await fetch("modules/swrifts-compendium-browser/templates/partials/compendium-results.hbs");
  const partialText = await partialSrc.text();
  Handlebars.registerPartial("compendium-results", partialText);

  window.showCompendiumBrowser = (tab = "iconic-frameworks") => {
    const app = new SWRIFTSCompendiumBrowser({ activeTab: tab });
    app.render(true);
  };
});

Hooks.once("ready", () => {
  window.showCompendiumBrowser = (tab = "iconic-frameworks") => {
    const app = new SWRIFTSCompendiumBrowser({ activeTab: tab });
    app.render(true);
  };

  // 🔍 Expose debug function globally for console use
  window.debugIconicFrameworks = () => SWRIFTSCompendiumBrowser.debugIconicFrameworks();
});

window.analyzeCompendiumItems = async () => {
  const packs = game.packs.filter(p =>
    p.documentName === "Item" &&
    (p.metadata.packageName.startsWith("swade") || p.metadata.packageName.startsWith("swrifts"))
  );

  const allItems = [];

  for (const pack of packs) {
    try {
      const items = await pack.getDocuments();
      allItems.push(...items);
    } catch (e) {
      console.warn(`Failed to load: ${pack.metadata.label}`, e);
    }
  }

  const typeCounts = {};
  const tagCounts = {};

  for (const item of allItems) {
    const type = item.type ?? "undefined";
    typeCounts[type] = (typeCounts[type] || 0) + 1;

    const tags = item.system?.tags ?? [];
    for (const tag of tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  console.group("📊 Compendium Item Type Counts");
  console.table(typeCounts);
  console.groupEnd();

  console.group("🏷️ Tag Counts (system.tags)");
  console.table(tagCounts);
  console.groupEnd();

  return { typeCounts, tagCounts };
};

// Debug Function for item types, tags, and subtypes
window.analyzeCompendiumItems = async () => {
  const packs = game.packs.filter(p =>
    p.documentName === "Item" &&
    (p.metadata.packageName.startsWith("swade") || p.metadata.packageName.startsWith("swrifts"))
  );

  const allItems = [];

  for (const pack of packs) {
    try {
      const items = await pack.getDocuments();
      allItems.push(...items);
    } catch (e) {
      console.warn(`Failed to load: ${pack.metadata.label}`, e);
    }
  }

  const typeCounts = {};
  const tagCounts = {};
  const subtypeCounts = {};

  for (const item of allItems) {
    // Count type
    const type = item.type ?? "undefined";
    typeCounts[type] = (typeCounts[type] || 0) + 1;

    // Count tags
    const tags = item.system?.tags ?? [];
    for (const tag of tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }

    // Count subtype
    const subtype = item.system?.subtype ?? null;
    if (subtype) {
      subtypeCounts[subtype] = (subtypeCounts[subtype] || 0) + 1;
    }
  }

  console.group("📊 Compendium Item Type Counts");
  console.table(typeCounts);
  console.groupEnd();

  console.group("🏷️ Tag Counts (system.tags)");
  console.table(tagCounts);
  console.groupEnd();

  console.group("🧬 Subtype Counts (system.subtype)");
  console.table(subtypeCounts);
  console.groupEnd();

  return { typeCounts, tagCounts, subtypeCounts };
};
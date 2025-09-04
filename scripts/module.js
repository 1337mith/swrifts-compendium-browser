import { SWRIFTSCompendiumBrowser } from "./ui/compendium-browser.js";

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
  Handlebars.registerHelper('firstValue', function(value) {
    if (typeof value === 'string') {
      return value.split(',');
    }
    if (Array.isArray(value)) {
      return value;
    }
    return '';
  });

  const partialSrc = await fetch("modules/swrifts-compendium-browser/templates/partials/compendium-results.hbs");
  const partialText = await partialSrc.text();
  Handlebars.registerPartial("compendium-results", partialText);

  window.showCompendiumBrowser = (tab = "iconic-frameworks") => {
    const app = new SWRIFTSCompendiumBrowser({ activeTab: tab });
    app.render(true);
  };
});

Hooks.once("ready", async () => {
  window.showCompendiumBrowser = (tab = "iconic-frameworks") => {
    const app = new SWRIFTSCompendiumBrowser({ activeTab: tab });
    app.render(true);
  };
  // 🔍 Expose debug function globally for console use
  window.debugIconicFrameworks = () => SWRIFTSCompendiumBrowser.debugIconicFrameworks();

  // Check if the macro already exists to avoid duplicates
  let macroName = "Open Compendium Browser";
  let existing = game.macros.find(m => m.name === macroName);
  if (!existing) {
    await Macro.create({
      name: macroName,
      type: "script",
      scope: "global",
      img: "/modules/swrifts-tlpg/assets/icons/swrifts-research.webp",
      command: `window.showCompendiumBrowser();`
    });
    console.log(`Macro '${macroName}' created`);
  }
});

Hooks.on("renderActorSheet", (sheet, html, data) => {
  html[0].addEventListener("drop", async event => {
    event.preventDefault();

    let dropData = null;
    try {
      const raw = event.dataTransfer.getData("text/foundry-item");
      if (raw) dropData = JSON.parse(raw);
    } catch (err) {
      console.warn("Failed to parse text/foundry-item data:", err);
    }

    if (!dropData) {
      const raw = event.dataTransfer.getData("text/plain");
      if (raw) dropData = { type: "Item", uuid: raw };
    }

    if (dropData && dropData.type === "Item" && dropData.uuid) {
      console.log("Detected drop of Item with UUID:", dropData.uuid);

      try {
        const item = await fromUuid(dropData.uuid);
        if (!item) {
          console.error("Could not find item document from UUID", dropData.uuid);
          return;
        }

        await sheet.actor.createEmbeddedDocuments("Item", [item.toObject()]);
        console.log("Item added to actor from drop.");

        // Refresh sheet UI to reflect added items
        sheet.render(false);
      } catch (e) {
        console.error("Error adding item to actor:", e);
      }
    }
  });
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
  const subtypeCounts = {};

  for (const item of allItems) {
    // Count type
    const type = item.type ?? "undefined";
    typeCounts[type] = (typeCounts[type] || 0) + 1;

    // Count subtype
    const subtype = item.system?.subtype ?? null;
    if (subtype) {
      subtypeCounts[subtype] = (subtypeCounts[subtype] || 0) + 1;
    }
  }

  console.group("📊 Compendium Item Type Counts");
  console.table(typeCounts);
  console.groupEnd();

  console.group("🧬 Subtype Counts (system.subtype)");
  console.table(subtypeCounts);
  console.groupEnd();

  return { typeCounts, subtypeCounts };
};
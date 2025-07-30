import { SWRIFTSCompendiumBrowser } from "./scripts/ui/swrifts-compendium-browser.js";

/* ------------------------- */
/*  Initialization           */
/* ------------------------- */
Hooks.once("init", async () => {
  console.log("SWRIFTS | Initializing Savage Rifts Compendium Browser");

  /* ---------------------- */
  /*  Optional Helpers       */
  /* ---------------------- */
  
  // If your compendium browser UI templates use these, keep them.
  // If not, you can remove them.

  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("fallback", (value, defaultValue) => value ?? defaultValue);
  Handlebars.registerHelper("capitalize", str => {
    if (typeof str !== "string") return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  });
  Handlebars.registerHelper("previewDescription", str => {
    if (!str) return "";
    str = str.replace(/(<([^>]+)>)/gi, "");
    return str.length > 120 ? str.slice(0, 117) + "…" : str;
  });

  /* ---------------------- */
  /*  Expose UI Function     */
  /* ---------------------- */
  window.showCompendiumBrowser = (tab = "iconic-framework") => {
    const app = new SWRIFTSCompendiumBrowser({ activeTab: tab });
    app.render(true);
  };
});

/* ------------------------- */
/*  Ready Hook               */
/* ------------------------- */
Hooks.once("ready", async () => {
  await SWRIFTSCompendiumBrowser.preload(); // Preload all items in memory
});
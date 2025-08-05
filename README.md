SWRIFTS Compendium Browser
A powerful and user-friendly compendium browser for Savage Rifts modules in Foundry Virtual Tabletop.
Easily search, filter, sort, and drag items from your favorite Savage Worlds Adventure Edition (SWADE) and Savage Rifts compendia directly into your Actor sheets.

Features
Browse and filter all items from SWADE and SWRIFTS-related compendia.
Multiple tabs to view different item categories (Frameworks, Ancestries, Skills, Hindrances, Edges, Gear, and more).
Full-text search and filtering by source and severity.
Sort results by name, source, or severity.
Drag-and-drop support: drag items directly from the browser into actor sheets’ inventory for seamless addition.
Handy macros included for quick access.
Built with performance and extensibility in mind.

Installation
Download the latest release ZIP from Releases.
In Foundry VTT, go to Configuration & Setup > Add-on Modules > Install Module.
Use the Install from URL feature and enter the raw URL of the module.json for the desired version, for example:

Usage
Open the compendium browser by running the macro Open Compendium Browser, or by calling the global function in the console:

js
window.showCompendiumBrowser();
Navigate the tabs to view different item categories.

Use the search box and filters to narrow down the results.
Click an entry to open its item sheet.
Drag items from the list onto an actor’s inventory to add them directly.

Development
For module developers or contributors:
Code is located in the compendium-browser.js and module.js files.
Handlebars templates are in templates/.
Make sure to run Foundry VTT with the latest SWADE and SWRIFTS compendia for best compatibility.
Use the provided example macros or auto-create macros for quick browser launching.

Support & Contribution
Found a bug? Please open an issue in this repository.
Suggestions and feature requests are welcome!
Pull requests for improvements, fixes, or new features are appreciated.
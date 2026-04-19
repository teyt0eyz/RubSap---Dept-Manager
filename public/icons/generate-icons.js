/**
 * Run: node public/icons/generate-icons.js
 * Requires: npm install canvas  (or use an online icon generator)
 *
 * Alternatively, use https://realfavicongenerator.net/ with the SVG below.
 */

// SVG source for the RubSap icon (blue circle with "RS" text)
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#1d4ed8"/>
  <text x="256" y="310" font-family="Arial,sans-serif" font-size="200" font-weight="bold"
    fill="white" text-anchor="middle">RS</text>
</svg>
`;

const fs = require("fs");
fs.writeFileSync(__dirname + "/icon.svg", svg.trim());
console.log("SVG icon written to public/icons/icon.svg");
console.log("Upload it to https://realfavicongenerator.net/ to get all PNG sizes.");

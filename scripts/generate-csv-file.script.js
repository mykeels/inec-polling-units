/**
 * The script should walk through all polling units data, and generate a giant CSV
 * that can be used in Excel or Google sheets with the format:
 * name, ward_name, local_government_name, state_name, latitude, longitude
 */

const fs = require("fs");
const path = require("path");

async function* walk(dir) {
  for await (const d of await fs.promises.opendir(dir)) {
    const entry = path.join(dir, d.name);
    if (d.isDirectory()) yield* walk(entry);
    else if (d.isFile()) yield entry;
  }
}

(async () => {
  for await (const file of walk(`./states/`)) {
    // @TODO Write code here
  }
})();

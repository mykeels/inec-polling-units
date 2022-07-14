const fs = require("fs");
const path = require("path");

/**
 * Traverses through directories to return all files containing
 * polling unit information for each state
 */
module.exports = async function* walk(dir) {
  for await (const d of await fs.promises.opendir(dir)) {
    const entry = path.join(dir, d.name);
    if (d.isDirectory()) yield* walk(entry);
    else if (d.isFile()) yield entry;
  }
};

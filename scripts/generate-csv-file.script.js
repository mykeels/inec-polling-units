/**
 * The script should walk through all polling units data, and generate a giant CSV
 * that can be used in Excel or Google sheets with the format:
 * name, ward_name, local_government_name, state_name, latitude, longitude
 */

const fs = require("fs");
const fsPromise = require("fs/promises")
const path = require("path");
let converter = require('json-2-csv');

async function* walk(dir) {
  for await (const d of await fs.promises.opendir(dir)) {
    const entry = path.join(dir, d.name);
    if (d.isDirectory()) yield* walk(entry);
    else if (d.isFile()) yield entry;
  }
}

(async () => {
  let all = []
  for await (const file of walk(`./states/`)) {
    if (file.endsWith('/units/index.json')) {
      const json = JSON.parse(await fsPromise.readFile(file, { encoding: 'utf8' }))
      all = [...all, ...json]
    }
  }

  converter.json2csv(all, async (err, csv) => {
    if (err) {
      return console.error(err)
    }
    await fsPromise.writeFile(path.join(process.cwd(), 'polling-units.csv'), csv)
  },
    {
      emptyFieldValue: "",
      keys: [
        "name",
        "ward_name",
        "local_government_name",
        "state_name",
        "location.latitude",
        "location.longitude"
      ]
    })
})();

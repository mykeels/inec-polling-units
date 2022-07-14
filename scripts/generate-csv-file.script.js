/**
 * This script walks through all polling units data, and generate a giant CSV
 * that can be used in Excel or Google sheets with the format:
 * name, ward_name, local_government_name, state_name, latitude, longitude
 */

const fs = require("fs");
const path = require("node:path");
const walk = require("./walk");
const converter = require("json-2-csv");

(async () => {
  let all = [];
  for await (const file of walk(`./states/`)) {
    if (file.endsWith(path.normalize("/units/index.json"))) {
      const json = JSON.parse(
        await fs.promises.readFile(file, { encoding: "utf8" })
      );
      all = [...all, ...json];
    }
  }

  converter.json2csv(
    all,
    async (err, csv) => {
      if (err) {
        return console.error(err);
      }
      await fs.promises.writeFile(
        path.join(process.cwd(), "polling-units.csv"),
        csv
      );
    },
    {
      emptyFieldValue: "",
      keys: [
        "name",
        "ward_name",
        "local_government_name",
        "state_name",
        "location.latitude",
        "location.longitude",
      ],
    }
  );
})();

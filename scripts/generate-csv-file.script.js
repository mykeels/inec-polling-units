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

// create csv file
try {
  fs.writeFileSync(
    `inec-polling-units.csv`,
    `name, ward_name, local_government_name, state_name, latitude, longitude \n`,
    { encoding: "utf8" }
  );
} catch (error) {
  console.log(error);
}

(async () => {
  for await (const file of walk(`./states/`)) {
    // @TODO Write code here
    // append values to file created before
    let parseData;
    if (!file.includes(".csv")) {
      const fileData = fs.readFileSync(file, { encoding: "utf8" });
      parseData = JSON.parse(fileData);
    }

    if (parseData && Array.isArray(parseData)) {
      for await (const {
        name,
        ward_name,
        local_government_name,
        state_name,
        location,
      } of parseData) {
        try {
          fs.appendFileSync(
            `inec-polling-units.csv`,
            `${name || ""}, ${ward_name || ""}, ${
              local_government_name || ""
            }, ${state_name || ""}, ${location ? location.latitude : ""}, ${
              location ? location.longitude : ""
            }\n`,
            { encoding: "utf8" }
          );
        } catch (error) {
          console.log(error);
        }
      }
    } else if (parseData && !Array.isArray(parseData)) {
      const { name, ward_name, local_government_name, state_name, location } =
        parseData;

      try {
        fs.appendFileSync(
          `inec-polling-units.csv`,
          `${name || ""}, ${ward_name || ""}, ${local_government_name || ""}, ${
            state_name || ""
          }, ${location ? location.latitude : ""}, ${
            location ? location.longitude : ""
          }\n`,
          { encoding: "utf8" }
        );
      } catch (error) {
        console.log(error);
      }
    }
  }
})();

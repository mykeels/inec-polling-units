/**
 * This script updates the README file with the voting location
 * stats for every state
 */

const fs = require("fs");
const path = require("path");
const walk = require("./walk");

/**
 * @param {Object[]} units
 * @param {string} units[].id
 * @param {string} units[].ward_id
 * @param {string} units[].local_government_id
 * @param {string} units[].state_name
 * @param {object} units[].location
 */
function generatePUTable(units) {
  let unitsMap = {};
  let totalUnits = 0;
  let totalUnitsWithUnknownLocations = 0;

  for (const unit of units) {
    if (!unitsMap[unit.state_name]) {
      unitsMap[unit.state_name] = {};
      unitsMap[unit.state_name]["pollingUnits"] = 0;
      unitsMap[unit.state_name]["wards"] = 0;
      unitsMap[unit.state_name]["lgas"] = 0;
      unitsMap[unit.state_name]["unitsWithUnknownLocations"] = 0;
      console.log(unit.state_name);
    }

    if (!unitsMap[unit.state_name][unit.local_government_id]) {
      unitsMap[unit.state_name][unit.local_government_id] = {};
      unitsMap[unit.state_name]["lgas"]++;
    }

    if (!unitsMap[unit.state_name][unit.local_government_id][unit.ward_id]) {
      unitsMap[unit.state_name][unit.local_government_id][unit.ward_id] = {};
      unitsMap[unit.state_name]["wards"]++;
    }

    if (
      !unitsMap[unit.state_name][unit.local_government_id][unit.ward_id][
        unit.id
      ]
    ) {
      unitsMap[unit.state_name][unit.local_government_id][unit.ward_id][
        unit.id
      ] = true;
      unitsMap[unit.state_name]["pollingUnits"]++;
      totalUnits++;
    }

    if (!unit.location) {
      unitsMap[unit.state_name]["unitsWithUnknownLocations"]++;
      totalUnitsWithUnknownLocations++;
    }
  }

  let tableInfo = `
  |  |  |
| -- | -- |
| Total Polling Units | ${totalUnits.toLocaleString()} |
| Polling Units with Known Locations | ${(
  totalUnits - totalUnitsWithUnknownLocations
).toLocaleString()} |
| Polling Units with Unknown Locations |  ${totalUnitsWithUnknownLocations.toLocaleString()} |
| Location Data Completion (%) | ${(
  ((totalUnits - totalUnitsWithUnknownLocations) / totalUnits) *
  100
)
  .toFixed(2)
  .toLocaleString()}% |

### State Data Overview

| State | LGAs | Wards | Polling Units | Location Data Completion (%) |
| ----- | ---- | ----- | ------- | ------- |`;

  for (const state of [...Object.keys(unitsMap).sort()]) {
    const { lgas, wards, pollingUnits, unitsWithUnknownLocations } =
      unitsMap[state];
    tableInfo += `
 | ${state} | ${lgas} | ${wards} | ${pollingUnits.toLocaleString()} | ${(
      ((pollingUnits - unitsWithUnknownLocations) / pollingUnits) *
      100
    )
      .toFixed(2)
      .toLocaleString()}% |`;
  }

  return tableInfo;
}

/**
 * @param {string} tableInfo
 */
async function updateReadmePUTable(tableInfo) {
  const readmePath = path.join(process.cwd(), "README.md");
  const readme = await fs.promises.readFile(readmePath, {
    encoding: "utf8",
  });
  const [firstPart] = readme.split("## Polling Unit Stats");
  const [_, lastPart] = readme.split("<!-- End of PU stats -->");

  const updatedReadmeText =
    firstPart +
    "## Polling Unit Stats\n" +
    tableInfo +
    "\n<!-- End of PU stats -->" +
    lastPart;

  await fs.promises.writeFile(readmePath, updatedReadmeText);
}

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
  const tableInfo = generatePUTable(all);
  await updateReadmePUTable(tableInfo);
})();

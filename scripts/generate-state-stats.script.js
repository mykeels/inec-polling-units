/**
 * This script updates the README file with the voting location
 * stats for every state
 */

const fs = require("fs");
const path = require("path");
const walk = require("./walk");

/**
 * @param {object[]} units
 * @param {string} units[].id
 * @param {string} units[].ward_id
 * @param {string} units[].local_government_id
 * @param {string} units[].state_name
 * @param {object} units[].location
 */
function aggregateData(units) {
  /**
   * @type {{ [state: string]: { lgas: number, wards: number, pollingUnits: number, unitsWithUnknownLocations: number } }}
   */
  let stateRecords = {};
  let totalUnits = 0;
  let totalUnitsWithUnknownLocations = 0;

  for (const unit of units) {
    if (!stateRecords[unit.state_name]) {
      stateRecords[unit.state_name] = {};
      stateRecords[unit.state_name]["id"] = unit.state_id;
      stateRecords[unit.state_name]["pollingUnits"] = 0;
      stateRecords[unit.state_name]["wards"] = 0;
      stateRecords[unit.state_name]["lgas"] = 0;
      stateRecords[unit.state_name]["unitsWithUnknownLocations"] = 0;
    }

    if (!stateRecords[unit.state_name][unit.local_government_id]) {
      stateRecords[unit.state_name][unit.local_government_id] = {};
      stateRecords[unit.state_name]["lgas"]++;
    }

    if (
      !stateRecords[unit.state_name][unit.local_government_id][unit.ward_id]
    ) {
      stateRecords[unit.state_name][unit.local_government_id][unit.ward_id] =
        {};
      stateRecords[unit.state_name]["wards"]++;
    }

    if (
      !stateRecords[unit.state_name][unit.local_government_id][unit.ward_id][
        unit.id
      ]
    ) {
      stateRecords[unit.state_name][unit.local_government_id][unit.ward_id][
        unit.id
      ] = true;
      stateRecords[unit.state_name]["pollingUnits"]++;
      totalUnits++;
    }

    if (!unit.location) {
      stateRecords[unit.state_name]["unitsWithUnknownLocations"]++;
      totalUnitsWithUnknownLocations++;
    }
  }

  return {
    stateRecords,
    totalUnits,
    totalUnitsWithUnknownLocations,
  };
}

/**
 * @param {object[]} units
 * @param {string} units[].id
 * @param {string} units[].ward_id
 * @param {string} units[].local_government_id
 * @param {string} units[].state_name
 * @param {object} units[].location
 */
async function generateTables(units) {
  const { stateRecords, totalUnits, totalUnitsWithUnknownLocations } =
    aggregateData(units);

  // generate polling-units
  const pollingUnitStats = getPollingUnitStats(
    totalUnits,
    totalUnitsWithUnknownLocations
  );
  await updateReadmePUTable(pollingUnitStats);

  // generate states
  const stateDataOverview = getStateDataOverview(stateRecords);
  await fs.promises.writeFile(
    path.join(__dirname, "../states/README.md"),
    stateDataOverview,
    "utf8"
  );
}

/**
 * @param {number} totalUnits
 * @param {number} totalUnitsWithUnknownLocations
 */
function getPollingUnitStats(totalUnits, totalUnitsWithUnknownLocations) {
  return `
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

[Get started exploring the data]("./states/README.md").
      `;
}

/**
 * @param {number} units
 */
function getStateDataOverview(stateData) {
  return `
# States Data

| State | LGAs | Wards | Polling Units | Location Data Completion (%) |
| ----- | ---- | ----- | ------- | ------- |
${Object.keys(stateData)
  .sort()
  .map((state) => {
    const { id, lgas, wards, pollingUnits, unitsWithUnknownLocations } =
      stateData[state];
    return `
 | [${state}](./${id.padStart(
      2,
      "0"
    )}-${state.toLowerCase().replace(/ /g, "%20")}) | ${lgas} | ${wards} | ${pollingUnits.toLocaleString()} | ${(
      ((pollingUnits - unitsWithUnknownLocations) / pollingUnits) *
      100
    )
      .toFixed(2)
      .toLocaleString()}% |`;
  })
  .join("\n")}
      `;
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
  let allUnits = [];
  for await (const file of walk(`./states/`)) {
    if (file.endsWith(path.normalize("/units/index.json"))) {
      const units = require(path.resolve(file));
      allUnits = allUnits.concat(units);
    }
  }
  await generateTables(allUnits);
})();

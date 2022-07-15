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
   * @type {{ [state: string]: { id: string, lgas: number, wards: number, pollingUnits: number, unitsWithUnknownLocations: number, [lga: string]: { id: string, wards: number, pollingUnits: number, unitsWithUnknownLocations: number }  } }}
   */
  let nationalRecords = {};
  let totalUnits = 0;
  let totalUnitsWithUnknownLocations = 0;

  for (const unit of units) {
    aggregateNationalRecords(unit, nationalRecords);

    totalUnits++;
    if (!unit.location) {
      totalUnitsWithUnknownLocations++;
    }
  }

  return {
    nationalRecords,
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
 * @param {{ [state: string]: { id: string, lgas: number, wards: number, pollingUnits: number, unitsWithUnknownLocations: number } }} nationalRecords
 */
function aggregateNationalRecords(unit, nationalRecords = {}) {
  if (!nationalRecords[unit.state_name]) {
    nationalRecords[unit.state_name] = {};
    nationalRecords[unit.state_name]["id"] = unit.state_id;
    nationalRecords[unit.state_name]["name"] = unit.state_name;
    nationalRecords[unit.state_name]["pollingUnits"] = 0;
    nationalRecords[unit.state_name]["wards"] = 0;
    nationalRecords[unit.state_name]["lgas"] = 0;
    nationalRecords[unit.state_name]["unitsWithUnknownLocations"] = 0;
  }

  if (!nationalRecords[unit.state_name][unit.local_government_id]) {
    nationalRecords[unit.state_name][unit.local_government_id] = {
      id: unit.local_government_id,
      name: unit.local_government_name,
      pollingUnits: 0,
      unitsWithUnknownLocations: 0,
      wards: 0,
    };
    nationalRecords[unit.state_name]["lgas"]++;
  }

  if (
    !nationalRecords[unit.state_name][unit.local_government_id][unit.ward_id]
  ) {
    nationalRecords[unit.state_name][unit.local_government_id][unit.ward_id] = {
      id: unit.ward_id,
      name: unit.ward_name,
      pollingUnits: 0,
      unitsWithUnknownLocations: 0,
    };
    nationalRecords[unit.state_name]["wards"]++;
    nationalRecords[unit.state_name][unit.local_government_id]["wards"]++;
  }

  if (
    !nationalRecords[unit.state_name][unit.local_government_id][unit.ward_id][
      unit.id
    ]
  ) {
    nationalRecords[unit.state_name][unit.local_government_id][unit.ward_id][
      unit.id
    ] = {
      id: unit.id,
      name: unit.name,
    };
    nationalRecords[unit.state_name]["pollingUnits"]++;
    nationalRecords[unit.state_name][unit.local_government_id][
      "pollingUnits"
    ]++;
    nationalRecords[unit.state_name][unit.local_government_id][unit.ward_id][
      "pollingUnits"
    ]++;
  }

  if (!unit.location) {
    nationalRecords[unit.state_name]["unitsWithUnknownLocations"]++;
    nationalRecords[unit.state_name][unit.local_government_id][
      "unitsWithUnknownLocations"
    ]++;
    nationalRecords[unit.state_name][unit.local_government_id][unit.ward_id][
      "unitsWithUnknownLocations"
    ]++;
    nationalRecords[unit.state_name][unit.local_government_id][unit.ward_id][
      unit.id
    ]["unitsWithUnknownLocations"]++;
  }
  return nationalRecords;
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
  const { nationalRecords, totalUnits, totalUnitsWithUnknownLocations } =
    aggregateData(units);

  // generate polling-units
  const pollingUnitStats = getPollingUnitStats(
    totalUnits,
    totalUnitsWithUnknownLocations
  );
  await updateReadmePUTable(pollingUnitStats);

  // generate states
  const stateDataOverview = getStateDataOverview(nationalRecords);
  await fs.promises.writeFile(
    path.join(__dirname, "../states/README.md"),
    stateDataOverview,
    "utf8"
  );

  for (let [state, stateRecords] of Object.entries(nationalRecords)) {
    const lgaDataOverview = getLGADataOverview(stateRecords);
    const stateLinkId = `${stateRecords.id.padStart(
      2,
      "0"
    )}-${state.toLowerCase()}`;
    await fs.promises.writeFile(
      path.join(__dirname, `../states/${stateLinkId}/README.md`),
      lgaDataOverview,
      "utf8"
    );

    for (let [lga, lgaRecords] of Object.entries(stateRecords)) {
      const wardDataOverview = getWardDataOverview(lgaRecords);
      if (!lgaRecords.name) {
        continue;
      }
      const lgaLinkId = `${lga.padStart(2, "0")}-${lgaRecords.name
        .toLowerCase()
        .replace(/[ .]/g, "-")
        .replace(/-+/g, "-")}`;
      await fs.promises.writeFile(
        path.join(
          __dirname,
          `../states/${stateLinkId}/lgas/${lgaLinkId}/README.md`
        ),
        wardDataOverview,
        "utf8"
      );
    }
  }
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

[Get started exploring the data](./states#readme).
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
    return `| [${state}](./${id.padStart(2, "0")}-${state
      .toLowerCase()
      .replace(
        / /g,
        "%20"
      )}) | ${lgas} | ${wards} | ${pollingUnits.toLocaleString()} | ${(
      ((pollingUnits - unitsWithUnknownLocations) / pollingUnits) *
      100
    )
      .toFixed(2)
      .toLocaleString()}% |`;
  })
  .join("\n")}`;
}

/**
 * @param {{ [lga: string]: { id: string, wards: number, pollingUnits: number, unitsWithUnknownLocations: number } }} stateRecords
 */
function getLGADataOverview(stateRecords) {
  return `
# ${stateRecords.name} LGAs Data

| LGAs | Wards | Polling Units | Location Data Completion (%) |
| ----- | ---- | ----- | ------- |
${Object.keys(stateRecords)
  .sort()
  .map((lga) => {
    if (
      [
        "id",
        "name",
        "wards",
        "pollingUnits",
        "unitsWithUnknownLocations",
        "lgas",
      ].some((key) => key === lga)
    ) {
      return;
    }
    const { id, name, wards, pollingUnits, unitsWithUnknownLocations } =
      stateRecords[lga];
    return `| [${name}](./lgas/${id.padStart(2, "0")}-${name
      .toLowerCase()
      .replace(/ /g, "-")}) | ${wards} | ${pollingUnits.toLocaleString()} | ${(
      ((pollingUnits - unitsWithUnknownLocations) / pollingUnits) *
      100
    )
      .toFixed(2)
      .toLocaleString()}% |`;
  })
  .join("\n")}`;
}

/**
 * @param {{ [ward: string]: { id: string, pollingUnits: number, unitsWithUnknownLocations: number } }} lgaRecords
 */
function getWardDataOverview(lgaRecords) {
  return `
# ${lgaRecords.name} Wards Data

| Wards | Polling Units | Location Data Completion (%) |
| ---- | ----- | ------- |
${Object.keys(lgaRecords)
  .sort()
  .map((ward) => {
    if (
      ["id", "name", "pollingUnits", "unitsWithUnknownLocations", "wards"].some(
        (key) => key === ward
      )
    ) {
      return;
    }
    const { id, name, pollingUnits, unitsWithUnknownLocations } =
      lgaRecords[ward];
    if (!id) {
      console.log({ id, ward, name, pollingUnits, unitsWithUnknownLocations })
      return "";
    }
    return `| [${name}](./wards/${id.padStart(2, "0")}-${name
      .toLowerCase()
      .replace(/[ .]/g, "-")
      .replace(/-+/g, "-")}) | ${pollingUnits.toLocaleString()} | ${(
      ((pollingUnits - unitsWithUnknownLocations) / pollingUnits) *
      100
    )
      .toFixed(2)
      .toLocaleString()}% |`;
  })
  .join("\n")}`;
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

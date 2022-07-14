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

/**
 * @param {Object[]} units
 * @param {string} units[].id
 * @param {string} units[].ward_id
 * @param {string} units[].local_government_id
 * @param {string} units[].state_name
 */
function generatePUTable(units) {
  let unitsMap = {}
  let totalUnits = 0

  for (const unit of units) {
    if (!unitsMap[unit.state_name]) {
      unitsMap[unit.state_name] = {}
      unitsMap[unit.state_name]['pollingUnits'] = 0
    }

    if (!unitsMap[unit.state_name][unit.local_government_id]) {
      unitsMap[unit.state_name]['lgas'] = 1
      unitsMap[unit.state_name][unit.local_government_id] = {}
    } else {
      unitsMap[unit.state_name]['lgas']++
    }

    if (!unitsMap[unit.state_name][unit.local_government_id][unit.ward_id]) {
      unitsMap[unit.state_name]['wards'] = 1
      unitsMap[unit.state_name][unit.local_government_id][unit.ward_id] = {}
    } else {
      unitsMap[unit.state_name]['wards']++
    }

    if (!unitsMap[unit.state_name][unit.local_government_id][unit.ward_id][unit.id]) {
      unitsMap[unit.state_name][unit.local_government_id][unit.ward_id][unit.id] = true
      unitsMap[unit.state_name]['pollingUnits']++
      totalUnits++
    }
  }

  let tableInfo = `
Total polling units: ${totalUnits}

| State | LGAs | Wards | Polling Units |
| ----- | ---- | ----- | ------- |`;

  for (const state of Object.keys(unitsMap)) {
    tableInfo += `
| ${state} | ${unitsMap[state]['lgas']} | ${unitsMap[state]['wards']} | ${unitsMap[state]['pollingUnits']} |`
  }

  return tableInfo
}

/**
 * @param {string} tableInfo
 */
async function updateReadmePUTable(tableInfo) {
  const readmePath = path.join(process.cwd(), 'README.md')
  const readme = await fsPromise.readFile(readmePath, {
    encoding: 'utf8'
  })
  const [firstPart] = readme.split('### Polling Unit Stats')
  const [_, lastPart] = readme.split('<!-- End of PU stats -->')

  const updatedReadmeText = firstPart + '### Polling Unit Stats\n'
    + tableInfo + '\n<!-- End of PU stats -->' + lastPart;

  await fsPromise.writeFile(readmePath, updatedReadmeText)
}

(async () => {
  let all = []
  for await (const file of walk(`./states/`)) {
    if (file.endsWith('/units/index.json')) {
      const json = JSON.parse(await fsPromise.readFile(file, { encoding: 'utf8' }))
      all = [...all, ...json]
    }
  }
  const tableInfo = generatePUTable(all)
  await updateReadmePUTable(tableInfo)

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

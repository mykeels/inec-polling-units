/**
 * This script walks through the polling units data, and retrieves location data for
 * each polling unit, using Google Places API.
 *
 * To run, you will need to provide a GOOGLE_PLACES_API_KEY env var in a .env file
 */

const fs = require("fs");
const path = require("path");
const { default: axios } = require("axios");
const walk = require('./walk')

require("dotenv").config();

async function getAddressGeocode(...args) {
  var API_KEY = process.env.GOOGLE_PLACES_API_KEY;
  var url =
    "https://maps.googleapis.com/maps/api/place/textsearch/json?query=" +
    args.filter(Boolean).join(" ") +
    "&key=" +
    API_KEY;
  return axios
    .get(url)
    .then((res) => res.data.results[0])
    .catch((error) => {
      console.error(error);
      return null;
    });
}

const getUnitWithGeolocation = async (unit) => {
  const address = `${unit.name}, ${unit.ward_name}, ${unit.local_government_name}, ${unit.state_name}`;
  console.log(address);
  if (!unit.location) {
    const geodata = await getAddressGeocode(address);
    const geometry = (geodata || {}).geometry;
    const location = (geometry || {}).location;
    const latitude = (location || {}).lat;
    const longitude = (location || {}).lng;
    unit.location = geometry
      ? {
          latitude,
          longitude,
          viewport: (geometry || {}).viewport,
          formatted_address: (geodata || {}).formatted_address,
          google_map_url: `https://maps.google.com?q=${latitude},${longitude}`,
          google_place_id: geodata.place_id,
        }
      : null;
  }
  return unit;
};

(async () => {
  for await (const file of walk(`./states/`)) {
    if (file.endsWith("units\\index.json")) {
      const units = require(path.resolve(file));

      const unitsWithGeoLocation = await Promise.all(
        units.map((unit) => getUnitWithGeolocation(unit))
      );
      fs.writeFileSync(
        path.resolve(file),
        JSON.stringify(unitsWithGeoLocation, null, 2),
        "utf8"
      );
      console.log("================================================");
    }
  }

  //   const geodata = await getAddressGeocode(
  //     "20, ADEYOOLA STREET, ILORO/ONIPETESI, AGEGE, LAGOS"
  //   );
  //   console.log(JSON.stringify(geodata, null, 2));
})();

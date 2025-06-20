const axios = require('axios');

const API_KEY = '15625e09-3af8-4aaf-a592-2674a4b2f98b'; // 🔒 Replace this with your Motive API token
const BASE_URL = 'https://api.gomotive.com/v1/vehicles/locations';

async function fetchVehicles(perPage = 25) {
  let vehicles = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const res = await axios.get(BASE_URL, {
        headers: {
          Authorization: `Bearer ${API_KEY}`
        },
        params: {
          per_page: perPage,
          page_no: page
        }
      });

      const data = res.data.vehicles || res.data.data || [];

      if (data.length === 0) {
        hasMore = false;
      } else {
        vehicles.push(...data);
        page++;
      }
    } catch (err) {
      console.error('Error fetching data:', err.response?.data || err.message);
      break;
    }
  }

  return vehicles;
}

function displayTable(vehicles) {
  const tableData = vehicles.map(v => ({
    ID: v.id,
    Number: v.number,
    Year: v.year,
    Make: v.make,
    Model: v.model,
    VIN: v.vin,
    Latitude: v.current_location?.lat || 'N/A',
    Longitude: v.current_location?.lon || 'N/A',
    Odometer_km: v.current_location?.odometer ? (v.current_location.odometer / 1000).toFixed(2) : 'N/A',
    Speed_kph: v.current_location?.speed || 0,
    Fuel_L: v.current_location?.fuel ? v.current_location.fuel.toFixed(2) : 'N/A',
    Location: v.current_location?.description || 'N/A',
    Timestamp: v.current_location?.located_at || 'N/A'
  }));

  console.table(tableData);
}

// Run the job
(async () => {
  const vehicles = await fetchVehicles();
  displayTable(vehicles);
})();

const fetch = require('node-fetch');

const options = {
  method: 'GET',
  headers: {
    accept: 'application/json',
    'x-api-key': '15625e09-3af8-4aaf-a592-2674a4b2f98b'
  }
};

const startTime = '2025-06-07T00:00:00Z';
const endTime = '2025-06-07T23:59:59Z';
const limit = 10;

const url = `https://api.gomotive.com/v2/inspection_reports?start_time=${encodeURIComponent(startTime)}&end_time=${encodeURIComponent(endTime)}&limit=${limit}`;

fetch(url, options)
  .then(res => {
    if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
    return res.json();
  })
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(err => console.error('Fetch failed:', err));

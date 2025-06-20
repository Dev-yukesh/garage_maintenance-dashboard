const axios = require('axios');

const API_KEY = '15625e09-3af8-4aaf-a592-2674a4b2f98b'; // Replace with your real key

axios.get('https://api.gomotive.com/v1/vehicle_locations', {
  headers: {
    'x-api-key': API_KEY
  },
  params: {
    per_page: 1,
    page_no: 1
  }
})
.then(res => {
  console.log('Success:', res.data);
})
.catch(err => {
  console.error('Request failed:', err.response?.data || err.message);
});

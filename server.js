const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve all static files
app.use(express.static(__dirname));

// API route
app.get('/getMotiveReports', async (req, res) => {
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'x-api-key': '15625e09-3af8-4aaf-a592-2674a4b2f98b',
    }
  };

  try {
    const response = await fetch('https://api.gomotive.com/v2/inspection_reports?per_page=25&page_no=1', options);
    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch Motive API');
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

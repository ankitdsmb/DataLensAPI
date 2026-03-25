const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Scraper Service is running!');
});

app.listen(port, () => {
  console.log(`Scraper Service listening on port ${port}`);
});

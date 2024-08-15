const express = require('express');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// CORS configuration
const corsOptions = {
  origin: 'http://localhost:3000',
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10
});

app.use(limiter);

// Setup cache
const cache = new NodeCache({ stdTTL: 300 });

const COINS = ['bitcoin', 'ethereum', 'dogecoin'];
const API_BASE_URL = 'https://api.coingecko.com/api/v3/coins';

// Function to fetch data with retry mechanism
const fetchWithRetry = async (url, retries = 3, backoff = 300) => {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 429 && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, retries - 1, backoff * 2);
    }
    throw error;
  }
};
//comment
app.get('/api/data', async (req, res) => {
  try {
    let data = cache.get('cryptoData');
    if (data) {
      console.log('Serving from cache');
      return res.json(data);
    }

    console.log('Fetching fresh data');
    const currentDataPromises = COINS.map(coin => 
      fetchWithRetry(`${API_BASE_URL}/${coin}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`)
    );

    const historicalDataPromises = COINS.map(coin => 
      fetchWithRetry(`${API_BASE_URL}/${coin}/market_chart?vs_currency=usd&days=7&interval=daily`)
    );

    const [currentResponses, historicalResponses] = await Promise.all([
      Promise.all(currentDataPromises),
      Promise.all(historicalDataPromises)
    ]);

    data = currentResponses.map((response, index) => ({
      id: response.id,
      name: response.name,
      symbol: response.symbol,
      price: response.market_data.current_price.usd,
      priceChange24h: response.market_data.price_change_percentage_24h,
      marketCap: response.market_data.market_cap.usd,
      image: response.image.small,
      priceHistory: historicalResponses[index].prices.map(([timestamp, price]) => ({
        date: new Date(timestamp).toLocaleDateString(),
        price: price
      }))
    }));

    cache.set('cryptoData', data);
    res.json(data);
  } catch (error) {
    console.error('Error fetching data:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      if (error.response.status === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
      }
    }
    res.status(500).json({ error: 'An error occurred while fetching data', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

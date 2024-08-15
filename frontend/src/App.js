import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import 'bootstrap/dist/css/bootstrap.min.css';

const Dashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('http://localhost:5000/api/data');
      setData(response.data);
      setLastUpdated(new Date());
      setLoading(false);
    } catch (err) {
      console.error('Error details:', err.response ? err.response.data : err.message);
      setError(err.response ? err.response.data.error : err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    fetchData();
  };

  if (loading) return <div className="text-center mt-5">Loading...</div>;
  if (error) return (
    <div className="text-center mt-5 text-danger">
      <h2>Error fetching data</h2>
      <p>{error}</p>
      {error === 'Rate limit exceeded. Please try again later.' && (
        <p>We've hit the API rate limit. Please wait a moment before refreshing.</p>
      )}
      <p>Please check the console for more details.</p>
      <button className="btn btn-primary mt-3" onClick={handleRefresh}>Try Again</button>
    </div>
  );

  const getColorClass = (value) => {
    return value >= 0 ? 'text-success' : 'text-danger';
  };

  return (
    <div className="container-fluid bg-dark text-light py-4">
      <h1 className="text-center mb-4 text-primary">Crypto Dashboard</h1>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <p className="mb-0">Last updated: {lastUpdated ? lastUpdated.toLocaleString() : 'Never'}</p>
        <button className="btn btn-primary" onClick={handleRefresh}>Refresh Data</button>
      </div>
      <div className="row">
        {data.map((coin) => (
          <div key={coin.id} className="col-md-4 mb-4">
            <div className="card bg-warning text-dark">
              <div className="card-body">
                <div className="d-flex align-items-center mb-3">
                  <img src={coin.image} alt={coin.name} className="me-2" style={{width: '30px', height: '30px'}} />
                  <h5 className="card-title mb-0">{coin.name} ({coin.symbol.toUpperCase()})</h5>
                </div>
                <h6 className="card-subtitle mb-2">
                  Price: ${coin.price.toFixed(2)}
                </h6>
                <p className={`card-text ${getColorClass(coin.priceChange24h)}`}>
                  24h Change: {coin.priceChange24h.toFixed(2)}%
                </p>
                <p className="card-text">
                  Market Cap: ${coin.marketCap.toLocaleString()}
                </p>
                <div style={{ width: '100%', height: 200 }}>
                  <ResponsiveContainer>
                    <LineChart data={coin.priceHistory}>
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="price" stroke="#8884d8" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;

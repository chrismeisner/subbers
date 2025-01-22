import React, { useState, useEffect } from 'react';

function App() {
  const [allSubscribers, setAllSubscribers] = useState([]);
  const [filteredSubscribers, setFilteredSubscribers] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [loading, setLoading] = useState(false);

  // We do NOT define an API URL variable here since we're using the dev proxy.
  // If you need to build for production with a different endpoint, 
  // you can conditionally set that later. For dev, we rely on the proxy.

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    try {
      setLoading(true);
      // Relative path fetch: 
      // "proxy" in package.json redirects this to http://localhost:4200/get-subscribers
      const response = await fetch('/get-subscribers');
      if (!response.ok) {
        throw new Error(`Failed to fetch. Status: ${response.status}`);
      }
      const data = await response.json();
      setLoading(false);

      setAllSubscribers(data.subscribers);
      setFilteredSubscribers(data.subscribers);
    } catch (error) {
      console.error('Error fetching subscribers:', error);
      setLoading(false);
    }
  };

  const handleProductFilterChange = (e) => {
    const product = e.target.value;
    setSelectedProduct(product);

    if (product === '') {
      setFilteredSubscribers(allSubscribers);
    } else {
      const filtered = allSubscribers.filter(
        (sub) => sub.product_name === product
      );
      setFilteredSubscribers(filtered);
    }
  };

  const copyEmailAddresses = () => {
    const emails = filteredSubscribers.map((sub) => sub.email).join(', ');
    const tempTextArea = document.createElement('textarea');
    tempTextArea.value = emails;
    document.body.appendChild(tempTextArea);
    tempTextArea.select();
    document.execCommand('copy');
    document.body.removeChild(tempTextArea);
    alert('Email addresses copied to clipboard!');
  };

  const uniqueProducts = [...new Set(allSubscribers.map((sub) => sub.product_name))];

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <h1 className="text-2xl font-bold text-center mb-4">
        Current Stripe Subscribers
      </h1>

      <div className="mb-4 text-center">
        <select
          value={selectedProduct}
          onChange={handleProductFilterChange}
          className="border px-2 py-1 rounded"
        >
          <option value="">All Products</option>
          {uniqueProducts.map((product) => (
            <option key={product} value={product}>
              {product}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <span className="text-gray-700">
          Records retrieved: {filteredSubscribers.length}
        </span>
        <button
          onClick={copyEmailAddresses}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
        >
          Copy Email Addresses
        </button>
      </div>

      {loading && (
        <div className="text-center text-gray-600 mb-4">
          Loading subscribers...
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2">ID</th>
              <th className="border p-2">Email</th>
              <th className="border p-2">Name</th>
              <th className="border p-2">Phone</th>
              <th className="border p-2">Subscription Status</th>
              <th className="border p-2">Plan</th>
              <th className="border p-2">Product Name</th>
              <th className="border p-2">Amount Charged</th>
              <th className="border p-2">Currency</th>
              <th className="border p-2">Current Period End</th>
              <th className="border p-2">Trial End</th>
              <th className="border p-2">Subscription Start</th>
              <th className="border p-2">Billing Interval</th>
              <th className="border p-2">Discount</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubscribers.map((sub) => (
              <tr key={sub.id}>
                <td className="border p-2">{sub.id}</td>
                <td className="border p-2">{sub.email}</td>
                <td className="border p-2">{sub.name}</td>
                <td className="border p-2">{sub.phone}</td>
                <td className="border p-2">{sub.subscription_status}</td>
                <td className="border p-2">{sub.plan_name}</td>
                <td className="border p-2">{sub.product_name}</td>
                <td className="border p-2">{sub.amount_charged}</td>
                <td className="border p-2">{sub.currency}</td>
                <td className="border p-2">{sub.current_period_end}</td>
                <td className="border p-2">{sub.trial_end}</td>
                <td className="border p-2">{sub.subscription_start}</td>
                <td className="border p-2">{sub.billing_interval}</td>
                <td className="border p-2">{sub.discount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;

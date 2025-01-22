/************************************************************
 * src/App.js
 ************************************************************/
import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import { onAuthStateChanged, getIdToken, signOut } from "firebase/auth";
import { auth } from "./firebase";

function App() {
  const [user, setUser] = useState(null);
  const [allSubscribers, setAllSubscribers] = useState([]);
  const [filteredSubscribers, setFilteredSubscribers] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [loading, setLoading] = useState(false);
  const [stripeKeyInput, setStripeKeyInput] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchSubscribers(currentUser);
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  async function fetchSubscribers(currentUser) {
    if (!currentUser) return;
    try {
      setLoading(true);
      const token = await getIdToken(currentUser, false);
      const response = await fetch("/get-subscribers", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch. Status: ${response.status}`);
      }
      const data = await response.json();
      setLoading(false);
      setAllSubscribers(data.subscribers);
      setFilteredSubscribers(data.subscribers);
      console.log("Subscribers fetched successfully!");
    } catch (error) {
      console.error("Error fetching subscribers:", error);
      setLoading(false);
    }
  }

  async function handleSaveStripeKey() {
    if (!user) return;
    try {
      const token = await getIdToken(user, false);
      const response = await fetch("/save-stripe-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ stripeKey: stripeKeyInput })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save Stripe key");
      }
      alert("Stripe Key saved successfully!");
      setStripeKeyInput("");
      fetchSubscribers(user);
    } catch (err) {
      console.error("Error saving Stripe key:", err);
      alert("Error saving Stripe key: " + err.message);
    }
  }

  function handleProductFilterChange(e) {
    const product = e.target.value;
    setSelectedProduct(product);
    if (product === "") {
      setFilteredSubscribers(allSubscribers);
    } else {
      const filtered = allSubscribers.filter(
        (sub) => sub.product_name === product
      );
      setFilteredSubscribers(filtered);
    }
  }

  function copyEmailAddresses() {
    const emails = filteredSubscribers.map((sub) => sub.email).join(", ");
    navigator.clipboard.writeText(emails);
    alert("Email addresses copied to clipboard!");
  }

  function handleLogout() {
    signOut(auth).catch((err) => {
      console.error("Error logging out:", err);
    });
  }

  const uniqueProducts = [...new Set(allSubscribers.map((sub) => sub.product_name))];

  if (!user) {
    return <Login onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="flex justify-between items-center mb-4">
        <div className="text-gray-700">
          Logged in as: <strong>{user.email}</strong>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
        >
          Logout
        </button>
      </div>

      <h1 className="text-2xl font-bold text-center mb-4">
        Current Stripe Subscribers
      </h1>

      <div className="mb-6 text-center">
        <label className="block mb-2">Enter your Stripe Key:</label>
        <input
          type="text"
          value={stripeKeyInput}
          onChange={(e) => setStripeKeyInput(e.target.value)}
          className="border px-2 py-1 rounded w-80"
        />
        <button
          onClick={handleSaveStripeKey}
          className="bg-green-600 text-white px-3 py-1 rounded ml-2"
        >
          Save
        </button>
      </div>

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

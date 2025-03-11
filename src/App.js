import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import { onAuthStateChanged, getIdToken, signOut } from "firebase/auth";
import { auth } from "./firebase";

function App() {
  const [user, setUser] = useState(null);
  const [allEvents, setAllEvents] = useState([]);
  const [allSubscribers, setAllSubscribers] = useState([]);
  const [filteredSubscribers, setFilteredSubscribers] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [stripeKeyInput, setStripeKeyInput] = useState("");
  const [savedStripeKey, setSavedStripeKey] = useState("");
  const [savedUserID, setSavedUserID] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        console.log("User logged in:", currentUser.email);
        fetchEvents(currentUser);
        fetchSubscribers(currentUser);
        fetchUserInfo(currentUser);
      } else {
        console.log("User logged out");
        setUser(null);
        setAllEvents([]);
        setAllSubscribers([]);
        setFilteredSubscribers([]);
        setSavedStripeKey("");
        setSavedUserID("");
      }
    });
    return () => unsubscribe();
  }, []);

  async function fetchUserInfo(currentUser) {
    try {
      const token = await getIdToken(currentUser, false);
      const response = await fetch("/get-user", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      console.log("Fetched user info:", data);
      setSavedStripeKey(data.stripeKey || "");
      setSavedUserID(data.userID || "");
    } catch (error) {
      console.error("Error fetching user info:", error);
    }
  }

  async function fetchEvents(currentUser) {
    if (!currentUser) return;
    try {
      setLoadingEvents(true);
      const token = await getIdToken(currentUser, false);
      const response = await fetch("/get-events", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch events. Status: ${response.status}`);
      }
      const data = await response.json();
      console.log("Fetched events:", data.events);
      setAllEvents(data.events);
      setLoadingEvents(false);
    } catch (error) {
      console.error("Error fetching events:", error);
      setLoadingEvents(false);
    }
  }

  async function fetchSubscribers(currentUser) {
    if (!currentUser) return;
    try {
      setLoadingSubs(true);
      const token = await getIdToken(currentUser, false);
      const response = await fetch("/get-subscribers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch subscribers. Status: ${response.status}`);
      }
      const data = await response.json();
      console.log("Fetched subscribers:", data.subscribers);
      setAllSubscribers(data.subscribers);
      setFilteredSubscribers(data.subscribers);
      setLoadingSubs(false);
    } catch (error) {
      console.error("Error fetching subscribers:", error);
      setLoadingSubs(false);
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
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stripeKey: stripeKeyInput }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save Stripe key");
      }
      console.log("Stripe Key saved successfully:", stripeKeyInput);
      alert("Stripe Key saved successfully!");
      setStripeKeyInput("");
      fetchSubscribers(user);
      fetchUserInfo(user);
    } catch (err) {
      console.error("Error saving Stripe key:", err);
      alert("Error saving Stripe key: " + err.message);
    }
  }

  // New: Handle the Stripe Connect OAuth flow.
  function handleConnectStripe() {
    const userEmail = user.email;
    const clientId = process.env.REACT_APP_STRIPE_CONNECT_CLIENT_ID;
    const redirectUri = process.env.REACT_APP_STRIPE_CONNECT_REDIRECT_URI;
    const stripeConnectUrl = `https://connect.stripe.com/oauth/v2/authorize?response_type=code&client_id=${clientId}&scope=read_write&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(userEmail)}`;
    console.log("Redirecting to Stripe Connect URL:", stripeConnectUrl);
    window.location.href = stripeConnectUrl;
  }

  function handleProductFilterChange(e) {
    const product = e.target.value;
    setSelectedProduct(product);
    if (product === "") {
      setFilteredSubscribers(allSubscribers);
    } else {
      const filtered = allSubscribers.filter((sub) => sub.product_name === product);
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

  if (!user) {
    return <Login onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      {/* Top bar */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-gray-700">
          Logged in as: <strong>{user.email}</strong>
        </div>
        <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">
          Logout
        </button>
      </div>

      {/* EVENTS TABLE */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-2">Events</h2>
        {loadingEvents && <div className="text-gray-600 mb-2">Loading events...</div>}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="border p-2">Record ID</th>
                <th className="border p-2">Event ID</th>
                <th className="border p-2">User ID</th>
                <th className="border p-2">Start Date</th>
                <th className="border p-2">Cadence</th>
              </tr>
            </thead>
            <tbody>
              {allEvents.map((evt) => (
                <tr key={evt.id}>
                  <td className="border p-2">{evt.id}</td>
                  <td className="border p-2">{evt.EventID}</td>
                  <td className="border p-2">{evt.UserID}</td>
                  <td className="border p-2">{evt.StartDate}</td>
                  <td className="border p-2">{evt.Cadence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* STRIPE KEY & Connect Section */}
      <div className="mb-6 text-center">
        <label className="block mb-2">Enter your Stripe Key (manual entry):</label>
        <input
          type="text"
          value={stripeKeyInput}
          onChange={(e) => setStripeKeyInput(e.target.value)}
          className="border px-2 py-1 rounded w-80"
        />
        <button onClick={handleSaveStripeKey} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded ml-2">
          Save
        </button>
        <div className="mt-2">
          {savedStripeKey ? <span>Saved Stripe Key: {savedStripeKey}</span> : <span>No Stripe key saved</span>}
        </div>
        <div className="mt-2">
          {savedUserID ? <span>Airtable UserID: {savedUserID}</span> : <span>No Airtable UserID found</span>}
        </div>
        {/* Connect Stripe Account Button */}
        <div className="mt-6">
          <button onClick={handleConnectStripe} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded">
            Connect Stripe Account
          </button>
        </div>
      </div>

      {/* SUBSCRIBERS TABLE */}
      <h2 className="text-xl font-bold text-center mb-4">Current Stripe Subscribers</h2>
      <div className="mb-4 text-center">
        <select value={selectedProduct} onChange={handleProductFilterChange} className="border px-2 py-1 rounded">
          <option value="">All Products</option>
          {[...new Set(allSubscribers.map((sub) => sub.product_name))].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <span className="text-gray-700">Records retrieved: {filteredSubscribers.length}</span>
        <button onClick={copyEmailAddresses} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded">
          Copy Email Addresses
        </button>
      </div>
      {loadingSubs && <div className="text-center text-gray-600 mb-4">Loading subscribers...</div>}
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

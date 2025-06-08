import { useState } from "react";

export default function App() {
  const [amount, setAmount] = useState(0);
  const exchangeRate = 87.5;
  const feePercent = 5;

  const calculatePayout = (usd) => {
    const fee = usd * (feePercent / 100);
    return (usd - fee) * exchangeRate;
  };

  return (
    <main
      className="min-h-screen bg-cover bg-center p-6 text-white"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1581091012184-7b1067d9e8f2')"
      }}
    >
      <div className="max-w-4xl mx-auto space-y-8">
        <div style={{ backgroundColor: "rgba(0,0,0,0.7)", padding: "1.5rem", borderRadius: "1rem" }}>
          <h1 className="text-3xl font-bold mb-4">Welcome to Mula Wave</h1>
          <p>
            Fast, secure, and affordable money transfer service from Zimbabwe to India
            for students. No more banking charges, daily limits, or delays.
          </p>
        </div>

        <div style={{ backgroundColor: "rgba(0,0,0,0.7)", padding: "1.5rem", borderRadius: "1rem" }}>
          <h2 className="text-2xl font-semibold">Send Money</h2>
          <input
            type="number"
            placeholder="Enter amount in USD"
            onChange={(e) => setAmount(parseFloat(e.target.value))}
            style={{ padding: "0.5rem", color: "black", marginBottom: "1rem", width: "100%" }}
          />
          <p className="text-lg">
            You will receive: <strong>{calculatePayout(amount).toFixed(2)} INR</strong>
          </p>
          <button style={{ padding: "0.5rem 1rem", backgroundColor: "#10b981", color: "white", border: "none", borderRadius: "0.5rem" }}>
            Generate Order
          </button>
        </div>

        <div style={{ backgroundColor: "rgba(0,0,0,0.7)", padding: "1.5rem", borderRadius: "1rem" }}>
          <h2 className="text-2xl font-semibold">Our Mission</h2>
          <p>
            We are bridging the financial gap and peeling off the transaction burden,
            connecting global minds all in one wave.
          </p>
        </div>

        <div style={{ backgroundColor: "rgba(0,0,0,0.7)", padding: "1.5rem", borderRadius: "1rem" }}>
          <h2 className="text-2xl font-semibold mb-4">Features</h2>
          <ul style={{ listStyle: "disc", paddingLeft: "1.5rem" }}>
            <li>5% transaction fee at ₹87.5/USD</li>
            <li>No banking charges or daily limits</li>
            <li>Simple registration with passport, email, phone & selfie</li>
            <li>Order tracking with reference number</li>
            <li>Receive money in bank or wallet</li>
            <li>Transaction history</li>
            <li>Real-time customer support</li>
            <li>Admin dashboard for managing orders and users</li>
            <li>On-ground centers in Zimbabwe & India</li>
            <li>Mobile app coming soon</li>
          </ul>
        </div>
      </div>
    </main>
  );
}

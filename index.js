const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// Cache for FX rates
let fxRates = {
  UGX: 0.0,
  TZS: 0.0,
  NGN: 0.0
};

// Function to fetch live FX rate from ExchangeRate.host
async function fetchFX(from, to = "KES") {
  try {
    const res = await fetch(`https://api.exchangerate.host/convert?from=${from}&to=${to}`);
    const data = await res.json();
    if (data.success) {
      return data.result;
    }
  } catch (err) {
    console.error(`FX fetch error (${from} → ${to}):`, err);
  }
  return null;
}

// Update all FX rates
async function updateFXRates() {
  console.log("Fetching live FX rates...");
  const ugx = await fetchFX("UGX");
  const tzs = await fetchFX("TZS");
  const ngn = await fetchFX("NGN");

  if (ugx) fxRates.UGX = ugx;
  if (tzs) fxRates.TZS = tzs;
  if (ngn) fxRates.NGN = ngn;

  console.log("Updated FX Rates:", fxRates);
}

// Initial fetch
updateFXRates();

// Refresh every 1 hour
setInterval(updateFXRates, 60 * 60 * 1000);

// Conversion function
function toKES(fiat, price) {
  if (!price || price <= 0) return null;
  if (fiat === "KES") return price;
  if (fiat === "UGX") return price * fxRates.UGX;
  if (fiat === "TZS") return price * fxRates.TZS;
  if (fiat === "NGN") return price * fxRates.NGN;
  return null;
}

// Example route
app.get("/test", (req, res) => {
  res.json({
    UGXtoKES: toKES("UGX", 10000),
    TZStoKES: toKES("TZS", 10000),
    NGNtoKES: toKES("NGN", 10000)
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

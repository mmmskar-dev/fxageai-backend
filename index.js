const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

/* =========================
   FX RATE CACHE (KES BASE)
========================= */
let fxRates = {
  UGX: null,
  TZS: null,
  NGN: null,
  updatedAt: null
};

async function fetchFX(from) {
  try {
    const res = await fetch(
      `https://api.exchangerate.host/convert?from=${from}&to=KES`
    );
    const data = await res.json();
    if (data && data.result) return data.result;
  } catch (err) {
    console.error(`FX error ${from}:`, err.message);
  }
  return null;
}

async function updateFXRates() {
  console.log("🔄 Updating FX rates...");
  const [ugx, tzs, ngn] = await Promise.all([
    fetchFX("UGX"),
    fetchFX("TZS"),
    fetchFX("NGN")
  ]);

  if (ugx) fxRates.UGX = ugx;
  if (tzs) fxRates.TZS = tzs;
  if (ngn) fxRates.NGN = ngn;

  fxRates.updatedAt = new Date().toISOString();
  console.log("✅ FX Updated:", fxRates);
}

// Initial + hourly refresh
updateFXRates();
setInterval(updateFXRates, 60 * 60 * 1000);

/* =========================
   HELPERS
========================= */
function toKES(fiat, price) {
  if (!price || price <= 0) return null;
  if (fiat === "KES") return price;
  if (fxRates[fiat]) return price * fxRates[fiat];
  return null;
}

function calcSpread(buyKES, sellKES) {
  if (!buyKES || !sellKES) return null;
  const spread = sellKES - buyKES;
  return spread > 0 ? Number(spread.toFixed(2)) : null;
}

function profitOnCapital(spread, capital = 10000, buyKES) {
  if (!spread || !buyKES) return null;
  const usdt = capital / buyKES;
  return Number((usdt * spread).toFixed(2));
}

/* =========================
   P2P FETCHERS
========================= */
async function fetchBinance(fiat, tradeType) {
  const res = await fetch("https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fiat,
      tradeType,
      asset: "USDT",
      payTypes: [],
      page: 1,
      rows: 5
    })
  });
  const json = await res.json();
  return json?.data || [];
}

/* =========================
   ARBITRAGE ENGINE
========================= */
app.get("/opportunities", async (req, res) => {
  try {
    const fiats = ["KES", "UGX", "TZS", "NGN"];
    let prices = [];

    for (const fiat of fiats) {
      const sells = await fetchBinance(fiat, "SELL"); // you BUY from sellers
      const buys  = await fetchBinance(fiat, "BUY");  // you SELL to buyers

      if (!sells.length || !buys.length) continue;

      const lowestSell = Math.min(...sells.map(a => Number(a.adv.price)));
      const highestBuy = Math.max(...buys.map(a => Number(a.adv.price)));

      const buyKES  = toKES(fiat, lowestSell);
      const sellKES = toKES(fiat, highestBuy);

      const spread = calcSpread(buyKES, sellKES);
      if (!spread) continue;

      prices.push({
        route: `Binance USDT/${fiat}`,
        buyKES: Number(buyKES.toFixed(2)),
        sellKES: Number(sellKES.toFixed(2)),
        spreadKES: spread,
        profitKES: profitOnCapital(spread, 10000, buyKES)
      });
    }

    prices.sort((a, b) => b.spreadKES - a.spreadKES);
    res.json({
      fxUpdatedAt: fxRates.updatedAt,
      capitalKES: 10000,
      opportunities: prices.slice(0, 10)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Arbitrage engine error" });
  }
});

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.json({
    status: "FXageAI backend running",
    fxRates
  });
});

app.listen(PORT, () =>
  console.log(`🚀 FXageAI backend running on port ${PORT}`)
);

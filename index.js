const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 10000;

/* =========================
   FX CACHE (MID-MARKET)
========================= */

let fxRates = {
  UGX: null,
  TZS: null,
  updated: null,
};

async function updateFXRates() {
  try {
    const res = await fetch(
      "https://api.exchangerate.host/latest?base=KES&symbols=UGX,TZS"
    );
    const data = await res.json();

    fxRates.UGX = data.rates.UGX;
    fxRates.TZS = data.rates.TZS;
    fxRates.updated = new Date().toISOString();

    console.log("FX updated:", fxRates);
  } catch (err) {
    console.error("FX update failed:", err.message);
  }
}

// update FX on boot + every hour
updateFXRates();
setInterval(updateFXRates, 60 * 60 * 1000);

/* =========================
   HELPERS (A)
========================= */

function impliedFX(sellFiatPrice, buyKES) {
  if (!sellFiatPrice || !buyKES) return null;
  return Number((sellFiatPrice / buyKES).toFixed(2));
}

function deviation(implied, market) {
  if (!implied || !market) return null;
  return Number((((implied - market) / market) * 100).toFixed(2));
}

function classify(dev) {
  if (dev >= 2.5) return "EXECUTABLE";
  if (dev >= 1.0) return "WATCH";
  return "SKIP";
}

function profitKES(capital, dev) {
  if (!dev) return 0;
  return Math.round((capital * dev) / 100);
}

/* =========================
   BINANCE P2P FETCH
========================= */

async function fetchBinanceBest(asset, fiat, tradeType) {
  try {
    const res = await fetch(
      "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset,
          fiat,
          tradeType,
          page: 1,
          rows: 1,
        }),
      }
    );

    const data = await res.json();
    return Number(data.data[0].adv.price);
  } catch {
    return null;
  }
}

/* =========================
   RETAIL CORRIDOR ENGINE (B)
========================= */

app.get("/opportunities", async (req, res) => {
  try {
    if (!fxRates.UGX || !fxRates.TZS) {
      return res.json({ message: "FX not ready yet" });
    }

    // Binance P2P prices
    const buyKES = await fetchBinanceBest("USDT", "KES", "BUY");
    const sellUGX = await fetchBinanceBest("USDT", "UGX", "SELL");
    const sellTZS = await fetchBinanceBest("USDT", "TZS", "SELL");

    const opportunities = [];

    /* ---- KES → UGX ---- */
    const impliedUGX = impliedFX(sellUGX, buyKES);
    const devUGX = deviation(impliedUGX, fxRates.UGX);

    opportunities.push({
      route: "KES → USDT → UGX",
      buyKES,
      sellFiat: sellUGX,
      marketFX: fxRates.UGX,
      impliedFX: impliedUGX,
      deviation: devUGX,
      profitKES: profitKES(10000, devUGX),
      status: classify(devUGX),
    });

    /* ---- KES → TZS ---- */
    const impliedTZS = impliedFX(sellTZS, buyKES);
    const devTZS = deviation(impliedTZS, fxRates.TZS);

    opportunities.push({
      route: "KES → USDT → TZS",
      buyKES,
      sellFiat: sellTZS,
      marketFX: fxRates.TZS,
      impliedFX: impliedTZS,
      deviation: devTZS,
      profitKES: profitKES(10000, devTZS),
      status: classify(devTZS),
    });

    /* ---- UGX ↔ TZS corridor ---- */
    const ugxToKes = 1 / fxRates.UGX;
    const impliedUGX_TZS = sellTZS * ugxToKes;
    const marketUGX_TZS = fxRates.TZS / fxRates.UGX;
    const devUGX_TZS = deviation(impliedUGX_TZS, marketUGX_TZS);

    opportunities.push({
      route: "UGX ↔ TZS (corridor)",
      impliedFX: impliedUGX_TZS.toFixed(2),
      marketFX: marketUGX_TZS.toFixed(2),
      deviation: devUGX_TZS,
      profitKES: profitKES(10000, devUGX_TZS),
      status: classify(devUGX_TZS),
    });

    res.json({
      updated: fxRates.updated,
      capitalKES: 10000,
      opportunities: opportunities
        .filter((o) => o.status !== "SKIP")
        .sort((a, b) => b.deviation - a.deviation),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   HEALTH CHECK
========================= */

app.get("/", (req, res) => {
  res.send("FXageAI Retail Backend running");
});

/* =========================
   SERVER START
========================= */

app.listen(PORT, () => {
  console.log(`FXageAI backend running on port ${PORT}`);
});

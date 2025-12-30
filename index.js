const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

/* --- FX NORMALIZATION --- */
function toKES(fiat, price) {
  if (!price || price <= 0) return null;

  if (fiat === "KES") return price;
  if (fiat === "UGX") return price * 0.036;
  if (fiat === "TZS") return price * 0.056;
  if (fiat === "NGN") return price * 0.082;

  return null;
}

/* --- BINANCE --- */
async function binanceP2P(fiat) {
  try {
    const res = await fetch(
      "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          asset: "USDT",
          fiat,
          tradeType: "BUY",
          page: 1,
          rows: 5
        })
      }
    );

    const json = await res.json();
    return json.data.map(ad => ({
      exchange: "Binance",
      fiat,
      price: Number(ad.adv.price)
    }));
  } catch {
    return [];
  }
}

/* --- OKX --- */
async function okxP2P(fiat) {
  try {
    const res = await fetch(
      "https://www.okx.com/priapi/v1/c2c/marketAds/list",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          side: "buy",
          quoteCurrency: fiat,
          baseCurrency: "USDT",
          sortType: "price_asc",
          page: 1,
          rows: 5
        })
      }
    );

    const json = await res.json();
    if (!json.data || !json.data.sell) return [];

    return json.data.sell.map(ad => ({
      exchange: "OKX",
      fiat,
      price: Number(ad.price)
    }));
  } catch {
    return [];
  }
}

/* --- ARBITRAGE ENGINE --- */
app.get("/opportunities", async (req, res) => {
  const fiats = ["KES", "UGX", "TZS", "NGN"];
  let rows = [];

  for (const fiat of fiats) {
    rows.push(...await binanceP2P(fiat));
    rows.push(...await okxP2P(fiat));
  }

  const normalized = rows
    .map(r => {
      const ksh = toKES(r.fiat, r.price);
      return ksh
        ? { ...r, ksh: Number(ksh.toFixed(2)) }
        : null;
    })
    .filter(r => r && r.ksh > 50 && r.ksh < 300);

  if (normalized.length < 2) {
    return res.json({ error: "Not enough data" });
  }

  normalized.sort((a, b) => a.ksh - b.ksh);

  const capital = 10000;
  const routes = [];

  for (let i = 0; i < normalized.length - 1; i++) {
    for (let j = normalized.length - 1; j > i; j--) {
      const buy = normalized[i];
      const sell = normalized[j];
      const spread = sell.ksh - buy.ksh;
      if (spread <= 0) continue;

      const usdt = capital / buy.ksh;
      const profit = usdt * spread;

      routes.push({
        buy,
        sell,
        spreadKES: Number(spread.toFixed(2)),
        profitKES: Number(profit.toFixed(2))
      });
    }
  }

  routes.sort((a, b) => b.profitKES - a.profitKES);

  res.json(routes.slice(0, 2));
});

app.listen(PORT, () =>
  console.log("FXageAI backend running on port", PORT)
);

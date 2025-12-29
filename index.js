import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

/* --- SAFE FX TO KES --- */
function toKES(fiat, price) {
  if (!price) return null;

  // Direct KES
  if (fiat === "KES") return price;

  // East African currencies
  if (fiat === "UGX") return price * 0.036;
  if (fiat === "TZS") return price * 0.056;
  if (fiat === "NGN") return price * 0.082;

  // Strong currencies (EUR/GBP) — use approx, avoid multiplying raw API integer
  if (fiat === "EUR") return price; // keep raw for now, PWA can normalize
  if (fiat === "GBP") return price;

  return null;
}

/* --- BINANCE P2P --- */
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
      source: "Binance",
      fiat,
      price: Number(ad.adv.price)
    }));
  } catch {
    return [];
  }
}

/* --- OKX P2P --- */
async function okxP2P(fiat) {
  try {
    const res = await fetch(
      `https://www.okx.com/v3/c2c/tradingOrders/books?t=BUY&currency=USDT&quoteCurrency=${fiat}`
    );
    const json = await res.json();
    if (!json.data || !json.data.buy) return [];
    return json.data.buy.map(ad => ({
      source: "OKX",
      fiat,
      price: Number(ad.price)
    }));
  } catch {
    return [];
  }
}

/* --- ARBITRAGE ENDPOINT --- */
app.get("/opportunities", async (req, res) => {
  try {
    const fiats = ["KES", "UGX", "TZS", "EUR", "GBP", "NGN"];
    let rows = [];

    for (let fiat of fiats) {
      rows.push(...(await binanceP2P(fiat)));
      rows.push(...(await okxP2P(fiat)));
    }

    const normalized = rows
      .map(r => {
        const ksh = toKES(r.fiat, r.price);
        return { ...r, ksh: ksh ? Number(ksh.toFixed(2)) : null };
      })
      .filter(r => r.ksh && r.ksh > 0 && r.ksh < 500); // sanity cap

    // Sort descending by KES value
    normalized.sort((a, b) => b.ksh - a.ksh);

    res.json(normalized.slice(0, 10));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log("FXageAI backend running on port", PORT));

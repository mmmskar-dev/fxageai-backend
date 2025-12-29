import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

/* --- SAFE FX TO KES --- */
function toKES(fiat, price) {
  if (!price) return null;

  // KES direct
  if (fiat === "KES") return price;

  // East African currencies
  if (fiat === "UGX") return price * 0.036;
  if (fiat === "TZS") return price * 0.056;
  if (fiat === "NGN") return price * 0.082;

  // Strong currencies
  if (fiat === "EUR") return price * 170; // approx 1 EUR = 170 KES
  if (fiat === "GBP") return price * 198; // approx 1 GBP = 198 KES

  return null;
}

/* --- BINANCE P2P --- */
async function binanceP2P(fiat) {
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
}

/* --- OKX P2P --- */
async function okxP2P(fiat) {
  const res = await fetch(
    `https://www.okx.com/v3/c2c/tradingOrders/books?t=BUY&currency=USDT&quoteCurrency=${fiat}`
  );
  const json = await res.json();
  return json.data.buy.map(ad => ({
    source: "OKX",
    fiat,
    price: Number(ad.price)
  }));
}

/* --- ARBITRAGE ENDPOINT --- */
app.get("/opportunities", async (req, res) => {
  try {
    const fiats = ["KES", "UGX", "TZS", "EUR", "GBP", "NGN"];
    let rows = [];

    for (let fiat of fiats) {
      rows.push(...(await binanceP2P(fiat).catch(() => [])));
      rows.push(...(await okxP2P(fiat).catch(() => [])));
    }

    const normalized = rows
      .map(r => {
        const ksh = toKES(r.fiat, r.price);
        return { ...r, ksh: ksh ? Number(ksh.toFixed(2)) : null };
      })
      // Remove nulls and absurd values
      .filter(r => r.ksh && r.ksh > 0 && r.ksh < 500);

    // Sort descending for highest KES first
    normalized.sort((a, b) => b.ksh - a.ksh);

    // Return top 10
    res.json(normalized.slice(0, 10));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log("FXageAI backend running on port", PORT));

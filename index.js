import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

const FX = {
  UGX: 0.036,
  TZS: 0.056,
  NGN: 0.082,
  EUR: 170,
  GBP: 198
};

async function binanceP2P(fiat) {
  const res = await fetch("https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      asset: "USDT",
      fiat,
      tradeType: "BUY",
      page: 1,
      rows: 5
    })
  });
  const json = await res.json();
  return json.data.map(ad => ({
    source: "Binance",
    fiat,
    price: Number(ad.adv.price)
  }));
}

async function okxP2P(fiat) {
  const res = await fetch(`https://www.okx.com/v3/c2c/tradingOrders/books?t=BUY&currency=USDT&quoteCurrency=${fiat}`);
  const json = await res.json();
  return json.data.buy.map(ad => ({
    source: "OKX",
    fiat,
    price: Number(ad.price)
  }));
}

app.get("/opportunities", async (req, res) => {
  try {
    const fiats = ["KES", "UGX", "TZS", "EUR", "GBP", "NGN"];
    let rows = [];

    for (let fiat of fiats) {
      rows.push(...await binanceP2P(fiat).catch(() => []));
      rows.push(...await okxP2P(fiat).catch(() => []));
    }

    const normalized = rows.map(r => {
      const ksh = r.fiat === "KES"
        ? r.price
        : r.price * (FX[r.fiat] || 1);

      return { ...r, ksh: Number(ksh.toFixed(2)) };
    });

    normalized.sort((a, b) => b.ksh - a.ksh);
    res.json(normalized.slice(0, 10));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log("FXageAI backend running"));

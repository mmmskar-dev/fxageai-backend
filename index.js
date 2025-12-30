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

  // SORT ASCENDING BY BUY PRICE
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

  res.json(routes.slice(0, 2)); // TOP 2 ROUTES
});

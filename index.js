<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FXageAI – P2P Arbitrage Monitor</title>

  <style>
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background: #0b1320;
      color: #eaf0ff;
    }

    header {
      padding: 12px;
      background: #020617;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    h1 {
      font-size: 18px;
      color: #0fb9b1;
    }

    .fx {
      font-size: 13px;
      background: #111827;
      padding: 6px 10px;
      border-radius: 8px;
    }

    main {
      padding: 12px;
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .box {
      background: #111a2b;
      border-radius: 14px;
      padding: 10px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-bottom: 10px;
    }

    th, td {
      padding: 6px;
      text-align: center;
    }

    /* Flag color headers */
    .kes th { background: linear-gradient(90deg, black, red, green); }
    .ugx th { background: linear-gradient(90deg, black, yellow, red); }
    .tzs th { background: linear-gradient(90deg, green, yellow, blue); }

    .advice {
      background: #111a2b;
      border-radius: 14px;
      padding: 12px;
      margin-top: 14px;
    }

    input, button {
      padding: 8px;
      border-radius: 8px;
      border: none;
      margin-top: 6px;
    }

    button {
      background: #0fb9b1;
      font-weight: bold;
    }
  </style>
</head>

<body>

<header>
  <h1>FXageAI – Live P2P Arbitrage</h1>
  <div class="fx">Mid FX: 1 USD = 145.20 KES</div>
</header>

<main>

  <div class="grid">

    <!-- BINANCE -->
    <div class="box">
      <h3>Binance P2P</h3>

      <table>
        <thead class="kes">
          <tr><th colspan="2">KES (KES)</th></tr>
          <tr><th>Buy</th><th>Sell</th></tr>
        </thead>
        <tbody id="b-kes"></tbody>
      </table>

      <table>
        <thead class="ugx">
          <tr><th colspan="2">UGX → KES</th></tr>
          <tr><th>Buy</th><th>Sell</th></tr>
        </thead>
        <tbody id="b-ugx"></tbody>
      </table>

      <table>
        <thead class="tzs">
          <tr><th colspan="2">TZS → KES</th></tr>
          <tr><th>Buy</th><th>Sell</th></tr>
        </thead>
        <tbody id="b-tzs"></tbody>
      </table>
    </div>

    <!-- OKX -->
    <div class="box">
      <h3>OKX P2P</h3>

      <table>
        <thead class="kes">
          <tr><th colspan="2">KES (KES)</th></tr>
          <tr><th>Buy</th><th>Sell</th></tr>
        </thead>
        <tbody id="o-kes"></tbody>
      </table>

      <table>
        <thead class="ugx">
          <tr><th colspan="2">UGX → KES</th></tr>
          <tr><th>Buy</th><th>Sell</th></tr>
        </thead>
        <tbody id="o-ugx"></tbody>
      </table>

      <table>
        <thead class="tzs">
          <tr><th colspan="2">TZS → KES</th></tr>
          <tr><th>Buy</th><th>Sell</th></tr>
        </thead>
        <tbody id="o-tzs"></tbody>
      </table>
    </div>

  </div>

  <div class="advice">
    <h3>Advisory & Profit (KES)</h3>
    <label>Capital (KES)</label><br>
    <input id="capital" value="100000"><br>
    <button onclick="calc()">Compute Profit</button>
    <p id="out"></p>
  </div>

</main>

<script>
  const FX = {
    UGX: 0.038,
    TZS: 0.058
  };

  function rows(buy, sell, rate = 1) {
    let r = '';
    for (let i = 0; i < 10; i++) {
      r += `<tr>
        <td>${((buy+i)*rate).toFixed(2)} KES</td>
        <td>${((sell+i)*rate).toFixed(2)} KES</td>
      </tr>`;
    }
    return r;
  }

  document.getElementById('b-kes').innerHTML = rows(146,145);
  document.getElementById('b-ugx').innerHTML = rows(3800,3750,FX.UGX);
  document.getElementById('b-tzs').innerHTML = rows(2550,2500,FX.TZS);

  document.getElementById('o-kes').innerHTML = rows(147,146);
  document.getElementById('o-ugx').innerHTML = rows(3850,3780,FX.UGX);
  document.getElementById('o-tzs').innerHTML = rows(2600,2520,FX.TZS);

  function calc(){
    const cap = Number(document.getElementById('capital').value);
    const usdt = cap / 146;
    const back = usdt * 3850 * FX.UGX;
    document.getElementById('out').innerText =
      `Final: ${back.toFixed(0)} KES | Profit: ${(back-cap).toFixed(0)} KES`;
  }
</script>

</body>
</html>

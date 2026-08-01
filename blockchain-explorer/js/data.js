// js/data.js — generates 1,050 blockchain transaction records
(function() {
  function rndHex(len) {
    let s = '';
    const c = '0123456789abcdef';
    for (let i = 0; i < len; i++) s += c[Math.floor(Math.random() * 16)];
    return s;
  }
  function rndAddr() { return '0x' + rndHex(40); }
  function rndFloat(lo, hi, dec) { return parseFloat((Math.random() * (hi - lo) + lo).toFixed(dec)); }
  function seededRand(seed) {
    let s = seed;
    return function() { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
  }

  const rand     = seededRand(42);
  const TOKENS   = ['ETH','USDT','USDC','BNB','MATIC','DAI','LINK','UNI','AAVE','SHIB','WBTC','SOL'];
  const METHODS  = ['transfer','swap','approve','stake','unstake','mint','burn','bridgeOut','flashLoan','addLiquidity'];
  const STATUSES = ['confirmed','confirmed','confirmed','confirmed','confirmed','pending','failed'];
  const NETWORKS = ['Ethereum','Polygon','BSC','Arbitrum','Optimism'];

  function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
  function rnd(lo, hi) { return rand() * (hi - lo) + lo; }

  const baseMs = new Date('2024-01-01T00:00:00Z').getTime();
  const txs = [];

  for (let i = 0; i < 1050; i++) {
    const ts      = new Date(baseMs + Math.floor(rnd(0, 525600)) * 60000);
    const token   = pick(TOKENS);
    const value   = parseFloat(rnd(0.0001, 500).toFixed(6));
    const gasP    = parseFloat(rnd(5, 120).toFixed(2));
    const gasU    = Math.floor(rnd(21000, 350000));
    const status  = pick(STATUSES);
    const usdMul  = (token === 'ETH' || token === 'WBTC') ? rnd(1000, 45000) : rnd(0.9, 1.1);
    txs.push({
      id:            i + 1,
      hash:          '0x' + rndHex(64),
      blockNumber:   19000000 + Math.floor(rnd(0, 200000)),
      timestamp:     ts.toISOString().replace('.000Z','Z'),
      from:          rndAddr(),
      to:            rndAddr(),
      value,
      token,
      valueUSD:      parseFloat((value * usdMul).toFixed(2)),
      gasPrice:      gasP,
      gasUsed:       gasU,
      gasFeeETH:     parseFloat(((gasP * gasU) / 1e9).toFixed(6)),
      status,
      network:       pick(NETWORKS),
      method:        pick(METHODS),
      nonce:         Math.floor(rnd(0, 5000)),
      confirmations: status === 'confirmed' ? Math.floor(rnd(1, 50000)) : 0
    });
  }

  txs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  txs.forEach((t, i) => { t.id = i + 1; });

  window.TX_DATA = txs;
})();
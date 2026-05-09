'use client';

import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

const ZONE_ESTIMATES: Record<string, number> = {
  '2': 18,
  '3': 21,
  '4': 25,
  '5': 30,
  '6': 36,
  '7': 42,
  '8': 50,
};

const GOOGLE_FORM_ID = '1FAIpQLSdbT6PvKW2Gin5SPKaFKIQ9tqktLPEUGs6f3NW1j7SrBUcsbQ';
const FIELD_NAME = 'entry.580416978';
const FIELD_BUSINESS = 'entry.1903935303';
const FIELD_EMAIL = 'entry.767732606';

export default function Home() {
  const [bottlePrice, setBottlePrice] = useState(35);
  const [cogs, setCogs] = useState(9);
  const [bottles, setBottles] = useState(3);
  const [platformFee, setPlatformFee] = useState(3.5);
  const [discount, setDiscount] = useState(0);
  const [packCost, setPackCost] = useState(5);
  const [monthlyOrders, setMonthlyOrders] = useState(50);
  const [compareFlatRate, setCompareFlatRate] = useState(15);
  const [shippingMode, setShippingMode] = useState<'exact' | 'zone' | 'flat'>('zone');

  const [exactShipCost, setExactShipCost] = useState(35);
  const [exactShipCharge, setExactShipCharge] = useState(0);
  const [zone, setZone] = useState('5');
  const [zoneShipCharge, setZoneShipCharge] = useState(0);
  const [flatShipCost, setFlatShipCost] = useState(35);
  const [flatShipCharge, setFlatShipCharge] = useState(15);

  const [name, setName] = useState('');
  const [business, setBusiness] = useState('');
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  const { shippingCost, customerCharge } = useMemo(() => {
    if (shippingMode === 'exact') {
      return { shippingCost: exactShipCost, customerCharge: exactShipCharge };
    }
    if (shippingMode === 'zone') {
      return { shippingCost: ZONE_ESTIMATES[zone] || 25, customerCharge: zoneShipCharge };
    }
    return { shippingCost: flatShipCost, customerCharge: flatShipCharge };
  }, [shippingMode, exactShipCost, exactShipCharge, zone, zoneShipCharge, flatShipCost, flatShipCharge]);

  // Wine and shipping tracked separately for clarity
  const calc = (b: number) => {
    const grossRevenue = b * bottlePrice;
    const discountAmt = grossRevenue * (discount / 100);
    const wineRevenue = grossRevenue - discountAmt;
    const cogsTotal = b * cogs;
    const fee = wineRevenue * (platformFee / 100);
    const wineCost = cogsTotal + fee + packCost;
    const wineProfit = wineRevenue - wineCost;
    const shippingGap = shippingCost - customerCharge;
    const netProfit = wineProfit - shippingGap;

    return {
      wineRevenue,
      wineCost,
      wineProfit,
      shippingCost,
      customerCharge,
      shippingGap,
      profit: netProfit,
    };
  };

  const current = calc(bottles);

  const annualWineRevenue = current.wineRevenue * monthlyOrders * 12;
  const annualProfit = current.profit * monthlyOrders * 12;
  const annualShippingGap = current.shippingGap * monthlyOrders * 12;

  // Scenario comparison — wine math is identical, only shipping recovery changes
  const scenarioCalc = (customerChargeOverride: number) => {
    const grossRevenue = bottles * bottlePrice;
    const discountAmt = grossRevenue * (discount / 100);
    const wineRevenue = grossRevenue - discountAmt;
    const cogsTotal = bottles * cogs;
    const fee = wineRevenue * (platformFee / 100);
    const wineProfit = wineRevenue - cogsTotal - fee - packCost;
    const shippingGap = shippingCost - customerChargeOverride;
    const profit = wineProfit - shippingGap;
    return {
      profit,
      annualProfit: profit * monthlyOrders * 12,
      shippingGap,
    };
  };

  const scenarios = [
    { id: 'free', label: 'Free shipping', sublabel: 'Customer pays $0', result: scenarioCalc(0) },
    { id: 'flat', label: `Flat rate $${compareFlatRate}`, sublabel: `Customer pays $${compareFlatRate}`, result: scenarioCalc(compareFlatRate) },
    { id: 'full', label: 'Customer pays full', sublabel: `Customer pays $${shippingCost.toFixed(0)}`, result: scenarioCalc(shippingCost) },
  ];

  const winnerIdx = scenarios.reduce((bestIdx, s, i, arr) => s.result.annualProfit > arr[bestIdx].result.annualProfit ? i : bestIdx, 0);

  const breakeven = useMemo(() => {
    for (let b = 1; b <= 36; b++) {
      if (calc(b).profit >= 0) return b;
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bottlePrice, cogs, platformFee, discount, packCost, shippingCost, customerCharge]);

  const curveData = useMemo(() => {
    const data = [];
    for (let b = 1; b <= 12; b++) {
      const c = calc(b);
      data.push({ bottles: b, profit: parseFloat(c.profit.toFixed(2)) });
    }
    return data;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bottlePrice, cogs, platformFee, discount, packCost, shippingCost, customerCharge]);

  const recommendations = useMemo(() => {
    const recs: string[] = [];

    if (breakeven === null) {
      recs.push('Free shipping is unprofitable at any reasonable order size. Consider raising prices, lowering COGS, or charging shipping to the customer.');
    } else if (breakeven === 1) {
      recs.push(`You're profitable from the first bottle. Strong margin headroom — consider running free shipping with no minimum as a competitive perk.`);
    } else {
      recs.push(`Set your free shipping minimum at ${breakeven} bottles. That's the lowest order size where you stay profitable.`);
      const safeMin = breakeven + 1;
      if (calc(safeMin).profit > 0) {
        recs.push(`For a safety buffer, set the threshold at ${safeMin} bottles — you'll net $${calc(safeMin).profit.toFixed(2)} per order.`);
      }
    }

    const marginPct = bottlePrice > 0 ? ((bottlePrice - cogs) / bottlePrice) * 100 : 0;
    if (marginPct < 50) {
      recs.push(`Your bottle margin is ${marginPct.toFixed(0)}%. Wineries typically need 60%+ margin to absorb shipping. Consider raising your price or sourcing.`);
    }

    if (shippingMode !== 'flat' && breakeven && breakeven > 4) {
      const suggestedFlat = Math.round(shippingCost * 0.5);
      recs.push(`Free shipping needs ${breakeven}+ bottles to pencil out. A flat rate around $${suggestedFlat} could be more profitable while still feeling like a deal to customers.`);
    }

    if (customerCharge === 0 && breakeven && breakeven > 3) {
      recs.push(`Even charging $${Math.round(shippingCost * 0.4)}–$${Math.round(shippingCost * 0.6)} for shipping would close most of your gap and feel reasonable to customers.`);
    }

    return recs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakeven, bottlePrice, cogs, shippingMode, shippingCost, customerCharge]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@') || !name.trim() || !business.trim()) return;

    setEmailStatus('sending');

    const formData = new FormData();
    formData.append(FIELD_NAME, name);
    formData.append(FIELD_BUSINESS, business);
    formData.append(FIELD_EMAIL, email);

    try {
      await fetch(
        `https://docs.google.com/forms/d/e/${GOOGLE_FORM_ID}/formResponse`,
        {
          method: 'POST',
          mode: 'no-cors',
          body: formData,
        }
      );
      setEmailStatus('sent');
      setName('');
      setBusiness('');
      setEmail('');
      setTimeout(() => setEmailStatus('idle'), 5000);
    } catch (err) {
      setEmailStatus('sent');
      setName('');
      setBusiness('');
      setEmail('');
      setTimeout(() => setEmailStatus('idle'), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-700 to-rose-900" />
            <span className="font-serif text-xl tracking-tight">Should I Free Ship?</span>
          </div>
          <a href="#calculator" className="text-sm text-stone-600 hover:text-stone-900">
            Run the numbers
          </a>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 pt-16 pb-10">
        <h1 className="font-serif text-4xl md:text-5xl tracking-tight mb-4 leading-tight">
          Smart shipping wins customers and protects your margins.
        </h1>
        <p className="text-lg text-stone-600 max-w-2xl leading-relaxed">
          Plug in your numbers to compare free shipping, flat rate, and zone-based pricing — and find the strategy that fits your wines, your margins, and your buyers.
        </p>
      </section>

      <section id="calculator" className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-white border border-stone-200 rounded-lg p-6">
            <h2 className="font-serif text-2xl mb-6">Your numbers</h2>

            <div className="space-y-5">
              <Section title="Product">
                <Input label="Unit price" prefix="$" value={bottlePrice} onChange={setBottlePrice} step={1} />
                <Input label="Cost of goods (COGS) per bottle" prefix="$" value={cogs} onChange={setCogs} step={1} />
                <Input label="Units in current order" value={bottles} onChange={setBottles} step={1} />
                <Input label="Order discount" suffix="%" value={discount} onChange={setDiscount} step={1} />
              </Section>

              <Section title="Costs">
                <Input label="Platform / payment fee" suffix="%" value={platformFee} onChange={setPlatformFee} step={0.1} />
                <Input label="Packaging & materials" prefix="$" value={packCost} onChange={setPackCost} step={0.5} />
              </Section>

              <Section title="Volume">
                <Input label="Monthly DTC orders (avg)" value={monthlyOrders} onChange={setMonthlyOrders} step={1} />
              </Section>

              <Section title="Shipping">
                <div className="flex gap-2 mb-4">
                  {(['exact', 'zone', 'flat'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setShippingMode(mode)}
                      className={`flex-1 text-xs uppercase tracking-wider py-2 px-3 rounded border transition ${
                        shippingMode === mode
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-white text-stone-600 border-stone-300 hover:border-stone-500'
                      }`}
                    >
                      {mode === 'exact' ? 'Exact $' : mode === 'zone' ? 'By zone' : 'Flat rate'}
                    </button>
                  ))}
                </div>

                {shippingMode === 'exact' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Your shipping cost" prefix="$" value={exactShipCost} onChange={setExactShipCost} step={0.5} />
                    <Input label="Charged to customer" prefix="$" value={exactShipCharge} onChange={setExactShipCharge} step={0.5} />
                  </div>
                )}

                {shippingMode === 'zone' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-stone-700 mb-1 block">UPS / FedEx zone</label>
                      <select
                        value={zone}
                        onChange={(e) => setZone(e.target.value)}
                        className="w-full px-3 py-2 border border-stone-300 rounded bg-white text-sm focus:outline-none focus:border-stone-500"
                      >
                        <option value="2">Zone 2 — adjacent state (~$18)</option>
                        <option value="3">Zone 3 — close (~$21)</option>
                        <option value="4">Zone 4 — mid-range (~$25)</option>
                        <option value="5">Zone 5 — mid-range (~$30)</option>
                        <option value="6">Zone 6 — far (~$36)</option>
                        <option value="7">Zone 7 — far (~$42)</option>
                        <option value="8">Zone 8 — cross-country (~$50)</option>
                      </select>
                    </div>
                    <Input label="Charged to customer" prefix="$" value={zoneShipCharge} onChange={setZoneShipCharge} step={0.5} />
                  </div>
                )}

                {shippingMode === 'flat' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Your shipping cost" prefix="$" value={flatShipCost} onChange={setFlatShipCost} step={0.5} />
                    <Input label="Flat rate to customer" prefix="$" value={flatShipCharge} onChange={setFlatShipCharge} step={0.5} />
                  </div>
                )}

                {current.shippingGap > 0 && (
                  <div className="mt-3 text-xs text-stone-600 bg-stone-50 border border-stone-200 rounded px-3 py-2">
                    You're absorbing <span className="font-medium text-rose-700">${current.shippingGap.toFixed(2)}</span> in shipping per order.
                  </div>
                )}
                {current.shippingGap < 0 && (
                  <div className="mt-3 text-xs text-stone-600 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
                    Customer is paying <span className="font-medium text-emerald-700">${Math.abs(current.shippingGap).toFixed(2)}</span> more than your shipping cost — extra margin on every order.
                  </div>
                )}
                {current.shippingGap === 0 && customerCharge > 0 && (
                  <div className="mt-3 text-xs text-stone-600 bg-stone-50 border border-stone-200 rounded px-3 py-2">
                    Shipping breakeven — customer covers your cost exactly.
                  </div>
                )}
              </Section>
            </div>
          </div>

          <div className="space-y-6">
            <div
              className={`rounded-lg p-6 border ${
                current.profit > 0
                  ? 'bg-emerald-50 border-emerald-200'
                  : current.profit === 0
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-rose-50 border-rose-200'
              }`}
            >
              <div className="text-xs uppercase tracking-wider text-stone-600 mb-2">The verdict</div>
              <div className="font-serif text-2xl mb-2">
                {current.profit > 0
                  ? `Yes — this order is profitable.`
                  : current.profit === 0
                  ? `Breakeven — no profit, no loss.`
                  : `No — you'd lose money.`}
              </div>
              <div className="text-stone-700 leading-relaxed">
                {current.profit > 0
                  ? `Wine profit: $${current.wineProfit.toFixed(2)}.${current.shippingGap > 0 ? ` Shipping eats $${current.shippingGap.toFixed(2)} of that.` : current.shippingGap < 0 ? ` Plus $${Math.abs(current.shippingGap).toFixed(2)} extra from shipping.` : ''} Net: $${current.profit.toFixed(2)} per order.`
                  : current.profit < 0
                  ? `You're out $${Math.abs(current.profit).toFixed(2)} on this order. ${current.shippingGap > current.wineProfit ? `Shipping gap of $${current.shippingGap.toFixed(2)} is wiping out your wine profit.` : `Wine margin isn't covering costs.`} ${breakeven ? `Breakeven hits at ${breakeven} bottles.` : `Margins need a rework — at any reasonable order size you'd still lose money.`}`
                  : `Breakeven exactly. No profit, no loss.`}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Metric label="Wine profit" value={`$${current.wineProfit.toFixed(2)}`} />
              <Metric
                label={current.shippingGap > 0 ? 'Shipping loss' : current.shippingGap < 0 ? 'Shipping gain' : 'Shipping'}
                value={`${current.shippingGap > 0 ? '-' : current.shippingGap < 0 ? '+' : ''}$${Math.abs(current.shippingGap).toFixed(2)}`}
                highlight={current.shippingGap > 0 ? 'bad' : current.shippingGap < 0 ? 'good' : 'neutral'}
              />
              <Metric
                label="Net profit"
                value={`${current.profit >= 0 ? '+' : '-'}$${Math.abs(current.profit).toFixed(2)}`}
                highlight={current.profit > 0 ? 'good' : current.profit < 0 ? 'bad' : 'neutral'}
              />
            </div>

            <div className="bg-stone-900 text-stone-100 rounded-lg p-6">
              <div className="text-xs uppercase tracking-wider text-stone-400 mb-3">Annual impact at {monthlyOrders} orders/month</div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="text-xs text-stone-400 mb-1">Wine revenue</div>
                  <div className="font-serif text-xl">${(annualWineRevenue / 1000).toFixed(1)}K</div>
                </div>
                <div>
                  <div className="text-xs text-stone-400 mb-1">{annualShippingGap > 0 ? 'Shipping loss' : annualShippingGap < 0 ? 'Shipping gain' : 'Shipping'}</div>
                  <div className={`font-serif text-xl ${annualShippingGap > 0 ? 'text-rose-400' : annualShippingGap < 0 ? 'text-emerald-400' : 'text-stone-300'}`}>
                    {annualShippingGap > 0 ? '-' : annualShippingGap < 0 ? '+' : ''}${Math.abs(annualShippingGap / 1000).toFixed(1)}K
                  </div>
                </div>
                <div>
                  <div className="text-xs text-stone-400 mb-1">Net profit</div>
                  <div className={`font-serif text-xl ${annualProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {annualProfit >= 0 ? '+' : '-'}${Math.abs(annualProfit / 1000).toFixed(1)}K
                  </div>
                </div>
              </div>
              {annualShippingGap > 0 && (
                <div className="text-sm text-stone-300 leading-relaxed border-t border-stone-700 pt-4">
                  Shipping is costing you <span className="font-medium text-rose-400">${annualShippingGap.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span> per year. That's cash flow eaten by carriers — recoverable with a smarter shipping strategy.
                </div>
              )}
              {annualShippingGap < 0 && (
                <div className="text-sm text-stone-300 leading-relaxed border-t border-stone-700 pt-4">
                  Shipping is adding <span className="font-medium text-emerald-400">${Math.abs(annualShippingGap).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span> to your bottom line per year. Customer charges exceed your shipping cost.
                </div>
              )}
              {annualShippingGap === 0 && (
                <div className="text-sm text-stone-300 leading-relaxed border-t border-stone-700 pt-4">
                  Shipping is breakeven — customers are covering exactly what you're paying.
                </div>
              )}
            </div>

            <div className="bg-white border border-stone-200 rounded-lg p-6">
              <h3 className="font-serif text-xl mb-4">Recommendations</h3>
              <ul className="space-y-3">
                {recommendations.map((rec, i) => (
                  <li key={i} className="flex gap-3 text-sm text-stone-700 leading-relaxed">
                    <span className="text-rose-700 font-bold mt-0.5">→</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white border border-stone-200 rounded-lg p-6">
          <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
            <h3 className="font-serif text-xl">Compare strategies</h3>
            <span className="text-sm text-stone-500">Same order, three shipping plays</span>
          </div>
          <p className="text-sm text-stone-600 mb-5">
            Using your inputs above, here's how each strategy stacks up at {bottles} bottle{bottles > 1 ? 's' : ''} per order, {monthlyOrders} orders/month.
          </p>

          <div className="mb-5 max-w-xs">
            <label className="text-sm text-stone-700 mb-1 block">Flat rate to test</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm">$</span>
              <input
                type="number"
                value={compareFlatRate}
                onChange={(e) => setCompareFlatRate(parseFloat(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
                step={1}
                className="w-full py-2 pl-7 pr-3 border border-stone-300 rounded bg-white text-sm focus:outline-none focus:border-stone-500"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            {scenarios.map((s, i) => {
              const isWinner = i === winnerIdx && s.result.annualProfit > 0;
              const isProfitable = s.result.profit > 0;
              return (
                <div
                  key={s.id}
                  className={`relative rounded-lg p-5 border ${
                    isWinner
                      ? 'bg-emerald-50 border-emerald-300'
                      : isProfitable
                      ? 'bg-stone-50 border-stone-200'
                      : 'bg-rose-50 border-rose-200'
                  }`}
                >
                  {isWinner && (
                    <div className="absolute -top-2 left-4 bg-emerald-700 text-white text-[10px] uppercase tracking-wider px-2 py-1 rounded">
                      Best annual profit
                    </div>
                  )}
                  <div className="font-serif text-lg mb-1">{s.label}</div>
                  <div className="text-xs text-stone-500 mb-4">{s.sublabel}</div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-stone-500">Per order</div>
                      <div className={`text-lg font-medium ${s.result.profit >= 0 ? 'text-stone-900' : 'text-rose-700'}`}>
                        {s.result.profit >= 0 ? '+' : '-'}${Math.abs(s.result.profit).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-stone-500">Per year</div>
                      <div className={`text-xl font-medium ${s.result.annualProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {s.result.annualProfit >= 0 ? '+' : '-'}${Math.abs(s.result.annualProfit).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    {s.result.shippingGap > 0 && (
                      <div className="pt-2 border-t border-stone-200/60">
                        <div className="text-xs text-stone-500">Shipping loss</div>
                        <div className="text-sm text-rose-700">${s.result.shippingGap.toFixed(2)}/order</div>
                      </div>
                    )}
                    {s.result.shippingGap < 0 && (
                      <div className="pt-2 border-t border-stone-200/60">
                        <div className="text-xs text-stone-500">Shipping gain</div>
                        <div className="text-sm text-emerald-700">+${Math.abs(s.result.shippingGap).toFixed(2)}/order</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-stone-500 mt-4 leading-relaxed">
            Numbers reflect your current product, cost, and zone inputs. Adjust any of those above and the comparison updates live.
          </p>
        </div>

        <div className="mt-8 bg-white border border-stone-200 rounded-lg p-6">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="font-serif text-xl">Profitability curve</h3>
            <span className="text-sm text-stone-500">Net profit by bottle count</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={curveData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="bottles" stroke="#78716c" style={{ fontSize: 12 }} label={{ value: 'Bottles', position: 'insideBottom', offset: -5, style: { fontSize: 12, fill: '#78716c' } }} />
                <YAxis stroke="#78716c" style={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Profit']}
                  contentStyle={{ background: 'white', border: '1px solid #e7e5e4', borderRadius: 6, fontSize: 13 }}
                />
                <ReferenceLine y={0} stroke="#a8a29e" strokeDasharray="4 4" />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#9f1239"
                  strokeWidth={2.5}
                  dot={{ fill: '#9f1239', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <div className="prose prose-stone max-w-none">
          <h2 className="font-serif text-3xl mb-6 leading-tight">
            How to think about shipping strategy in DTC wine
          </h2>

          <p className="text-stone-700 leading-relaxed mb-5">
            Shipping is one of the largest costs in direct-to-consumer wine, and the strategy a winery picks shapes everything from average order value to customer retention. There's no single right answer. The best approach depends on your margins, your buyer, and what you're trying to grow.
          </p>

          <p className="text-stone-700 leading-relaxed mb-10">
            The calculator above runs the math. The thinking below covers the tradeoffs each strategy carries — what tends to work, what tends to backfire, and what to weigh before you commit.
          </p>

          <h3 className="font-serif text-2xl mb-3 mt-10">Free shipping</h3>
          <p className="text-stone-700 leading-relaxed mb-3">
            Free shipping is the most aggressive growth lever in DTC. It removes friction at checkout, lifts conversion rates, and is often what tips a customer from a 3-bottle order to a 6-bottle order to hit a free shipping minimum.
          </p>
          <p className="text-stone-700 leading-relaxed mb-3">
            <span className="font-medium">Where it tends to work:</span> wineries with strong bottle margins (60%+ gross), higher price points, and a buyer base concentrated in nearby zones. It also pairs well with a smart minimum-order threshold that pushes customers toward larger carts.
          </p>
          <p className="text-stone-700 leading-relaxed mb-8">
            <span className="font-medium">Where it tends to hurt:</span> wineries with thin margins, value price points, or a national customer base where most orders ship to far zones. Free shipping in those cases can quietly turn profitable orders into breakeven ones — or worse — without the operator realizing it until quarter-end.
          </p>

          <h3 className="font-serif text-2xl mb-3 mt-10">Flat rate shipping</h3>
          <p className="text-stone-700 leading-relaxed mb-3">
            Flat rate gives the customer a known, predictable shipping cost while letting the winery recover most or all of its actual outbound spend. It's the most flexible strategy because the rate can be tuned to match margin and zone reality.
          </p>
          <p className="text-stone-700 leading-relaxed mb-3">
            <span className="font-medium">Where it tends to work:</span> wineries shipping nationally, wineries with mid-tier price points, and operators who want predictable shipping economics regardless of where the order goes. A well-set flat rate can feel generous to customers while still covering the winery's true cost.
          </p>
          <p className="text-stone-700 leading-relaxed mb-8">
            <span className="font-medium">Where it tends to hurt:</span> if the rate is set too high, it can suppress conversion. If it's set too low, it leaves money on the table on every cross-country order. Flat rate also doesn't reward larger carts the way a free-shipping threshold does, so it may slightly compress average order value.
          </p>

          <h3 className="font-serif text-2xl mb-3 mt-10">Charging actual shipping</h3>
          <p className="text-stone-700 leading-relaxed mb-3">
            Passing the actual carrier rate through to the customer is the most margin-protective approach. The winery never absorbs shipping cost, and the operator's economics stay clean regardless of zone or order size.
          </p>
          <p className="text-stone-700 leading-relaxed mb-3">
            <span className="font-medium">Where it tends to work:</span> for premium and ultra-premium wineries with brand pull, where the customer is buying a specific bottle and shipping cost is a small percentage of total spend. It's also the right call when margins are too tight for any subsidy at all.
          </p>
          <p className="text-stone-700 leading-relaxed mb-8">
            <span className="font-medium">Where it tends to hurt:</span> showing $40+ in shipping at checkout on a $60 order is a well-known cart abandonment driver. For value or mid-tier price points, this strategy can suppress conversion enough that the protected margin doesn't outweigh the lost sales.
          </p>

          <h3 className="font-serif text-2xl mb-3 mt-10">A few things worth weighing</h3>
          <p className="text-stone-700 leading-relaxed mb-3">
            Before locking in a strategy, a few questions tend to clarify the picture:
          </p>
          <ul className="text-stone-700 leading-relaxed mb-3 space-y-2 ml-5 list-disc">
            <li>What is your true gross margin per bottle, after COGS, packaging, and platform fees?</li>
            <li>Where do your orders actually ship — concentrated nearby, or spread cross-country?</li>
            <li>What is your average order size today, and what would it take to lift it by one or two bottles?</li>
            <li>How price-sensitive is your customer? Are they buying on price, or buying you?</li>
            <li>What does your competition do, and what would standing apart cost you?</li>
          </ul>
          <p className="text-stone-700 leading-relaxed">
            The calculator above lets you model each scenario against your real numbers. The right answer is the one that matches how your winery actually runs.
          </p>
        </div>
      </section>
      <section className="bg-stone-900 text-stone-100 py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-3xl mb-3">More tools coming soon.</h2>
          <p className="text-stone-300 mb-8 leading-relaxed">
            Club retention math, payment processing margins, and more. Get notified when they launch.
          </p>
          {emailStatus === 'sent' ? (
            <div className="bg-emerald-900/40 border border-emerald-700 rounded-lg p-6 max-w-md mx-auto">
              <p className="font-serif text-xl mb-1">You're on the list.</p>
              <p className="text-stone-300 text-sm">We'll be in touch when the next tool drops.</p>
            </div>
          ) : (
            <form onSubmit={handleEmail} className="space-y-3 max-w-md mx-auto">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3 rounded bg-stone-800 border border-stone-700 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-stone-500"
              />
              <input
                type="text"
                required
                value={business}
                onChange={(e) => setBusiness(e.target.value)}
                placeholder="Business name"
                className="w-full px-4 py-3 rounded bg-stone-800 border border-stone-700 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-stone-500"
              />
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@business.com"
                  className="flex-1 px-4 py-3 rounded bg-stone-800 border border-stone-700 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-stone-500"
                />
                <button
                  type="submit"
                  disabled={emailStatus === 'sending'}
                  className="px-6 py-3 rounded bg-rose-700 hover:bg-rose-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition whitespace-nowrap"
                >
                  {emailStatus === 'sending' ? 'Sending...' : 'Notify me'}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      <footer className="bg-stone-900 text-stone-500 py-8 px-6 border-t border-stone-800">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 text-sm">
          <span>© {new Date().getFullYear()} Should I Free Ship?</span>
          <span>A free tool for wineries running DTC.</span>
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-stone-500 mb-3 pb-2 border-b border-stone-200">
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
}) {
  return (
    <div>
      <label className="text-sm text-stone-700 mb-1 block">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm">{prefix}</span>
        )}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          onFocus={(e) => e.target.select()}
          step={step}
          className={`w-full py-2 border border-stone-300 rounded bg-white text-sm focus:outline-none focus:border-stone-500 ${
            prefix ? 'pl-7' : 'pl-3'
          } ${suffix ? 'pr-8' : 'pr-3'}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm">{suffix}</span>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: 'good' | 'bad' | 'neutral';
}) {
  const colorClass =
    highlight === 'good'
      ? 'text-emerald-700'
      : highlight === 'bad'
      ? 'text-rose-700'
      : 'text-stone-900';
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4">
      <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">{label}</div>
      <div className={`text-xl font-medium ${colorClass}`}>{value}</div>
    </div>
  );
}
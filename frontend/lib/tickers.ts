import { makeRng, hashSeed, clamp } from "./rng";
import type { TickerProfile, Fundamental, Pillar, Post } from "./types";

type Curated = Omit<TickerProfile, "insufficient" | "quietNote">;

const NVDA: Curated = {
  ticker: "NVDA",
  name: "NVIDIA CORP",
  shortName: "NVIDIA",
  exchange: "NASDAQ",
  seed: 42,
  priceStart: 118,
  driftBias: 1,
  mentions: 18420,
  mentionsLabel: "18,420",
  velocityLabel: "+212%",
  sentimentScore: 84,
  spark7d: [55, 62, 60, 71, 78, 80, 84],
  fundamentals: [
    { label: "P/E", value: "63.2" },
    { label: "FWD P/E", value: "34.8" },
    { label: "PEG", value: "1.12" },
    { label: "REV GROWTH", value: "+62.4%", color: "bullish" },
    { label: "GROSS MARGIN", value: "75.9%" },
    { label: "OP MARGIN", value: "62.1%" },
    { label: "ROE", value: "91.3%" },
    { label: "NET CASH", value: "$38.9B" },
  ],
  pillars: [
    { key: "val", name: "Valuation", score: 38, weight: 20, hintText: "Rich vs. sector on every multiple", inputs: [
      { k: "P/E vs sector", v: "+78%" }, { k: "EV / EBITDA", v: "51.3" }, { k: "FCF yield", v: "2.1%" }, { k: "PEG", v: "1.12" }] },
    { key: "grw", name: "Growth", score: 92, weight: 25, hintText: "Hyperscaler demand still compounding", inputs: [
      { k: "Revenue YoY", v: "+62.4%" }, { k: "EPS YoY", v: "+71.2%" }, { k: "Fwd rev est.", v: "+34.0%" }, { k: "Backlog", v: "record" }] },
    { key: "qlt", name: "Quality", score: 88, weight: 20, hintText: "Fortress margins, net cash balance", inputs: [
      { k: "Gross margin", v: "75.9%" }, { k: "ROE", v: "91.3%" }, { k: "Net cash", v: "$38.9B" }, { k: "SBC / revenue", v: "2.4%" }] },
    { key: "mom", name: "Momentum", score: 74, weight: 20, hintText: "Above both moving averages", inputs: [
      { k: "vs 50-DMA", v: "+6.8%" }, { k: "vs 200-DMA", v: "+19.2%" }, { k: "RSI (14d)", v: "63" }, { k: "3-mo rel. str.", v: "+11%" }] },
    { key: "snt", name: "Sentiment", score: 81, weight: 15, hintText: "Crowd euphoric — contrarian flag", inputs: [
      { k: "Social score", v: "84 / 100" }, { k: "Mention velocity", v: "+212%" }, { k: "Put / call", v: "0.55" }, { k: "Analyst rev. ↑", v: "31" }] },
  ],
  posts: [
    { src: "r/wallstreetbets · u/leather_hands_87", time: "2h", text: "Blackwell ramp is not priced in. Datacenter guide is a lock — loaded May calls this morning.", score: 88, up: "▲ 2.1k" },
    { src: "StockTwits · @macro_ronin", time: "4h", text: "Everyone in here is euphoric, which is exactly when I trim. Took half off into strength.", score: 24, up: "▲ 312" },
    { src: "r/stocks · u/quiet_compounder", time: "7h", text: "76% gross margins will compress eventually, but the CUDA moat is still five years deep.", score: 58, up: "▲ 940" },
    { src: "StockTwits · @theta_gang_taro", time: "9h", text: "Selling the 150 puts all week. Perfectly happy to own it there.", score: 72, up: "▲ 188" },
  ],
};

const SMCI: Curated = {
  ticker: "SMCI",
  name: "SUPER MICRO COMPUTER",
  shortName: "Super Micro",
  exchange: "NASDAQ",
  seed: 107,
  priceStart: 33,
  driftBias: 1,
  mentions: 9215,
  mentionsLabel: "9,215",
  velocityLabel: "+341%",
  sentimentScore: 71,
  spark7d: [40, 44, 42, 55, 58, 66, 71],
  fundamentals: [
    { label: "P/E", value: "21.4" },
    { label: "FWD P/E", value: "14.9" },
    { label: "PEG", value: "0.68" },
    { label: "REV GROWTH", value: "+110.2%", color: "bullish" },
    { label: "GROSS MARGIN", value: "14.1%" },
    { label: "OP MARGIN", value: "8.4%" },
    { label: "ROE", value: "22.7%" },
    { label: "NET CASH", value: "$0.6B" },
  ],
  pillars: [
    { key: "val", name: "Valuation", score: 64, weight: 20, hintText: "Cheap on forward growth, overhang lingers", inputs: [
      { k: "P/E vs sector", v: "−22%" }, { k: "EV / EBITDA", v: "12.1" }, { k: "FCF yield", v: "3.8%" }, { k: "PEG", v: "0.68" }] },
    { key: "grw", name: "Growth", score: 90, weight: 25, hintText: "AI server backlog still outrunning guidance", inputs: [
      { k: "Revenue YoY", v: "+110.2%" }, { k: "EPS YoY", v: "+58.0%" }, { k: "Fwd rev est.", v: "+71.0%" }, { k: "Backlog", v: "record" }] },
    { key: "qlt", name: "Quality", score: 41, weight: 20, hintText: "Thin margins, working-capital strain", inputs: [
      { k: "Gross margin", v: "14.1%" }, { k: "ROE", v: "22.7%" }, { k: "Net cash", v: "$0.6B" }, { k: "SBC / revenue", v: "1.1%" }] },
    { key: "mom", name: "Momentum", score: 68, weight: 20, hintText: "Reclaiming the 50-DMA after filing cleared", inputs: [
      { k: "vs 50-DMA", v: "+9.1%" }, { k: "vs 200-DMA", v: "−4.2%" }, { k: "RSI (14d)", v: "58" }, { k: "3-mo rel. str.", v: "+6%" }] },
    { key: "snt", name: "Sentiment", score: 71, weight: 15, hintText: "Velocity spiking on short-covering chatter", inputs: [
      { k: "Social score", v: "71 / 100" }, { k: "Mention velocity", v: "+341%" }, { k: "Put / call", v: "0.71" }, { k: "Analyst rev. ↑", v: "9" }] },
  ],
  posts: [
    { src: "r/wallstreetbets · u/rack_and_stack", time: "1h", text: "Supply chain checks show GB200 rack orders way ahead of what's in the model. Small position, big conviction.", score: 79, up: "▲ 1.4k" },
    { src: "StockTwits · @filing_watcher", time: "5h", text: "Audit overhang isn't fully gone just because the 10-K is filed. Sizing accordingly.", score: 31, up: "▲ 265" },
    { src: "r/stocks · u/margin_call_me_maybe", time: "8h", text: "Revenue growth is real but gross margin keeps sliding — this is a volume business now, not a premium one.", score: 44, up: "▲ 501" },
  ],
};

const PLTR: Curated = {
  ticker: "PLTR",
  name: "PALANTIR TECHNOLOGIES",
  shortName: "Palantir",
  exchange: "NYSE",
  seed: 219,
  priceStart: 92,
  driftBias: 1,
  mentions: 12377,
  mentionsLabel: "12,377",
  velocityLabel: "+186%",
  sentimentScore: 78,
  spark7d: [60, 58, 64, 66, 70, 75, 78],
  fundamentals: [
    { label: "P/E", value: "218.5" },
    { label: "FWD P/E", value: "142.0" },
    { label: "PEG", value: "3.4" },
    { label: "REV GROWTH", value: "+39.0%", color: "bullish" },
    { label: "GROSS MARGIN", value: "80.6%" },
    { label: "OP MARGIN", value: "22.4%" },
    { label: "ROE", value: "26.8%" },
    { label: "NET CASH", value: "$4.2B" },
  ],
  pillars: [
    { key: "val", name: "Valuation", score: 12, weight: 20, hintText: "Priced for a decade of flawless execution", inputs: [
      { k: "P/E vs sector", v: "+410%" }, { k: "EV / EBITDA", v: "165.0" }, { k: "FCF yield", v: "1.1%" }, { k: "PEG", v: "3.4" }] },
    { key: "grw", name: "Growth", score: 81, weight: 25, hintText: "Government + commercial AIP both accelerating", inputs: [
      { k: "Revenue YoY", v: "+39.0%" }, { k: "EPS YoY", v: "+76.0%" }, { k: "Fwd rev est.", v: "+32.0%" }, { k: "Backlog", v: "record" }] },
    { key: "qlt", name: "Quality", score: 76, weight: 20, hintText: "High margin, debt-free balance sheet", inputs: [
      { k: "Gross margin", v: "80.6%" }, { k: "ROE", v: "26.8%" }, { k: "Net cash", v: "$4.2B" }, { k: "SBC / revenue", v: "18.6%" }] },
    { key: "mom", name: "Momentum", score: 83, weight: 20, hintText: "New highs on an expanding multiple", inputs: [
      { k: "vs 50-DMA", v: "+14.2%" }, { k: "vs 200-DMA", v: "+58.0%" }, { k: "RSI (14d)", v: "71" }, { k: "3-mo rel. str.", v: "+24%" }] },
    { key: "snt", name: "Sentiment", score: 78, weight: 15, hintText: "Retail conviction unusually one-sided", inputs: [
      { k: "Social score", v: "78 / 100" }, { k: "Mention velocity", v: "+186%" }, { k: "Put / call", v: "0.44" }, { k: "Analyst rev. ↑", v: "14" }] },
  ],
  posts: [
    { src: "r/stocks · u/ontology_bull", time: "3h", text: "AIP bootcamps are converting into real contracts faster than the sell side is modeling. Commercial is the story now.", score: 82, up: "▲ 1.1k" },
    { src: "StockTwits · @multiple_matters", time: "6h", text: "Great company, insane multiple. I love it and own zero shares.", score: 29, up: "▲ 407" },
    { src: "r/wallstreetbets · u/karp_disciple", time: "10h", text: "Government contract renewals came in above consensus again. This crowd has been early and right for two years.", score: 85, up: "▲ 2.4k" },
  ],
};

const GME: Curated = {
  ticker: "GME",
  name: "GAMESTOP CORP",
  shortName: "GameStop",
  exchange: "NYSE",
  seed: 331,
  priceStart: 27,
  driftBias: -1,
  mentions: 6530,
  mentionsLabel: "6,530",
  velocityLabel: "+95%",
  sentimentScore: 33,
  spark7d: [52, 48, 45, 40, 38, 35, 33],
  fundamentals: [
    { label: "P/E", value: "n/m" },
    { label: "FWD P/E", value: "n/m" },
    { label: "PEG", value: "n/m" },
    { label: "REV GROWTH", value: "−12.6%", color: "bearish" },
    { label: "GROSS MARGIN", value: "26.0%" },
    { label: "OP MARGIN", value: "−1.8%" },
    { label: "ROE", value: "−2.1%" },
    { label: "NET CASH", value: "$4.8B" },
  ],
  pillars: [
    { key: "val", name: "Valuation", score: 45, weight: 20, hintText: "Net cash props up an otherwise cheap-looking multiple", inputs: [
      { k: "P/E vs sector", v: "n/m" }, { k: "EV / EBITDA", v: "n/m" }, { k: "FCF yield", v: "−0.4%" }, { k: "PEG", v: "n/m" }] },
    { key: "grw", name: "Growth", score: 22, weight: 25, hintText: "Store base shrinking faster than digital scales", inputs: [
      { k: "Revenue YoY", v: "−12.6%" }, { k: "EPS YoY", v: "n/m" }, { k: "Fwd rev est.", v: "−4.0%" }, { k: "Backlog", v: "n/a" }] },
    { key: "qlt", name: "Quality", score: 29, weight: 20, hintText: "Cash-rich but core business unprofitable", inputs: [
      { k: "Gross margin", v: "26.0%" }, { k: "ROE", v: "−2.1%" }, { k: "Net cash", v: "$4.8B" }, { k: "SBC / revenue", v: "3.2%" }] },
    { key: "mom", name: "Momentum", score: 31, weight: 20, hintText: "Rolling over from a meme-driven spike", inputs: [
      { k: "vs 50-DMA", v: "−8.4%" }, { k: "vs 200-DMA", v: "−3.1%" }, { k: "RSI (14d)", v: "38" }, { k: "3-mo rel. str.", v: "−9%" }] },
    { key: "snt", name: "Sentiment", score: 33, weight: 15, hintText: "Split crowd — squeeze chatter fading", inputs: [
      { k: "Social score", v: "33 / 100" }, { k: "Mention velocity", v: "+95%" }, { k: "Put / call", v: "1.28" }, { k: "Analyst rev. ↓", v: "3" }] },
  ],
  posts: [
    { src: "r/wallstreetbets · u/diamond_since_2021", time: "1h", text: "Short interest is still elevated and nobody's talking about it anymore. That's usually when it moves.", score: 61, up: "▲ 890" },
    { src: "StockTwits · @tired_of_the_saga", time: "4h", text: "Store closures keep coming. The cash pile doesn't fix the business getting smaller every quarter.", score: 18, up: "▲ 220" },
    { src: "r/stocks · u/show_me_the_10q", time: "9h", text: "Genuinely split room here — half see optionality in the cash, half see a melting ice cube. Both are right.", score: 40, up: "▲ 356" },
  ],
};

const TSLA: Curated = {
  ticker: "TSLA",
  name: "TESLA INC",
  shortName: "Tesla",
  exchange: "NASDAQ",
  seed: 458,
  priceStart: 268,
  driftBias: -1,
  mentions: 15904,
  mentionsLabel: "15,904",
  velocityLabel: "+48%",
  sentimentScore: 41,
  spark7d: [55, 50, 49, 46, 44, 43, 41],
  fundamentals: [
    { label: "P/E", value: "68.4" },
    { label: "FWD P/E", value: "88.1" },
    { label: "PEG", value: "4.9" },
    { label: "REV GROWTH", value: "+2.1%", color: "bullish" },
    { label: "GROSS MARGIN", value: "17.9%" },
    { label: "OP MARGIN", value: "7.2%" },
    { label: "ROE", value: "9.8%" },
    { label: "NET CASH", value: "$16.1B" },
  ],
  pillars: [
    { key: "val", name: "Valuation", score: 24, weight: 20, hintText: "Priced like software, margins like automotive", inputs: [
      { k: "P/E vs sector", v: "+190%" }, { k: "EV / EBITDA", v: "44.2" }, { k: "FCF yield", v: "1.4%" }, { k: "PEG", v: "4.9" }] },
    { key: "grw", name: "Growth", score: 46, weight: 25, hintText: "Deliveries plateauing ahead of next-gen platform", inputs: [
      { k: "Revenue YoY", v: "+2.1%" }, { k: "EPS YoY", v: "−8.0%" }, { k: "Fwd rev est.", v: "+11.0%" }, { k: "Backlog", v: "n/a" }] },
    { key: "qlt", name: "Quality", score: 58, weight: 20, hintText: "Margins compressing but balance sheet solid", inputs: [
      { k: "Gross margin", v: "17.9%" }, { k: "ROE", v: "9.8%" }, { k: "Net cash", v: "$16.1B" }, { k: "SBC / revenue", v: "2.0%" }] },
    { key: "mom", name: "Momentum", score: 39, weight: 20, hintText: "Below the 50-DMA, choppy since Q1", inputs: [
      { k: "vs 50-DMA", v: "−3.6%" }, { k: "vs 200-DMA", v: "+1.2%" }, { k: "RSI (14d)", v: "44" }, { k: "3-mo rel. str.", v: "−6%" }] },
    { key: "snt", name: "Sentiment", score: 41, weight: 15, hintText: "Cooling off after robotaxi headlines faded", inputs: [
      { k: "Social score", v: "41 / 100" }, { k: "Mention velocity", v: "+48%" }, { k: "Put / call", v: "0.88" }, { k: "Analyst rev. ↓", v: "6" }] },
  ],
  posts: [
    { src: "r/stocks · u/fsd_skeptic", time: "2h", text: "Delivery numbers were the real story and they were soft. Robotaxi narrative can only carry the stock so far.", score: 28, up: "▲ 610" },
    { src: "StockTwits · @megapack_bull", time: "5h", text: "Energy storage deployments are the quiet compounder nobody's pricing in here.", score: 66, up: "▲ 340" },
    { src: "r/wallstreetbets · u/gigafactory_gains", time: "8h", text: "Chop city. Selling covered calls until it picks a direction.", score: 42, up: "▲ 275" },
  ],
};

const COIN: Curated = {
  ticker: "COIN",
  name: "COINBASE GLOBAL",
  shortName: "Coinbase",
  exchange: "NASDAQ",
  seed: 573,
  priceStart: 288,
  driftBias: 1,
  mentions: 5118,
  mentionsLabel: "5,118",
  velocityLabel: "+37%",
  sentimentScore: 66,
  spark7d: [58, 60, 57, 61, 63, 64, 66],
  fundamentals: [
    { label: "P/E", value: "44.6" },
    { label: "FWD P/E", value: "31.2" },
    { label: "PEG", value: "1.6" },
    { label: "REV GROWTH", value: "+58.0%", color: "bullish" },
    { label: "GROSS MARGIN", value: "85.1%" },
    { label: "OP MARGIN", value: "33.4%" },
    { label: "ROE", value: "18.9%" },
    { label: "NET CASH", value: "$9.3B" },
  ],
  pillars: [
    { key: "val", name: "Valuation", score: 41, weight: 20, hintText: "Rich, but cheaper than the last cycle's peak", inputs: [
      { k: "P/E vs sector", v: "+35%" }, { k: "EV / EBITDA", v: "28.4" }, { k: "FCF yield", v: "2.9%" }, { k: "PEG", v: "1.6" }] },
    { key: "grw", name: "Growth", score: 74, weight: 25, hintText: "Trading volume and subscriptions both re-accelerating", inputs: [
      { k: "Revenue YoY", v: "+58.0%" }, { k: "EPS YoY", v: "+91.0%" }, { k: "Fwd rev est.", v: "+22.0%" }, { k: "Backlog", v: "n/a" }] },
    { key: "qlt", name: "Quality", score: 79, weight: 20, hintText: "High-margin platform, strong reserves", inputs: [
      { k: "Gross margin", v: "85.1%" }, { k: "ROE", v: "18.9%" }, { k: "Net cash", v: "$9.3B" }, { k: "SBC / revenue", v: "6.7%" }] },
    { key: "mom", name: "Momentum", score: 61, weight: 20, hintText: "Tracking spot crypto strength", inputs: [
      { k: "vs 50-DMA", v: "+5.9%" }, { k: "vs 200-DMA", v: "+14.4%" }, { k: "RSI (14d)", v: "57" }, { k: "3-mo rel. str.", v: "+9%" }] },
    { key: "snt", name: "Sentiment", score: 66, weight: 15, hintText: "Constructive, tracking token prices", inputs: [
      { k: "Social score", v: "66 / 100" }, { k: "Mention velocity", v: "+37%" }, { k: "Put / call", v: "0.61" }, { k: "Analyst rev. ↑", v: "8" }] },
  ],
  posts: [
    { src: "StockTwits · @onchain_oda", time: "3h", text: "Subscription and services revenue is finally decoupling from trading volume swings. That's the multiple re-rate case.", score: 70, up: "▲ 480" },
    { src: "r/stocks · u/regulatory_hawk", time: "6h", text: "Framework clarity is a real tailwind but a lot of it looks priced in already.", score: 48, up: "▲ 190" },
    { src: "r/wallstreetbets · u/degen_but_diversified", time: "9h", text: "Correlated to BTC as always, but the derivatives business is finally pulling its weight.", score: 63, up: "▲ 322" },
  ],
};

const AMD: Curated = {
  ticker: "AMD",
  name: "ADVANCED MICRO DEVICES",
  shortName: "Adv. Micro",
  exchange: "NASDAQ",
  seed: 689,
  priceStart: 148,
  driftBias: 1,
  mentions: 7842,
  mentionsLabel: "7,842",
  velocityLabel: "+22%",
  sentimentScore: 63,
  spark7d: [60, 61, 59, 62, 61, 62, 63],
  fundamentals: [
    { label: "P/E", value: "108.5" },
    { label: "FWD P/E", value: "38.7" },
    { label: "PEG", value: "1.3" },
    { label: "REV GROWTH", value: "+23.0%", color: "bullish" },
    { label: "GROSS MARGIN", value: "53.6%" },
    { label: "OP MARGIN", value: "14.2%" },
    { label: "ROE", value: "5.1%" },
    { label: "NET CASH", value: "$3.7B" },
  ],
  pillars: [
    { key: "val", name: "Valuation", score: 34, weight: 20, hintText: "Expensive trailing, more reasonable forward", inputs: [
      { k: "P/E vs sector", v: "+52%" }, { k: "EV / EBITDA", v: "33.1" }, { k: "FCF yield", v: "1.8%" }, { k: "PEG", v: "1.3" }] },
    { key: "grw", name: "Growth", score: 70, weight: 25, hintText: "Data-center GPU share still climbing", inputs: [
      { k: "Revenue YoY", v: "+23.0%" }, { k: "EPS YoY", v: "+37.0%" }, { k: "Fwd rev est.", v: "+26.0%" }, { k: "Backlog", v: "rising" }] },
    { key: "qlt", name: "Quality", score: 58, weight: 20, hintText: "Margins improving off a low base", inputs: [
      { k: "Gross margin", v: "53.6%" }, { k: "ROE", v: "5.1%" }, { k: "Net cash", v: "$3.7B" }, { k: "SBC / revenue", v: "4.9%" }] },
    { key: "mom", name: "Momentum", score: 65, weight: 20, hintText: "Steady grind higher, no blow-off top", inputs: [
      { k: "vs 50-DMA", v: "+4.1%" }, { k: "vs 200-DMA", v: "+9.8%" }, { k: "RSI (14d)", v: "56" }, { k: "3-mo rel. str.", v: "+5%" }] },
    { key: "snt", name: "Sentiment", score: 63, weight: 15, hintText: "Quietly constructive, low velocity", inputs: [
      { k: "Social score", v: "63 / 100" }, { k: "Mention velocity", v: "+22%" }, { k: "Put / call", v: "0.68" }, { k: "Analyst rev. ↑", v: "11" }] },
  ],
  posts: [
    { src: "r/stocks · u/foundry_watcher", time: "4h", text: "MI350 ramp commentary was better than expected on the call. Still the clear #2 in AI accelerators and gaining share.", score: 68, up: "▲ 410" },
    { src: "StockTwits · @client_cpu_guy", time: "7h", text: "Everyone's focused on datacenter but the client CPU share gains against Intel are underrated here.", score: 59, up: "▲ 175" },
    { src: "r/wallstreetbets · u/eternal_second_place", time: "11h", text: "Perpetually the value AI play next to NVDA. Fine by me, I'm not paying NVDA's multiple.", score: 55, up: "▲ 230" },
  ],
};

const SOFI: Curated = {
  ticker: "SOFI",
  name: "SOFI TECHNOLOGIES",
  shortName: "SoFi Tech",
  exchange: "NASDAQ",
  seed: 812,
  priceStart: 15,
  driftBias: -1,
  mentions: 4406,
  mentionsLabel: "4,406",
  velocityLabel: "−12%",
  sentimentScore: 47,
  spark7d: [50, 51, 49, 48, 49, 47, 47],
  fundamentals: [
    { label: "P/E", value: "42.1" },
    { label: "FWD P/E", value: "27.6" },
    { label: "PEG", value: "1.1" },
    { label: "REV GROWTH", value: "+26.0%", color: "bullish" },
    { label: "GROSS MARGIN", value: "63.0%" },
    { label: "OP MARGIN", value: "9.8%" },
    { label: "ROE", value: "4.4%" },
    { label: "NET CASH", value: "$1.2B" },
  ],
  pillars: [
    { key: "val", name: "Valuation", score: 48, weight: 20, hintText: "Fair for a fintech scaling into profitability", inputs: [
      { k: "P/E vs sector", v: "+8%" }, { k: "EV / EBITDA", v: "19.6" }, { k: "FCF yield", v: "2.4%" }, { k: "PEG", v: "1.1" }] },
    { key: "grw", name: "Growth", score: 62, weight: 25, hintText: "Member growth still outpacing loan growth", inputs: [
      { k: "Revenue YoY", v: "+26.0%" }, { k: "EPS YoY", v: "+140.0%" }, { k: "Fwd rev est.", v: "+19.0%" }, { k: "Backlog", v: "n/a" }] },
    { key: "qlt", name: "Quality", score: 44, weight: 20, hintText: "Newly profitable, margins still thin", inputs: [
      { k: "Gross margin", v: "63.0%" }, { k: "ROE", v: "4.4%" }, { k: "Net cash", v: "$1.2B" }, { k: "SBC / revenue", v: "5.8%" }] },
    { key: "mom", name: "Momentum", score: 42, weight: 20, hintText: "Range-bound since rate-cut repricing stalled", inputs: [
      { k: "vs 50-DMA", v: "−1.2%" }, { k: "vs 200-DMA", v: "+3.4%" }, { k: "RSI (14d)", v: "47" }, { k: "3-mo rel. str.", v: "−2%" }] },
    { key: "snt", name: "Sentiment", score: 47, weight: 15, hintText: "Split — rate-cut optimism meets credit worries", inputs: [
      { k: "Social score", v: "47 / 100" }, { k: "Mention velocity", v: "−12%" }, { k: "Put / call", v: "0.94" }, { k: "Analyst rev. ↑", v: "4" }] },
  ],
  posts: [
    { src: "StockTwits · @fintech_flywheel", time: "5h", text: "Deposit growth funding more of the loan book at lower cost — that's the whole bull case in one line.", score: 61, up: "▲ 260" },
    { src: "r/stocks · u/credit_cycle_watcher", time: "8h", text: "Personal loan delinquencies are the thing to watch here, not the member growth headline.", score: 33, up: "▲ 198" },
    { src: "r/wallstreetbets · u/no_fee_no_problem", time: "12h", text: "Rate-cut repricing should help NIM eventually, market's just impatient.", score: 54, up: "▲ 140" },
  ],
};

export const CURATED: Record<string, Curated> = {
  NVDA, SMCI, PLTR, GME, TSLA, COIN, AMD, SOFI,
};

export const TRENDING_TICKERS = ["NVDA", "SMCI", "PLTR", "GME", "TSLA", "COIN", "AMD", "SOFI"];

const GENERIC_POST_TEMPLATES = [
  (t: string) => `Been watching ${t} chatter build for a few days now — nothing dramatic, just steady accumulation talk.`,
  (t: string) => `${t} is thin enough here that a single desk can move the tape. Sizing small.`,
  (t: string) => `No strong view on ${t} yet, just flagging the volume pickup in case it's early.`,
];

function genericFundamentals(rng: () => number): Fundamental[] {
  const pe = (8 + rng() * 70).toFixed(1);
  const fwdPe = (6 + rng() * 50).toFixed(1);
  const peg = (0.4 + rng() * 3).toFixed(2);
  const revGrowth = (rng() - 0.35) * 60;
  const gm = (20 + rng() * 65).toFixed(1);
  const om = (2 + rng() * 40).toFixed(1);
  const roe = (rng() * 35).toFixed(1);
  const cash = (0.1 + rng() * 12).toFixed(1);
  return [
    { label: "P/E", value: pe },
    { label: "FWD P/E", value: fwdPe },
    { label: "PEG", value: peg },
    { label: "REV GROWTH", value: (revGrowth >= 0 ? "+" : "−") + Math.abs(revGrowth).toFixed(1) + "%", color: revGrowth >= 0 ? "bullish" : "bearish" },
    { label: "GROSS MARGIN", value: gm + "%" },
    { label: "OP MARGIN", value: om + "%" },
    { label: "ROE", value: roe + "%" },
    { label: "NET CASH", value: "$" + cash + "B" },
  ];
}

function genericPillars(rng: () => number, insufficient: boolean): Pillar[] {
  const mk = (key: Pillar["key"], name: string, weight: number, hint: string, keys: string[]): Pillar => {
    const score = Math.round(rng() * 100);
    return {
      key, name, weight, score,
      hintText: insufficient && key === "snt" ? "Too little chatter to score with confidence" : hint,
      inputs: keys.map((k) => ({ k, v: insufficient && key === "snt" ? "—" : (rng() * 100).toFixed(1) + (rng() > 0.5 ? "%" : "") })),
    };
  };
  return [
    mk("val", "Valuation", 20, "Mixed signals across multiples", ["P/E vs sector", "EV / EBITDA", "FCF yield", "PEG"]),
    mk("grw", "Growth", 25, "Growth trend still forming", ["Revenue YoY", "EPS YoY", "Fwd rev est.", "Backlog"]),
    mk("qlt", "Quality", 20, "Balance sheet within normal range", ["Gross margin", "ROE", "Net cash", "SBC / revenue"]),
    mk("mom", "Momentum", 20, "No clear trend established yet", ["vs 50-DMA", "vs 200-DMA", "RSI (14d)", "3-mo rel. str."]),
    mk("snt", "Sentiment", 15, "Thin social volume", ["Social score", "Mention velocity", "Put / call", "Analyst rev."]),
  ];
}

function genericName(ticker: string): string {
  return ticker.toUpperCase() + " CORP";
}

export function getTickerProfile(rawTicker: string): TickerProfile {
  const ticker = rawTicker.toUpperCase();
  const curated = CURATED[ticker];
  if (curated) {
    return { ...curated, insufficient: false, quietNote: "" };
  }

  const seed = hashSeed(ticker);
  const rng = makeRng(seed);
  const mentions = Math.floor(rng() * 420);
  const insufficient = mentions < 60;
  const sentimentScore = Math.round(rng() * 100);
  const velocityPct = Math.round((rng() - 0.4) * 240);
  const spark7d = Array.from({ length: 7 }, () =>
    Math.round(clamp(sentimentScore + (rng() - 0.5) * 24, 0, 100))
  );
  const priceStart = 8 + rng() * 340;
  const driftBias = rng() > 0.5 ? 1 : -1;

  const posts: Post[] = insufficient
    ? []
    : GENERIC_POST_TEMPLATES.slice(0, 1 + Math.floor(rng() * 2)).map((tmpl) => ({
        src: (rng() > 0.5 ? "r/stocks · u/anon_trader_" : "StockTwits · @watcher_") + Math.floor(rng() * 900 + 100),
        time: (1 + Math.floor(rng() * 11)) + "h",
        text: tmpl(ticker),
        score: Math.round(clamp(sentimentScore + (rng() - 0.5) * 20, 0, 100)),
        up: "▲ " + Math.floor(20 + rng() * 300),
      }));

  return {
    ticker,
    name: genericName(ticker),
    shortName: ticker,
    exchange: rng() > 0.5 ? "NASDAQ" : "NYSE",
    seed,
    priceStart,
    driftBias,
    mentions,
    mentionsLabel: mentions.toLocaleString("en-US"),
    velocityLabel: (velocityPct >= 0 ? "+" : "−") + Math.abs(velocityPct) + "%",
    sentimentScore,
    spark7d,
    fundamentals: genericFundamentals(rng),
    pillars: genericPillars(rng, insufficient),
    posts,
    insufficient,
    quietNote: insufficient
      ? `${ticker} — fewer than 60 mentions today.`
      : "",
  };
}

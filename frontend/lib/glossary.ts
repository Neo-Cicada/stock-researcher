// English glosses for the Japanese text scattered through the woodblock UI.
// Keyed by the exact string rendered on screen (or, for the single-kanji hanko
// seals, by the kanji itself). `glossFor` returns undefined for anything we
// haven't translated, so a missing entry degrades to plain untooltipped text.
const GLOSSES: Record<string, string> = {
  // Brand + page labels
  株価: "kabuka — stock price",
  相場の季節: "sōba no kisetsu — the market season",
  機関投資家: "kikan tōshika — institutional investors",
  経済指標: "keizai shihyō — economic indicators",
  決算予定: "kessan yotei — earnings schedule",
  保有株: "hoyū kabu — shares held",
  銘柄研究: "meigara kenkyū — stock research",

  // Section stamps (hanko)
  機関: "kikan — institutions",
  指標: "shihyō — indicators",
  決算: "kessan — earnings",
  話題: "wadai — what people are talking about",

  // Chart + status text
  強気: "tsuyoki — bullish",
  弱気: "yowaki — bearish",
  開場中: "kaijō-chū — market open",
  閉場: "heijō — market closed",
  墨を磨っています: "sumi o sutte imasu — grinding the ink",

  // Market-season labels
  枯枝: "kareeda — bare branch",
  蕾: "tsubomi — bud",
  開花: "kaika — blossoming",
  花盛り: "hanazakari — in full flower",
  満開: "mankai — full bloom",

  // Theme stamps
  勢: "ikioi — momentum",
  金: "kane — money, gold",
  噂: "uwasa — rumour",
  波: "nami — wave",
  風: "kaze — wind",

  // Institution seals
  帆: "ho — sail",
  岩: "iwa — rock",
  州: "shū — state",
  信: "shin — trust",
  銀: "gin — silver, bank",
  晶: "shō — crystal",
  宝: "takara — treasure",
  街: "machi — street",
  価: "ka — value",
  貝: "kai — shell, old money",
  城: "shiro — castle",
  千: "sen — thousand",
  覚: "kaku — awareness",
  算: "san — calculation",
  双: "sō — pair, twin",
  橋: "hashi — bridge",
  点: "ten — point",
  虎: "tora — tiger",
  索: "saku — search",
  // Fallback seal for an institution we don't have a kanji for.
  機: "ki — institution",
};

export function glossFor(text: string): string | undefined {
  return GLOSSES[text.trim()];
}

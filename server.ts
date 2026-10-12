import express from "express";
import { createServer as createViteServer } from "vite";
import { execFile } from "child_process";
import path from "path";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

interface BondCandidate {
  secid: string;
  name: string;
  face: number;
  cpy: number;
  coupon_pct: number;
  coupon_value?: number;
  next_coupon?: string;
  payout_months?: number[];
  maturity: string;
  years_left: number;
  ytm: number;
  clean: number;
  liq: number;
  ndi: number;
  moddur?: number;
  price_to_par?: number;
  discount?: number;
  price_rub?: number;
  score?: number;
  ldv_eligible?: boolean;
}

function num(v: unknown, defaultVal: number | null = null): number | null {
  if (v === null || v === undefined || v === "" || v === "null") {
    return defaultVal;
  }
  const f = Number(v);
  return Number.isNaN(f) ? defaultVal : f;
}

function modifiedDuration(
  couponPct: number,
  cpy: number,
  yearsLeft: number,
  cleanPrice: number,
  ytm: number,
  face = 1000.0
): number | null {
  if (!ytm || ytm <= 0 || !cleanPrice || cleanPrice <= 0) {
    return null;
  }
  const yPer = ytm / 100.0 / cpy;
  const stepDays = 365.25 / cpy;
  const n = Math.max(1, Math.ceil((yearsLeft * 365.25) / stepDays));
  const cf = ((couponPct / 100.0) * face) / cpy;
  let pv = 0.0;
  let durPeriods = 0.0;
  for (let t = 1; t <= n; t++) {
    const flow = cf + (t === n ? face : 0.0);
    const disc = Math.pow(1.0 + yPer, t);
    durPeriods += (t * flow) / disc;
    pv += flow / disc;
  }
  if (pv <= 0) return null;
  return durPeriods / pv / (1.0 + yPer) / cpy;
}

async function fetchScoredOfzFallback(customConfig?: Record<string, unknown>): Promise<BondCandidate[]> {
  const url =
    "https://iss.moex.com/iss/engines/stock/markets/bonds/boards/TQOB/securities.json?iss.meta=off";
  const resp = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (ofz-agent-tool)" },
  });
  const res = await resp.json();

  const parseTable = (block: { columns: string[]; data: unknown[][] }) => {
    const cols = block.columns;
    return (block.data || []).map((row) => {
      const obj: Record<string, unknown> = {};
      cols.forEach((c, idx) => {
        obj[c] = row[idx];
      });
      return obj;
    });
  };

  const secRows = parseTable(res.securities);
  const mRows = parseTable(res.marketdata);
  const mMap: Record<string, Record<string, unknown>> = {};
  for (const r of mRows) {
    if (typeof r.SECID === "string") {
      mMap[r.SECID] = r;
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minYears = Number(customConfig?.min_years ?? 1.0);
  const maxYears = Number(customConfig?.max_years ?? 10.0);
  const minLiq = Number(customConfig?.min_liq ?? 5000000.0);
  const topN = Number(customConfig?.top_n ?? 5);

  const cands: BondCandidate[] = [];

  for (const sec of secRows) {
    const secid = String(sec.SECID || "");
    if (!secid) continue;
    const b = { ...sec, ...(mMap[secid] || {}) };
    const name = String(b.SHORTNAME || "").toUpperCase();

    if (!name.includes("ОФЗ") && !secid.startsWith("SU")) continue;

    const matStr = String(b.MATDATE || "");
    if (matStr.length < 10) continue;
    const matDate = new Date(matStr.slice(0, 10) + "T00:00:00");
    if (Number.isNaN(matDate.getTime())) continue;

    const daysDiff = (matDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    const yearsLeft = daysDiff / 365.25;
    if (yearsLeft < minYears || yearsLeft > maxYears) continue;

    const ytm =
      num(b.YIELD) ||
      num(b.YIELD_TO_MATURITY) ||
      num(b.YIELD_TO_MATURITY_PREV) ||
      num(b.YIELDTOOFFER);
    const clean =
      num(b.CLEANPRICE) ||
      num(b.CLEAN_PRICE) ||
      num(b.PREVPRICE) ||
      num(b.LCLOSEPRICE);

    if (!ytm || !clean || ytm <= 0 || clean <= 0) continue;

    let liq = num(b.VALTODAY) || num(b.VALUE);
    if (!liq || liq <= 0) {
      const prevVol = num(b.PREVVOLUME) || 0.0;
      const prevPrice = num(b.PREVPRICE) || 100.0;
      const faceVal = num(b.FACEVALUE, 1000.0) || 1000.0;
      liq = prevVol * (prevPrice / 100.0) * (faceVal / 1000.0);
    }

    if (liq < minLiq) continue;

    const faceVal = num(b.FACEVALUE, 1000.0) || 1000.0;
    const cpy = num(b.COUPONPERYEAR, 2) || 2;
    const cVal = num(b.COUPONVALUE);

    let couponPct = 0.0;
    if (cVal !== null && cVal > 0) {
      couponPct = ((cVal * cpy) / faceVal) * 100.0;
    } else {
      couponPct = num(b.COUPON) || num(b.COUPONPERCENT) || 0.0;
    }

    const ndi = Math.round((num(b.ACCRUEDINTEREST, 0.0) || 0.0) * 100) / 100;
    const cleanRound = Math.round(clean * 100) / 100;
    const cValNum = cVal !== null && cVal !== undefined ? Math.round(Number(cVal) * 100) / 100 : Math.round(((faceVal * (couponPct / 100)) / cpy) * 100) / 100;
    const nextCoupStr = String(b.NEXTCOUPON || "");

    let payoutMonths = [3, 9];
    if (nextCoupStr && nextCoupStr.length >= 7) {
      try {
        const baseM = parseInt(nextCoupStr.slice(5, 7), 10);
        const stepM = Math.max(1, Math.round(12 / cpy));
        payoutMonths = Array.from({ length: Math.round(cpy) }, (_, i) => ((baseM - 1 + i * stepM) % 12) + 1).sort((a, b) => a - b);
      } catch {
        payoutMonths = cpy === 2 ? [3, 9] : [1, 4, 7, 10];
      }
    }

    cands.push({
      secid,
      name: String(b.SHORTNAME || ""),
      face: faceVal,
      cpy,
      coupon_pct: Math.round(couponPct * 100) / 100,
      coupon_value: cValNum,
      next_coupon: nextCoupStr,
      payout_months: payoutMonths,
      maturity: matStr.slice(0, 10),
      years_left: Math.round(yearsLeft * 100) / 100,
      ytm: Math.round(ytm * 100) / 100,
      clean: cleanRound,
      liq: Math.round(liq),
      ndi,
    });
  }

interface ScoredBond extends BondCandidate {
  moddur: number;
  price_to_par: number;
  discount: number;
  price_rub: number;
  score: number;
  ldv_eligible: boolean;
}

  const enriched: ScoredBond[] = [];
  for (const c of cands) {
    const moddur = modifiedDuration(
      c.coupon_pct,
      c.cpy,
      c.years_left,
      c.clean,
      c.ytm,
      c.face
    );
    if (!moddur) continue;

    const priceToPar = c.clean;
    enriched.push({
      ...c,
      moddur: Math.round(moddur * 100) / 100,
      price_to_par: Math.round(priceToPar * 100) / 100,
      discount: Math.round((100.0 - priceToPar) * 100) / 100,
      price_rub: Math.round((c.face * (c.clean / 100.0) + c.ndi) * 100) / 100,
      score: 0,
      ldv_eligible: c.years_left >= 3.0,
    });
  }

  if (enriched.length === 0) return [];

  const minmax = (vals: number[]) => {
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    if (hi - lo < 1e-9) return vals.map(() => 50.0);
    return vals.map((v) => ((v - lo) / (hi - lo)) * 100.0);
  };

  const nYtm = minmax(enriched.map((c) => c.ytm));
  const nInv = minmax(enriched.map((c) => 1.0 / c.moddur));
  const nLiq = minmax(enriched.map((c) => c.liq));
  const nDisc = minmax(enriched.map((c) => c.discount));

  const weights = [40.0, 30.0, 15.0, 15.0];
  const totW = 100.0;
  const w = weights.map((wi) => wi / totW);

  enriched.forEach((c, i) => {
    const sc =
      w[0] * nYtm[i] + w[1] * nInv[i] + w[2] * nLiq[i] + w[3] * nDisc[i];
    c.score = Math.round(sc * 100) / 100;
  });

  enriched.sort((a, b) => b.score - a.score);

  const finalList: ScoredBond[] = [];
  const counts: Record<string, number> = { short: 0, mid: 0, long: 0 };

  for (const c of enriched) {
    const bucket = c.years_left < 2 ? "short" : c.years_left <= 5 ? "mid" : "long";
    if (counts[bucket] < 2) {
      finalList.push(c);
      counts[bucket] += 1;
    }
  }

  return finalList.slice(0, topN);
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API endpoint running the Python script
  app.post("/api/ofz", async (req, res) => {
    const scriptPath = path.resolve(process.cwd(), "ofz_script.py");
    const configStr = req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : "";
    const args = configStr ? [scriptPath, configStr] : [scriptPath];

    execFile("python3", args, { timeout: 20000 }, async (error, stdout) => {
      if (!error && stdout) {
        try {
          const parsed = JSON.parse(stdout);
          return res.json({ data: parsed, source: "python" });
        } catch {
          // fallback
        }
      }
      try {
        const fallbackData = await fetchScoredOfzFallback(req.body);
        return res.json({ data: fallbackData, source: "node_fallback" });
      } catch (err) {
        return res.status(500).json({
          error: err instanceof Error ? err.message : "Ошибка при получении данных с MOEX ISS",
        });
      }
    });
  });

  // GET also supported for simple requests
  app.get("/api/ofz", async (_req, res) => {
    const scriptPath = path.resolve(process.cwd(), "ofz_script.py");
    execFile("python3", [scriptPath], { timeout: 20000 }, async (error, stdout) => {
      if (!error && stdout) {
        try {
          const parsed = JSON.parse(stdout);
          return res.json({ data: parsed, source: "python" });
        } catch {
          // fallback
        }
      }
      try {
        const fallbackData = await fetchScoredOfzFallback();
        return res.json({ data: fallbackData, source: "node_fallback" });
      } catch (err) {
        return res.status(500).json({
          error: err instanceof Error ? err.message : "Ошибка при получении данных с MOEX ISS",
        });
      }
    });
  });

  // System prompt specified in technical requirement
  const SYSTEM_PROMPT = `Ты — вежливый и профессиональный финансовый AI-ассистент. Твоя задача — помогать пользователю разобраться в аналитическом дашборде, который сравнивает государственные облигации (ОФЗ), банковские вклады и влияние инфляции.

Твои правила:
1. ДОМЕННАЯ ЗОНА: Отвечай ТОЛЬКО на вопросы, связанные с финансами, инвестициями, экономикой, работой дашборда и терминами (ОФЗ, YTM, купоны, инфляция, ставка ЦБ, сложный процент).
2. ЗАЩИТА ОТ ОФФТОПА: Если пользователь задает вопрос на любую другую тему (программирование, рецепты, политика, погода и т.д.), ты ОБЯЗАН ответить строго по шаблону: "Извините, но я настроен отвечать только на вопросы о финансах, инвестициях и работе этого аналитического калькулятора. Чем я могу помочь вам в этих темах?"
3. НЕТ ИИР: Ты не даешь индивидуальных инвестиционных рекомендаций. Не говори пользователю "покупай это" или "продавай то". Используй формулировки: "Исторически...", "Математика показывает...", "На дашборде видно, что...".
4. СТИЛЬ ОБЩЕНИЯ: Пиши просто, понятно для новичков. Избегай излишне сложного академического языка. Если используешь термин (например, YTM), кратко объясни его. Форматируй текст: используй списки и выделяй главное **жирным**.
5. КОНТЕКСТ: Если в запросе переданы текущие параметры пользователя (сумма, выбранные бумаги), опирайся на них в своих расчетах и ответах.`;

  function generateIntelligentFallback(query: string, context?: string): string {
    const q = query.toLowerCase();

    // Check offtop
    const financeKeywords = [
      "ytm", "офз", "вклад", "доходност", "купон", "инфляц", "цб", "ставк", "процент",
      "капитал", "сложн", "реинвест", "брокер", "портфел", "акци", "облигац", "сбережен",
      "прибыль", "деньг", "рубл", "пополнен", "горизонт", "расчет", "дашборд", "минфин",
      "подушк", "ликвидност", "риск", "накоплен"
    ];
    const isFinance = financeKeywords.some((kw) => q.includes(kw));

    if (!isFinance) {
      return "Извините, но я настроен отвечать только на вопросы о финансах, инвестициях и работе этого аналитического калькулятора. Чем я могу помочь вам в этих темах?";
    }

    if (q.includes("ytm") || q.includes("доходность к погашению")) {
      return `**YTM (Yield to Maturity / Доходность к погашению)** — это полная годовая доходность облигации, которую получит инвестор, если:
1. Купит бумагу по текущей рыночной цене;
2. Будет удерживать её до самого погашения номинала (1000 ₽);
3. Будет реинвестировать все поступающие купоны под ту же ставку.

В отличие от простого купонного процента, **YTM учитывает не только купоны, но и дисконт** (разницу между ценой покупки со скидкой и выплатой 100% номинала Минфином).`;
    }

    if (q.includes("риск") && (q.includes("вклад") || q.includes("банк"))) {
      return `Главный скрытый риск банковского вклада на долгосрочном горизонте — **риск реинвестирования (Reinvestment Risk)**:
- Сейчас банк предлагает высокий процент (18–20%), но **только на 3–6 месяцев**.
- По официальному прогнозу ЦБ РФ ключевая ставка в ближайшие 2–3 года будет снижаться (с 19% до 10–14% и далее к 8%).
- Когда срок вашего текущего вклада закончится, банк предложит открыть новый депозит уже под существенно более низкую ставку.

**В ОФЗ же высокая доходность юридически фиксируется на весь срок обращения бумаги (3–8 лет)**, защищая вас от снижения ставок регулятором.`;
    }

    if (q.includes("сложн") || q.includes("реинвест")) {
      return `**Сложный процент (реинвестирование)** — это механизм, при котором поступающий доход начинает приносить новый доход:
- Когда вам поступает купон по ОФЗ, вы не выводите его на карту, а **докупаете на него новые облигации**.
- Каждая докупленная облигация приносит новые купоны в следующую выплату.
- В результате кривая роста вашего капитала начинает расти не по прямой линии, а по экспоненте (геометрическая прогрессия).

На нашем графике включение тумблера **«Реинвестировать купоны»** наглядно показывает, как дополнительная прибыль от сложного процента может составлять сотни тысяч рублей.`;
    }

    if (q.includes("почему") && (q.includes("офз больше") || q.includes("прибыль") || q.includes("выигрыва"))) {
      return `На дашборде видно, что **ОФЗ опережают банковский вклад**, и вот почему:
1. **Фиксация доходности**: в ОФЗ ставка зафиксирована на весь выбранный горизонт от Минфина РФ.
2. **Прогноз снижения ставки ЦБ**: вкладчик неизбежно столкнется с падением доходности депозитов при пролонгациях через 1–2 года.
3. **Постоянные купоны и дисконт**: покупка бумаг ниже номинала дает дополнительную премию при погашении в 1000 ₽.

${context ? `По вашим текущим параметрам: на дистанции ОФЗ формируют заметную дополнительную прибыль по сравнению с постоянным продлением вкладов.` : ""}`;
    }

    return `Математика расчетов показывает:
- **ОФЗ** фиксируют двузначную доходность на весь выбранный срок от государства (Минфин РФ).
- **Банковский вклад** дает высокий процент сейчас, но ставка упадет при смягчении политики ЦБ.
- **Инфляция** непрерывно обесценивает сбережения, если хранить деньги наличными или на беспроцентной карте.

Вы можете уточнить любой параметр калькулятора или термин (например, задать вопрос про YTM, дюрацию или сложный процент)!`;
  }

  // OpenRouter & AI Chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, context } = req.body;
      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "Массив messages обязателен" });
      }

      const formattedMessages: { role: string; content: string }[] = [
        { role: "system", content: SYSTEM_PROMPT }
      ];

      for (let i = 0; i < messages.length - 1; i++) {
        const m = messages[i];
        if (m && (m.role === "user" || m.role === "assistant")) {
          formattedMessages.push({ role: m.role, content: String(m.content) });
        }
      }

      const lastMessage = messages[messages.length - 1];
      let lastContent = String(lastMessage.content || "");
      if (context && typeof context === "string") {
        lastContent = `${context}\n\nВОПРОС ПОЛЬЗОВАТЕЛЯ: ${lastContent}`;
      }
      formattedMessages.push({ role: "user", content: lastContent });

      // 1. Try OpenRouter API if OPENROUTER_API_KEY is present
      const openRouterKey = process.env.OPENROUTER_API_KEY;
      if (openRouterKey && openRouterKey !== "your-openrouter-key") {
        try {
          const orResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${openRouterKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "http://localhost:3000",
              "X-Title": "OFZ Financial Calculator"
            },
            body: JSON.stringify({
              model: "openai/gpt-4o-mini",
              messages: formattedMessages,
              temperature: 0.3
            })
          });

          if (orResp.ok) {
            const orData = await orResp.json();
            const reply = orData.choices?.[0]?.message?.content;
            if (reply) {
              return res.json({ reply, provider: "openrouter" });
            }
          } else {
            console.warn("OpenRouter API response error:", orResp.status, await orResp.text());
          }
        } catch (orErr) {
          console.warn("OpenRouter API error:", orErr);
        }
      }

      // 2. Fallback to Gemini if GEMINI_API_KEY is present
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (geminiApiKey) {
        try {
          const { GoogleGenAI } = await import("@google/genai");
          const ai = new GoogleGenAI({ apiKey: geminiApiKey });
          const contents = formattedMessages
            .filter((m) => m.role !== "system")
            .map((m) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }]
            }));

          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            config: {
              systemInstruction: SYSTEM_PROMPT,
              temperature: 0.3
            },
            contents
          });

          const reply = response.text;
          if (reply) {
            return res.json({ reply, provider: "gemini" });
          }
        } catch (geminiErr) {
          console.warn("Gemini API fallback error:", geminiErr);
        }
      }

      // 3. Fallback to contextual financial domain generator
      const reply = generateIntelligentFallback(lastMessage.content, context);
      return res.json({ reply, provider: "fallback_domain" });
    } catch (err) {
      console.error("Chat endpoint error:", err);
      return res.status(500).json({ error: "Ошибка при обработке запроса чата" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

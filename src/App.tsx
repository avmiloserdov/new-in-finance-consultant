import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ShieldCheck,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Landmark,
  BarChart3,
  Coins,
  Calendar,
  Layers,
  Sliders,
  Wallet,
  X,
  Check,
  ChevronRight,
  Info,
  TrendingDown,
  DollarSign,
  Percent,
  HelpCircle,
  Play,
  Settings2
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";
import { AiAssistantWidget } from "./components/AiAssistantWidget";

export interface OfzBond {
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
  moddur: number;
  price_to_par: number;
  discount: number;
  price_rub?: number;
  score: number;
  ldv_eligible: boolean;
}

export type AnswerKey = "A" | "B" | "V" | "G";

export interface QuestionOption {
  key: AnswerKey;
  title: string;
}

export interface QuestionData {
  id: number;
  kicker: string;
  title: string;
  subtitle: string;
  options: QuestionOption[];
}

const QUESTIONS: QuestionData[] = [
  {
    id: 1,
    kicker: "Распределение доходов",
    title: "1. Как сейчас распределяются ваши доходы в конце месяца?",
    subtitle: "Оцените реальную ситуацию с расходами, кредитами и остатком средств.",
    options: [
      {
        key: "A",
        title: "Почти всё уходит на жизнь и/или кредиты. Свободных денег почти не остается."
      },
      {
        key: "B",
        title: "Кредитов нет, но и финансовой подушки (запаса на 3–6 месяцев) пока нет."
      },
      {
        key: "V",
        title: "Есть запас на 3–6 месяцев на вкладе, и помимо этого остаются свободные деньги."
      }
    ]
  },
  {
    id: 2,
    kicker: "Цель накоплений",
    title: "2. Вспомните свои текущие накопления. Для чего они предназначены в реальности?",
    subtitle: "Реальный горизонт использования накопленных средств.",
    options: [
      {
        key: "A",
        title: "Деньги «на всякий случай» или на ближайшие траты (отпуск, ремонт). Могут понадобиться в течение года."
      },
      {
        key: "B",
        title: "Коплю на конкретную цель (взнос по ипотеке, авто), которая предстоит через 1–3 года."
      },
      {
        key: "V",
        title: "Это деньги на далекое будущее (пенсия, капитал для детей). Не планирую их трогать ближайшие 5–10 лет."
      }
    ]
  },
  {
    id: 3,
    kicker: "Опыт и отношение к просадкам",
    title: "3. Вспомните ситуацию, когда ваши сбережения обесценивались (скачок инфляции, падение курса, неудачная покупка). Как вы действовали?",
    subtitle: "Ваш реальный психологический опыт при столкновении с финансовыми рисками.",
    options: [
      {
        key: "A",
        title: "Я всегда храню деньги только на вкладах. Для меня невыносима мысль о потере даже копейки."
      },
      {
        key: "B",
        title: "Был опыт просадок. Я занервничал и продал активы/снял деньги, чтобы не потерять больше."
      },
      {
        key: "V",
        title: "Был опыт просадок. Я спокойно переждал (или докупил актив), так как понимал, что это временно."
      },
      {
        key: "G",
        title: "Я никогда не сталкивался с существенным падением своих сбережений или неудачными вложениями."
      }
    ]
  },
  {
    id: 4,
    kicker: "Неожиданные доходы",
    title: "4. Как вы распоряжались неожиданными деньгами за последний год (премия, подаренные деньги, кэшбэк)?",
    subtitle: "Куда отправляются незапланированные поступления.",
    options: [
      {
        key: "A",
        title: "Оставлял на карте или базовом вкладе, чтобы не сгорели."
      },
      {
        key: "B",
        title: "Тратил на текущие нужды или приятные покупки (важно чувствовать деньги здесь и сейчас)."
      },
      {
        key: "V",
        title: "Искал способ вложить их под процент повыше и не трогал."
      }
    ]
  }
];

export interface InvestorProfile {
  type: "conservative" | "cautious" | "rentier" | "aggressive";
  title: string;
  statusBadge: string;
  summary: string;
  recommendation: string;
  horizonYears: number;
  expectedReturn: string;
  targetGoal: string;
  allocation: { name: string; pct: number; color: string; desc: string }[];
  keyAdvantages: { title: string; desc: string }[];
  honestPenalty?: boolean;
}

export function calculateProfile(
  answers: Record<number, AnswerKey>,
  q5Score: number,
  q5Tool: AnswerKey
): InvestorProfile {
  const isHonestPenalty = q5Score >= 8 && q5Tool === "A";

  // Base scenario is always Conservative: portfolio of OFZ + Deposit
  return {
    type: "conservative",
    title: "Консервативный профиль инвестора",
    statusBadge: "Сохранение капитала & Защита от инфляции",
    summary:
      "Для вашего профиля ключевая задача — гарантированно защитить накопления от инфляции и исключить биржевые просадки. Оптимальным решением является портфель, состоящий из ОФЗ и банковского вклада.",
    recommendation:
      "Основа портфеля — надежные государственные облигации (ОФЗ, 70%), которые юридически фиксируют высокую двузначную ставку на весь срок, защищая от снижения процентов по депозитам в будущем. Оставшиеся 30% размещаются на банковском вкладе или накопительном счете для оперативной подушки ликвидности.",
    horizonYears: answers[2] === "A" ? 1 : answers[2] === "B" ? 3 : 5,
    expectedReturn: "15-17% годовых",
    targetGoal: "Опережение инфляции и вкладов при нулевом кредитном риске",
    allocation: [
      {
        name: "Облигации федерального займа (ОФЗ)",
        pct: 70,
        color: "#7863F6",
        desc: "Юридическая гарантия возврата номинала и купонов от Минфина РФ. Фиксация высокой ставки на годы вперед."
      },
      {
        name: "Банковский вклад / Накопительный счет",
        pct: 30,
        color: "#38bdf8",
        desc: "Ликвидная подушка безопасности под страховой защитой Агентства по страхованию вкладов (АСВ до 1,4 млн ₽)."
      }
    ],
    keyAdvantages: [
      {
        title: "Фиксация ставки на несколько лет",
        desc: "В отличие от вклада, где банк снизит процент через 3–6 месяцев вслед за ключевой ставкой ЦБ, ОФЗ фиксируют доходность до самого погашения."
      },
      {
        title: "Государственная надежность",
        desc: "ОФЗ обеспечены бюджетом Российской Федерации (Минфин РФ), а вклад застрахован государственной системой АСВ."
      },
      {
        title: "Регулярный купонный доход",
        desc: "Выплаты поступают каждые 6 месяцев прямо на ваш банковский или брокерский счет с возможностью реинвестирования."
      }
    ],
    honestPenalty: isHonestPenalty
  };
}

function getViridisStyle(value: number, min: number, max: number): {
  backgroundColor: string;
  color: string;
} {
  const stops: [number, number, number][] = [
    [68, 1, 84],
    [59, 82, 139],
    [33, 145, 140],
    [94, 201, 98],
    [253, 231, 37]
  ];

  let t = max - min < 1e-9 ? 0.5 : (value - min) / (max - min);
  t = Math.max(0, Math.min(1, t));

  const scaled = t * (stops.length - 1);
  const idx = Math.min(Math.floor(scaled), stops.length - 2);
  const frac = scaled - idx;

  const c1 = stops[idx];
  const c2 = stops[idx + 1];

  const r = Math.round(c1[0] + (c2[0] - c1[0]) * frac);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * frac);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * frac);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const textColor = luminance > 0.58 ? "#0b0b0f" : "#ffffff";

  return {
    backgroundColor: `rgb(${r}, ${g}, ${b})`,
    color: textColor
  };
}

const ENCOURAGEMENTS_AFTER_QUESTION: Record<number, string> = {
  1: "Отличное начало! 1-й вопрос пройден.",
  2: "Почти половина позади! Переходим к рискам.",
  3: "Больше половины пройдено! Отличный темп.",
  4: "Остался последний шаг перед профилем!"
};

const DEFAULT_OFZ_BONDS: OfzBond[] = [
  {
    secid: "SU26245RMFS9",
    name: "ОФЗ 26245",
    face: 1000,
    cpy: 2,
    coupon_pct: 11.97,
    coupon_value: 59.84,
    next_coupon: "2027-04-07",
    payout_months: [4, 10],
    maturity: "2035-09-26",
    years_left: 8.96,
    ytm: 16.85,
    clean: 80.85,
    liq: 1480000000,
    ndi: 0,
    moddur: 4.88,
    price_to_par: 80.85,
    discount: 19.15,
    price_rub: 808.5,
    score: 64.81,
    ldv_eligible: true
  },
  {
    secid: "SU26252RMFS5",
    name: "ОФЗ 26252",
    face: 1000,
    cpy: 2,
    coupon_pct: 12.47,
    coupon_value: 62.33,
    next_coupon: "2026-10-21",
    payout_months: [4, 10],
    maturity: "2033-10-12",
    years_left: 7.0,
    ytm: 16.69,
    clean: 85.8,
    liq: 1380000000,
    ndi: 0,
    moddur: 4.28,
    price_to_par: 85.8,
    discount: 14.2,
    price_rub: 858.0,
    score: 62.65,
    ldv_eligible: true
  },
  {
    secid: "SU26212RMFS9",
    name: "ОФЗ 26212",
    face: 1000,
    cpy: 2,
    coupon_pct: 7.03,
    coupon_value: 35.15,
    next_coupon: "2027-01-20",
    payout_months: [1, 7],
    maturity: "2028-01-19",
    years_left: 1.27,
    ytm: 13.84,
    clean: 92.8,
    liq: 75000000,
    ndi: 0,
    moddur: 1.35,
    price_to_par: 92.8,
    discount: 7.2,
    price_rub: 928.0,
    score: 58.65,
    ldv_eligible: false
  },
  {
    secid: "SU26236RMFS8",
    name: "ОФЗ 26236",
    face: 1000,
    cpy: 2,
    coupon_pct: 5.68,
    coupon_value: 28.42,
    next_coupon: "2026-11-18",
    payout_months: [5, 11],
    maturity: "2028-05-17",
    years_left: 1.6,
    ytm: 14.66,
    clean: 88.16,
    liq: 335000000,
    ndi: 0,
    moddur: 1.78,
    price_to_par: 88.16,
    discount: 11.84,
    price_rub: 881.6,
    score: 58.03,
    ldv_eligible: false
  },
  {
    secid: "SU26237RMFS6",
    name: "ОФЗ 26237",
    face: 1000,
    cpy: 2,
    coupon_pct: 6.68,
    coupon_value: 33.41,
    next_coupon: "2027-03-17",
    payout_months: [3, 9],
    maturity: "2029-03-14",
    years_left: 2.42,
    ytm: 14.93,
    clean: 85.0,
    liq: 45000000,
    ndi: 0,
    moddur: 2.16,
    price_to_par: 85.0,
    discount: 15.0,
    price_rub: 850.0,
    score: 52.7,
    ldv_eligible: false
  }
];

const MONTH_NAMES = [
  "Янв", "Фев", "Мар", "Апр", "Май", "Июн",
  "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"
];

// Official Bank of Russia (CBR) Macroeconomic Forecast trajectory
export const CBR_FORECAST_BY_YEAR = [
  { year: 1, cbrRate: 19.0, inflation: 8.5, desc: "Высокая ставка для охлаждения спроса" },
  { year: 2, cbrRate: 15.0, inflation: 5.5, desc: "Начало цикла смягчения ДКП" },
  { year: 3, cbrRate: 10.5, inflation: 4.5, desc: "Приближение к нейтральной ставке" },
  { year: 4, cbrRate: 8.5, inflation: 4.0, desc: "Таргет инфляции 4.0% достигнут" },
  { year: 5, cbrRate: 8.0, inflation: 4.0, desc: "Долгосрочный нейтральный уровень" }
];

export function getCbrKeyRateForYear(yearIndex: number): number {
  if (yearIndex <= 0) return 0.19;
  if (yearIndex === 1) return 0.19;
  if (yearIndex === 2) return 0.15;
  if (yearIndex === 3) return 0.105;
  if (yearIndex === 4) return 0.085;
  return 0.08;
}

export function getInflationForYear(yearIndex: number): number {
  if (yearIndex <= 0) return 0.085;
  if (yearIndex === 1) return 0.085;
  if (yearIndex === 2) return 0.055;
  if (yearIndex === 3) return 0.045;
  return 0.04;
}

function useAnimatedNumber(value: number, durationMs = 350): number {
  const [displayVal, setDisplayVal] = useState(value);
  const startRef = useRef(displayVal);
  const targetRef = useRef(value);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = displayVal;
    targetRef.current = value;
    startTimeRef.current = null;

    let animId: number;
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(1, elapsed / durationMs);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startRef.current + (targetRef.current - startRef.current) * ease;
      setDisplayVal(current);

      if (progress < 1) {
        animId = requestAnimationFrame(animate);
      } else {
        setDisplayVal(targetRef.current);
      }
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [value, durationMs]);

  return displayVal;
}

export default function App() {
  // Step flow:
  // 1..5: Questions
  // 6: Labor illusion (loading calculation)
  // 7: Profile conclusion + Initial parameter sliders + Button "Получить стратегию"
  // 8: Analytical page (comparison charts, MOEX table, + interactive sliders at bottom)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [answers, setAnswers] = useState<Record<number, AnswerKey>>({});
  const [q5Score, setQ5Score] = useState<number | null>(null);
  const [q5Tool, setQ5Tool] = useState<AnswerKey | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [selectedOption, setSelectedOption] = useState<AnswerKey | null>(null);
  const [laborPhase, setLaborPhase] = useState<number>(0);

  // OFZ script execution state
  const [ofzData, setOfzData] = useState<OfzBond[] | null>(null);
  const [ofzLoading, setOfzLoading] = useState<boolean>(false);
  const [ofzError, setOfzError] = useState<string | null>(null);
  const [ofzFetchedAt, setOfzFetchedAt] = useState<string | null>(null);

  // Portfolio & Comparison Dashboard Parameters
  const [initialAmount, setInitialAmount] = useState<number>(50000);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(15000);
  const [years, setYears] = useState<number>(5);
  const [selectedBondIds, setSelectedBondIds] = useState<string[]>(["SU26245RMFS9", "SU26252RMFS5"]);
  const [bondWeights, setBondWeights] = useState<Record<string, number>>({
    SU26245RMFS9: 50,
    SU26252RMFS5: 50
  });

  // Active view tab: comparison (vs deposit & inflation), ofzGrowth, or cashflow
  const [activeVisualTab, setActiveVisualTab] = useState<"comparison" | "ofzGrowth" | "cashflow">("comparison");
  const [isReinvesting, setIsReinvesting] = useState<boolean>(true);

  // Visible lines toggles for comparison chart
  const [showOfzLine, setShowOfzLine] = useState<boolean>(true);
  const [showDepositLine, setShowDepositLine] = useState<boolean>(true);
  const [showNoToolsLine, setShowNoToolsLine] = useState<boolean>(true);
  const [showInflationLine, setShowInflationLine] = useState<boolean>(true);

  // Modal for broker explanation
  const [isBrokerModalOpen, setIsBrokerModalOpen] = useState<boolean>(false);

  // Set default slider values from questionnaire answers when reaching step 7
  useEffect(() => {
    if (currentStep === 7) {
      if (answers[2] === "A") setYears(1);
      else if (answers[2] === "B") setYears(3);
      else if (answers[2] === "V") setYears(5);

      if (answers[4] === "B") {
        setIsReinvesting(false);
      } else {
        setIsReinvesting(true);
      }

      if (!ofzData && !ofzLoading) {
        handleRunOfzScript();
      }
    }
  }, [currentStep]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Labor illusion timer: from step 6 -> step 7 (profile conclusion)
  useEffect(() => {
    if (currentStep === 6) {
      setLaborPhase(0);
      const t1 = setTimeout(() => setLaborPhase(1), 900);
      const t2 = setTimeout(() => setLaborPhase(2), 1800);
      const t3 = setTimeout(() => {
        setCurrentStep(7);
      }, 2700);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [currentStep]);

  const handleSelectAnswer = (qId: number, key: AnswerKey) => {
    setSelectedOption(key);
    setAnswers((prev) => ({ ...prev, [qId]: key }));

    const toast = ENCOURAGEMENTS_AFTER_QUESTION[qId];
    if (toast) {
      setToastMessage(toast);
    }

    setTimeout(() => {
      setSelectedOption(null);
      setCurrentStep((prev) => prev + 1);
    }, 380);
  };

  const handleStep5Submit = () => {
    if (q5Score === null || q5Tool === null) return;
    setCurrentStep(6);
  };

  const handleRestart = () => {
    setAnswers({});
    setQ5Score(null);
    setQ5Tool(null);
    setSelectedOption(null);
    setOfzData(null);
    setOfzError(null);
    setCurrentStep(1);
  };

  const handleRunOfzScript = async () => {
    setOfzLoading(true);
    setOfzError(null);
    try {
      const configPayload: Record<string, unknown> = {
        top_n: 8,
        variant: "C"
      };

      const response = await fetch("/api/ofz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configPayload)
      });

      if (!response.ok) {
        const errObj = await response.json().catch(() => ({}));
        throw new Error(errObj.error || `Ошибка сервера (${response.status})`);
      }

      const res = await response.json();
      const items: OfzBond[] = Array.isArray(res.data) && res.data.length > 0 ? res.data : DEFAULT_OFZ_BONDS;
      setOfzData(items);

      if (items.length >= 2) {
        const id1 = items[0].secid;
        const id2 = items[1].secid;
        setSelectedBondIds([id1, id2]);
        setBondWeights({ [id1]: 50, [id2]: 50 });
      } else if (items.length === 1) {
        setSelectedBondIds([items[0].secid]);
        setBondWeights({ [items[0].secid]: 100 });
      }

      setOfzFetchedAt(
        new Date().toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        })
      );
    } catch (err) {
      setOfzError(
        err instanceof Error ? err.message : "Не удалось запустить расчет ОФЗ. Используются актуальные данные по умолчанию."
      );
      setOfzData(DEFAULT_OFZ_BONDS);
    } finally {
      setOfzLoading(false);
    }
  };

  const availableBonds: OfzBond[] = useMemo(() => {
    return ofzData && ofzData.length > 0 ? ofzData : DEFAULT_OFZ_BONDS;
  }, [ofzData]);

  const handleToggleBond = (secid: string) => {
    if (selectedBondIds.includes(secid)) {
      if (selectedBondIds.length === 1) return;
      const remaining = selectedBondIds.filter((id) => id !== secid);
      setSelectedBondIds(remaining);
      const equalShare = Math.round(100 / remaining.length);
      const newWeights: Record<string, number> = {};
      remaining.forEach((id, idx) => {
        newWeights[id] = idx === remaining.length - 1 ? 100 - equalShare * (remaining.length - 1) : equalShare;
      });
      setBondWeights(newWeights);
    } else {
      const next = [...selectedBondIds, secid];
      setSelectedBondIds(next);
      const equalShare = Math.round(100 / next.length);
      const newWeights: Record<string, number> = {};
      next.forEach((id, idx) => {
        newWeights[id] = idx === next.length - 1 ? 100 - equalShare * (next.length - 1) : equalShare;
      });
      setBondWeights(newWeights);
    }
  };

  const handleWeightChange = (secid: string, newWeight: number) => {
    const others = selectedBondIds.filter((id) => id !== secid);
    if (others.length === 0) {
      setBondWeights({ [secid]: 100 });
      return;
    }
    const clamped = Math.max(5, Math.min(95, newWeight));
    const remainingBudget = 100 - clamped;
    const otherTotal = others.reduce((acc, id) => acc + (bondWeights[id] || 0), 0) || 1;

    const updated: Record<string, number> = { [secid]: clamped };
    let distributed = 0;
    others.forEach((id, idx) => {
      if (idx === others.length - 1) {
        updated[id] = Math.max(1, remainingBudget - distributed);
      } else {
        const share = Math.round(((bondWeights[id] || 0) / otherTotal) * remainingBudget);
        updated[id] = Math.max(1, share);
        distributed += share;
      }
    });
    setBondWeights(updated);
  };

  const portfolioMetrics = useMemo(() => {
    const selected = availableBonds.filter((b) => selectedBondIds.includes(b.secid));
    if (selected.length === 0) {
      return { weightedYtm: 15.0, weightedCouponPct: 10.0 };
    }
    let totalWeight = 0;
    let sumYtm = 0;
    let sumCoupon = 0;

    selected.forEach((b) => {
      const w = (bondWeights[b.secid] || 0) / 100;
      totalWeight += w;
      sumYtm += (b.ytm || 15) * w;
      sumCoupon += (b.coupon_pct || 10) * w;
    });

    const weightedYtm = totalWeight > 0 ? sumYtm / totalWeight : 15.0;
    const weightedCouponPct = totalWeight > 0 ? sumCoupon / totalWeight : 10.0;

    return {
      weightedYtm,
      weightedCouponPct,
      selected
    };
  }, [availableBonds, selectedBondIds, bondWeights]);

  // CALCULATION ENGINE:
  // 1. OFZ: locked yield (weightedYtm) across the period
  // 2. Bank Deposit: rate equals CBR key rate forecast path (19% -> 15% -> 10.5% -> 8.5% -> 8.0%)
  // 3. No tools (nominal): cash / 0% card (simply total contributions)
  // 4. Inflation: purchasing power of money kept without tools (deflated by cumulative inflation)
  const {
    comparisonChartData,
    finalOfzCapital,
    finalDepositCapital,
    finalNoToolsNominal,
    finalInflationPurchasingPower,
    ofzAdvantageOverDeposit,
    ofzAdvantagePercent,
    inflationLossRub,
    inflationLossPercent,
    totalProfitOfz,
    totalProfitDeposit,
    averageMonthlyPassive
  } = useMemo(() => {
    const ofzAnnualRate = portfolioMetrics.weightedYtm / 100;
    const ofzMonthlyRate = ofzAnnualRate / 12;

    const data: {
      year: number;
      label: string;
      ofzTotal: number;
      depositTotal: number;
      noToolsNominal: number;
      inflationPurchasingPower: number;
      ofzProfit: number;
      cbrRate: number;
      inflationRate: number;
    }[] = [];

    let currentOfz = initialAmount;
    let currentDeposit = initialAmount;
    let currentNominal = initialAmount;
    let cumulativeInflationMultiplier = 1.0;

    data.push({
      year: 0,
      label: "Старт",
      ofzTotal: Math.round(initialAmount),
      depositTotal: Math.round(initialAmount),
      noToolsNominal: Math.round(initialAmount),
      inflationPurchasingPower: Math.round(initialAmount),
      ofzProfit: 0,
      cbrRate: 19.0,
      inflationRate: 8.5
    });

    for (let y = 1; y <= years; y++) {
      const yearCbrRate = getCbrKeyRateForYear(y);
      const yearDepositMonthlyRate = yearCbrRate / 12;
      const yearInflationRate = getInflationForYear(y);

      cumulativeInflationMultiplier *= 1 + yearInflationRate;

      for (let m = 1; m <= 12; m++) {
        currentNominal += monthlyContribution;

        // OFZ: Locked yield with or without coupon reinvestment
        if (isReinvesting) {
          currentOfz = (currentOfz + monthlyContribution) * (1 + ofzMonthlyRate);
        } else {
          const couponThisMonth = currentOfz * ofzMonthlyRate;
          currentOfz += monthlyContribution + couponThisMonth;
        }

        // Bank Deposit: compounded monthly at current year's CBR key rate
        currentDeposit = (currentDeposit + monthlyContribution) * (1 + yearDepositMonthlyRate);
      }

      const realPurchasingPower = currentNominal / cumulativeInflationMultiplier;
      const ofzProfit = Math.max(0, currentOfz - currentNominal);

      data.push({
        year: y,
        label: `${y} ${y === 1 ? "год" : y < 5 ? "года" : "лет"}`,
        ofzTotal: Math.round(currentOfz),
        depositTotal: Math.round(currentDeposit),
        noToolsNominal: Math.round(currentNominal),
        inflationPurchasingPower: Math.round(realPurchasingPower),
        ofzProfit: Math.round(ofzProfit),
        cbrRate: +(yearCbrRate * 100).toFixed(1),
        inflationRate: +(yearInflationRate * 100).toFixed(1)
      });
    }

    const finalOfz = currentOfz;
    const finalDeposit = currentDeposit;
    const finalNominal = currentNominal;
    const finalInflation = currentNominal / cumulativeInflationMultiplier;

    const advantageOverDeposit = Math.max(0, finalOfz - finalDeposit);
    const advantagePct = finalDeposit > 0 ? (advantageOverDeposit / finalDeposit) * 100 : 0;

    const lossRub = Math.max(0, finalNominal - finalInflation);
    const lossPct = finalNominal > 0 ? (lossRub / finalNominal) * 100 : 0;

    const profitOfz = Math.max(0, finalOfz - finalNominal);
    const profitDeposit = Math.max(0, finalDeposit - finalNominal);

    const avgMonthly = (finalOfz * (portfolioMetrics.weightedCouponPct / 100)) / 12;

    return {
      comparisonChartData: data,
      finalOfzCapital: finalOfz,
      finalDepositCapital: finalDeposit,
      finalNoToolsNominal: finalNominal,
      finalInflationPurchasingPower: finalInflation,
      ofzAdvantageOverDeposit: advantageOverDeposit,
      ofzAdvantagePercent: advantagePct,
      inflationLossRub: lossRub,
      inflationLossPercent: lossPct,
      totalProfitOfz: profitOfz,
      totalProfitDeposit: profitDeposit,
      averageMonthlyPassive: avgMonthly
    };
  }, [initialAmount, monthlyContribution, years, portfolioMetrics, isReinvesting]);

  // Cashflow distribution by month
  const cashflowData = useMemo(() => {
    const monthTotals = Array(12).fill(0);

    const selected = availableBonds.filter((b) => selectedBondIds.includes(b.secid));
    if (selected.length === 0) {
      return MONTH_NAMES.map((m) => ({ month: m, amount: 0 }));
    }

    selected.forEach((b) => {
      const share = (bondWeights[b.secid] || 0) / 100;
      const allocatedCapital = finalOfzCapital * share;
      const annualBondCoupon = allocatedCapital * (b.coupon_pct / 100);
      const cpy = b.cpy || 2;
      const payoutPerOccurrence = annualBondCoupon / cpy;
      const months = b.payout_months && b.payout_months.length > 0 ? b.payout_months : [4, 10];

      months.forEach((m) => {
        const zeroIndex = (m - 1) % 12;
        monthTotals[zeroIndex] += payoutPerOccurrence;
      });
    });

    return MONTH_NAMES.map((m, idx) => ({
      month: m,
      amount: Math.round(monthTotals[idx])
    }));
  }, [availableBonds, selectedBondIds, bondWeights, finalOfzCapital]);

  const animFinalOfz = useAnimatedNumber(finalOfzCapital);
  const animFinalDeposit = useAnimatedNumber(finalDepositCapital);
  const animAdvantage = useAnimatedNumber(ofzAdvantageOverDeposit);
  const animInflationLoss = useAnimatedNumber(inflationLossRub);

  const progressPercent =
    currentStep === 0
      ? 0
      : currentStep <= 5
      ? Math.round((currentStep / 5) * 100)
      : 100;

  const profile = useMemo(() => {
    return calculateProfile(answers, q5Score || 5, q5Tool || "B");
  }, [answers, q5Score, q5Tool]);

  const laborMessages = [
    "Загружаем котировки ОФЗ с Московской Биржи (TQOB)...",
    "Моделируем траекторию ставки ЦБ и инфляции...",
    "Определяем инвестиционный профиль и защитный портфель..."
  ];

  const leftSideTitles: Record<number, string> = {
    1: "ФИНАНСОВЫЙ КОНСУЛЬТАНТ ДЛЯ НАЧИНАЮЩИХ ИНВЕСТОРОВ",
    2: "ЗАЩИТА НАКОПЛЕНИЙ И ГОРИЗОНТ ЦЕЛИ",
    3: "БЕЗОПАСНЫЙ СТАРТ И РИСК-ПРОФИЛЬ",
    4: "СРАВНЕНИЕ ДОХОДНОСТИ С ИНФЛЯЦИЕЙ",
    5: "УРОВЕНЬ КОНТРОЛЯ И ДИСЦИПЛИНЫ",
    6: "ФИНАНСОВЫЙ КОНСУЛЬТАНТ",
    7: "ЗАКЛЮЧЕНИЕ О ПРОФИЛЕ",
    8: "СРАВНЕНИЕ ОФЗ, ВКЛАДА И ИНФЛЯЦИИ"
  };

  // Reusable Sliders Component for both Step 7 and Step 8 (bottom interactive simulator)
  const renderSlidersBlock = (isBottomSimulator = false) => (
    <div className="bg-[#101017] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#7863F6]" />
            <span>{isBottomSimulator ? "Интерактивный симулятор параметров" : "Стартовые параметры расчета"}</span>
          </h3>
          <p className="text-[11px] text-white/50 mt-0.5">
            {isBottomSimulator
              ? "Подвигайте ползунки, чтобы проверить другие сценарии и суммы прямо сейчас"
              : "Укажите ваши текущие накопления, ежемесячный взнос и горизонт"}
          </p>
        </div>
        <div className="text-xs font-mono text-cyan-400">
          ОФЗ YTM: <span className="font-bold text-white">{portfolioMetrics.weightedYtm.toFixed(1)}%</span>
        </div>
      </div>

      {/* Slider 1: Initial Amount */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/70">Имеющиеся накопления (стартовая сумма)</span>
          <span className="font-mono font-bold text-white tabular-nums text-sm bg-white/5 px-2.5 py-0.5 rounded-md border border-white/10">
            {initialAmount.toLocaleString("ru-RU")} ₽
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1000000}
          step={5000}
          value={initialAmount}
          onChange={(e) => setInitialAmount(Number(e.target.value))}
          className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#7863F6]"
        />
        <div className="flex items-center justify-between text-[10px] text-white/40 font-mono">
          <button type="button" onClick={() => setInitialAmount(0)} className="hover:text-white cursor-pointer">0 ₽</button>
          <button type="button" onClick={() => setInitialAmount(50000)} className="hover:text-white cursor-pointer">50 000 ₽</button>
          <button type="button" onClick={() => setInitialAmount(150000)} className="hover:text-white cursor-pointer">150 000 ₽</button>
          <button type="button" onClick={() => setInitialAmount(500000)} className="hover:text-white cursor-pointer">500 000 ₽</button>
          <button type="button" onClick={() => setInitialAmount(1000000)} className="hover:text-white cursor-pointer">1 000 000 ₽</button>
        </div>
      </div>

      {/* Slider 2: Monthly Deposit */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/70">Сколько готовы откладывать в месяц</span>
          <span className="font-mono font-bold text-cyan-300 tabular-nums text-sm bg-cyan-950/40 px-2.5 py-0.5 rounded-md border border-cyan-800/40">
            +{monthlyContribution.toLocaleString("ru-RU")} ₽/мес
          </span>
        </div>
        <input
          type="range"
          min={1000}
          max={200000}
          step={1000}
          value={monthlyContribution}
          onChange={(e) => setMonthlyContribution(Number(e.target.value))}
          className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#7863F6]"
        />
        <div className="flex items-center justify-between text-[10px] text-white/40 font-mono">
          <button type="button" onClick={() => setMonthlyContribution(5000)} className="hover:text-white cursor-pointer">5 000 ₽</button>
          <button type="button" onClick={() => setMonthlyContribution(15000)} className="hover:text-white cursor-pointer">15 000 ₽</button>
          <button type="button" onClick={() => setMonthlyContribution(30000)} className="hover:text-white cursor-pointer">30 000 ₽</button>
          <button type="button" onClick={() => setMonthlyContribution(50000)} className="hover:text-white cursor-pointer">50 000 ₽</button>
          <button type="button" onClick={() => setMonthlyContribution(100000)} className="hover:text-white cursor-pointer">100 000 ₽</button>
        </div>
      </div>

      {/* Slider 3: Horizon Years */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/70">Срок накоплений (горизонт цели)</span>
          <span className="font-mono font-bold text-purple-200 tabular-nums text-sm bg-purple-950/40 px-2.5 py-0.5 rounded-md border border-purple-800/40">
            {years} {years === 1 ? "год" : years < 5 ? "года" : "лет"}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={15}
          step={1}
          value={years}
          onChange={(e) => setYears(Number(e.target.value))}
          className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#7863F6]"
        />
        <div className="flex items-center justify-between text-[10px] text-white/40 font-mono">
          <button type="button" onClick={() => setYears(1)} className="hover:text-white cursor-pointer">1 год</button>
          <button type="button" onClick={() => setYears(3)} className="hover:text-white cursor-pointer">3 года</button>
          <button type="button" onClick={() => setYears(5)} className="hover:text-white cursor-pointer">5 лет</button>
          <button type="button" onClick={() => setYears(7)} className="hover:text-white cursor-pointer">7 лет</button>
          <button type="button" onClick={() => setYears(10)} className="hover:text-white cursor-pointer">10 лет</button>
        </div>
      </div>

      {/* Reinvest Toggle */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-white">Реинвестировать купоны ОФЗ</div>
          <div className="text-[11px] text-white/40">
            {isReinvesting ? "Сложный процент: купоны покупают новые бумаги" : "Купоны накапливаются отдельно"}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsReinvesting(!isReinvesting)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
            isReinvesting ? "bg-[#7863F6]" : "bg-white/20"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isReinvesting ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Quick Summary of Values */}
      <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-mono bg-white/5 p-3 rounded-xl border border-white/10">
        <div>
          <div className="text-white/40 text-[11px]">Сумма личных пополнений:</div>
          <div className="text-white font-bold text-sm mt-0.5">
            {Math.round(finalNoToolsNominal).toLocaleString("ru-RU")} ₽
          </div>
        </div>
        <div>
          <div className="text-purple-300 text-[11px]">Ожидаемый капитал в ОФЗ:</div>
          <div className="text-emerald-400 font-bold text-sm mt-0.5">
            ~{Math.round(finalOfzCapital).toLocaleString("ru-RU")} ₽
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#07070a] text-white flex flex-col font-sans selection:bg-[#7863F6]/30 selection:text-white">
      {/* Micro-copywriting Toast */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-200">
          <div className="bg-[#1e1b4b]/90 backdrop-blur-md text-purple-200 text-xs font-semibold py-2 px-5 rounded-full shadow-2xl border border-purple-500/30 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEWPORT MODE A: QUESTIONNAIRE & LOADING (STEPS 1..6)    */}
      {/* ======================================================== */}
      {currentStep <= 6 ? (
        <div className="flex-1 flex flex-col lg:flex-row min-h-screen overflow-hidden">
          {/* Left Column: Cyber Grid & Mission */}
          <div className="relative flex-1 bg-[#050508] p-8 sm:p-12 lg:p-16 flex flex-col justify-between overflow-hidden border-b lg:border-b-0 lg:border-r border-white/10">
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                backgroundSize: "28px 28px"
              }}
            />

            <div className="absolute top-10 left-10 w-2.5 h-2.5 bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
            <div className="absolute top-10 right-10 w-2.5 h-2.5 bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
            <div className="absolute bottom-10 left-10 w-2.5 h-2.5 bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
            <div className="absolute bottom-10 right-10 w-2.5 h-2.5 bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />

            <div className="relative z-10 flex items-center justify-between">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                  className="flex items-center gap-2 text-white/60 hover:text-white text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Назад</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 text-white/40 text-xs font-mono uppercase tracking-widest">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>Финансовый консультант</span>
                </div>
              )}

              {currentStep >= 1 && currentStep <= 5 && (
                <div className="text-xs font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-3 py-1 rounded-full">
                  Вопрос {currentStep} из 5
                </div>
              )}
            </div>

            <div className="relative z-10 my-auto py-8 max-w-lg">
              <span className="inline-block px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-mono uppercase tracking-widest rounded-md mb-4">
                Сравнение с вкладом и инфляцией · Данные MOEX
              </span>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white leading-tight">
                {leftSideTitles[currentStep] || "ФИНАНСОВЫЙ КОНСУЛЬТАНТ ДЛЯ НАЧИНАЮЩИХ ИНВЕСТОРОВ"}
              </h1>
              <p className="mt-5 text-white/60 text-sm sm:text-base leading-relaxed">
                Агент консультант помогает начинающему инвестору составить стратегию защиты накоплений от инфляции и план достижения финансовой цели, используя актуальные рыночные данные, чтобы получить варианты финансового портфеля.
              </p>
            </div>

            <div className="relative z-10 flex items-center justify-between text-[11px] font-mono text-white/30 uppercase tracking-widest pt-4 border-t border-white/5">
              <span>МОСБИРЖА (TQOB) ISS API</span>
              <span>НЕ ЯВЛЯЕТСЯ ИИР</span>
            </div>
          </div>

          {/* Right Column: Interactive Quiz Panels */}
          <div className="relative flex-1 bg-gradient-to-br from-[#6852ED] via-[#5B43E8] to-[#462BC7] p-6 sm:p-12 lg:p-16 flex flex-col justify-between overflow-y-auto">
            <div className="flex items-center justify-between pb-4">
              <div className="text-xs font-medium text-white/70">
                {currentStep >= 1 && currentStep <= 5
                  ? `Прогресс опроса: ${progressPercent}%`
                  : "Обработка ответов"}
              </div>
              <button
                type="button"
                onClick={handleRestart}
                className="p-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Начать заново"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {currentStep >= 1 && currentStep <= 5 && (
              <div className="w-full bg-black/20 h-1 rounded-full mb-8 overflow-hidden">
                <div
                  className="bg-white h-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}

            <div className="my-auto py-4">
              {/* Questions 1 to 4 */}
              {currentStep >= 1 && currentStep <= 4 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="space-y-2">
                    <div className="text-xs font-mono uppercase tracking-wider text-white/60">
                      {QUESTIONS[currentStep - 1].kicker}
                    </div>
                    <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight leading-snug">
                      {QUESTIONS[currentStep - 1].title}
                    </h2>
                    <p className="text-white/70 text-xs sm:text-sm">
                      {QUESTIONS[currentStep - 1].subtitle}
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    {QUESTIONS[currentStep - 1].options.map((opt) => {
                      const isSelected =
                        selectedOption === opt.key || answers[currentStep] === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => handleSelectAnswer(currentStep, opt.key)}
                          className={`w-full text-left p-4 sm:p-5 rounded-xl border transition-all duration-200 cursor-pointer flex items-start gap-4 ${
                            isSelected
                              ? "bg-white text-[#462BC7] border-white shadow-xl scale-[1.01]"
                              : "bg-white/10 hover:bg-white/15 border-white/15 text-white backdrop-blur-md"
                          }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold transition-colors ${
                              isSelected
                                ? "bg-[#5B43E8] text-white"
                                : "bg-white/20 text-white"
                            }`}
                          >
                            {isSelected ? <Check className="w-4 h-4" /> : opt.key}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-sm sm:text-base leading-snug">
                              {opt.title}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Question 5 */}
              {currentStep === 5 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="space-y-2">
                    <div className="text-xs font-mono uppercase tracking-wider text-white/60">
                      Уровень финансового контроля
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                      5. Оцените по шкале от 1 до 10, насколько точно вы знаете, куда уходят ваши деньги каждый месяц?
                    </h2>
                    <p className="text-white/70 text-xs sm:text-sm">
                      1 — «деньги просто куда-то испаряются», 10 — «знаю всё до копейки».
                    </p>
                  </div>

                  <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3">
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                        const isNumSelected = q5Score === num;
                        return (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setQ5Score(num)}
                            className={`h-11 sm:h-12 rounded-xl font-bold text-sm sm:text-base transition-all cursor-pointer flex items-center justify-center ${
                              isNumSelected
                                ? "bg-white text-[#462BC7] shadow-lg scale-105"
                                : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                            }`}
                          >
                            {num}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-white/60 pt-1 px-1">
                      <span>1 — «деньги куда-то испаряются»</span>
                      <span>10 — «знаю всё до копейки»</span>
                    </div>
                  </div>

                  {q5Score !== null && (
                    <div className="space-y-3 pt-2">
                      <h3 className="text-sm sm:text-base font-bold text-white">
                        Какой инструмент вы фактически используете для учета прямо сейчас?
                      </h3>

                      <div className="space-y-2.5">
                        {[
                          {
                            key: "A" as AnswerKey,
                            title: "Никакой, держу в голове",
                            desc: "Трачу по ощущениям, точных цифр по категориям нет"
                          },
                          {
                            key: "B" as AnswerKey,
                            title: "Смотрю в приложении банка",
                            desc: "Пользуюсь встроенной аналитикой расходов одного-двух банков"
                          },
                          {
                            key: "V" as AnswerKey,
                            title: "Веду Excel / специальные приложения",
                            desc: "Регулярно записываю траты, веду бюджет и планирую категории"
                          }
                        ].map((toolOpt) => {
                          const isToolSelected = q5Tool === toolOpt.key;
                          return (
                            <button
                              key={toolOpt.key}
                              type="button"
                              onClick={() => setQ5Tool(toolOpt.key)}
                              className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                                isToolSelected
                                  ? "bg-white text-[#462BC7] border-white shadow-xl"
                                  : "bg-white/10 hover:bg-white/20 border-white/15 text-white backdrop-blur-md"
                              }`}
                            >
                              <div
                                className={`w-6 h-6 rounded-md shrink-0 flex items-center justify-center text-xs font-bold ${
                                  isToolSelected
                                    ? "bg-[#5B43E8] text-white"
                                    : "bg-white/20 text-white"
                                }`}
                              >
                                {toolOpt.key}
                              </div>
                              <div>
                                <div className="font-semibold text-sm">
                                  {toolOpt.title}
                                </div>
                                <div className={`text-xs mt-0.5 ${isToolSelected ? "text-[#462BC7]/70" : "text-white/60"}`}>
                                  {toolOpt.desc}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleStep5Submit}
                      disabled={q5Score === null || q5Tool === null}
                      className="w-full inline-flex items-center justify-center gap-2 py-4 px-6 text-base font-bold text-[#3b2db8] bg-white hover:bg-white/90 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-xl transition-all cursor-pointer"
                    >
                      <span>Узнать мой профиль</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 6: Labor Illusion Loading */}
              {currentStep === 6 && (
                <div className="text-center space-y-6 py-12 animate-fade-in">
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="w-16 h-16 rounded-full border-4 border-white/20 border-t-white animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xl sm:text-2xl font-bold text-white min-h-[2rem]">
                      {laborMessages[laborPhase]}
                    </div>
                    <p className="text-xs text-white/60 font-mono">
                      Фаза {laborPhase + 1} из 3 · Финансовое профилирование
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2 pt-2">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          i <= laborPhase ? "w-8 bg-white" : "w-2 bg-white/20"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="text-xs text-white/40 pt-4 flex items-center justify-between font-mono">
              <span>КАЛЬКУЛЯТОР ИНВЕСТОРА</span>
              <span>НЕ ЯВЛЯЕТСЯ ИИР</span>
            </div>
          </div>
        </div>
      ) : currentStep === 7 ? (
        /* ======================================================== */
        /* VIEWPORT MODE B: STEP 7 — PROFILE CONCLUSION & SLIDERS   */
        /* As requested: Profile Conclusion -> Sliders -> Button    */
        /* ======================================================== */
        <div className="flex-1 flex flex-col justify-between py-8 px-4 sm:px-8 max-w-4xl mx-auto w-full animate-fade-in space-y-8">
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              <span className="text-xs font-mono uppercase tracking-wider text-white/70">
                Результаты опроса · Шаг 1 из 2
              </span>
            </div>
            <button
              type="button"
              onClick={handleRestart}
              className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Пройти опрос заново</span>
            </button>
          </div>

          {/* 1. Profile Conclusion Card */}
          <div className="bg-gradient-to-br from-[#17142d] via-[#141224] to-[#0c0a18] border border-[#7863F6]/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#7863F6]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold font-mono uppercase tracking-wider bg-[#7863F6]/20 text-[#c2b6ff] border border-[#7863F6]/40">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>{profile.statusBadge}</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                {profile.title}
              </h1>
              <p className="text-sm sm:text-base text-white/70 leading-relaxed max-w-2xl">
                {profile.summary}
              </p>
            </div>

            {/* Proposed Portfolio Structure: OFZ + Deposit */}
            <div className="relative z-10 bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="text-xs font-mono uppercase tracking-wider text-cyan-300 font-bold">
                  Предлагаемый портфель: ОФЗ + Банковский вклад
                </div>
                <div className="text-xs text-white/50">
                  Баланс надежности и доходности
                </div>
              </div>

              {/* Allocation Visual Bar */}
              <div className="w-full h-3 rounded-full overflow-hidden flex bg-black/40 border border-white/10">
                <div style={{ width: "70%" }} className="bg-[#7863F6] h-full" title="70% ОФЗ" />
                <div style={{ width: "30%" }} className="bg-[#38bdf8] h-full" title="30% Вклад" />
              </div>

              {/* 2 Column Detail Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="bg-black/30 border border-[#7863F6]/30 rounded-xl p-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-purple-200 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#7863F6]" />
                      70% — Облигации (ОФЗ)
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400">15–17% YTM</span>
                  </div>
                  <p className="text-xs text-white/60 leading-relaxed">
                    Фиксируют высокую двузначную ставку на весь срок от государства (Минфин РФ), защищая от снижения процентов по вкладам.
                  </p>
                </div>

                <div className="bg-black/30 border border-cyan-500/30 rounded-xl p-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-cyan-200 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
                      30% — Банковский вклад
                    </span>
                    <span className="text-xs font-mono font-bold text-cyan-300">Ликвидность</span>
                  </div>
                  <p className="text-xs text-white/60 leading-relaxed">
                    Подушка безопасности с мгновенным доступом к деньгам без потерь, застрахованная государством (АСВ до 1,4 млн ₽).
                  </p>
                </div>
              </div>

              {/* 3 Key Advantages of this mix */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                {profile.keyAdvantages.map((adv, idx) => (
                  <div key={idx} className="bg-white/5 rounded-xl p-3 border border-white/5 space-y-1">
                    <div className="font-bold text-white/90 text-[11px]">{adv.title}</div>
                    <div className="text-[11px] text-white/50 leading-relaxed">{adv.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Sliders Input Block */}
          {renderSlidersBlock(false)}

          {/* 3. Prominent CTA Button: "Получить стратегию" */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setCurrentStep(8)}
              className="w-full sm:w-auto min-w-[320px] inline-flex items-center justify-center gap-3 py-4 px-8 text-base font-bold text-white bg-gradient-to-r from-[#7863F6] via-[#6852ED] to-[#5B43E8] hover:brightness-110 active:scale-98 rounded-2xl shadow-[0_0_30px_rgba(120,99,246,0.4)] transition-all cursor-pointer"
            >
              <span>Получить стратегию</span>
              <ArrowRight className="w-5 h-5 text-cyan-300" />
            </button>
            <div className="text-[11px] text-white/40 mt-3 font-mono">
              Переход к подробному аналитическому дашборду и сравнительным графикам
            </div>
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* VIEWPORT MODE C: STEP 8 — FULL ANALYTICAL DASHBOARD      */
        /* Comparison Charts + MOEX Bonds + Bottom Sliders          */
        /* ======================================================== */
        <div className="w-full max-w-6xl mx-auto p-4 sm:p-8 space-y-8 animate-fade-in">
          {/* Top Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-3.5 h-3.5 bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
              <div>
                <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-white uppercase font-mono">
                  Аналитическая стратегия: ОФЗ vs Вклад vs Инфляция
                </h1>
                <p className="text-xs text-white/50 mt-0.5">
                  Моделирование на основе открытого API Мосбиржи TQOB и среднесрочных прогнозов Банка России
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setCurrentStep(7)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white/80 hover:text-white bg-white/10 hover:bg-white/15 border border-white/15 transition-colors cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Изменить параметры</span>
              </button>
              <button
                type="button"
                onClick={handleRestart}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Опрос заново</span>
              </button>
            </div>
          </div>

          {/* Legal / Non-advisory Disclaimer Pill */}
          <div className="bg-[#12111d] border border-white/10 rounded-xl p-3.5 flex items-start gap-3 text-xs text-white/70">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-white">Интерактивный аналитический калькулятор:</span> Не является индивидуальной инвестиционной рекомендацией (ИИР). Моделирование показывает поведение инструментов при динамике ставки ЦБ РФ и уровне инфляции.
            </div>
          </div>

          {/* 4 Cards: OFZ vs Deposit vs Pillow vs Inflation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: OFZ Portfolio Capital */}
            <div className="bg-gradient-to-br from-[#1a1538] to-[#121024] border border-[#7863F6]/40 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-xl">
              <div className="flex items-center justify-between text-xs text-white/60">
                <span className="font-semibold text-purple-300 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#7863F6]" />
                  Портфель ОФЗ
                </span>
                <span className="font-mono text-cyan-300">{portfolioMetrics.weightedYtm.toFixed(1)}% YTM</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums mt-2">
                {Math.round(animFinalOfz).toLocaleString("ru-RU")} ₽
              </div>
              <div className="text-xs text-emerald-400 mt-1 font-mono">
                +{Math.round(totalProfitOfz).toLocaleString("ru-RU")} ₽ прибыль
              </div>
              <div className="text-[11px] text-white/40 mt-2 border-t border-white/10 pt-2">
                Доходность зафиксирована на {years} {years === 1 ? "год" : years < 5 ? "года" : "лет"}
              </div>
            </div>

            {/* Card 2: Bank Deposit & Advantage */}
            <div className="bg-gradient-to-br from-[#0c1a2e] to-[#07111f] border border-cyan-500/30 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-xl">
              <div className="flex items-center justify-between text-xs text-white/60">
                <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
                  Вклад (прогноз ЦБ)
                </span>
                <span className="font-mono text-white/50">ставка падает</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-cyan-100 font-mono tabular-nums mt-2">
                {Math.round(animFinalDeposit).toLocaleString("ru-RU")} ₽
              </div>
              <div className="text-xs text-emerald-300 mt-1 font-mono">
                +{Math.round(totalProfitDeposit).toLocaleString("ru-RU")} ₽ прибыль
              </div>
              <div className="text-[11px] text-cyan-400/90 font-semibold mt-2 border-t border-white/10 pt-2 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                <span>ОФЗ дают на +{Math.round(animAdvantage).toLocaleString("ru-RU")} ₽ больше</span>
              </div>
            </div>

            {/* Card 3: No tools (nominal) */}
            <div className="bg-[#101017] border border-white/10 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-xl">
              <div className="flex items-center justify-between text-xs text-white/60">
                <span className="font-semibold text-white/80 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  Без инструментов
                </span>
                <span className="font-mono text-white/40">0% годовых</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white/90 font-mono tabular-nums mt-2">
                {Math.round(finalNoToolsNominal).toLocaleString("ru-RU")} ₽
              </div>
              <div className="text-xs text-white/40 mt-1 font-mono">
                0 ₽ инвестиционного дохода
              </div>
              <div className="text-[11px] text-white/40 mt-2 border-t border-white/10 pt-2">
                Деньги на карте или наличными «под подушкой»
              </div>
            </div>

            {/* Card 4: Inflation Loss (Real purchasing power) */}
            <div className="bg-gradient-to-br from-[#240e16] to-[#14080e] border border-rose-500/30 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-xl">
              <div className="flex items-center justify-between text-xs text-white/60">
                <span className="font-semibold text-rose-300 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" />
                  Реальная ценность
                </span>
                <span className="font-mono text-rose-400/80">с инфляцией</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-rose-200 font-mono tabular-nums mt-2">
                {Math.round(finalInflationPurchasingPower).toLocaleString("ru-RU")} ₽
              </div>
              <div className="text-xs text-rose-400 mt-1 font-mono flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>-{Math.round(animInflationLoss).toLocaleString("ru-RU")} ₽ ({inflationLossPercent.toFixed(0)}%)</span>
              </div>
              <div className="text-[11px] text-rose-300/80 mt-2 border-t border-white/10 pt-2">
                Сгорело из-за инфляции при отказе от инструментов
              </div>
            </div>
          </div>

          {/* Why OFZ Wins Callout */}
          <div className="bg-[#121124] border border-[#7863F6]/30 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#7863F6]/20 text-[#a594fd] rounded-xl border border-[#7863F6]/40">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Почему ОФЗ выигрывают у банковского вклада на горизонте {years} {years === 1 ? "года" : years < 5 ? "лет" : "лет"}?
                  </h3>
                  <p className="text-xs text-white/50">
                    Эффект фиксации ставки против риска реинвестирования депозита (Reinvestment Risk)
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold font-mono bg-emerald-950/40 text-emerald-300 border border-emerald-600/30 shrink-0">
                <span>Разница: +{Math.round(ofzAdvantageOverDeposit).toLocaleString("ru-RU")} ₽ (+{ofzAdvantagePercent.toFixed(1)}%)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-1.5">
                <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  1. Вклад снизит ставку
                </div>
                <p className="text-white/60 leading-relaxed">
                  Банк дает высокий процент только на первые 3-6 месяцев. Когда ЦБ снизит ключевую ставку по прогнозу до 10-15%, депозит придется переоткрывать уже под меньший процент.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-1.5">
                <div className="font-bold text-[#a594fd] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7863F6]" />
                  2. В ОФЗ ставка зафиксирована
                </div>
                <p className="text-white/60 leading-relaxed">
                  Купив ОФЗ со сроком 3-8 лет, вы юридически гарантируете себе доходность ({portfolioMetrics.weightedYtm.toFixed(1)}% YTM) на весь срок обращения бумаги от Минфина РФ.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-1.5">
                <div className="font-bold text-rose-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  3. Инфляция без инструментов
                </div>
                <p className="text-white/60 leading-relaxed">
                  Если держать деньги наличными или на 0% карте, инфляция за {years} {years === 1 ? "год" : years < 5 ? "года" : "лет"} «съест» около {inflationLossPercent.toFixed(0)}% покупательской способности ({Math.round(inflationLossRub).toLocaleString("ru-RU")} ₽).
                </p>
              </div>
            </div>
          </div>

          {/* Charts & MOEX Bonds Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 5 Cols: Bond Selector & CBR Macro info */}
            <div className="lg:col-span-5 space-y-6">
              {/* OFZ Selection Cards */}
              <div className="bg-[#101017] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Coins className="w-4 h-4 text-[#7863F6]" />
                      Выбор выпусков ОФЗ в портфель
                    </h3>
                    <p className="text-[11px] text-white/50 mt-0.5">
                      Кликните для добавления или исключения бумаги
                    </p>
                  </div>
                  <span className="text-xs font-mono text-cyan-400">
                    Выбрано: {selectedBondIds.length}
                  </span>
                </div>

                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                  {availableBonds.map((bond) => {
                    const isSelected = selectedBondIds.includes(bond.secid);
                    const currentWeight = bondWeights[bond.secid] || 0;

                    return (
                      <div
                        key={bond.secid}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isSelected
                            ? "bg-[#1d1938] border-[#7863F6] ring-1 ring-[#7863F6]/50 shadow-md"
                            : "bg-white/5 border-white/10 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <div
                          onClick={() => handleToggleBond(bond.secid)}
                          className="flex items-start justify-between gap-3 cursor-pointer"
                        >
                          <div className="flex items-start gap-2.5">
                            <div
                              className={`w-5 h-5 rounded-md mt-0.5 flex items-center justify-center text-xs font-bold transition-colors shrink-0 ${
                                isSelected
                                  ? "bg-[#7863F6] text-white"
                                  : "bg-white/10 text-white/50 border border-white/20"
                              }`}
                            >
                              {isSelected ? "✓" : "+"}
                            </div>
                            <div>
                              <div className="font-bold text-sm text-white flex items-center gap-2">
                                <span>{bond.name}</span>
                                <span className="font-mono text-[11px] text-white/40 font-normal">
                                  {bond.secid}
                                </span>
                              </div>
                              <div className="text-[11px] text-white/50 mt-0.5 flex items-center gap-2 font-mono">
                                <span>{bond.years_left.toFixed(1)} лет</span>
                                <span>·</span>
                                <span>Купон {bond.coupon_pct.toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold font-mono text-emerald-400 tabular-nums">
                              {bond.ytm.toFixed(2)}% YTM
                            </div>
                            <div className="text-[11px] text-white/40 font-mono">
                              {(bond.price_rub || 850).toFixed(0)} ₽
                            </div>
                          </div>
                        </div>

                        {isSelected && selectedBondIds.length > 1 && (
                          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center gap-3 text-xs">
                            <span className="text-white/60 text-[11px] shrink-0">Доля:</span>
                            <input
                              type="range"
                              min={5}
                              max={95}
                              step={5}
                              value={currentWeight}
                              onChange={(e) => handleWeightChange(bond.secid, Number(e.target.value))}
                              className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#7863F6]"
                            />
                            <span className="font-mono font-bold text-cyan-300 w-9 text-right shrink-0">
                              {currentWeight}%
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CBR Forecast Assumptions Panel */}
              <div className="bg-[#101017] border border-white/10 rounded-2xl p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                    <Landmark className="w-4 h-4 text-cyan-400" />
                    Прогноз Банка России по годам
                  </span>
                  <span className="text-[11px] text-white/40 font-mono">ЦБ РФ</span>
                </div>
                <div className="space-y-2 text-xs font-mono pt-1">
                  {CBR_FORECAST_BY_YEAR.map((item) => (
                    <div key={item.year} className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                      <span className="text-white/70">Год {item.year}:</span>
                      <div className="flex items-center gap-3">
                        <span className="text-cyan-400 font-bold">Ставка: {item.cbrRate}%</span>
                        <span className="text-rose-400">Инфляция: {item.inflation}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right 7 Cols: Chart Tabs */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-[#101017] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
                {/* Visual Tab Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-xl overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => setActiveVisualTab("comparison")}
                      className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                        activeVisualTab === "comparison"
                          ? "bg-[#7863F6] text-white shadow-md"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      Сравнение инструментов
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveVisualTab("ofzGrowth")}
                      className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                        activeVisualTab === "ofzGrowth"
                          ? "bg-[#7863F6] text-white shadow-md"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      Сложный процент ОФЗ
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveVisualTab("cashflow")}
                      className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                        activeVisualTab === "cashflow"
                          ? "bg-[#7863F6] text-white shadow-md"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      Календарь купонов
                    </button>
                  </div>

                  <div className="text-xs text-white/50 font-mono text-right">
                    Горизонт: {years} {years === 1 ? "год" : years < 5 ? "года" : "лет"}
                  </div>
                </div>

                {/* TAB 1: COMPARISON CHART */}
                {activeVisualTab === "comparison" && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setShowOfzLine(!showOfzLine)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                          showOfzLine
                            ? "bg-[#7863F6]/20 border-[#7863F6] text-white"
                            : "bg-white/5 border-white/10 text-white/40"
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-[#7863F6]" />
                        <span>ОФЗ (фикс. {portfolioMetrics.weightedYtm.toFixed(1)}%)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowDepositLine(!showDepositLine)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                          showDepositLine
                            ? "bg-cyan-950/40 border-cyan-500 text-cyan-200"
                            : "bg-white/5 border-white/10 text-white/40"
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
                        <span>Вклад (траектория ЦБ)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowNoToolsLine(!showNoToolsLine)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                          showNoToolsLine
                            ? "bg-slate-800/60 border-slate-400 text-slate-200"
                            : "bg-white/5 border-white/10 text-white/40"
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                        <span>Без инструментов (номинал)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowInflationLine(!showInflationLine)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                          showInflationLine
                            ? "bg-rose-950/40 border-rose-500 text-rose-200"
                            : "bg-white/5 border-white/10 text-white/40"
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" />
                        <span>С поправкой на инфляцию</span>
                      </button>
                    </div>

                    <div className="h-[320px] w-full pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={comparisonChartData} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#262635" vertical={false} />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 11, fill: "#8888a0" }}
                            axisLine={{ stroke: "#333348" }}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fill: "#8888a0" }}
                            axisLine={{ stroke: "#333348" }}
                            tickLine={false}
                            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                          />
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (!active || !payload || payload.length === 0) return null;
                              const row = payload[0].payload;
                              return (
                                <div className="bg-[#12121b] border border-white/15 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[240px]">
                                  <div className="font-bold text-white border-b border-white/10 pb-1 flex items-center justify-between">
                                    <span>{label}</span>
                                    <span className="text-[10px] text-white/50 font-mono">
                                      Ставка ЦБ: {row.cbrRate}% · Инфляция: {row.inflationRate}%
                                    </span>
                                  </div>
                                  <div className="space-y-1 pt-1 font-mono">
                                    <div className="flex items-center justify-between text-purple-300">
                                      <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-[#7863F6]" />
                                        ОФЗ портфель:
                                      </span>
                                      <span className="font-bold">{Number(row.ofzTotal).toLocaleString("ru-RU")} ₽</span>
                                    </div>
                                    <div className="flex items-center justify-between text-cyan-300">
                                      <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-[#38bdf8]" />
                                        Вклад в банке:
                                      </span>
                                      <span className="font-bold">{Number(row.depositTotal).toLocaleString("ru-RU")} ₽</span>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-300">
                                      <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                                        Без инструментов:
                                      </span>
                                      <span>{Number(row.noToolsNominal).toLocaleString("ru-RU")} ₽</span>
                                    </div>
                                    <div className="flex items-center justify-between text-rose-300 border-t border-white/10 pt-1">
                                      <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-[#f43f5e]" />
                                        Реальная ценность:
                                      </span>
                                      <span className="font-bold">{Number(row.inflationPurchasingPower).toLocaleString("ru-RU")} ₽</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }}
                          />
                          {showOfzLine && (
                            <Line
                              type="monotone"
                              dataKey="ofzTotal"
                              stroke="#7863F6"
                              strokeWidth={3}
                              dot={{ r: 4, fill: "#7863F6" }}
                              activeDot={{ r: 6 }}
                              name="ОФЗ портфель"
                            />
                          )}
                          {showDepositLine && (
                            <Line
                              type="monotone"
                              dataKey="depositTotal"
                              stroke="#38bdf8"
                              strokeWidth={2.5}
                              strokeDasharray="4 4"
                              dot={{ r: 3, fill: "#38bdf8" }}
                              activeDot={{ r: 5 }}
                              name="Банковский вклад (ставка ЦБ)"
                            />
                          )}
                          {showNoToolsLine && (
                            <Line
                              type="monotone"
                              dataKey="noToolsNominal"
                              stroke="#94a3b8"
                              strokeWidth={2}
                              strokeDasharray="2 2"
                              dot={false}
                              name="Без инструментов (номинал)"
                            />
                          )}
                          {showInflationLine && (
                            <Line
                              type="monotone"
                              dataKey="inflationPurchasingPower"
                              stroke="#f43f5e"
                              strokeWidth={2.5}
                              dot={false}
                              name="Покупательная способность без инструментов"
                            />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* TAB 2: OFZ COMPOUND INTEREST DETAIL */}
                {activeVisualTab === "ofzGrowth" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/5 border border-white/10 rounded-xl p-4">
                      <div>
                        <div className="text-xs font-semibold text-white/50">
                          Капитал ОФЗ через {years} {years === 1 ? "год" : years < 5 ? "года" : "лет"}:
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums mt-0.5">
                          {Math.round(animFinalOfz).toLocaleString("ru-RU")} ₽
                        </div>
                        <div className="text-xs text-white/50 mt-1">
                          Личные пополнения:{" "}
                          <span className="font-mono text-white/80">
                            {Math.round(finalNoToolsNominal).toLocaleString("ru-RU")} ₽
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-emerald-400">
                          Из них чистый доход (купоны):
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono tabular-nums mt-0.5">
                          +{Math.round(totalProfitOfz).toLocaleString("ru-RU")} ₽
                        </div>
                        <div className="text-xs text-white/50 mt-1">
                          Средневзвешенная доходность:{" "}
                          <span className="font-mono text-cyan-300">
                            {portfolioMetrics.weightedYtm.toFixed(2)}% годовых
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="h-[280px] w-full pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={comparisonChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorProfitDark" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                            </linearGradient>
                            <linearGradient id="colorPrincipalDark" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#7863F6" stopOpacity={0.5} />
                              <stop offset="95%" stopColor="#7863F6" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#262635" vertical={false} />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 11, fill: "#8888a0" }}
                            axisLine={{ stroke: "#333348" }}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fill: "#8888a0" }}
                            axisLine={{ stroke: "#333348" }}
                            tickLine={false}
                            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                          />
                          <Tooltip
                            formatter={(value: any, name: any) => [
                              `${Number(value).toLocaleString("ru-RU")} ₽`,
                              name === "ofzProfit" ? "Заработанный доход" : "Внесенные средства"
                            ]}
                            labelStyle={{ fontWeight: "bold", color: "#ffffff" }}
                            contentStyle={{
                              backgroundColor: "#12121b",
                              borderRadius: "0.75rem",
                              border: "1px solid rgba(255,255,255,0.15)",
                              boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)",
                              color: "#ffffff"
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="noToolsNominal"
                            stackId="1"
                            stroke="#7863F6"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorPrincipalDark)"
                            name="Внесенные средства"
                          />
                          <Area
                            type="monotone"
                            dataKey="ofzProfit"
                            stackId="1"
                            stroke="#10b981"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorProfitDark)"
                            name="Заработанный доход"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* TAB 3: CASH FLOW BAR CHART */}
                {activeVisualTab === "cashflow" && (
                  <div className="space-y-6">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold text-white/50">
                          Средний пассивный доход к {years}-му году:
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums mt-0.5">
                          {Math.round(averageMonthlyPassive).toLocaleString("ru-RU")} ₽ / мес
                        </div>
                      </div>

                      <div className="text-xs text-white/60 sm:text-right">
                        <div>Выплаты по ОФЗ: 2 раза в год по каждому выпуску</div>
                        <div className="text-white/40 mt-0.5">Поступают на банковский или брокерский счет</div>
                      </div>
                    </div>

                    <div className="h-[280px] w-full pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={cashflowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#262635" vertical={false} />
                          <XAxis
                            dataKey="month"
                            tick={{ fontSize: 11, fill: "#8888a0" }}
                            axisLine={{ stroke: "#333348" }}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fill: "#8888a0" }}
                            axisLine={{ stroke: "#333348" }}
                            tickLine={false}
                            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                          />
                          <Tooltip
                            formatter={(value: any) => [`${Number(value).toLocaleString("ru-RU")} ₽`, "Выплата купонов"]}
                            labelStyle={{ fontWeight: "bold", color: "#ffffff" }}
                            contentStyle={{
                              backgroundColor: "#12121b",
                              borderRadius: "0.75rem",
                              border: "1px solid rgba(255,255,255,0.15)",
                              boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)",
                              color: "#ffffff"
                            }}
                          />
                          <Bar
                            dataKey="amount"
                            fill="#7863F6"
                            radius={[6, 6, 0, 0]}
                            isAnimationActive={true}
                            animationDuration={800}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>

              {/* MOEX API Bonds Table */}
              <div className="bg-[#101017] border border-white/10 rounded-2xl p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Landmark className="w-3.5 h-3.5 text-cyan-400" />
                    Таблица котировок TQOB с открытого API Мосбиржи
                  </span>
                  <div className="flex items-center gap-3">
                    {ofzFetchedAt && (
                      <span className="text-[11px] text-white/40 font-mono">Обновлено: {ofzFetchedAt}</span>
                    )}
                    <button
                      type="button"
                      onClick={handleRunOfzScript}
                      disabled={ofzLoading}
                      className="px-2.5 py-1 text-[11px] font-semibold text-white bg-white/10 hover:bg-white/20 rounded-md transition-colors cursor-pointer"
                    >
                      {ofzLoading ? "Загрузка..." : "Обновить"}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-[11px] text-white/50 font-semibold">
                        <th className="py-2.5 pr-3">Название</th>
                        <th className="py-2.5 pr-3">Тикер</th>
                        <th className="py-2.5 pr-3 text-right">Срок (лет)</th>
                        <th className="py-2.5 pr-3 text-right">Доходность (YTM)</th>
                        <th className="py-2.5 pr-3 text-right">Купон (% год)</th>
                        <th className="py-2.5 text-right">Инвест-оценка</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                      {availableBonds.map((b) => {
                        const isSel = selectedBondIds.includes(b.secid);
                        const viridis = getViridisStyle(b.score, 50, 65);
                        return (
                          <tr key={b.secid} className={isSel ? "bg-[#7863F6]/10" : ""}>
                            <td className="py-2.5 pr-3 font-sans font-semibold text-white">{b.name}</td>
                            <td className="py-2.5 pr-3 text-white/50">{b.secid}</td>
                            <td className="py-2.5 pr-3 text-right text-white/70">{b.years_left.toFixed(2)}</td>
                            <td className="py-2.5 pr-3 text-right font-bold text-emerald-400">{b.ytm.toFixed(2)}%</td>
                            <td className="py-2.5 pr-3 text-right text-white/70">{b.coupon_pct.toFixed(2)}%</td>
                            <td className="py-2.5 text-right font-bold px-2 rounded" style={viridis}>
                              {b.score.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* BOTTOM INTERACTIVE SIMULATOR (SLIDERS TO PLAY WITH)      */}
          {/* Requested: "ползунки там внизу где-то были, чтобы можно было тоже их подвигать, поиграться" */}
          {/* ======================================================== */}
          <div className="pt-4 border-t border-white/10 space-y-4">
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Интерактивный симулятор параметров</span>
            </div>
            {renderSlidersBlock(true)}
          </div>

          {/* Sticky Bottom Bar */}
          <div className="sticky bottom-4 z-40 bg-[#12111f]/95 backdrop-blur-xl border border-white/15 p-4 rounded-2xl shadow-2xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-white/70">
                <span className="font-bold text-white text-sm">
                  Капитал ОФЗ {Math.round(finalOfzCapital).toLocaleString("ru-RU")} ₽
                </span>{" "}
                · Выигрыш у вклада:{" "}
                <span className="text-emerald-400 font-bold font-mono">
                  +{Math.round(ofzAdvantageOverDeposit).toLocaleString("ru-RU")} ₽
                </span>
              </div>
              <div className="w-full sm:w-auto flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsBrokerModalOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-6 text-sm font-bold text-white bg-[#7863F6] hover:bg-[#6852ED] active:bg-[#5B43E8] rounded-xl shadow-lg transition-all cursor-pointer whitespace-nowrap"
                >
                  <span>Как купить ОФЗ из расчета</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Modal: How to buy OFZ via licensed brokers */}
          {isBrokerModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
              <div className="bg-[#12111f] border border-white/15 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 relative">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-base font-bold text-white">Как приобрести выбранные ОФЗ?</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBrokerModalOpen(false)}
                    className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="text-xs text-white/70 space-y-3 leading-relaxed">
                  <p>
                    Облигации федерального займа (ОФЗ) выпускаются Министерством финансов РФ и обращаются на Московской Бирже в секции <strong className="text-white">TQOB</strong>.
                  </p>
                  <div className="bg-white/5 rounded-xl p-3 space-y-2 border border-white/10">
                    <div className="font-semibold text-white text-[11px] uppercase tracking-wider">
                      Пошаговая инструкция:
                    </div>
                    <ol className="list-decimal pl-4 space-y-1 text-white/80">
                      <li>Откройте брокерский счет или ИИС в любом аккредитованном российском банке (Т-Банк, Сбер, Альфа, ВТБ, БКС и др.).</li>
                      <li>В строке поиска введите тикер нужной ОФЗ: например, <span className="font-mono text-cyan-300">{selectedBondIds.join(", ")}</span>.</li>
                      <li>Укажите количество лотов (1 лот = 1 облигация номиналом 1000 ₽) и подтвердите покупку.</li>
                    </ol>
                  </div>
                  <p className="text-[11px] text-white/50">
                    Купоны будут поступать на ваш счет автоматически каждые полгода без необходимости каких-либо действий.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsBrokerModalOpen(false)}
                    className="w-full py-2.5 bg-[#7863F6] hover:bg-[#6852ED] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Понятно, закрыть
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating AI Assistant Chatbot Widget */}
      <AiAssistantWidget
        context={{
          years,
          initialAmount,
          monthlyContribution,
          totalContributions: finalNoToolsNominal,
          finalOfzCapital,
          finalDepositCapital,
          ofzAdvantageOverDeposit,
          inflationLossRub,
          weightedYtm: portfolioMetrics.weightedYtm,
          isReinvesting,
          selectedBonds: availableBonds
            .filter((b) => selectedBondIds.includes(b.secid))
            .map((b) => ({
              secid: b.secid,
              name: b.name,
              weight: bondWeights[b.secid] || 0,
              ytm: b.ytm
            }))
        }}
      />
    </div>
  );
}

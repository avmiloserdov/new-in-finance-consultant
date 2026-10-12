import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Send,
  X,
  Trash2,
  Bot,
  User,
  ChevronDown,
  Info,
  Maximize2,
  Minimize2
} from "lucide-react";
import { marked } from "marked";

export interface DashboardContextData {
  years: number;
  initialAmount: number;
  monthlyContribution: number;
  totalContributions: number;
  finalOfzCapital: number;
  finalDepositCapital: number;
  ofzAdvantageOverDeposit: number;
  inflationLossRub: number;
  weightedYtm: number;
  isReinvesting: boolean;
  selectedBonds: {
    secid: string;
    name: string;
    weight: number;
    ytm: number;
  }[];
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const STARTER_CHIPS = [
  "Что такое YTM?",
  "В чем риск банковского вклада?",
  "Как работает сложный процент?",
  "Почему прибыль по ОФЗ больше, чем по вкладу?"
];

export function AiAssistantWidget({ context }: { context: DashboardContextData }) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const touchStartY = useRef<number | null>(null);
  const isDragging = useRef<boolean>(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Здравствуйте! Я ваш финансовый AI-ассистент. Я вижу параметры вашего портфеля на дашборде. Чем я могу помочь? Могу объяснить термины (**YTM**, **дюрация**, **сложный процент**), сравнить ОФЗ с вкладами или разобрать ваши расчеты.",
      timestamp: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, messages, isLoading]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || touchStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    const delta = currentY - touchStartY.current;
    if (delta > 0) {
      setDragOffset(delta);
    }
  };

  const handleTouchEnd = () => {
    if (dragOffset > 90) {
      setIsOpen(false);
    }
    setDragOffset(0);
    isDragging.current = false;
    touchStartY.current = null;
  };

  const formatContextString = (): string => {
    const bondsStr = context.selectedBonds
      .map((b) => `${b.name} (${b.secid}, доля ${b.weight}%, YTM ${b.ytm.toFixed(2)}%)`)
      .join("; ");

    return `[СИСТЕМНЫЕ ДАННЫЕ ДАШБОРДА: Горизонт: ${context.years} лет. Стартовая сумма: ${Math.round(
      context.initialAmount
    ).toLocaleString("ru-RU")} руб. Пополнение: ${Math.round(
      context.monthlyContribution
    ).toLocaleString("ru-RU")} руб/мес. Всего внесено: ${Math.round(
      context.totalContributions
    ).toLocaleString("ru-RU")} руб. Средневзвешенная ставка ОФЗ (YTM): ${context.weightedYtm.toFixed(
      2
    )}%. Расчетный капитал ОФЗ: ${Math.round(
      context.finalOfzCapital
    ).toLocaleString("ru-RU")} руб. Капитал на банковском вкладе (траектория ставки ЦБ): ${Math.round(
      context.finalDepositCapital
    ).toLocaleString("ru-RU")} руб. Преимущество ОФЗ над вкладом: +${Math.round(
      context.ofzAdvantageOverDeposit
    ).toLocaleString("ru-RU")} руб. Потери от инфляции без инструментов: -${Math.round(
      context.inflationLossRub
    ).toLocaleString("ru-RU")} руб. Реинвестирование процентных доходов (купоны ОФЗ и капитализация вклада): ${
      context.isReinvesting ? "Включено (сложный процент)" : "Выключено (выплата на отдельный счет без сложного процента)"
    }. Выбранные бумаги: ${bondsStr || "ОФЗ 26245, ОФЗ 26252"}. Прогноз ставки ЦБ: плавное снижение с 19% до 8%.]`;
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content
          })),
          context: formatContextString()
        })
      });

      if (!response.ok) {
        throw new Error(`Ошибка сервера (${response.status})`);
      }

      const data = await response.json();
      const botReply = data.reply || "Извините, не удалось сформировать ответ. Попробуйте еще раз.";

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: botReply,
        timestamp: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Произошла ошибка при обращении к AI-ассистенту. Пожалуйста, проверьте соединение и повторите вопрос.",
        timestamp: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "История очищена. Я готов ответить на любые вопросы по финансовому анализу, терминам или расчетам вашего портфеля на дашборде!",
        timestamp: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
      }
    ]);
  };

  const renderMarkdown = (content: string) => {
    try {
      const html = marked.parse(content, { breaks: true, gfm: true }) as string;
      return <div className="prose prose-invert prose-xs max-w-none text-white/90 leading-relaxed space-y-2 [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5 [&_strong]:text-white [&_strong]:font-bold" dangerouslySetInnerHTML={{ __html: html }} />;
    } catch {
      return <div className="text-white/90 whitespace-pre-wrap">{content}</div>;
    }
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 flex items-center gap-3">
        {!isOpen && (
          <div
            onClick={() => setIsOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-[#121124]/90 backdrop-blur-md border border-[#7863F6]/40 text-purple-200 text-xs font-semibold rounded-full shadow-2xl cursor-pointer hover:border-[#7863F6] transition-all hover:scale-102"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>AI-Ассистент по ОФЗ</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Закрыть чат" : "Открыть финансовый AI-ассистент"}
          className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_0_25px_rgba(120,99,246,0.5)] cursor-pointer ${
            isOpen
              ? "bg-[#1f1d38] border border-white/20 text-white hover:bg-[#282647] rotate-90"
              : "bg-gradient-to-r from-[#7863F6] via-[#6852ED] to-[#4F46E5] text-white hover:scale-108 hover:shadow-[0_0_35px_rgba(120,99,246,0.8)]"
          }`}
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <div className="relative">
              <Sparkles className="w-6 h-6 text-white" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full" />
            </div>
          )}
        </button>
      </div>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 sm:hidden"
        />
      )}

      {/* Chat Window / Bottom Sheet */}
      {isOpen && (
        <div
          style={dragOffset > 0 ? { transform: `translateY(${dragOffset}px)` } : undefined}
          className="fixed inset-x-0 bottom-0 top-12 sm:top-auto sm:inset-auto sm:bottom-24 sm:right-6 sm:w-[420px] sm:max-w-[440px] sm:h-[580px] sm:max-h-[82vh] z-50 bg-[#0F111A] border-t sm:border border-[#7863F6]/40 rounded-t-3xl sm:rounded-3xl shadow-[0_-15px_50px_rgba(0,0,0,0.8)] sm:shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden backdrop-blur-2xl animate-fade-in font-sans transition-transform duration-75"
        >
          {/* Mobile Swipe-down Handle */}
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="sm:hidden pt-3 pb-1.5 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing select-none bg-[#161825]"
          >
            <div className="w-12 h-1.5 bg-white/30 rounded-full" />
            <span className="text-[10px] text-white/40 mt-1 font-mono">Потяните вниз, чтобы свернуть</span>
          </div>

          {/* Header */}
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="px-5 py-3.5 sm:py-4 bg-[#161825] border-b border-white/10 flex items-center justify-between select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7863F6] to-[#4F46E5] flex items-center justify-center shadow-[0_0_12px_rgba(120,99,246,0.5)] shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-sm text-white flex items-center gap-2">
                  <span>AI-Ассистент</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 font-mono">
                    Онлайн
                  </span>
                </div>
                <div className="text-[11px] text-white/50 flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                  <span className="truncate">Видит данные вашего дашборда</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearHistory}
                title="Очистить историю"
                className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Закрыть"
                className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>



          {/* Message Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs mt-1 ${
                      isUser
                        ? "bg-[#7863F6] text-white"
                        : "bg-[#1e1b4b] border border-purple-500/30 text-cyan-300"
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  </div>

                  <div className={`space-y-1 max-w-[85%] ${isUser ? "text-right" : "text-left"}`}>
                    <div
                      className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-md ${
                        isUser
                          ? "bg-[#7863F6] text-white rounded-tr-sm"
                          : "bg-[#161825] border border-white/10 text-white/90 rounded-tl-sm"
                      }`}
                    >
                      {isUser ? msg.content : renderMarkdown(msg.content)}
                    </div>
                    <div className="text-[10px] text-white/30 font-mono px-1">
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg shrink-0 bg-[#1e1b4b] border border-purple-500/30 text-cyan-300 flex items-center justify-center text-xs mt-1">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="bg-[#161825] border border-white/10 text-white/80 rounded-2xl rounded-tl-sm p-3.5 flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-white/50 text-[11px] font-mono ml-1">Ассистент думает...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Starter Chips (Shown when history is short) */}
          {messages.length <= 3 && !isLoading && (
            <div className="px-4 py-2 bg-[#121420]/80 border-t border-white/5">
              <div className="text-[10px] text-white/40 font-mono mb-1.5 uppercase tracking-wider">
                Быстрые вопросы:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STARTER_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(chip)}
                    className="text-[11px] text-white/80 hover:text-white bg-white/5 hover:bg-[#7863F6]/20 border border-white/10 hover:border-[#7863F6]/50 px-2.5 py-1 rounded-full transition-all cursor-pointer text-left"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 bg-[#161825] border-t border-white/10">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Спросите о YTM, купонах или расчете..."
                disabled={isLoading}
                className="flex-1 bg-white/5 border border-white/10 focus:border-[#7863F6] focus:ring-1 focus:ring-[#7863F6] rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white placeholder:text-white/40 outline-none transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                aria-label="Отправить сообщение"
                className="w-10 h-10 rounded-xl bg-[#7863F6] hover:bg-[#6852ED] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white shadow-lg transition-all cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="text-[10px] text-center text-white/30 mt-2 font-mono">
              Отвечает только на вопросы о финансах и дашборде
            </div>
          </div>
        </div>
      )}
    </>
  );
}

'use client';

import { useI18n } from "@/locales/useI18n";
import { useState, useMemo } from "react";

type ContributionLevel = 0 | 1 | 2 | 3 | 4;

interface Day {
  date: string;
  count: number;
  level: ContributionLevel;
}

interface ContributionGraphProps {
  seed?: string;
}

function createSeededRandom(seed: string) {
  let state = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0) || 1;

  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function generateMockData(seed = 'default'): Day[] {
  const days: Day[] = [];
  const today = new Date();
  const start = new Date(today);
  start.setFullYear(today.getFullYear() - 2);
  const random = createSeededRandom(seed);

  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const rand = random();
    const count = rand < 0.4 ? 0 : Math.floor(random() * 20);
    const level: ContributionLevel =
      count === 0 ? 0 : count < 4 ? 1 : count < 8 ? 2 : count < 14 ? 3 : 4;

    days.push({
      date: new Date(d).toISOString().split("T")[0],
      count,
      level,
    });
  }
  return days;
}

const LEVEL_COLORS: Record<ContributionLevel, string> = {
  0: "bg-vaks-light-input dark:bg-vaks-dark-input",
  1: "bg-purple-200 dark:bg-purple-900",
  2: "bg-purple-400 dark:bg-purple-700",
  3: "bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button",
  4: "bg-purple-800 dark:bg-purple-400",
};

const selectClass = `text-sm rounded-md px-2 py-1 border
  bg-vaks-light-input dark:bg-vaks-dark-input
  border-vaks-light-stroke dark:border-vaks-dark-stroke
  text-vaks-light-main-txt dark:text-vaks-dark-main-txt`;

export function ContributionGraph({ seed = 'default' }: ContributionGraphProps) {
  const { t } = useI18n();
  const profile = t.perfil

  // Meses traduzidos
  const MONTHS = [
    t.meses.jan, t.meses.fev, t.meses.mar, t.meses.abr,
    t.meses.mai, t.meses.jun, t.meses.jul, t.meses.ago,
    t.meses.set, t.meses.out, t.meses.nov, t.meses.dez,
  ];
  
  // Dias da semana traduzidos
  const DAYS_LABEL = [
    t.dias_semana.domingo, "", t.dias_semana.terca, "", 
    t.dias_semana.quinta, "", t.dias_semana.sabado
  ];
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [view, setView] = useState<"year" | "month">("year");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const allDays = useMemo(() => generateMockData(seed), [seed]);

  // anos disponíveis dinamicamente
  const years = useMemo(() =>
    Array.from(new Set(allDays.map(d => new Date(d.date).getFullYear()))).sort((a, b) => b - a),
  [allDays]);

  // filtra por view + ano
  const filteredDays = useMemo(() => {
    return view === "year"
      ? allDays.filter(d => new Date(d.date).getFullYear() === selectedYear)
      : allDays.filter(d => {
          const date = new Date(d.date);
          return date.getFullYear() === selectedYear && date.getMonth() === selectedMonth;
        });
  }, [allDays, view, selectedYear, selectedMonth]);

  // agrupa em semanas
  const weeks = useMemo(() => {
    const result: Day[][] = [];
    if (!filteredDays.length) return result;
    const firstDay = new Date(filteredDays[0].date);
    const startPad = firstDay.getDay();
    const padded: (Day | null)[] = [...Array(startPad).fill(null), ...filteredDays];
    for (let i = 0; i < padded.length; i += 7) {
      result.push(padded.slice(i, i + 7).filter(Boolean) as Day[]);
    }
    return result;
  }, [filteredDays]);

  // labels dos meses no topo
  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, i) => {
      if (!week[0]) return;
      const month = new Date(week[0].date).getMonth();
      if (month !== lastMonth) {
        labels.push({ label: MONTHS[month], col: i });
        lastMonth = month;
      }
    });
    return labels;
  }, [weeks]);

  const total = filteredDays.reduce((acc, d) => acc + d.count, 0);
  
  return (
    <div className="rounded-xl border border-vaks-light-purple-card-hover dark:border-vaks-dark-purple-card-hover bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card p-6 w-full shadow-md dark:shadow-vaks-dark-purple-card-hover">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="text-base font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
            {profile.card2.titulo}
          </h3>
          <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
            {total} {profile.card2.descricao}{" "}
            {view === "year"
              ? ` ${selectedYear}`
              : ` ${MONTHS[selectedMonth]} de ${selectedYear}`}
          </p>
        </div>

        {/* Controlos */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Seletor de ano — sempre visível */}
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className={selectClass}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* Seletor de mês — só na view mensal */}
          {view === "month" && (
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className={selectClass}
            >
              {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
          )}

          {/* Toggle Anual / Mensal */}
          <div className="flex rounded-lg overflow-hidden border border-vaks-light-stroke dark:border-vaks-dark-stroke">
            {(["year", "month"] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 text-xs font-medium transition-colors
                  ${view === v
                    ? "bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button text-white"
                    : "text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt hover:bg-vaks-light-input dark:hover:bg-vaks-dark-input"
                  }`}
              >
                {v === "year" ? profile.card2.anual : profile.card2.mensal}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Graph */}
      <div className="overflow-x-auto">
        <div className="relative" style={{ minWidth: view === "year" ? 700 : 200 }}>
          {/* Labels dos meses */}
          {view === "year" && (
            <div className="relative mb-1" style={{ paddingLeft: 28, height: 16 }}>
              {monthLabels.map(({ label, col }) => (
                <div
                  key={label + col}
                  className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt absolute"
                  style={{ left: 28 + col * 14 }}
                >
                  {label}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-1 mt-4">
            {/* Labels dos dias */}
            <div className="flex flex-col gap-1 mr-1">
              {DAYS_LABEL.map((d, i) => (
                <div
                  key={i}
                  className="text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt h-3 flex items-center"
                  style={{ fontSize: 9 }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Quadradinhos */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {Array.from({ length: 7 }).map((_, di) => {
                  const day = week.find((_, idx) => {
                    const date = new Date(week[0]?.date);
                    return (date.getDay() + idx) % 7 === di;
                  }) ?? week[di];

                  if (!day) return <div key={di} className="w-3 h-3 rounded-sm opacity-0" />;

                  return (
                    <div
                      key={di}
                      className={`w-3 h-3 rounded-sm cursor-pointer transition-transform hover:scale-125 ${LEVEL_COLORS[day.level]}`}
                      onMouseEnter={e => {
                        const rect = (e.target as HTMLElement).getBoundingClientRect();
                        setTooltip({ text: `${day.count} contribuições em ${day.date}`, x: rect.left, y: rect.top });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-1 mt-3 justify-end">
        <span className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mr-1">{profile.card2.menos}</span>
        {([0, 1, 2, 3, 4] as ContributionLevel[]).map(l => (
          <div key={l} className={`w-3 h-3 rounded-sm ${LEVEL_COLORS[l]}`} />
        ))}
        <span className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt ml-1">{profile.card2.mais}</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-2 py-1 rounded-md text-xs text-white bg-gray-900 dark:bg-gray-700 pointer-events-none shadow"
          style={{ top: tooltip.y - 32, left: tooltip.x }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
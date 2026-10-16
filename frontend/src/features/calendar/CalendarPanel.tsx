import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useEntryDates } from '../../queries/entries';

function updateDateParam(params: URLSearchParams, date: string | null) {
  const next = new URLSearchParams(params);
  if (date) next.set('date', date);
  else next.delete('date');
  return next;
}

export default function CalendarPanel() {
  const [params, setParams] = useSearchParams();
  const selectedDate = params.get('date');
  const { data: markedDates = [] } = useEntryDates();
  const marked = useMemo(() => new Set(markedDates), [markedDates]);
  const [month, setMonth] = useState(() => (selectedDate ? parseISO(selectedDate) : new Date()));

  const selectDay = (day: Date) => {
    const dayIso = format(day, 'yyyy-MM-dd');
    setParams(
      (current) => updateDateParam(current, current.get('date') === dayIso ? null : dayIso),
      {
        replace: true,
      },
    );
    if (!isSameMonth(day, month)) setMonth(day);
  };

  const monthStart = startOfMonth(month);
  const days: Date[] = [];
  let cursor = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  while (cursor <= gridEnd) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return (
    <section className="rounded-2xl border border-rule bg-card">
      <div className="border-b border-rule px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMonth((current) => subMonths(current, 1))}
            className="rounded-full p-2 text-muted hover:bg-rule/60 hover:text-ink"
            aria-label="上个月"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="font-serif text-base font-semibold">
            {format(month, 'yyyy年M月', { locale: zhCN })}
          </h2>
          <button
            type="button"
            onClick={() => setMonth((current) => addMonths(current, 1))}
            className="rounded-full p-2 text-muted hover:bg-rule/60 hover:text-ink"
            aria-label="下个月"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-7 text-center text-xs font-semibold text-muted">
          {['一', '二', '三', '四', '五', '六', '日'].map((label) => (
            <div key={label}>{label}</div>
          ))}
        </div>
        {selectedDate && (
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-muted">
              已选：{format(parseISO(selectedDate), 'M月d日', { locale: zhCN })}
            </span>
            <button
              type="button"
              onClick={() =>
                setParams((current) => updateDateParam(current, null), { replace: true })
              }
              className="font-semibold text-accent"
            >
              显示全部
            </button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-7 gap-1 p-3">
        {days.map((day) => {
          const dayIso = format(day, 'yyyy-MM-dd');
          const inMonth = isSameMonth(day, monthStart);
          const selected = selectedDate === dayIso;
          return (
            <div key={dayIso} className="relative flex justify-center">
              <button
                type="button"
                onClick={() => selectDay(day)}
                aria-label={`选择日期 ${dayIso}`}
                aria-pressed={selected}
                className={[
                  'flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold',
                  selected
                    ? 'bg-accent text-accent-ink'
                    : inMonth
                      ? 'text-ink hover:bg-rule/70'
                      : 'text-muted/50',
                  isToday(day) && !selected ? 'ring-2 ring-accent/40' : '',
                ].join(' ')}
              >
                {format(day, 'd')}
              </button>
              {marked.has(dayIso) && (
                <span className="absolute bottom-0.5 h-1.5 w-1.5 rounded-full bg-accent" />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

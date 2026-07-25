import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

function CalendarPanel({
  calendarMonth,
  setCalendarMonth,
  markedDateSet,
  selectedDate,
  setSelectedDate,
}) {
  const handleSelectDate = (day) => {
    const dayIso = format(day, 'yyyy-MM-dd');
    setSelectedDate((prev) => (prev === dayIso ? null : dayIso));

    if (!isSameMonth(day, calendarMonth)) {
      setCalendarMonth(day);
    }
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = [];
    let day = gridStart;
    while (day <= gridEnd) {
      const dayForCell = day;
      const dayIso = format(dayForCell, 'yyyy-MM-dd');
      const inMonth = isSameMonth(dayForCell, monthStart);
      const isMarked = markedDateSet.has(dayIso);
      const today = isToday(dayForCell);
      const selected = selectedDate === dayIso;

      days.push(
        <div key={dayIso} className="flex justify-center">
          <div className="relative w-9 h-9">
            <button
              type="button"
              onClick={() => handleSelectDate(dayForCell)}
              className={[
                'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                selected
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : inMonth
                    ? 'text-gray-800 hover:bg-indigo-50'
                    : 'text-gray-300 hover:bg-gray-50',
                today && !selected ? 'ring-2 ring-indigo-200' : '',
              ].join(' ')}
              title={dayIso}
              aria-label={`选择日期 ${dayIso}`}
              aria-pressed={selected}
            >
              {format(dayForCell, 'd')}
            </button>
            {isMarked && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-600" />
              </div>
            )}
          </div>
        </div>,
      );

      day = addDays(day, 1);
    }

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCalendarMonth((d) => subMonths(d, 1))}
              className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all"
              aria-label="上个月"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-sm font-bold text-gray-800">
              {format(calendarMonth, 'yyyy年MM月', { locale: zhCN })}
            </div>
            <button
              type="button"
              onClick={() => setCalendarMonth((d) => addMonths(d, 1))}
              className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all"
              aria-label="下个月"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mt-4 text-xs font-semibold text-gray-400">
            {['一', '二', '三', '四', '五', '六', '日'].map((w) => (
              <div key={w} className="text-center">
                {w}
              </div>
            ))}
          </div>

          {selectedDate && (
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs font-medium text-gray-500">
                已选：{format(parseISO(selectedDate), 'MM月dd日', { locale: zhCN })}
              </div>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                显示全部
              </button>
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="grid grid-cols-7 gap-1">{days}</div>
        </div>
      </div>
    );
  };

  return renderCalendar();
}

export default CalendarPanel;

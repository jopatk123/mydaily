import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export function parseEntryDate(rawValue: unknown): Date | null {
  if (!rawValue) return null;
  if (rawValue instanceof Date) return rawValue;
  if (typeof rawValue === 'string') {
    const hasTimezoneSuffix = /([zZ]|[+-]\d{2}:\d{2})$/.test(rawValue);
    return new Date(hasTimezoneSuffix ? rawValue : `${rawValue}Z`);
  }
  return new Date(rawValue as number);
}

export function formatEntryDate(rawValue: unknown) {
  const date = parseEntryDate(rawValue);
  if (!date || Number.isNaN(date.getTime())) return '日期未知';
  return format(date, 'yyyy年M月d日 · HH:mm', { locale: zhCN });
}

export function toYmd(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

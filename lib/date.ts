// SQLite datetime('now') "2026-08-16 13:13:00" biçiminde, UTC olarak saklar ama
// dizede zaman dilimi işareti yoktur. new Date(...) bunu yerel saat sanıp
// yanlış gösterir (TR'de 3 saat geri). Burada açıkça UTC olarak yorumluyoruz.
export function parseDbDate(value: string | number | Date): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  // Zaten zaman dilimi taşıyorsa (ISO 'Z' ya da +03:00) olduğu gibi bırak
  if (/[Zz]$|[+-]\d{2}:?\d{2}$/.test(value)) return new Date(value);
  return new Date(value.replace(' ', 'T') + 'Z');
}

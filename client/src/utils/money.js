// The app uses one currency everywhere. Set VITE_CURRENCY in .env (for example NPR, USD, GBP); defaults to USD.
export const CURRENCY_CODE = import.meta.env?.VITE_CURRENCY || 'USD';

const makeFormatter = (currency) => new Intl.NumberFormat(undefined, { style: 'currency', currency });
let formatter;
try {
  formatter = makeFormatter(CURRENCY_CODE);
} catch {
  formatter = makeFormatter('USD'); // unknown currency code in .env
}

export const formatMoney = (value) => formatter.format(Number(value) || 0);

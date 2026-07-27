/** Форматирует денежное значение, разделяя тысячи пробелами. */
export function formatMechanismMoney(value = "") {
  const source = String(value).replace(/\s/g, "").replace(",", ".");
  const [integer = "", fraction] = source.split(".");
  const digits = integer.replace(/\D/g, "");
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const decimals = fraction?.replace(/\D/g, "").slice(0, 2);
  return decimals !== undefined ? `${grouped || "0"},${decimals}` : grouped;
}

/** Подключает удобное форматирование к денежным полям формы. */
export function formatMechanismMoneyInput(input) {
  if (!input) return;
  input.value = formatMechanismMoney(input.value);
}

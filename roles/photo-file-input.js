/**
 * Делает выбор фотографий надёжным в Safari, Android WebView и Telegram Mini Apps.
 * Некоторые WebView отправляют только `input`, а некоторые — только `change`.
 */
export function bindPhotoFileInput(input, onSelect) {
  if (!(input instanceof HTMLInputElement) || input.type !== "file") return () => {};

  let lastSelection = "";
  let fallbackTimer = 0;
  let waitingForPicker = false;

  const selectionKey = (files) =>
    files.map((file) => `${file.name}:${file.size}:${file.lastModified}`).join("|");

  const consumeSelection = () => {
    window.clearTimeout(fallbackTimer);
    const files = Array.from(input.files ?? []);
    if (!files.length) return;

    const key = selectionKey(files);
    if (key === lastSelection) return;
    lastSelection = key;

    // Сохраняем объекты File до очистки input: так повторный выбор того же фото
    // снова создаст событие и будет работать одинаково на iOS и Android.
    input.value = "";
    Promise.resolve(onSelect(files)).catch((error) => {
      console.error("Не удалось обработать выбранные фотографии.", error);
    }).finally(() => {
      lastSelection = "";
    });
  };

  const scheduleFallback = () => {
    if (!waitingForPicker) return;
    waitingForPicker = false;
    window.clearTimeout(fallbackTimer);
    fallbackTimer = window.setTimeout(consumeSelection, 250);
  };

  const expectPickerResult = () => {
    waitingForPicker = true;
  };

  input.addEventListener("click", expectPickerResult);
  input.addEventListener("input", consumeSelection);
  input.addEventListener("change", consumeSelection);
  // В старых Telegram WebView событие выбора иногда теряется после возврата
  // из системной галереи. Проверяем FileList при восстановлении страницы/фокуса.
  window.addEventListener("focus", scheduleFallback);

  return () => {
    window.clearTimeout(fallbackTimer);
    input.removeEventListener("click", expectPickerResult);
    input.removeEventListener("input", consumeSelection);
    input.removeEventListener("change", consumeSelection);
    window.removeEventListener("focus", scheduleFallback);
  };
}

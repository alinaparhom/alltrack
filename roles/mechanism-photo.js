const MAX_IMAGE_SIDE = 1280;
const JPEG_QUALITY = 0.82;
const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Готовит фотографию техники для хранения вместе с её карточкой.
 * Уменьшение снимка сохраняет быстрый интерфейс и не раздувает JSON-файл.
 */
export async function prepareMechanismPhoto(file) {
  if (!SUPPORTED_IMAGE_TYPES.has(file?.type)) {
    throw new Error("Выберите изображение в формате JPG, PNG или WebP.");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error("Размер фотографии не должен превышать 12 МБ.");
  }

  const sourceUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Не удалось прочитать фотографию."));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
  const image = await new Promise((resolve, reject) => {
    const preview = new Image();
    preview.onerror = () => reject(new Error("Не удалось открыть фотографию."));
    preview.onload = () => resolve(preview);
    preview.src = sourceUrl;
  });
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

<?php
header("Content-Type: application/json; charset=utf-8");

$rawInput = file_get_contents("php://input");
$payload = json_decode($rawInput, true);

if (!is_array($payload)) {
  http_response_code(400);
  echo json_encode(["error" => "Некорректные данные запроса."]);
  exit;
}

$allowedFiles = ["organizations.json", "users.json", "pending-registrations.json"];

function readJsonFile(string $path, $default) {
  if (!file_exists($path)) {
    return $default;
  }
  $raw = file_get_contents($path);
  if ($raw === false) {
    return $default;
  }
  $decoded = json_decode($raw, true);
  return is_array($decoded) ? $decoded : $default;
}

function buildEntries(array $payload): array {
  $entries = $payload["entries"] ?? null;
  if (is_array($entries)) {
    return $entries;
  }
  $path = $payload["path"] ?? "";
  $data = $payload["data"] ?? null;
  return [["path" => $path, "data" => $data]];
}
function sanitizeFolderName(string $name): string {
  $trimmed = trim($name);
  $clean = preg_replace('/[\/\\\\:\*\?"<>\|]+/', "_", $trimmed);
  $clean = preg_replace('/\s+/', " ", $clean);
  return trim($clean);
}

function sanitizeFileName(string $name): string {
  $trimmed = trim($name);
  $clean = preg_replace('/[\/\\\\:\*\?"<>\|]+/', "_", $trimmed);
  return trim($clean);
}

function normalizeOrganizationName(string $value): string {
  $value = trim($value);
  $value = mb_strtolower($value, "UTF-8");
  $value = preg_replace('/[«»"\'`]+/u', "", $value);
  $value = preg_replace('/[^\p{L}\p{N}\s-]+/u', " ", $value);
  $value = preg_replace('/\s+/u', " ", $value);
  return trim($value);
}

function normalizeOrganizationFolder(string $value): string {
  return mb_strtolower(sanitizeFolderName($value), "UTF-8");
}

function normalizeTelegramId($value): ?string {
  if ($value === null) {
    return null;
  }
  if (is_numeric($value)) {
    $numericValue = (int) $value;
    if ($numericValue === 0) {
      return null;
    }
    return (string) $numericValue;
  }
  $raw = trim((string) $value);
  if ($raw === "") {
    return null;
  }
  $cleaned = preg_replace('/[^\d-]+/', "", $raw);
  if ($cleaned === "" || $cleaned === "0") {
    return null;
  }
  return $cleaned;
}

function pickOrganizationShortName(array $orgData, string $orgName): string {
  if ($orgName === "") {
    return "Организация";
  }
  $targetName = normalizeOrganizationName($orgName);
  $targetFolder = normalizeOrganizationFolder($orgName);
  $organizations = $orgData["organizations"] ?? [];

  $exactMatch = null;
  foreach ($organizations as $org) {
    $fullName = normalizeOrganizationName((string) ($org["full_name"] ?? ""));
    $fullFolder = normalizeOrganizationFolder((string) ($org["full_name"] ?? ""));
    if ($fullName === $targetName || $fullFolder === $targetFolder) {
      $exactMatch = $org;
      break;
    }
  }
  if (!$exactMatch) {
    foreach ($organizations as $org) {
      $shortName = normalizeOrganizationName((string) ($org["short_name"] ?? ""));
      $shortFolder = normalizeOrganizationFolder((string) ($org["short_name"] ?? ""));
      if ($shortName === $targetName || $shortFolder === $targetFolder) {
        $exactMatch = $org;
        break;
      }
    }
  }
  if ($exactMatch && !empty($exactMatch["short_name"])) {
    return (string) $exactMatch["short_name"];
  }

  foreach ($organizations as $org) {
    $fullName = normalizeOrganizationName((string) ($org["full_name"] ?? ""));
    $shortName = normalizeOrganizationName((string) ($org["short_name"] ?? ""));
    $fullFolder = normalizeOrganizationFolder((string) ($org["full_name"] ?? ""));
    $shortFolder = normalizeOrganizationFolder((string) ($org["short_name"] ?? ""));
    if (
      ($shortName && str_contains($targetName, $shortName)) ||
      ($fullName && str_contains($targetName, $fullName)) ||
      ($shortName && str_contains($shortName, $targetName)) ||
      ($fullName && str_contains($fullName, $targetName)) ||
      ($shortFolder && str_contains($targetFolder, $shortFolder)) ||
      ($fullFolder && str_contains($targetFolder, $fullFolder))
    ) {
      return (string) ($org["short_name"] ?? $orgName);
    }
  }

  return $orgName;
}

function resolveOrganizationFolderForEntry(array $entry): ?string {
  $user = $entry["user"] ?? null;
  if (!is_array($user)) {
    return null;
  }

  $usersPath = __DIR__ . DIRECTORY_SEPARATOR . "users.json";
  $orgsPath = __DIR__ . DIRECTORY_SEPARATOR . "organizations.json";
  $usersData = readJsonFile($usersPath, ["users" => []]);
  $orgsData = readJsonFile($orgsPath, ["organizations" => []]);

  $telegramId = normalizeTelegramId($user["telegram_id"] ?? null);
  $matchedUser = null;
  if ($telegramId) {
    foreach (($usersData["users"] ?? []) as $item) {
      $itemId = normalizeTelegramId($item["telegram_id"] ?? null);
      if ($itemId === $telegramId) {
        $matchedUser = $item;
        break;
      }
    }
  }
  if (!$matchedUser) {
    foreach (($usersData["users"] ?? []) as $item) {
      if (
        ($item["full_name"] ?? null) === ($user["full_name"] ?? null) &&
        ($item["organization"] ?? null) === ($user["organization"] ?? null) &&
        ($item["role"] ?? null) === ($user["role"] ?? null)
      ) {
        $matchedUser = $item;
        break;
      }
    }
  }

  $orgName = $matchedUser["organization"] ?? ($user["organization"] ?? "");
  if (!$orgName) {
    return null;
  }
  $shortName = pickOrganizationShortName($orgsData, (string) $orgName);
  $folder = sanitizeFolderName($shortName ?: (string) $orgName);
  return $folder !== "" ? $folder : null;
}

function ensureDirectory(string $path): bool {
  if (is_dir($path)) {
    return true;
  }
  return mkdir($path, 0775, true);
}

function writeJsonIfMissing(string $path, $data): bool {
  if (file_exists($path)) {
    return true;
  }
  $encoded = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
  if ($encoded === false) {
    return false;
  }
  return file_put_contents($path, $encoded . PHP_EOL, LOCK_EX) !== false;
}

function getNewOrganizations(string $targetPath, $data): array {
  $existingContent = [];
  if (file_exists($targetPath)) {
    $existingRaw = file_get_contents($targetPath);
    $existingContent = json_decode($existingRaw ?: "", true);
  }
  $existingOrganizations = $existingContent["organizations"] ?? [];
  $existingShortNames = [];
  foreach ($existingOrganizations as $org) {
    if (isset($org["short_name"])) {
      $existingShortNames[] = $org["short_name"];
    }
  }
  $incomingOrganizations = is_array($data) ? ($data["organizations"] ?? []) : [];
  $newOrganizations = [];
  foreach ($incomingOrganizations as $org) {
    $shortName = $org["short_name"] ?? "";
    if ($shortName && !in_array($shortName, $existingShortNames, true)) {
      $newOrganizations[] = $shortName;
    }
  }
  return $newOrganizations;
}

function createOrganizationFolders(array $newOrganizations): void {
  $jsonFiles = [
    "База с инструментами.json" => [],
    "Перемещения.json" => [],
    "Перемещения история.json" => [],
    "Объекты.json" => [],
    "Заявки.json" => [],
    "Штрафы.json" => [],
    "Списания.json" => [],
    "Ремонты.json" => [],
    "Поломки.json" => [],
    "Настройки.json" => ["users" => []],
  ];
  $folders = [
    "Фото инструментов",
    "Фото инструментов. Списание",
    "Акты списания",
    "Акты ремонтов",
    "Фото поломок",
    "Фото отказов",
    "Накладные покупка",
    "Накладные перемещения",
  ];

  foreach ($newOrganizations as $orgShortName) {
    $safeName = sanitizeFolderName($orgShortName);
    if ($safeName === "") {
      continue;
    }
    $orgPath = __DIR__ . DIRECTORY_SEPARATOR . $safeName;
    if (!ensureDirectory($orgPath)) {
      http_response_code(500);
      echo json_encode(["error" => "Не удалось создать папку организации."]);
      exit;
    }
    foreach ($jsonFiles as $file => $content) {
      $filePath = $orgPath . DIRECTORY_SEPARATOR . $file;
      if (!writeJsonIfMissing($filePath, $content)) {
        http_response_code(500);
        echo json_encode(["error" => "Не удалось создать файлы базы организации."]);
        exit;
      }
    }
    foreach ($folders as $folder) {
      $folderPath = $orgPath . DIRECTORY_SEPARATOR . $folder;
      if (!ensureDirectory($folderPath)) {
        http_response_code(500);
        echo json_encode(["error" => "Не удалось создать папки организации."]);
        exit;
      }
    }
  }
}

function resolveTargetPath(array $entry, array $allowedFiles): string {
  $path = (string) ($entry["path"] ?? "");
  $fileName = basename((string) $path);
  if (in_array($fileName, $allowedFiles, true)) {
    return __DIR__ . DIRECTORY_SEPARATOR . $fileName;
  }

  $orgScopedFiles = [
    "Настройки.json",
    "Объекты.json",
    "База с инструментами.json",
    "Перемещения.json",
    "Перемещения история.json",
    "Заявки.json",
    "Штрафы.json",
    "Ремонты.json",
    "Списания.json",
    "Поломки.json",
  ];
  if (!in_array($fileName, $orgScopedFiles, true)) {
    http_response_code(403);
    echo json_encode(["error" => "Доступ запрещен."]);
    exit;
  }

  $dirName = trim(dirname((string) $path), "/\\.");
  if ($dirName === "") {
    $resolvedFolder = resolveOrganizationFolderForEntry($entry);
    if ($resolvedFolder) {
      $dirName = $resolvedFolder;
    }
  }
  if ($dirName === "" || strpos($dirName, "..") !== false) {
    http_response_code(403);
    echo json_encode(["error" => "Доступ запрещен."]);
    exit;
  }

  $segments = preg_split('/[\/\\\\]+/', $dirName);
  if (!$segments || count($segments) !== 1) {
    http_response_code(403);
    echo json_encode(["error" => "Доступ запрещен."]);
    exit;
  }

  $orgFolder = sanitizeFolderName($segments[0]);
  if ($orgFolder === "" || $orgFolder !== $segments[0]) {
    http_response_code(403);
    echo json_encode(["error" => "Доступ запрещен."]);
    exit;
  }

  $orgPath = __DIR__ . DIRECTORY_SEPARATOR . $orgFolder;
  if (!ensureDirectory($orgPath)) {
    http_response_code(500);
    echo json_encode(["error" => "Не удалось создать папку организации."]);
    exit;
  }

  return $orgPath . DIRECTORY_SEPARATOR . $fileName;
}

function resolveFilePathValue(string $path, array $entry): string {
  $path = trim($path);
  if ($path === "") {
    http_response_code(400);
    echo json_encode(["error" => "Некорректный путь файла."]);
    exit;
  }

  $path = str_replace("\\", "/", $path);
  $path = ltrim($path, "./");
  $segments = array_values(array_filter(explode("/", $path), "strlen"));
  if (count($segments) === 2) {
    $resolvedFolder = resolveOrganizationFolderForEntry($entry);
    if (!$resolvedFolder) {
      http_response_code(403);
      echo json_encode(["error" => "Не удалось определить папку организации."]);
      exit;
    }
    array_unshift($segments, $resolvedFolder);
  }

  if (count($segments) !== 3) {
    http_response_code(403);
    echo json_encode(["error" => "Доступ запрещен."]);
    exit;
  }

  [$orgFolder, $photoFolder, $fileName] = $segments;
  $orgFolderSafe = sanitizeFolderName($orgFolder);
  if ($orgFolderSafe === "" || $orgFolderSafe !== $orgFolder) {
    http_response_code(403);
    echo json_encode(["error" => "Доступ запрещен."]);
    exit;
  }

  $photoFolderSafe = sanitizeFolderName($photoFolder);
  $allowedFolders = [
    "Фото инструментов",
    "Фото инструментов. Списание",
    "Накладные покупка",
    "Фото отказов",
    "Акты списания",
    "Акты ремонтов",
    "Фото поломок",
  ];
  if (!in_array($photoFolderSafe, $allowedFolders, true)) {
    http_response_code(403);
    echo json_encode(["error" => "Доступ запрещен."]);
    exit;
  }

  $fileNameSafe = sanitizeFileName($fileName);
  if ($fileNameSafe === "") {
    http_response_code(403);
    echo json_encode(["error" => "Некорректное имя файла."]);
    exit;
  }

  $orgPath = __DIR__ . DIRECTORY_SEPARATOR . $orgFolderSafe;
  if (!ensureDirectory($orgPath)) {
    http_response_code(500);
    echo json_encode(["error" => "Не удалось создать папку организации."]);
    exit;
  }
  $photoPath = $orgPath . DIRECTORY_SEPARATOR . $photoFolderSafe;
  if (!ensureDirectory($photoPath)) {
    http_response_code(500);
    echo json_encode(["error" => "Не удалось создать папку для фото."]);
    exit;
  }

  return $photoPath . DIRECTORY_SEPARATOR . $fileNameSafe;
}

function resolveFileTargetPath(array $entry): string {
  $path = (string) ($entry["path"] ?? "");
  return resolveFilePathValue($path, $entry);
}

function resolvePhotoFolderPath(array $entry): string {
  $path = trim((string) ($entry["path"] ?? ""));
  if ($path === "") {
    http_response_code(400);
    echo json_encode(["error" => "Некорректный путь папки."]);
    exit;
  }

  $path = str_replace("\\", "/", $path);
  $path = ltrim($path, "./");
  $segments = array_values(array_filter(explode("/", $path), "strlen"));
  if (count($segments) === 1) {
    $resolvedFolder = resolveOrganizationFolderForEntry($entry);
    if (!$resolvedFolder) {
      http_response_code(403);
      echo json_encode(["error" => "Не удалось определить папку организации."]);
      exit;
    }
    array_unshift($segments, $resolvedFolder);
  }

  if (count($segments) !== 2) {
    http_response_code(403);
    echo json_encode(["error" => "Доступ запрещен."]);
    exit;
  }

  [$orgFolder, $photoFolder] = $segments;
  $orgFolderSafe = sanitizeFolderName($orgFolder);
  if ($orgFolderSafe === "" || $orgFolderSafe !== $orgFolder) {
    http_response_code(403);
    echo json_encode(["error" => "Доступ запрещен."]);
    exit;
  }

  $photoFolderSafe = sanitizeFolderName($photoFolder);
  $allowedFolders = [
    "Фото инструментов",
    "Фото инструментов. Списание",
    "Накладные покупка",
    "Фото отказов",
    "Акты списания",
    "Акты ремонтов",
    "Фото поломок",
  ];
  if (!in_array($photoFolderSafe, $allowedFolders, true)) {
    http_response_code(403);
    echo json_encode(["error" => "Доступ запрещен."]);
    exit;
  }

  $orgPath = __DIR__ . DIRECTORY_SEPARATOR . $orgFolderSafe;
  return $orgPath . DIRECTORY_SEPARATOR . $photoFolderSafe;
}

function listPhotoFiles(array $entry): array {
  $photoPath = resolvePhotoFolderPath($entry);
  if (!is_dir($photoPath)) {
    return [];
  }
  $items = scandir($photoPath);
  if ($items === false) {
    return [];
  }
  $files = [];
  foreach ($items as $item) {
    if ($item === "." || $item === "..") {
      continue;
    }
    $fullPath = $photoPath . DIRECTORY_SEPARATOR . $item;
    if (is_file($fullPath)) {
      $files[] = $item;
    }
  }
  return $files;
}

function saveFileEntry(array $entry): void {
  $content = (string) ($entry["content"] ?? "");
  $encoding = (string) ($entry["encoding"] ?? "base64");
  if ($encoding !== "base64") {
    http_response_code(400);
    echo json_encode(["error" => "Неподдерживаемое кодирование файла."]);
    exit;
  }
  $decoded = base64_decode($content, true);
  if ($decoded === false) {
    http_response_code(400);
    echo json_encode(["error" => "Некорректные данные файла."]);
    exit;
  }
  $targetPath = resolveFileTargetPath($entry);
  $written = file_put_contents($targetPath, $decoded, LOCK_EX);
  if ($written === false) {
    http_response_code(500);
    echo json_encode(["error" => "Не удалось сохранить файл."]);
    exit;
  }
}

function moveFileEntry(array $entry): void {
  $from = (string) ($entry["from"] ?? "");
  $to = (string) ($entry["to"] ?? "");
  if ($from === "" || $to === "") {
    http_response_code(400);
    echo json_encode(["error" => "Некорректный путь файла."]);
    exit;
  }
  $sourcePath = resolveFilePathValue($from, $entry);
  $targetPath = resolveFilePathValue($to, $entry);
  if (!file_exists($sourcePath)) {
    return;
  }
  $targetDir = dirname($targetPath);
  if (!ensureDirectory($targetDir)) {
    http_response_code(500);
    echo json_encode(["error" => "Не удалось создать папку назначения."]);
    exit;
  }
  if (!@rename($sourcePath, $targetPath)) {
    if (!@copy($sourcePath, $targetPath)) {
      http_response_code(500);
      echo json_encode(["error" => "Не удалось перенести файл."]);
      exit;
    }
    if (!@unlink($sourcePath)) {
      http_response_code(500);
      echo json_encode(["error" => "Не удалось удалить исходный файл."]);
      exit;
    }
  }
}

function deleteFileEntry(array $entry): void {
  $targetPath = resolveFileTargetPath($entry);
  if (!file_exists($targetPath)) {
    return;
  }
  if (!unlink($targetPath)) {
    http_response_code(500);
    echo json_encode(["error" => "Не удалось удалить файл."]);
    exit;
  }
}

function saveEntry(array $entry, array $allowedFiles): void {
  if (($entry["type"] ?? "") === "file") {
    saveFileEntry($entry);
    return;
  }
  if (($entry["type"] ?? "") === "move-file") {
    moveFileEntry($entry);
    return;
  }
  if (($entry["type"] ?? "") === "delete-file") {
    deleteFileEntry($entry);
    return;
  }
  $path = $entry["path"] ?? "";
  $data = $entry["data"] ?? null;
  $fileName = basename((string) $path);

  $targetPath = resolveTargetPath($entry, $allowedFiles);
  $encoded = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

  if ($encoded === false) {
    http_response_code(400);
    echo json_encode(["error" => "Не удалось сериализовать данные."]);
    exit;
  }

  $newOrganizations = [];
  if ($fileName === "organizations.json") {
    $newOrganizations = getNewOrganizations($targetPath, $data);
  }

  $written = file_put_contents($targetPath, $encoded . PHP_EOL, LOCK_EX);
  if ($written === false) {
    http_response_code(500);
    echo json_encode(["error" => "Не удалось сохранить файл."]);
    exit;
  }

  if (!empty($newOrganizations)) {
    createOrganizationFolders($newOrganizations);
  }
}

$entries = buildEntries($payload);
if (count($entries) === 1 && ($entries[0]["type"] ?? "") === "list-photos") {
  $files = listPhotoFiles($entries[0]);
  echo json_encode(["files" => $files], JSON_UNESCAPED_UNICODE);
  exit;
}
foreach ($entries as $entry) {
  if (!is_array($entry)) {
    http_response_code(400);
    echo json_encode(["error" => "Некорректные данные запроса."]);
    exit;
  }
  saveEntry($entry, $allowedFiles);
}

echo json_encode(["success" => true]);

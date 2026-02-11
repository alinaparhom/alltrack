<?php
header("Content-Type: application/json; charset=utf-8");

$rawInput = file_get_contents("php://input");
$hasBody = is_string($rawInput) && trim($rawInput) !== "";
$payload = $hasBody ? json_decode($rawInput, true) : [];

if (!is_array($payload)) {
  http_response_code(400);
  echo json_encode(["error" => "Некорректные данные запроса."]);
  exit;
}

$allowedFiles = ["organizations.json", "users.json", "pending-registrations.json", "telegram-mailing-errors.json"];

function appendMailingLog(string $level, string $message, array $context = []): void {
  $logPath = __DIR__ . DIRECTORY_SEPARATOR . "telegram-mailing-errors.json";
  $existing = readJsonFile($logPath, ["logs" => []]);
  $logs = [];
  if (isset($existing["logs"]) && is_array($existing["logs"])) {
    $logs = $existing["logs"];
  } elseif (isset($existing["entries"]) && is_array($existing["entries"])) {
    // Поддержка старого формата файла логов.
    $logs = $existing["entries"];
  }

  $timezone = new DateTimeZone("Europe/Moscow");
  $entry = [
    "timestamp" => (new DateTimeImmutable("now", $timezone))->format(DateTimeInterface::ATOM),
    "level" => $level,
    "message" => $message,
    "context" => $context,
  ];

  $logs[] = $entry;
  if (count($logs) > 1000) {
    $logs = array_slice($logs, -1000);
  }

  $encoded = json_encode(["logs" => $logs], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
  if ($encoded === false) {
    return;
  }
  file_put_contents($logPath, $encoded . PHP_EOL, LOCK_EX);
}

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
  if (trim((string) $path) === "") {
    return [];
  }
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

function readJsonArrayFile(string $path): array {
  if (!file_exists($path)) {
    return [];
  }
  $raw = file_get_contents($path);
  if ($raw === false) {
    return [];
  }
  $decoded = json_decode($raw, true);
  return is_array($decoded) ? $decoded : [];
}

function isMoveAwaitingReply($move): bool {
  if (!is_array($move)) {
    return false;
  }
  $replyDate = "";
  $candidateKeys = ["Дата ответа", "дата ответа", "Дата Ответа", "Ответ", "Дата принятия"];
  foreach ($candidateKeys as $key) {
    if (array_key_exists($key, $move)) {
      $replyDate = trim((string) $move[$key]);
      break;
    }
  }
  if ($replyDate === "") {
    foreach ($move as $key => $value) {
      $normalizedKey = mb_strtolower(trim((string) $key), "UTF-8");
      if (str_contains($normalizedKey, "ответ")) {
        $replyDate = trim((string) $value);
        break;
      }
    }
  }
  return $replyDate === "";
}

function extractMoveList(array $movesData): array {
  if (isset($movesData["moves"]) && is_array($movesData["moves"])) {
    return $movesData["moves"];
  }
  if (isset($movesData["Перемещения"]) && is_array($movesData["Перемещения"])) {
    return $movesData["Перемещения"];
  }
  if (array_values($movesData) === $movesData) {
    return $movesData;
  }
  return [];
}

function extractTelegramGroups(array $settings): array {
  if (isset($settings["telegramGroups"]) && is_array($settings["telegramGroups"])) {
    return $settings["telegramGroups"];
  }
  if (isset($settings["organization"]) && is_array($settings["organization"])) {
    $organization = $settings["organization"];
    if (isset($organization["telegramGroups"]) && is_array($organization["telegramGroups"])) {
      return $organization["telegramGroups"];
    }
    if (
      isset($organization["telegram"]) &&
      is_array($organization["telegram"]) &&
      isset($organization["telegram"]["groups"]) &&
      is_array($organization["telegram"]["groups"])
    ) {
      return $organization["telegram"]["groups"];
    }
  }
  return [];
}

function normalizeTelegramGroupId($value): ?string {
  $normalized = normalizeTelegramId($value);
  if (!$normalized) {
    return null;
  }
  return $normalized;
}

function extractPendingMoveLines(array $moves): array {
  $lines = [];
  foreach ($moves as $index => $move) {
    if (!isMoveAwaitingReply($move)) {
      continue;
    }
    $toolName = trim((string) ($move["Название"] ?? $move["Инструмент"] ?? ""));
    $inventoryNumber = trim((string) ($move["Бухгалтерский номер"] ?? $move["Бух. номер"] ?? ""));
    $fromObject = trim((string) ($move["С объекта"] ?? $move["Объект"] ?? ""));
    $toObject = trim((string) ($move["На объект"] ?? ""));
    $moveDate = trim((string) ($move["Дата"] ?? $move["Дата перемещения"] ?? ""));

    $titleParts = [];
    if ($toolName !== "") {
      $titleParts[] = $toolName;
    }
    if ($inventoryNumber !== "") {
      $titleParts[] = "№ " . $inventoryNumber;
    }
    $title = trim(implode(" · ", $titleParts));
    if ($title === "") {
      $title = "Перемещение #" . ($index + 1);
    }

    $routeParts = [];
    if ($fromObject !== "") {
      $routeParts[] = "с: " . $fromObject;
    }
    if ($toObject !== "") {
      $routeParts[] = "на: " . $toObject;
    }

    $details = [];
    if (!empty($routeParts)) {
      $details[] = implode(", ", $routeParts);
    }
    if ($moveDate !== "") {
      $details[] = "дата: " . $moveDate;
    }

    $line = "• " . $title;
    if (!empty($details)) {
      $line .= " (" . implode("; ", $details) . ")";
    }
    $lines[] = $line;
  }
  return $lines;
}

function sendTelegramTextMessage(string $botToken, string $chatId, string $text): array {
  $apiUrl = "https://api.telegram.org/bot" . rawurlencode($botToken) . "/sendMessage";
  $payload = [
    "chat_id" => $chatId,
    "text" => $text,
    "disable_web_page_preview" => true,
  ];

  if (function_exists("curl_init")) {
    $curl = curl_init($apiUrl);
    if ($curl === false) {
      return [
        "ok" => false,
        "error" => "Не удалось инициализировать cURL",
        "statusCode" => 0,
      ];
    }

    curl_setopt_array($curl, [
      CURLOPT_POST => true,
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_HTTPHEADER => ["Content-Type: application/json; charset=utf-8"],
      CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
      CURLOPT_TIMEOUT => 12,
    ]);

    $response = curl_exec($curl);
    $statusCode = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $curlError = curl_error($curl);
    curl_close($curl);

    if ($response === false) {
      return [
        "ok" => false,
        "error" => $curlError !== "" ? $curlError : "Не удалось подключиться к Telegram API",
        "statusCode" => $statusCode,
      ];
    }

    $decoded = json_decode($response, true);
    if (!is_array($decoded)) {
      return [
        "ok" => false,
        "error" => "Некорректный JSON ответ от Telegram",
        "statusCode" => $statusCode,
        "response" => mb_substr((string) $response, 0, 800),
      ];
    }

    if (!empty($decoded["ok"])) {
      return [
        "ok" => true,
        "statusCode" => $statusCode,
        "response" => $decoded,
      ];
    }

    return [
      "ok" => false,
      "error" => (string) ($decoded["description"] ?? "Неизвестная ошибка Telegram API"),
      "statusCode" => $statusCode,
      "response" => $decoded,
    ];
  }

  $options = [
    "http" => [
      "method" => "POST",
      "header" => "Content-Type: application/json; charset=utf-8\r\n",
      "content" => json_encode($payload, JSON_UNESCAPED_UNICODE),
      "timeout" => 12,
      "ignore_errors" => true,
    ],
  ];

  $context = stream_context_create($options);
  $response = @file_get_contents($apiUrl, false, $context);
  $statusCode = 0;
  if (!empty($http_response_header) && is_array($http_response_header)) {
    foreach ($http_response_header as $headerLine) {
      if (preg_match('/^HTTP\/\S+\s+(\d{3})/', (string) $headerLine, $matches)) {
        $statusCode = (int) $matches[1];
        break;
      }
    }
  }

  if ($response === false) {
    return [
      "ok" => false,
      "error" => "Не удалось подключиться к Telegram API",
      "statusCode" => $statusCode,
    ];
  }

  $decoded = json_decode($response, true);
  if (!is_array($decoded)) {
    return [
      "ok" => false,
      "error" => "Некорректный JSON ответ от Telegram",
      "statusCode" => $statusCode,
      "response" => mb_substr($response, 0, 800),
    ];
  }

  if (!empty($decoded["ok"])) {
    return [
      "ok" => true,
      "statusCode" => $statusCode,
      "response" => $decoded,
    ];
  }

  return [
    "ok" => false,
    "error" => (string) ($decoded["description"] ?? "Неизвестная ошибка Telegram API"),
    "statusCode" => $statusCode,
    "response" => $decoded,
  ];
}

function runDailyPendingMovesMailingIfNeeded(): void {
  runDailyPendingMovesMailing([
    "respectTime" => true,
  ]);
}

function runDailyPendingMovesMailing(array $options = []): void {
  $respectTime = array_key_exists("respectTime", $options)
    ? (bool) $options["respectTime"]
    : true;

  $botToken = getenv("ALLTRACK_BOT_TOKEN") ?: "";
  if ($botToken === "") {
    $botToken = "8549452123:AAGxveuJSVf-xpNHQYTDKDmuMmHjGRVeDj0";
  }
  if ($botToken === "") {
    appendMailingLog("error", "Рассылка не запущена: не найден токен Telegram-бота.");
    return;
  }

  $timezone = new DateTimeZone("Europe/Moscow");
  $now = new DateTimeImmutable("now", $timezone);
  $currentTime = $now->format("H:i");
  if ($respectTime && $currentTime !== "14:45") {
    return;
  }

  $todayKey = $now->format("Y-m-d");
  $statePath = __DIR__ . DIRECTORY_SEPARATOR . "telegram-daily-pending-moves-state.json";
  $state = readJsonArrayFile($statePath);
  $sentMap = [];
  if (isset($state["sent"]) && is_array($state["sent"])) {
    $sentMap = $state["sent"];
  }

  $orgEntries = @scandir(__DIR__);
  if (!is_array($orgEntries)) {
    appendMailingLog("error", "Рассылка не запущена: не удалось прочитать список папок организаций.");
    return;
  }

  appendMailingLog("info", "Запуск ежедневной Telegram-рассылки по неотвеченным перемещениям.", [
    "respectTime" => $respectTime,
    "currentTime" => $currentTime,
    "date" => $todayKey,
  ]);

  $stateChanged = false;
  $sentCount = 0;
  foreach ($orgEntries as $orgFolder) {
    if ($orgFolder === "." || $orgFolder === "..") {
      continue;
    }
    $orgPath = __DIR__ . DIRECTORY_SEPARATOR . $orgFolder;
    if (!is_dir($orgPath)) {
      continue;
    }

    $settingsPath = $orgPath . DIRECTORY_SEPARATOR . "Настройки.json";
    $movesPath = $orgPath . DIRECTORY_SEPARATOR . "Перемещения.json";
    if (!file_exists($settingsPath) || !file_exists($movesPath)) {
      if (file_exists($settingsPath) || file_exists($movesPath)) {
        appendMailingLog("warning", "Пропущена организация с неполными файлами для рассылки.", [
          "organization" => $orgFolder,
          "settingsExists" => file_exists($settingsPath),
          "movesExists" => file_exists($movesPath),
        ]);
      }
      continue;
    }

    $settings = readJsonArrayFile($settingsPath);
    $telegramGroups = extractTelegramGroups($settings);
    if (!is_array($telegramGroups) || empty($telegramGroups)) {
      appendMailingLog("warning", "В организации не настроены Telegram-группы для рассылки.", [
        "organization" => $orgFolder,
      ]);
      continue;
    }

    $moves = readJsonArrayFile($movesPath);
    $moveList = extractMoveList($moves);

    $pendingLines = extractPendingMoveLines($moveList);
    $pendingCount = count($pendingLines);
    $header = "📦 " . $orgFolder . "\nНеотвеченные перемещения: " . $pendingCount;
    $body = $pendingCount > 0
      ? implode("\n", array_slice($pendingLines, 0, 50))
      : "✅ Все перемещения с ответом.";
    if ($pendingCount > 50) {
      $body .= "\n… и ещё " . ($pendingCount - 50) . " шт.";
    }
    $message = $header . "\n\n" . $body;

    foreach ($telegramGroups as $group) {
      if (!is_array($group)) {
        appendMailingLog("warning", "Пропущена некорректная запись Telegram-группы.", [
          "organization" => $orgFolder,
          "group" => $group,
        ]);
        continue;
      }
      $telegramId = normalizeTelegramGroupId($group["telegramId"] ?? null);
      if (!$telegramId) {
        appendMailingLog("warning", "У Telegram-группы отсутствует корректный telegramId.", [
          "organization" => $orgFolder,
          "groupName" => (string) ($group["name"] ?? ""),
          "telegramId" => $group["telegramId"] ?? null,
        ]);
        continue;
      }

      $groupKey = $orgFolder . "::" . $telegramId;
      if (($sentMap[$groupKey] ?? "") === $todayKey) {
        continue;
      }

      $sendResult = sendTelegramTextMessage($botToken, $telegramId, $message);
      if (!empty($sendResult["ok"])) {
        $sentMap[$groupKey] = $todayKey;
        $stateChanged = true;
        $sentCount++;
        appendMailingLog("info", "Ежедневная рассылка отправлена в Telegram-группу.", [
          "organization" => $orgFolder,
          "telegramId" => $telegramId,
          "pendingCount" => $pendingCount,
        ]);
      } else {
        appendMailingLog("error", "Не удалось отправить ежедневную рассылку в Telegram-группу.", [
          "organization" => $orgFolder,
          "telegramId" => $telegramId,
          "pendingCount" => $pendingCount,
          "error" => $sendResult["error"] ?? "Неизвестная ошибка",
          "statusCode" => $sendResult["statusCode"] ?? 0,
          "response" => $sendResult["response"] ?? null,
        ]);
      }
    }
  }

  appendMailingLog("info", "Ежедневная Telegram-рассылка завершена.", [
    "date" => $todayKey,
    "sentCount" => $sentCount,
  ]);

  if ($stateChanged) {
    $nextState = [
      "sent" => $sentMap,
      "updatedAt" => $now->format(DateTimeInterface::ATOM),
    ];
    $encoded = json_encode($nextState, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($encoded !== false) {
      $saved = file_put_contents($statePath, $encoded . PHP_EOL, LOCK_EX);
      if ($saved === false) {
        appendMailingLog("error", "Не удалось записать состояние ежедневной рассылки.", [
          "statePath" => $statePath,
        ]);
      }
    }
  }
}

$isCli = PHP_SAPI === "cli";
if ($isCli) {
  $argvList = isset($argv) && is_array($argv) ? $argv : [];
  if (in_array("--run-daily-mailing", $argvList, true)) {
    runDailyPendingMovesMailing(["respectTime" => false]);
    echo json_encode(["success" => true, "mode" => "daily-mailing-cli"], JSON_UNESCAPED_UNICODE) . PHP_EOL;
    exit;
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

runDailyPendingMovesMailingIfNeeded();

echo json_encode(["success" => true]);

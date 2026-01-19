<?php
header("Content-Type: application/json; charset=utf-8");

$rawInput = file_get_contents("php://input");
$payload = json_decode($rawInput, true);

if (!is_array($payload)) {
  http_response_code(400);
  echo json_encode(["error" => "Некорректные данные запроса."]);
  exit;
}

$path = $payload["path"] ?? "";
$data = $payload["data"] ?? null;
$fileName = basename($path);
$allowedFiles = ["organizations.json", "users.json", "pending-registrations.json"];
function sanitizeFolderName(string $name): string {
  $trimmed = trim($name);
  $clean = preg_replace('/[\/\\\\:\*\?"<>\|]+/', "_", $trimmed);
  $clean = preg_replace('/\s+/', " ", $clean);
  return trim($clean);
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

if (!in_array($fileName, $allowedFiles, true)) {
  http_response_code(403);
  echo json_encode(["error" => "Доступ запрещен."]);
  exit;
}

$targetPath = __DIR__ . DIRECTORY_SEPARATOR . $fileName;
$encoded = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

if ($encoded === false) {
  http_response_code(400);
  echo json_encode(["error" => "Не удалось сериализовать данные."]);
  exit;
}

$newOrganizations = [];
if ($fileName === "organizations.json") {
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
  foreach ($incomingOrganizations as $org) {
    $shortName = $org["short_name"] ?? "";
    if ($shortName && !in_array($shortName, $existingShortNames, true)) {
      $newOrganizations[] = $shortName;
    }
  }
}

$written = file_put_contents($targetPath, $encoded . PHP_EOL, LOCK_EX);

if ($written === false) {
  http_response_code(500);
  echo json_encode(["error" => "Не удалось сохранить файл."]);
  exit;
}

if (!empty($newOrganizations)) {
  $jsonFiles = [
    "База с инструментами.json" => [],
    "Перемещения.json" => [],
    "Объекты.json" => [],
    "Штрафы.json" => [],
    "Списания.json" => [],
    "Ремонты.json" => [],
    "Поломки.json" => [],
    "Настройки.json" => [],
  ];
  $folders = [
    "Фото инструментов",
    "Акты списания",
    "Акты ремонтов",
    "Фото поломок",
    "Фото отказов",
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

echo json_encode(["success" => true]);

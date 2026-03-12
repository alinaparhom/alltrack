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

$allowedFiles = ["organizations.json", "users.json", "pending-registrations.json", "telegram-mailing-errors.json", "feedback-requests.json"];

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

function schedulerPidIsRunning(int $pid): bool {
  if ($pid <= 0) {
    return false;
  }

  $procPath = "/proc/" . $pid . "/stat";
  if (file_exists($procPath)) {
    $stat = @file_get_contents($procPath);
    if (is_string($stat) && preg_match('/^\d+\s+\([^)]*\)\s+([A-Z])\s/', $stat, $matches)) {
      if (($matches[1] ?? "") === "Z") {
        return false;
      }
    }
  }

  if (function_exists("posix_kill")) {
    return @posix_kill($pid, 0);
  }

  return file_exists("/proc/" . $pid);
}

function ensureMailingSchedulerDaemon(): void {
  if (PHP_SAPI === "cli") {
    return;
  }

  $schedulerPath = __DIR__ . DIRECTORY_SEPARATOR . "telegram-scheduler.php";
  if (!file_exists($schedulerPath)) {
    return;
  }

  $pidPath = __DIR__ . DIRECTORY_SEPARATOR . "telegram-scheduler.pid";
  $runningPid = (int) @file_get_contents($pidPath);
  if (schedulerPidIsRunning($runningPid)) {
    return;
  }

  $bootstrapStatePath = __DIR__ . DIRECTORY_SEPARATOR . "telegram-scheduler-bootstrap.json";
  $bootstrapState = readJsonFile($bootstrapStatePath, []);
  $lastAttemptTs = (int) ($bootstrapState["lastAttemptTs"] ?? 0);
  $nowTs = time();
  if ($lastAttemptTs > 0 && ($nowTs - $lastAttemptTs) < 30) {
    return;
  }

  $nextState = [
    "lastAttemptTs" => $nowTs,
    "updatedAt" => (new DateTimeImmutable("now", new DateTimeZone("Europe/Moscow")))->format(DateTimeInterface::ATOM),
  ];
  $encoded = json_encode($nextState, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
  if ($encoded !== false) {
    @file_put_contents($bootstrapStatePath, $encoded . PHP_EOL, LOCK_EX);
  }

  $phpBinary = defined("PHP_BINARY") && PHP_BINARY ? PHP_BINARY : "php";
  $command = escapeshellarg($phpBinary)
    . " " . escapeshellarg($schedulerPath)
    . " --start-daemon";

  $output = [];
  $status = 0;
  @exec($command . " 2>&1", $output, $status);
  if ($status !== 0) {
    appendMailingLog("warning", "Не удалось запустить фоновый планировщик рассылок.", [
      "status" => $status,
      "output" => implode("\n", $output),
    ]);
  }
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

ensureMailingSchedulerDaemon();

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

function cleanupOldExportFiles(string $folderPath, int $maxFiles = 20): void {
  if ($maxFiles < 1 || !is_dir($folderPath)) {
    return;
  }

  $items = scandir($folderPath);
  if ($items === false) {
    return;
  }

  $files = [];
  foreach ($items as $item) {
    if ($item === "." || $item === "..") {
      continue;
    }
    $fullPath = $folderPath . DIRECTORY_SEPARATOR . $item;
    if (!is_file($fullPath)) {
      continue;
    }
    $mtime = @filemtime($fullPath);
    $files[] = [
      "path" => $fullPath,
      "mtime" => $mtime !== false ? (int) $mtime : 0,
    ];
  }

  if (count($files) <= $maxFiles) {
    return;
  }

  usort($files, static function (array $a, array $b): int {
    return ($a["mtime"] ?? 0) <=> ($b["mtime"] ?? 0);
  });

  $filesToDelete = array_slice($files, 0, count($files) - $maxFiles);
  foreach ($filesToDelete as $fileInfo) {
    $oldFilePath = (string) ($fileInfo["path"] ?? "");
    if ($oldFilePath !== "" && file_exists($oldFilePath)) {
      @unlink($oldFilePath);
    }
  }
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

function parseDateToDateTime(?string $value, DateTimeZone $timezone): ?DateTimeImmutable {
  $raw = trim((string) $value);
  if ($raw === "") {
    return null;
  }

  $formats = ["d.m.Y", "Y-m-d", DateTimeInterface::ATOM];
  foreach ($formats as $format) {
    $parsed = DateTimeImmutable::createFromFormat($format, $raw, $timezone);
    if ($parsed !== false) {
      return $parsed->setTime(0, 0, 0);
    }
  }

  $timestamp = strtotime($raw);
  if ($timestamp === false) {
    return null;
  }

  return (new DateTimeImmutable("@" . $timestamp))
    ->setTimezone($timezone)
    ->setTime(0, 0, 0);
}

function folderMatchesOrganization(string $targetFolder, string $candidate): bool {
  $candidateFolder = normalizeOrganizationFolder($candidate);
  if ($candidateFolder === "") {
    return false;
  }

  if ($candidateFolder === $targetFolder) {
    return true;
  }

  if (preg_match('/(^|\s)' . preg_quote($targetFolder, '/') . '(\s|$)/u', $candidateFolder)) {
    return true;
  }

  return str_ends_with($candidateFolder, " " . $targetFolder);
}

function resolveOrganizationLaunchDateByFolder(string $orgFolder, array $orgData, DateTimeZone $timezone): ?DateTimeImmutable {
  $targetFolder = normalizeOrganizationFolder($orgFolder);
  $organizations = is_array($orgData["organizations"] ?? null) ? $orgData["organizations"] : [];

  foreach ($organizations as $org) {
    if (!is_array($org)) {
      continue;
    }
    $fullName = (string) ($org["full_name"] ?? "");
    $shortName = (string) ($org["short_name"] ?? "");
    if (
      folderMatchesOrganization($targetFolder, $fullName) ||
      folderMatchesOrganization($targetFolder, $shortName)
    ) {
      $launchRaw = (string) ($org["launch_date"] ?? $org["launchDate"] ?? "");
      return parseDateToDateTime($launchRaw, $timezone);
    }
  }

  return null;
}

function resolveNoPhotoFineConfig(array $settings): ?array {
  $candidates = [
    $settings["organization"]["fines"]["noPhoto"] ?? null,
    $settings["organization"]["fines"] ?? null,
    $settings["fines"]["noPhoto"] ?? null,
    $settings["fines"] ?? null,
  ];

  foreach ($candidates as $candidate) {
    if (!is_array($candidate)) {
      continue;
    }

    $enabled = !empty($candidate["enabled"]);
    $periodDays = (int) ($candidate["days"] ?? 0);
    $amountPerPeriod = (float) ($candidate["amount"] ?? 0);
    if (!$enabled || $periodDays <= 0 || $amountPerPeriod <= 0) {
      continue;
    }

    return [
      "periodDays" => $periodDays,
      "amountPerPeriod" => $amountPerPeriod,
    ];
  }

  return null;
}

function calculateNoPhotoFineAmount(
  ?DateTimeImmutable $purchaseDate,
  ?DateTimeImmutable $launchDate,
  DateTimeImmutable $now,
  int $periodDays,
  float $amountPerPeriod
): float {
  if ($purchaseDate === null || $launchDate === null || $periodDays <= 0 || $amountPerPeriod <= 0) {
    return 0;
  }

  $baseDate = $purchaseDate < $launchDate ? $launchDate : $purchaseDate;
  $daysDiff = (int) $baseDate->diff($now)->format("%r%a");
  if ($daysDiff <= 0) {
    return 0;
  }

  $periods = intdiv($daysDiff, $periodDays);
  return $periods > 0 ? $periods * $amountPerPeriod : 0;
}

function runNoPhotoFineRecalculation(array $options = []): array {
  $respectTime = array_key_exists("respectTime", $options)
    ? (bool) $options["respectTime"]
    : true;
  $dryRun = !empty($options["dryRun"]);
  $timezone = new DateTimeZone("Europe/Moscow");
  $now = new DateTimeImmutable("now", $timezone);

  if ($respectTime && $now->format("H:i") !== "14:30") {
    return [
      "success" => true,
      "mode" => "daily-no-photo-fines-cli",
      "skipped" => true,
      "reason" => "outside-schedule",
      "currentTime" => $now->format("H:i"),
      "expectedTime" => "14:30",
    ];
  }

  $orgData = readJsonFile(__DIR__ . DIRECTORY_SEPARATOR . "organizations.json", ["organizations" => []]);
  $entries = @scandir(__DIR__);
  if (!is_array($entries)) {
    return [
      "success" => false,
      "mode" => "daily-no-photo-fines-cli",
      "error" => "Не удалось прочитать список организаций.",
    ];
  }

  $summary = [
    "success" => true,
    "mode" => "daily-no-photo-fines-cli",
    "date" => $now->format("Y-m-d"),
    "time" => $now->format("H:i"),
    "dryRun" => $dryRun,
    "organizationsChecked" => 0,
    "organizationsUpdated" => 0,
    "toolsUpdated" => 0,
    "organizations" => [],
  ];

  foreach ($entries as $orgFolder) {
    if ($orgFolder === "." || $orgFolder === "..") {
      continue;
    }
    $orgPath = __DIR__ . DIRECTORY_SEPARATOR . $orgFolder;
    if (!is_dir($orgPath)) {
      continue;
    }

    $settingsPath = $orgPath . DIRECTORY_SEPARATOR . "Настройки.json";
    $toolsPath = $orgPath . DIRECTORY_SEPARATOR . "База с инструментами.json";
    if (!file_exists($settingsPath) || !file_exists($toolsPath)) {
      continue;
    }

    $summary["organizationsChecked"]++;
    $settings = readJsonFile($settingsPath, []);
    $fineConfig = resolveNoPhotoFineConfig($settings);
    if ($fineConfig === null) {
      continue;
    }

    $periodDays = (int) $fineConfig["periodDays"];
    $amountPerPeriod = (float) $fineConfig["amountPerPeriod"];

    $launchDate = resolveOrganizationLaunchDateByFolder($orgFolder, $orgData, $timezone);
    if ($launchDate === null) {
      appendMailingLog("warning", "Не найден launch_date для перерасчета штрафов без фото.", [
        "organization" => $orgFolder,
      ]);
      continue;
    }

    $tools = readJsonFile($toolsPath, []);
    if (!is_array($tools)) {
      continue;
    }

    $updatedInOrg = 0;
    foreach ($tools as $index => $tool) {
      if (!is_array($tool)) {
        continue;
      }
      $photoCount = (int) ($tool["Количество фото"] ?? 0);
      if ($photoCount !== 0) {
        continue;
      }

      $purchaseDate = parseDateToDateTime((string) ($tool["Дата покупки"] ?? ""), $timezone);
      $fineAmount = calculateNoPhotoFineAmount($purchaseDate, $launchDate, $now, $periodDays, $amountPerPeriod);
      $currentStoredFine = (float) ($tool["Текущий штраф за отсутствие фото"] ?? 0);

      if (abs($fineAmount - $currentStoredFine) < 0.0001) {
        continue;
      }

      $tools[$index]["Текущий штраф за отсутствие фото"] = $fineAmount;
      $updatedInOrg++;
    }

    if ($updatedInOrg > 0) {
      $summary["organizationsUpdated"]++;
      $summary["toolsUpdated"] += $updatedInOrg;
      $summary["organizations"][] = [
        "organization" => $orgFolder,
        "updatedTools" => $updatedInOrg,
      ];

      if (!$dryRun) {
        $encoded = json_encode($tools, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        if ($encoded !== false) {
          file_put_contents($toolsPath, $encoded . PHP_EOL, LOCK_EX);
        }
      }
    }
  }

  return $summary;
}

function runNoPhotoFineRecalculationIfNeeded(): void {
  $timezone = new DateTimeZone("Europe/Moscow");
  $now = new DateTimeImmutable("now", $timezone);
  $scheduleTime = "14:30";
  $currentMinuteStamp = $now->format("Y-m-d H:i");
  $scheduledMinuteStamp = $now->format("Y-m-d") . " " . $scheduleTime;

  if ($currentMinuteStamp !== $scheduledMinuteStamp) {
    return;
  }

  $statePath = __DIR__ . DIRECTORY_SEPARATOR . "telegram-daily-no-photo-fines-state.json";
  $state = readJsonFile($statePath, []);
  $lastRunMinute = trim((string) ($state["lastRunMinute"] ?? ""));
  if ($lastRunMinute === $currentMinuteStamp) {
    return;
  }

  $result = runNoPhotoFineRecalculation([
    "respectTime" => false,
    "dryRun" => false,
  ]);

  if (empty($result["success"])) {
    appendMailingLog("error", "Не удалось выполнить ежедневный пересчёт штрафов за отсутствие фото.", [
      "result" => $result,
    ]);
    return;
  }

  $nextState = [
    "lastRunMinute" => $currentMinuteStamp,
    "updatedAt" => $now->format(DateTimeInterface::ATOM),
    "toolsUpdated" => (int) ($result["toolsUpdated"] ?? 0),
  ];
  $encoded = json_encode($nextState, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
  if ($encoded !== false) {
    $saved = file_put_contents($statePath, $encoded . PHP_EOL, LOCK_EX);
    if ($saved === false) {
      appendMailingLog("warning", "Не удалось записать состояние ежедневного пересчёта штрафов за отсутствие фото.", [
        "statePath" => $statePath,
      ]);
    }
  }
}

function normalizeWeekDayLabel(string $value): string {
  $normalized = mb_strtolower(trim($value), "UTF-8");
  $normalized = str_replace(["ё", "."], ["е", ""], $normalized);
  $normalized = preg_replace('/\s+/u', '', $normalized);
  $map = [
    "пн" => "Пн",
    "понед" => "Пн",
    "понедельник" => "Пн",
    "вт" => "Вт",
    "втор" => "Вт",
    "вторник" => "Вт",
    "ср" => "Ср",
    "сред" => "Ср",
    "среда" => "Ср",
    "чт" => "Чт",
    "чет" => "Чт",
    "четверг" => "Чт",
    "пт" => "Пт",
    "пят" => "Пт",
    "пятница" => "Пт",
    "сб" => "Сб",
    "суб" => "Сб",
    "суббота" => "Сб",
    "вс" => "Вс",
    "воскр" => "Вс",
    "воскресенье" => "Вс",
  ];
  return $map[$normalized] ?? "";
}

function normalizeScheduleTimeLabel($value): string {
  $raw = trim((string) $value);
  if ($raw === "") {
    return "";
  }

  $raw = str_replace([".", " "], [":", ""], $raw);
  if (!preg_match('/^(\d{1,2}):(\d{1,2})$/', $raw, $matches)) {
    return "";
  }

  $hour = (int) $matches[1];
  $minute = (int) $matches[2];
  if ($hour < 0 || $hour > 23 || $minute < 0 || $minute > 59) {
    return "";
  }

  return sprintf('%02d:%02d', $hour, $minute);
}

function isMoveRepliesScheduleDue(array $schedule, DateTimeImmutable $now): bool {
  $daysRaw = $schedule["days"] ?? [];
  if (!is_array($daysRaw) || empty($daysRaw)) {
    return false;
  }

  $timeRaw = normalizeScheduleTimeLabel($schedule["time"] ?? "");
  if ($timeRaw === "") {
    return false;
  }

  $dayByNumber = [1 => "Пн", 2 => "Вт", 3 => "Ср", 4 => "Чт", 5 => "Пт", 6 => "Сб", 7 => "Вс"];
  $today = $dayByNumber[(int) $now->format("N")] ?? "";
  if ($today === "") {
    return false;
  }

  $allowedDays = [];
  foreach ($daysRaw as $day) {
    $label = normalizeWeekDayLabel((string) $day);
    if ($label !== "") {
      $allowedDays[$label] = true;
    }
  }
  if (empty($allowedDays[$today])) {
    return false;
  }

  [$scheduleHour, $scheduleMinute] = array_map('intval', explode(':', $timeRaw));
  $scheduleTotalMinutes = ($scheduleHour * 60) + $scheduleMinute;
  $nowTotalMinutes = ((int) $now->format("H") * 60) + (int) $now->format("i");
  // Отправляем строго в нужную минуту.
  // Если задача cron не была запущена в это время, отправка не должна происходить позже.
  return $nowTotalMinutes === $scheduleTotalMinutes;
}

function resolveMoveRepliesMailingConfig(array $settings): ?array {
  return resolveOrganizationMailingConfig($settings, "moveReplies");
}

function resolveRepairsMailingConfig(array $settings): ?array {
  return resolveOrganizationMailingConfig($settings, "repairs");
}

function resolveNoPhotoMailingConfig(array $settings): ?array {
  return resolveOrganizationMailingConfig($settings, "noPhoto");
}

function resolveOrganizationMailingConfig(array $settings, string $mailingKey): ?array {
  if ($mailingKey === "") {
    return null;
  }

  $candidates = [
    $settings["mailings"][$mailingKey] ?? null,
    $settings["organization"]["mailings"][$mailingKey] ?? null,
  ];

  foreach ($candidates as $candidate) {
    if (!is_array($candidate)) {
      continue;
    }
    return $candidate;
  }

  return null;
}

function normalizeMailingGroupName(string $value): string {
  return mb_strtolower(trim($value), 'UTF-8');
}

function resolveToolGroupName(array $tool): string {
  $candidates = [
    $tool["Граппа инструментов"] ?? null,
    $tool["Группа инструментов"] ?? null,
    $tool["Группа"] ?? null,
  ];
  foreach ($candidates as $candidate) {
    $label = trim((string) $candidate);
    if ($label !== "") {
      return $label;
    }
  }
  return "";
}

function isToolInMailingGroups(array $tool, array $selectedGroups): bool {
  if (empty($selectedGroups)) {
    return true;
  }
  $toolGroup = normalizeMailingGroupName(resolveToolGroupName($tool));
  if ($toolGroup === "") {
    return false;
  }
  return isset($selectedGroups[$toolGroup]);
}

function formatPercentageLabel(int $count, int $total): string {
  if ($total <= 0 || $count <= 0) {
    return "0%";
  }
  $percentage = ($count / $total) * 100;
  if (abs($percentage - round($percentage)) < 0.00001) {
    return (string) ((int) round($percentage)) . "%";
  }
  return number_format($percentage, 1, '.', '') . "%";
}

function isToolBrokenForRepairsMailing(array $tool): bool {
  $status = mb_strtolower(trim((string) ($tool["Статус"] ?? "")), 'UTF-8');
  return in_array($status, ["сломан", "в ремонте", "на списание"], true);
}

function isToolWithoutPhoto(array $tool): bool {
  return (int) ($tool["Количество фото"] ?? 0) === 0;
}

function buildRepairsMailingChart(string $title, array $counts): string {
  if (empty($counts)) {
    return $title . "\n• Нет данных";
  }

  arsort($counts);
  $maxCount = max($counts);
  $lines = [$title];

  foreach ($counts as $label => $countRaw) {
    $count = (int) $countRaw;
    if ($count <= 0) {
      continue;
    }
    $safeLabel = trim((string) $label);
    if ($safeLabel === "") {
      $safeLabel = "Не указан";
    }
    $barLength = $maxCount > 0 ? max(1, (int) round(($count / $maxCount) * 10)) : 1;
    $bar = str_repeat("█", $barLength);
    $lines[] = "• {$safeLabel}: {$count} {$bar}";
  }

  return implode("\n", $lines);
}

function buildRepairsMailingText(string $organization, array $tools): string {
  $headerOrg = trim($organization) !== "" ? trim($organization) : "Организация";
  $totalCount = 0;
  $brokenCount = 0;
  $inRepairCount = 0;
  $writeOffCount = 0;

  foreach ($tools as $tool) {
    if (!is_array($tool)) {
      continue;
    }

    $totalCount++;
    $status = mb_strtolower(trim((string) ($tool["Статус"] ?? "")), 'UTF-8');
    if ($status === "сломан") {
      $brokenCount++;
    } elseif ($status === "в ремонте") {
      $inRepairCount++;
    } elseif ($status === "на списание") {
      $writeOffCount++;
    }
  }

  return "🛠 Рассылка «Ремонты»\n"
    . "🏢 Организация: {$headerOrg}\n\n"
    . "Инструментов в базе: {$totalCount}\n"
    . "Статус «Сломан»: {$brokenCount} (" . formatPercentageLabel($brokenCount, $totalCount) . ")\n"
    . "Статус «В ремонте»: {$inRepairCount} (" . formatPercentageLabel($inRepairCount, $totalCount) . ")\n"
    . "Статус «На списание»: {$writeOffCount} (" . formatPercentageLabel($writeOffCount, $totalCount) . ")";
}

function buildNoPhotoMailingText(string $organization, array $tools): string {
  $headerOrg = trim($organization) !== "" ? trim($organization) : "Организация";
  $withoutPhotoByObject = [];
  $withoutPhotoByResponsible = [];

  foreach ($tools as $tool) {
    if (!is_array($tool) || !isToolBrokenForRepairsMailing($tool) || !isToolWithoutPhoto($tool)) {
      continue;
    }

    $objectName = trim((string) ($tool["Объект"] ?? ""));
    $responsibleName = trim((string) ($tool["Ответственный"] ?? ""));
    $objectKey = $objectName !== "" ? $objectName : "Не указан";
    $responsibleKey = $responsibleName !== "" ? $responsibleName : "Не указан";
    $withoutPhotoByObject[$objectKey] = (int) ($withoutPhotoByObject[$objectKey] ?? 0) + 1;
    $withoutPhotoByResponsible[$responsibleKey] = (int) ($withoutPhotoByResponsible[$responsibleKey] ?? 0) + 1;
  }

  $totalWithoutPhoto = array_sum($withoutPhotoByObject);
  $chartByObject = buildRepairsMailingChart("📊 График 1 (по объектам, без фото)", $withoutPhotoByObject);
  $chartByResponsible = buildRepairsMailingChart("📊 График 2 (по ответственным, без фото)", $withoutPhotoByResponsible);

  return "📷 Рассылка «Без фото»\n"
    . "🏢 Организация: {$headerOrg}\n\n"
    . "Сломанных инструментов без фото: {$totalWithoutPhoto}\n\n"
    . $chartByObject . "\n\n"
    . $chartByResponsible;
}

function runNoPhotoMailing(array $options = []): array {
  $dryRun = !empty($options["dryRun"]);
  $timezone = new DateTimeZone("Europe/Moscow");
  $now = new DateTimeImmutable("now", $timezone);
  $botToken = getenv("ALLTRACK_BOT_TOKEN") ?: "";
  if ($botToken === "") {
    $botToken = "8549452123:AAGxveuJSVf-xpNHQYTDKDmuMmHjGRVeDj0";
  }

  $statePath = __DIR__ . DIRECTORY_SEPARATOR . "telegram-no-photo-mailing-state.json";
  $state = readJsonFile($statePath, ["sent" => []]);
  $sentState = is_array($state["sent"] ?? null) ? $state["sent"] : [];

  $summary = [
    "success" => true,
    "mode" => "no-photo-mailing-cli",
    "time" => $now->format(DateTimeInterface::ATOM),
    "dryRun" => $dryRun,
    "organizationsChecked" => 0,
    "messagesSent" => 0,
    "organizations" => [],
  ];

  $entries = @scandir(__DIR__);
  if (!is_array($entries)) {
    return ["success" => false, "mode" => "no-photo-mailing-cli", "error" => "Не удалось прочитать папки организаций."];
  }

  foreach ($entries as $orgFolder) {
    if ($orgFolder === "." || $orgFolder === "..") {
      continue;
    }
    $orgPath = __DIR__ . DIRECTORY_SEPARATOR . $orgFolder;
    if (!is_dir($orgPath)) {
      continue;
    }

    $settingsPath = $orgPath . DIRECTORY_SEPARATOR . "Настройки.json";
    $toolsPath = $orgPath . DIRECTORY_SEPARATOR . "База с инструментами.json";
    if (!file_exists($settingsPath) || !file_exists($toolsPath)) {
      continue;
    }
    $summary["organizationsChecked"]++;

    $settings = readJsonFile($settingsPath, []);
    $noPhotoMailing = resolveNoPhotoMailingConfig($settings);
    if (!is_array($noPhotoMailing) || empty($noPhotoMailing["enabled"])) {
      continue;
    }

    $scheduleByGroup = $noPhotoMailing["telegramSchedule"] ?? [];
    if (!is_array($scheduleByGroup) || empty($scheduleByGroup)) {
      continue;
    }

    $tools = readJsonArrayFile($toolsPath);
    $selectedGroups = [];
    foreach (($noPhotoMailing["toolGroups"] ?? []) as $groupName) {
      $label = normalizeMailingGroupName((string) $groupName);
      if ($label !== "") {
        $selectedGroups[$label] = true;
      }
    }

    $filteredTools = [];
    foreach ($tools as $tool) {
      if (!is_array($tool)) {
        continue;
      }
      if (!isToolInMailingGroups($tool, $selectedGroups)) {
        continue;
      }
      $filteredTools[] = $tool;
    }

    $orgSentCount = 0;
    foreach ($scheduleByGroup as $groupIdRaw => $schedule) {
      $chatId = normalizeTelegramId($groupIdRaw);
      if (!$chatId || !is_array($schedule)) {
        continue;
      }
      if (!isMoveRepliesScheduleDue($schedule, $now)) {
        continue;
      }

      $scheduleTime = normalizeScheduleTimeLabel($schedule["time"] ?? "");
      if ($scheduleTime === "") {
        continue;
      }
      $stateKey = $orgFolder . "|" . $chatId . "|" . $now->format("Y-m-d") . "|" . $scheduleTime;
      if (!empty($sentState[$stateKey])) {
        continue;
      }

      $text = buildNoPhotoMailingText($orgFolder, $filteredTools);
      $sendResult = $dryRun
        ? ["ok" => true, "statusCode" => 0]
        : sendTelegramTextMessage($botToken, $chatId, $text);

      if (!empty($sendResult["ok"])) {
        $sentState[$stateKey] = $now->format(DateTimeInterface::ATOM);
        $orgSentCount++;
        $summary["messagesSent"]++;
      } else {
        appendMailingLog("error", "Ошибка рассылки 'Без фото'.", [
          "organization" => $orgFolder,
          "chatId" => $chatId,
          "error" => $sendResult["error"] ?? "Неизвестная ошибка",
        ]);
      }
    }

    if ($orgSentCount > 0) {
      $summary["organizations"][] = [
        "organization" => $orgFolder,
        "messagesSent" => $orgSentCount,
        "toolsIncluded" => count($filteredTools),
      ];
    }
  }

  $encodedState = json_encode(["sent" => $sentState], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
  if ($encodedState !== false && !$dryRun) {
    file_put_contents($statePath, $encodedState . PHP_EOL, LOCK_EX);
  }

  return $summary;
}

function runNoPhotoMailingIfNeeded(): void {
  $timezone = new DateTimeZone("Europe/Moscow");
  $now = new DateTimeImmutable("now", $timezone);
  $currentMinuteStamp = $now->format("Y-m-d H:i");

  $statePath = __DIR__ . DIRECTORY_SEPARATOR . "telegram-no-photo-mailing-last-run.json";
  $state = readJsonFile($statePath, []);
  $lastRunMinute = trim((string) ($state["lastRunMinute"] ?? ""));
  if ($lastRunMinute === $currentMinuteStamp) {
    return;
  }

  $result = runNoPhotoMailing([
    "dryRun" => false,
  ]);

  if (empty($result["success"])) {
    appendMailingLog("error", "Не удалось выполнить рассылку 'Без фото' при автозапуске.", [
      "result" => $result,
    ]);
  }

  $nextState = [
    "lastRunMinute" => $currentMinuteStamp,
    "updatedAt" => $now->format(DateTimeInterface::ATOM),
  ];
  $encoded = json_encode($nextState, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
  if ($encoded !== false) {
    $saved = file_put_contents($statePath, $encoded . PHP_EOL, LOCK_EX);
    if ($saved === false) {
      appendMailingLog("warning", "Не удалось записать состояние автозапуска рассылки 'Без фото'.", [
        "statePath" => $statePath,
      ]);
    }
  }
}

function runRepairsMailing(array $options = []): array {
  $dryRun = !empty($options["dryRun"]);
  $timezone = new DateTimeZone("Europe/Moscow");
  $now = new DateTimeImmutable("now", $timezone);
  $botToken = getenv("ALLTRACK_BOT_TOKEN") ?: "";
  if ($botToken === "") {
    $botToken = "8549452123:AAGxveuJSVf-xpNHQYTDKDmuMmHjGRVeDj0";
  }

  $statePath = __DIR__ . DIRECTORY_SEPARATOR . "telegram-repairs-mailing-state.json";
  $state = readJsonFile($statePath, ["sent" => []]);
  $sentState = is_array($state["sent"] ?? null) ? $state["sent"] : [];

  $summary = [
    "success" => true,
    "mode" => "repairs-mailing-cli",
    "time" => $now->format(DateTimeInterface::ATOM),
    "dryRun" => $dryRun,
    "organizationsChecked" => 0,
    "messagesSent" => 0,
    "organizations" => [],
  ];

  $entries = @scandir(__DIR__);
  if (!is_array($entries)) {
    return ["success" => false, "mode" => "repairs-mailing-cli", "error" => "Не удалось прочитать папки организаций."];
  }

  foreach ($entries as $orgFolder) {
    if ($orgFolder === "." || $orgFolder === "..") {
      continue;
    }
    $orgPath = __DIR__ . DIRECTORY_SEPARATOR . $orgFolder;
    if (!is_dir($orgPath)) {
      continue;
    }

    $settingsPath = $orgPath . DIRECTORY_SEPARATOR . "Настройки.json";
    $toolsPath = $orgPath . DIRECTORY_SEPARATOR . "База с инструментами.json";
    if (!file_exists($settingsPath) || !file_exists($toolsPath)) {
      continue;
    }
    $summary["organizationsChecked"]++;

    $settings = readJsonFile($settingsPath, []);
    $repairsMailing = resolveRepairsMailingConfig($settings);
    if (!is_array($repairsMailing) || empty($repairsMailing["enabled"])) {
      continue;
    }

    $scheduleByGroup = $repairsMailing["telegramSchedule"] ?? [];
    if (!is_array($scheduleByGroup) || empty($scheduleByGroup)) {
      continue;
    }

    $tools = readJsonArrayFile($toolsPath);
    $selectedGroups = [];
    foreach (($repairsMailing["toolGroups"] ?? []) as $groupName) {
      $label = normalizeMailingGroupName((string) $groupName);
      if ($label !== "") {
        $selectedGroups[$label] = true;
      }
    }

    $filteredTools = [];
    foreach ($tools as $tool) {
      if (!is_array($tool)) {
        continue;
      }
      if (!isToolInMailingGroups($tool, $selectedGroups)) {
        continue;
      }
      $filteredTools[] = $tool;
    }

    $orgSentCount = 0;
    foreach ($scheduleByGroup as $groupIdRaw => $schedule) {
      $chatId = normalizeTelegramId($groupIdRaw);
      if (!$chatId || !is_array($schedule)) {
        continue;
      }
      if (!isMoveRepliesScheduleDue($schedule, $now)) {
        continue;
      }

      $scheduleTime = normalizeScheduleTimeLabel($schedule["time"] ?? "");
      if ($scheduleTime === "") {
        continue;
      }
      $stateKey = $orgFolder . "|" . $chatId . "|" . $now->format("Y-m-d") . "|" . $scheduleTime;
      if (!empty($sentState[$stateKey])) {
        continue;
      }

      $text = buildRepairsMailingText($orgFolder, $filteredTools);
      $sendResult = $dryRun
        ? ["ok" => true, "statusCode" => 0]
        : sendTelegramTextMessage($botToken, $chatId, $text);

      if (!empty($sendResult["ok"])) {
        $sentState[$stateKey] = $now->format(DateTimeInterface::ATOM);
        $orgSentCount++;
        $summary["messagesSent"]++;
      } else {
        appendMailingLog("error", "Ошибка рассылки 'Ремонты'.", [
          "organization" => $orgFolder,
          "chatId" => $chatId,
          "error" => $sendResult["error"] ?? "Неизвестная ошибка",
        ]);
      }
    }

    if ($orgSentCount > 0) {
      $summary["organizations"][] = [
        "organization" => $orgFolder,
        "messagesSent" => $orgSentCount,
        "toolsIncluded" => count($filteredTools),
      ];
    }
  }

  $encodedState = json_encode(["sent" => $sentState], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
  if ($encodedState !== false && !$dryRun) {
    file_put_contents($statePath, $encodedState . PHP_EOL, LOCK_EX);
  }

  return $summary;
}

function runRepairsMailingIfNeeded(): void {
  $timezone = new DateTimeZone("Europe/Moscow");
  $now = new DateTimeImmutable("now", $timezone);
  $currentMinuteStamp = $now->format("Y-m-d H:i");

  $statePath = __DIR__ . DIRECTORY_SEPARATOR . "telegram-repairs-mailing-last-run.json";
  $state = readJsonFile($statePath, []);
  $lastRunMinute = trim((string) ($state["lastRunMinute"] ?? ""));
  if ($lastRunMinute === $currentMinuteStamp) {
    return;
  }

  $result = runRepairsMailing([
    "dryRun" => false,
  ]);

  if (empty($result["success"])) {
    appendMailingLog("error", "Не удалось выполнить рассылку 'Ремонты' при автозапуске.", [
      "result" => $result,
    ]);
  }

  $nextState = [
    "lastRunMinute" => $currentMinuteStamp,
    "updatedAt" => $now->format(DateTimeInterface::ATOM),
  ];
  $encoded = json_encode($nextState, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
  if ($encoded !== false) {
    $saved = file_put_contents($statePath, $encoded . PHP_EOL, LOCK_EX);
    if ($saved === false) {
      appendMailingLog("warning", "Не удалось записать состояние автозапуска рассылки 'Ремонты'.", [
        "statePath" => $statePath,
      ]);
    }
  }
}

function resolveLateReplyFineConfig(array $settings): array {
  $candidates = [
    $settings["organization"]["fines"]["lateReply"] ?? null,
    $settings["organization"]["fines"] ?? null,
    $settings["fines"]["lateReply"] ?? null,
    $settings["fines"] ?? null,
  ];

  foreach ($candidates as $candidate) {
    if (!is_array($candidate)) {
      continue;
    }
    $enabled = !empty($candidate["enabled"]);
    $daysLimit = max(0, (int) ($candidate["days"] ?? 0));
    $amountPerDay = max(0, (float) ($candidate["amount"] ?? 0));
    if (!$enabled || $amountPerDay <= 0) {
      continue;
    }
    return [
      "enabled" => true,
      "daysLimit" => $daysLimit,
      "amountPerDay" => $amountPerDay,
    ];
  }

  return [
    "enabled" => false,
    "daysLimit" => 0,
    "amountPerDay" => 0,
  ];
}

function formatMoneyLabel(float $value): string {
  $normalized = round($value, 2);
  if (abs($normalized - round($normalized)) < 0.00001) {
    return number_format((float) round($normalized), 0, '.', ' ') . " руб.";
  }
  return number_format($normalized, 2, '.', ' ') . " руб.";
}

function resolveMovePendingDays(array $move, DateTimeImmutable $now, DateTimeZone $timezone): int {
  $moveDateRaw = trim((string) ($move["Дата перемещения"] ?? ""));
  $moveDate = parseDateToDateTime($moveDateRaw, $timezone);
  if ($moveDate === null) {
    return 0;
  }
  $days = (int) $moveDate->diff($now)->format("%r%a");
  return max(0, $days);
}

function resolveMoveCurrentLateFine(array $move, array $lateFineConfig, DateTimeImmutable $now, DateTimeZone $timezone): float {
  if (empty($lateFineConfig["enabled"])) {
    return 0;
  }
  $amountPerDay = (float) ($lateFineConfig["amountPerDay"] ?? 0);
  if ($amountPerDay <= 0) {
    return 0;
  }
  $pendingDays = resolveMovePendingDays($move, $now, $timezone);
  $daysLimit = max(0, (int) ($lateFineConfig["daysLimit"] ?? 0));
  if ($pendingDays <= $daysLimit) {
    return 0;
  }
  $chargedDays = max(0, $pendingDays - 1);
  return $chargedDays * $amountPerDay;
}

function resolveLateReplyBalanceByResponsible(array $fines): array {
  $summaryByUser = is_array($fines["Штрафы по пользователям"] ?? null)
    ? $fines["Штрафы по пользователям"]
    : [];
  $result = [];
  foreach ($summaryByUser as $fullName => $userSummary) {
    if (!is_array($userSummary)) {
      continue;
    }
    $lateReplySummary = is_array($userSummary["Поздний ответ"] ?? null)
      ? $userSummary["Поздний ответ"]
      : [];
    $balance = (float) ($lateReplySummary["Остаток"] ?? 0);
    $normalizedName = trim((string) $fullName);
    if ($normalizedName === "") {
      continue;
    }
    $result[$normalizedName] = $balance;
  }
  return $result;
}

function buildMoveRepliesMailingText(string $organization, array $pendingMoves, array $settings, array $fines): string {
  $count = count($pendingMoves);
  $headerOrg = trim($organization) !== "" ? trim($organization) : "Организация";
  $timezone = new DateTimeZone("Europe/Moscow");
  $now = new DateTimeImmutable("now", $timezone);
  $lateFineConfig = resolveLateReplyFineConfig($settings);
  $lateReplyBalanceByResponsible = resolveLateReplyBalanceByResponsible($fines);

  $groupedMoves = [];
  foreach ($pendingMoves as $move) {
    if (!is_array($move)) {
      continue;
    }
    $responsible = trim((string) ($move["Принял"] ?? ""));
    if ($responsible === "") {
      $responsible = "Не назначен";
    }
    if (!isset($groupedMoves[$responsible])) {
      $groupedMoves[$responsible] = [];
    }

    $groupedMoves[$responsible][] = [
      "move" => $move,
      "pendingDays" => resolveMovePendingDays($move, $now, $timezone),
      "currentFine" => resolveMoveCurrentLateFine($move, $lateFineConfig, $now, $timezone),
    ];
  }

  uksort($groupedMoves, static fn($a, $b) => strcasecmp($a, $b));

  $lines = [
    "📦 Напоминание: ответы на перемещения",
    "🏢 " . $headerOrg,
    "",
    "📌 Без ответа: " . $count,
  ];

  if ($count === 0) {
    $lines[] = "✅ Все перемещения закрыты, без просрочек.";
    return implode("\n", $lines);
  }

  $maxMoveLines = 120;
  $printedMoves = 0;
  foreach ($groupedMoves as $responsible => $movesByResponsible) {
    $currentBalance = (float) ($lateReplyBalanceByResponsible[$responsible] ?? 0);
    $currentPendingFine = 0;
    foreach ($movesByResponsible as $moveInfo) {
      $currentPendingFine += (float) ($moveInfo["currentFine"] ?? 0);
    }

    $lines[] = "";
    $lines[] = "👤 " . $responsible;
    $lines[] = "💳 Текущий остаток штрафа (закрытые): " . formatMoneyLabel($currentBalance);
    $lines[] = "⏳ Потенциальный штраф по открытым: " . formatMoneyLabel($currentPendingFine);

    foreach ($movesByResponsible as $moveInfo) {
      if ($printedMoves >= $maxMoveLines) {
        break 2;
      }
      $move = $moveInfo["move"];
      $toolName = trim((string) ($move["Инструмент"] ?? $move["Название"] ?? $move["Наименование"] ?? "Инструмент"));
      $toolNumber = trim((string) ($move["Номер"] ?? $move["Бух.номер"] ?? ""));
      $toObject = trim((string) ($move["Новый объект"] ?? ""));
      $pendingDays = (int) ($moveInfo["pendingDays"] ?? 0);
      $currentFine = (float) ($moveInfo["currentFine"] ?? 0);

      $line = "• 🧰 " . $toolName;
      if ($toolNumber !== "") {
        $line .= " (№" . $toolNumber . ")";
      }
      if ($toObject !== "") {
        $line .= " → 📍 " . $toObject;
      }
      $line .= "\n  ⌛ Без ответа: " . $pendingDays . " дн.";
      $line .= " · 💸 Штраф сейчас: " . formatMoneyLabel($currentFine);
      $lines[] = $line;
      $printedMoves++;
    }
  }

  if ($printedMoves < $count) {
    $lines[] = "";
    $lines[] = "⚠️ Показаны первые " . $printedMoves . " перемещений из " . $count . ".";
  }

  return implode("\n", $lines);
}

function runMoveRepliesMailing(array $options = []): array {
  $timezone = new DateTimeZone("Europe/Moscow");
  $now = new DateTimeImmutable("now", $timezone);
  $dryRun = !empty($options["dryRun"]);

  $botToken = getenv("ALLTRACK_BOT_TOKEN") ?: "";
  if ($botToken === "") {
    $botToken = "8549452123:AAGxveuJSVf-xpNHQYTDKDmuMmHjGRVeDj0";
  }

  $statePath = __DIR__ . DIRECTORY_SEPARATOR . "telegram-move-replies-mailing-state.json";
  $state = readJsonFile($statePath, ["sent" => []]);
  $sentState = is_array($state["sent"] ?? null) ? $state["sent"] : [];

  $summary = [
    "success" => true,
    "mode" => "move-replies-mailing-cli",
    "time" => $now->format(DateTimeInterface::ATOM),
    "dryRun" => $dryRun,
    "organizationsChecked" => 0,
    "messagesSent" => 0,
    "organizations" => [],
  ];

  $entries = @scandir(__DIR__);
  if (!is_array($entries)) {
    return ["success" => false, "mode" => "move-replies-mailing-cli", "error" => "Не удалось прочитать папки организаций."];
  }

  foreach ($entries as $orgFolder) {
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
      continue;
    }
    $summary["organizationsChecked"]++;

    $settings = readJsonFile($settingsPath, []);
    $moveRepliesMailing = resolveMoveRepliesMailingConfig($settings);
    if (!is_array($moveRepliesMailing) || empty($moveRepliesMailing["enabled"])) {
      continue;
    }

    $scheduleByGroup = $moveRepliesMailing["telegramSchedule"] ?? [];
    if (!is_array($scheduleByGroup) || empty($scheduleByGroup)) {
      continue;
    }

    $moves = readJsonArrayFile($movesPath);
    $finesPath = $orgPath . DIRECTORY_SEPARATOR . "Штрафы.json";
    $fines = readJsonFile($finesPath, []);
    $pendingMoves = [];
    foreach ($moves as $move) {
      if (!is_array($move)) {
        continue;
      }
      $answer = trim((string) ($move["Ответ"] ?? ""));
      if ($answer !== "") {
        continue;
      }
      $pendingMoves[] = $move;
    }

    $orgSentCount = 0;
    foreach ($scheduleByGroup as $groupIdRaw => $schedule) {
      $chatId = normalizeTelegramId($groupIdRaw);
      if (!$chatId || !is_array($schedule)) {
        continue;
      }
      if (!isMoveRepliesScheduleDue($schedule, $now)) {
        continue;
      }

      $scheduleTime = normalizeScheduleTimeLabel($schedule["time"] ?? "");
      if ($scheduleTime === "") {
        continue;
      }
      $stateKey = $orgFolder . "|" . $chatId . "|" . $now->format("Y-m-d") . "|" . $scheduleTime;
      if (!empty($sentState[$stateKey])) {
        continue;
      }

      $text = buildMoveRepliesMailingText($orgFolder, $pendingMoves, $settings, $fines);
      $sendResult = $dryRun
        ? ["ok" => true, "statusCode" => 0]
        : sendTelegramTextMessage($botToken, $chatId, $text);

      if (!empty($sendResult["ok"])) {
        $sentState[$stateKey] = $now->format(DateTimeInterface::ATOM);
        $orgSentCount++;
        $summary["messagesSent"]++;
      } else {
        appendMailingLog("error", "Ошибка рассылки 'Ответы на перемещения'.", [
          "organization" => $orgFolder,
          "chatId" => $chatId,
          "error" => $sendResult["error"] ?? "Неизвестная ошибка",
        ]);
      }
    }

    if ($orgSentCount > 0) {
      $summary["organizations"][] = [
        "organization" => $orgFolder,
        "messagesSent" => $orgSentCount,
        "pendingMoves" => count($pendingMoves),
      ];
    }
  }

  $encodedState = json_encode(["sent" => $sentState], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
  if ($encodedState !== false && !$dryRun) {
    file_put_contents($statePath, $encodedState . PHP_EOL, LOCK_EX);
  }

  return $summary;
}

function runMoveRepliesMailingIfNeeded(): void {
  $timezone = new DateTimeZone("Europe/Moscow");
  $now = new DateTimeImmutable("now", $timezone);
  $currentMinuteStamp = $now->format("Y-m-d H:i");

  $statePath = __DIR__ . DIRECTORY_SEPARATOR . "telegram-move-replies-mailing-last-run.json";
  $state = readJsonFile($statePath, []);
  $lastRunMinute = trim((string) ($state["lastRunMinute"] ?? ""));
  if ($lastRunMinute === $currentMinuteStamp) {
    return;
  }

  $result = runMoveRepliesMailing([
    "dryRun" => false,
  ]);

  if (empty($result["success"])) {
    appendMailingLog("error", "Не удалось выполнить рассылку 'Ответы на перемещения' при автозапуске.", [
      "result" => $result,
    ]);
  }

  $nextState = [
    "lastRunMinute" => $currentMinuteStamp,
    "updatedAt" => $now->format(DateTimeInterface::ATOM),
  ];
  $encoded = json_encode($nextState, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
  if ($encoded !== false) {
    $saved = file_put_contents($statePath, $encoded . PHP_EOL, LOCK_EX);
    if ($saved === false) {
      appendMailingLog("warning", "Не удалось записать состояние автозапуска рассылки 'Ответы на перемещения'.", [
        "statePath" => $statePath,
      ]);
    }
  }
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

function resolveOrganizationFolderName(string $name): ?string {
  $orgName = trim($name);
  if ($orgName === "") {
    return null;
  }

  $orgsPath = __DIR__ . DIRECTORY_SEPARATOR . "organizations.json";
  $orgsData = readJsonFile($orgsPath, ["organizations" => []]);
  $shortName = pickOrganizationShortName($orgsData, $orgName);
  $folder = sanitizeFolderName($shortName ?: $orgName);
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
    "Выгрузки",
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

  $orgFolder = resolveOrganizationFolderName($segments[0]);
  if ($orgFolder === null) {
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
  $orgFolderSafe = resolveOrganizationFolderName($orgFolder);
  if ($orgFolderSafe === null) {
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
    "Выгрузки",
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
  $orgFolderSafe = resolveOrganizationFolderName($orgFolder);
  if ($orgFolderSafe === null) {
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
    "Выгрузки",
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

  $targetDir = dirname($targetPath);
  if (basename($targetDir) === "Выгрузки") {
    cleanupOldExportFiles($targetDir, 20);
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
  if (($entry["type"] ?? "") === "feedback-request") {
    saveFeedbackRequest($entry);
    return;
  }
  if (($entry["type"] ?? "") === "feedback-status-update") {
    sendFeedbackStatusNotification($entry);
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

function sendTelegramPhotoMessage(string $botToken, string $chatId, string $photoPath, string $caption = ""): array {
  if (!function_exists("curl_init")) {
    return [
      "ok" => false,
      "error" => "На сервере недоступен cURL для отправки фото.",
      "statusCode" => 0,
    ];
  }

  $apiUrl = "https://api.telegram.org/bot" . rawurlencode($botToken) . "/sendPhoto";
  $postFields = [
    "chat_id" => $chatId,
    "photo" => new CURLFile($photoPath),
  ];
  if ($caption !== "") {
    $postFields["caption"] = $caption;
  }

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
    CURLOPT_POSTFIELDS => $postFields,
    CURLOPT_TIMEOUT => 20,
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

function saveFeedbackRequest(array $entry): void {
  $text = trim((string) ($entry["text"] ?? ""));
  if ($text === "") {
    http_response_code(400);
    echo json_encode(["error" => "Текст обращения обязателен."]);
    exit;
  }

  $isAnonymous = !empty($entry["anonymous"]);
  $organization = trim((string) ($entry["organization"] ?? ""));
  $createdBy = is_array($entry["createdBy"] ?? null) ? $entry["createdBy"] : [];

  $feedbackFile = __DIR__ . DIRECTORY_SEPARATOR . "feedback-requests.json";
  $feedbackPhotosDir = __DIR__ . DIRECTORY_SEPARATOR . "feedback-photos";
  if (!ensureDirectory($feedbackPhotosDir)) {
    http_response_code(500);
    echo json_encode(["error" => "Не удалось создать папку для фото обратной связи."]);
    exit;
  }

  $data = readJsonFile($feedbackFile, ["lastId" => 0, "requests" => []]);
  $lastId = (int) ($data["lastId"] ?? 0);
  $newId = $lastId + 1;

  $photos = is_array($entry["photos"] ?? null) ? $entry["photos"] : [];
  $savedPhotoNames = [];
  foreach ($photos as $index => $photoEntry) {
    if (!is_array($photoEntry)) {
      continue;
    }
    $encoded = (string) ($photoEntry["content"] ?? "");
    if ($encoded === "") {
      continue;
    }
    $decoded = base64_decode($encoded, true);
    if ($decoded === false) {
      continue;
    }
    $extensionRaw = strtolower((string) ($photoEntry["extension"] ?? "jpg"));
    $extension = preg_replace('/[^a-z0-9]+/', '', $extensionRaw);
    if ($extension === '') {
      $extension = 'jpg';
    }
    $photoName = $newId . '_' . ($index + 1) . '.' . $extension;
    $targetPath = $feedbackPhotosDir . DIRECTORY_SEPARATOR . $photoName;
    if (file_put_contents($targetPath, $decoded, LOCK_EX) !== false) {
      $savedPhotoNames[] = $photoName;
    }
  }

  $timezone = new DateTimeZone("Europe/Moscow");
  $requestEntry = [
    "id" => $newId,
    "createdAt" => (new DateTimeImmutable("now", $timezone))->format(DateTimeInterface::ATOM),
    "organization" => $organization,
    "anonymous" => $isAnonymous,
    "text" => $text,
    "photos" => $savedPhotoNames,
    "createdBy" => $isAnonymous
      ? ["label" => "Анонимно"]
      : [
          "telegram_id" => $createdBy["telegram_id"] ?? null,
          "full_name" => (string) ($createdBy["full_name"] ?? ""),
          "role" => (string) ($createdBy["role"] ?? ""),
          "organization" => (string) ($createdBy["organization"] ?? ""),
        ],
  ];

  $requests = is_array($data["requests"] ?? null) ? $data["requests"] : [];
  $requests[] = $requestEntry;
  $data["lastId"] = $newId;
  $data["requests"] = $requests;

  $encoded = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
  if ($encoded === false || file_put_contents($feedbackFile, $encoded . PHP_EOL, LOCK_EX) === false) {
    http_response_code(500);
    echo json_encode(["error" => "Не удалось сохранить обращение."]);
    exit;
  }

  $usersData = readJsonFile(__DIR__ . DIRECTORY_SEPARATOR . "users.json", ["users" => []]);
  $botToken = getenv("ALLTRACK_BOT_TOKEN") ?: "";
  if ($botToken === "") {
    $botToken = "8549452123:AAGxveuJSVf-xpNHQYTDKDmuMmHjGRVeDj0";
  }

  $superAdmins = [];
  foreach (($usersData["users"] ?? []) as $userItem) {
    if (!is_array($userItem)) {
      continue;
    }
    $role = trim((string) ($userItem["role"] ?? ""));
    if ($role !== "Супер-администратор") {
      continue;
    }
    $tgId = normalizeTelegramId($userItem["telegram_id"] ?? null);
    if ($tgId) {
      $superAdmins[] = $tgId;
    }
  }
  $superAdmins = array_values(array_unique($superAdmins));

  if ($botToken !== "" && !empty($superAdmins)) {
    $authorLine = $isAnonymous
      ? "👤 Отправитель: Анонимно"
      : "👤 Отправитель: " . trim((string) ($createdBy["full_name"] ?? "Не указан"));
    $message = "💬 Новая обратная связь\n"
      . "№ обращения: " . $newId . "\n"
      . "🏢 Организация: " . ($organization !== "" ? $organization : "Не указана") . "\n"
      . $authorLine . "\n\n"
      . "📝 Текст:\n" . $text;

    foreach ($superAdmins as $chatId) {
      sendTelegramTextMessage($botToken, $chatId, $message);
      foreach ($savedPhotoNames as $photoIndex => $photoName) {
        $photoPath = $feedbackPhotosDir . DIRECTORY_SEPARATOR . $photoName;
        if (!is_file($photoPath)) {
          continue;
        }
        $caption = $photoIndex === 0 ? "Фото к обращению №" . $newId : "";
        sendTelegramPhotoMessage($botToken, $chatId, $photoPath, $caption);
      }
    }
  }
}


function mapFeedbackStatusLabel(string $status): string {
  $normalized = mb_strtolower(trim($status), "UTF-8");
  if ($normalized === "in-progress" || $normalized === "in_progress" || $normalized === "в работе") {
    return "В работе";
  }
  if ($normalized === "closed" || $normalized === "закрыто" || $normalized === "закрыт") {
    return "Закрыто";
  }
  if ($normalized === "rejected" || $normalized === "reject" || $normalized === "отклонено") {
    return "Отклонено";
  }
  return "Новое";
}

function sendFeedbackStatusNotification(array $entry): void {
  $createdBy = is_array($entry["createdBy"] ?? null) ? $entry["createdBy"] : [];
  $telegramId = normalizeTelegramId($createdBy["telegram_id"] ?? null);
  if (!$telegramId) {
    return;
  }

  $botToken = getenv("ALLTRACK_BOT_TOKEN") ?: "";
  if ($botToken === "") {
    $botToken = "8549452123:AAGxveuJSVf-xpNHQYTDKDmuMmHjGRVeDj0";
  }
  if ($botToken === "") {
    return;
  }

  $requestId = (int) ($entry["requestId"] ?? 0);
  $statusLabel = mapFeedbackStatusLabel((string) ($entry["status"] ?? ""));
  $organization = trim((string) ($entry["organization"] ?? ""));
  $text = trim((string) ($entry["text"] ?? ""));
  if ($text !== "" && mb_strlen($text, "UTF-8") > 250) {
    $text = mb_substr($text, 0, 250, "UTF-8") . "…";
  }

  $message = "📬 Обновление по вашему обращению
"
    . "№ обращения: " . ($requestId > 0 ? (string) $requestId : "—") . "
"
    . "Статус: " . $statusLabel;

  if ($organization !== "") {
    $message .= "
🏢 Организация: " . $organization;
  }
  if ($text !== "") {
    $message .= "

📝 Ваш текст:
" . $text;
  }

  sendTelegramTextMessage($botToken, $telegramId, $message);
}

$isCli = PHP_SAPI === "cli";
if ($isCli) {
  $argvList = isset($argv) && is_array($argv) ? $argv : [];
  if (in_array("--run-scheduled-mailings", $argvList, true)) {
    $dryRun = in_array("--dry-run", $argvList, true);
    $moveRepliesResult = runMoveRepliesMailing([
      "dryRun" => $dryRun,
    ]);
    $repairsResult = runRepairsMailing([
      "dryRun" => $dryRun,
    ]);
    $noPhotoMailingResult = runNoPhotoMailing([
      "dryRun" => $dryRun,
    ]);
    $noPhotoResult = runNoPhotoFineRecalculation([
      "respectTime" => true,
      "dryRun" => $dryRun,
    ]);

    $result = [
      "success" => !empty($moveRepliesResult["success"]) && !empty($repairsResult["success"]) && !empty($noPhotoMailingResult["success"]) && !empty($noPhotoResult["success"]),
      "mode" => "scheduled-mailings-cli",
      "dryRun" => $dryRun,
      "moveReplies" => $moveRepliesResult,
      "repairs" => $repairsResult,
      "noPhotoMailing" => $noPhotoMailingResult,
      "noPhotoFines" => $noPhotoResult,
    ];
    echo json_encode($result, JSON_UNESCAPED_UNICODE) . PHP_EOL;
    exit;
  }
  if (in_array("--run-move-replies-mailing", $argvList, true)) {
    $dryRun = in_array("--dry-run", $argvList, true);
    $result = runMoveRepliesMailing([
      "dryRun" => $dryRun,
    ]);
    echo json_encode($result, JSON_UNESCAPED_UNICODE) . PHP_EOL;
    exit;
  }
  if (in_array("--run-daily-no-photo-fines", $argvList, true)) {
    $respectTime = !in_array("--ignore-time", $argvList, true);
    $dryRun = in_array("--dry-run", $argvList, true);
    $result = runNoPhotoFineRecalculation([
      "respectTime" => $respectTime,
      "dryRun" => $dryRun,
    ]);
    echo json_encode($result, JSON_UNESCAPED_UNICODE) . PHP_EOL;
    exit;
  }
  if (in_array("--run-repairs-mailing", $argvList, true)) {
    $dryRun = in_array("--dry-run", $argvList, true);
    $result = runRepairsMailing([
      "dryRun" => $dryRun,
    ]);
    echo json_encode($result, JSON_UNESCAPED_UNICODE) . PHP_EOL;
    exit;
  }
  if (in_array("--run-no-photo-mailing", $argvList, true)) {
    $dryRun = in_array("--dry-run", $argvList, true);
    $result = runNoPhotoMailing([
      "dryRun" => $dryRun,
    ]);
    echo json_encode($result, JSON_UNESCAPED_UNICODE) . PHP_EOL;
    exit;
  }
}

$requestedAction = trim((string) ($_GET["action"] ?? $payload["action"] ?? ""));
if ($requestedAction === "run-scheduled-mailings") {
  runNoPhotoFineRecalculationIfNeeded();
  runMoveRepliesMailingIfNeeded();
  runRepairsMailingIfNeeded();
  runNoPhotoMailingIfNeeded();
  echo json_encode([
    "success" => true,
    "action" => "run-scheduled-mailings",
    "serverTime" => (new DateTimeImmutable("now", new DateTimeZone("Europe/Moscow")))->format(DateTimeInterface::ATOM),
  ], JSON_UNESCAPED_UNICODE);
  exit;
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

runNoPhotoFineRecalculationIfNeeded();
runMoveRepliesMailingIfNeeded();
runRepairsMailingIfNeeded();
runNoPhotoMailingIfNeeded();

echo json_encode(["success" => true]);

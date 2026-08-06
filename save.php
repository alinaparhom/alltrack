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

function alltrack_fix_file_permissions(string $path): void {
  if ($path === '' || !is_file($path)) {
    return;
  }

  @chown($path, 'www-root');
  @chgrp($path, 'www-root');
  @chmod($path, 0664);
}

function alltrack_fix_dir_permissions(string $dir): void {
  if ($dir === '' || !is_dir($dir)) {
    return;
  }

  @chown($dir, 'www-root');
  @chgrp($dir, 'www-root');
  @chmod($dir, 02775);
}

function alltrack_ensure_dir(string $dir): bool {
  if ($dir === '') {
    return false;
  }

  if (!is_dir($dir)) {
    @mkdir($dir, 02775, true);
  }

  if (is_dir($dir)) {
    alltrack_fix_dir_permissions($dir);
    return true;
  }

  return false;
}

function alltrack_is_php_fpm_binary(string $path): bool {
  return stripos(basename($path), "php-fpm") !== false;
}

function alltrack_php_cli_binary(): string {
  $candidates = [
    "/usr/bin/php",
    "/usr/local/bin/php",
    "php",
  ];

  foreach ($candidates as $candidate) {
    if ($candidate === "php") {
      return $candidate;
    }

    if (is_file($candidate) && is_executable($candidate) && !alltrack_is_php_fpm_binary($candidate)) {
      return $candidate;
    }
  }

  return "php";
}

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
  if (file_put_contents($logPath, $encoded . PHP_EOL, LOCK_EX) !== false) {
    alltrack_fix_file_permissions($logPath);
  }
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
    if (@file_put_contents($bootstrapStatePath, $encoded . PHP_EOL, LOCK_EX) !== false) {
      alltrack_fix_file_permissions($bootstrapStatePath);
    }
  }

  $phpBinary = alltrack_php_cli_binary();
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

  $isNegative = str_starts_with($raw, "-");
  $digits = preg_replace('/\D+/', "", $raw);
  if ($digits === "") {
    return null;
  }

  $normalizedDigits = ltrim($digits, "0");
  if ($normalizedDigits === "") {
    return null;
  }

  return $isNegative ? "-" . $normalizedDigits : $normalizedDigits;
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

function resolveOrganizationFullNameByFolder(string $orgFolder, array $orgData): string {
  $fallback = trim($orgFolder);
  if ($fallback === "") {
    return "Организация";
  }

  $targetFolder = normalizeOrganizationFolder($orgFolder);
  $organizations = is_array($orgData["organizations"] ?? null) ? $orgData["organizations"] : [];

  foreach ($organizations as $org) {
    if (!is_array($org)) {
      continue;
    }
    $fullName = trim((string) ($org["full_name"] ?? ""));
    $shortName = trim((string) ($org["short_name"] ?? ""));
    if (
      folderMatchesOrganization($targetFolder, $fullName) ||
      folderMatchesOrganization($targetFolder, $shortName)
    ) {
      return $fullName !== "" ? $fullName : ($shortName !== "" ? $shortName : $fallback);
    }
  }

  return $fallback;
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
          if (file_put_contents($toolsPath, $encoded . PHP_EOL, LOCK_EX) !== false) {
            alltrack_fix_file_permissions($toolsPath);
          }
        }
      }
    }
  }

  return $summary;
}

function runNoPhotoFineRecalculationIfNeeded(): void {
  $timezone = new DateTimeZone("Europe/Moscow");
  $now = new DateTimeImmutable("now", $timezone);
  $scheduleTime = "08:45";
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
    } else {
      alltrack_fix_file_permissions($statePath);
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

function normalizePersonLabel(string $value): string {
  $normalized = preg_replace('/\s+/u', ' ', trim($value));
  if (!is_string($normalized)) {
    return "";
  }
  return mb_strtolower($normalized, 'UTF-8');
}

function resolvePendingAcceptanceMailingConfig(array $userSettings): array {
  $defaults = [
    "days" => ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
    "time" => "18:00",
  ];

  $raw = $userSettings["pendingAcceptanceMailing"] ?? null;
  if (!is_array($raw)) {
    return $defaults;
  }

  $allowedDaysMap = [
    "Пн" => true,
    "Вт" => true,
    "Ср" => true,
    "Чт" => true,
    "Пт" => true,
    "Сб" => true,
    "Вс" => true,
  ];

  $days = [];
  $rawDays = $raw["days"] ?? [];
  if (is_array($rawDays)) {
    foreach ($rawDays as $day) {
      $label = normalizeWeekDayLabel((string) $day);
      if ($label !== "" && !empty($allowedDaysMap[$label])) {
        $days[$label] = true;
      }
    }
  }

  $normalizedTime = normalizeScheduleTimeLabel($raw["time"] ?? "");
  return [
    "days" => !empty($days) ? array_keys($days) : $defaults["days"],
    "time" => $normalizedTime !== "" ? $normalizedTime : $defaults["time"],
  ];
}

function isUserPendingAcceptanceScheduleDue(array $schedule, DateTimeImmutable $now): bool {
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
  return $nowTotalMinutes === $scheduleTotalMinutes;
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

function resolveNoAccountingNumberMailingConfig(array $settings): ?array {
  return resolveOrganizationMailingConfig($settings, "noAccountingNumber");
}

function normalizeTelegramScheduleForMailing($schedule, array $organizationTelegramGroups = []): array {
  $normalized = [];

  if (is_array($schedule) && array_is_list($schedule)) {
    foreach ($schedule as $entry) {
      if (!is_array($entry)) {
        continue;
      }
      $chatId = normalizeTelegramId((string) ($entry["telegramId"] ?? $entry["telegram_id"] ?? $entry["groupId"] ?? $entry["chatId"] ?? ""));
      if (!$chatId) {
        continue;
      }
      $normalized[$chatId] = [
        "days" => is_array($entry["days"] ?? null) ? $entry["days"] : [],
        "time" => normalizeScheduleTimeLabel((string) ($entry["time"] ?? "")),
      ];
    }
    return $normalized;
  }

  if (is_array($schedule)) {
    foreach ($schedule as $groupIdRaw => $entry) {
      if (!is_array($entry)) {
        continue;
      }
      $chatId = normalizeTelegramId((string) $groupIdRaw);
      if (!$chatId) {
        continue;
      }
      $normalized[$chatId] = [
        "days" => is_array($entry["days"] ?? null) ? $entry["days"] : [],
        "time" => normalizeScheduleTimeLabel((string) ($entry["time"] ?? "")),
      ];
    }
  }

  return $normalized;
}

function resolveOrganizationMailingConfig(array $settings, string $mailingKey): ?array {
  if ($mailingKey === "") {
    return null;
  }

  $candidates = [
    $settings["organization"]["mailings"][$mailingKey] ?? null,
    $settings["mailings"][$mailingKey] ?? null,
  ];

  $resolved = null;
  foreach ($candidates as $candidate) {
    if (!is_array($candidate) || empty($candidate)) {
      continue;
    }

    if ($resolved === null) {
      $resolved = $candidate;
      continue;
    }

    $resolved = array_replace($resolved, $candidate);
  }

  if ($resolved === null) {
    return null;
  }

  $organizationTelegramGroups = is_array($settings["organization"]["telegramGroups"] ?? null)
    ? $settings["organization"]["telegramGroups"]
    : [];

  $resolved["telegramSchedule"] = normalizeTelegramScheduleForMailing(
    $resolved["telegramSchedule"] ?? [],
    $organizationTelegramGroups
  );

  return $resolved;
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

function isBrokenTool(array $tool): bool {
  $status = mb_strtolower(trim((string) ($tool["Статус"] ?? "")), 'UTF-8');
  return $status === "сломан";
}

function renderMailingTopList(array $counter, string $labelTitle): array {
  if (empty($counter)) {
    return ["• Нет данных"];
  }

  arsort($counter, SORT_NUMERIC);
  $total = array_sum($counter);
  $maxValue = max($counter);
  $lines = [];

  foreach ($counter as $label => $count) {
    $normalizedLabel = trim((string) $label);
    if ($normalizedLabel === "") {
      $normalizedLabel = "Не указано";
    }
    $barLength = $maxValue > 0 ? max(1, (int) round(($count / $maxValue) * 10)) : 1;
    $bar = str_repeat("▮", $barLength);
    $percent = formatPercentageLabel((int) $count, (int) $total);
    $lines[] = "• {$normalizedLabel}: {$count} {$labelTitle} {$bar} ({$percent})";
  }

  return $lines;
}

function collectNoPhotoTools(array $tools): array {
  $noPhoto = [];
  foreach ($tools as $tool) {
    if (!is_array($tool)) {
      continue;
    }
    $photoCount = (int) ($tool["Количество фото"] ?? 0);
    if ($photoCount !== 0) {
      continue;
    }
    $noPhoto[] = $tool;
  }
  return $noPhoto;
}

function buildNoPhotoChartCounters(array $tools): array {
  $byObject = [];
  $byResponsible = [];

  foreach ($tools as $tool) {
    if (!is_array($tool)) {
      continue;
    }

    $object = trim((string) ($tool["Объект"] ?? ""));
    if ($object !== "") {
      $byObject[$object] = ($byObject[$object] ?? 0) + 1;
    }

    $responsible = trim((string) ($tool["Ответственный"] ?? ""));
    if ($responsible !== "") {
      $byResponsible[$responsible] = ($byResponsible[$responsible] ?? 0) + 1;
    }
  }

  return [
    "byObject" => $byObject,
    "byResponsible" => $byResponsible,
  ];
}

function buildNoPhotoMailingText(string $organization, array $tools): string {
  $headerOrg = trim($organization) !== "" ? trim($organization) : "Организация";
  $noPhotoTools = collectNoPhotoTools($tools);

  $totalCount = count($noPhotoTools);
  $lines = [
    "📷 Рассылка «Без фото»",
    "🏢 Организация: {$headerOrg}",
    "",
    "Инструментов без фото: {$totalCount}",
  ];

  if ($totalCount === 0) {
    $lines[] = "✅ Нет инструментов с количеством фото 0.";
    return implode("\n", $lines);
  }

  return implode("\n", $lines);
}

function collectToolsWithoutAccountingNumber(array $tools): array {
  $missingAccounting = [];
  foreach ($tools as $tool) {
    if (!is_array($tool)) {
      continue;
    }

    $accountingNumber = trim((string) ($tool["Бух.номер"] ?? ""));
    if ($accountingNumber !== "") {
      continue;
    }

    $missingAccounting[] = $tool;
  }

  return $missingAccounting;
}

function buildNoAccountingNumberMailingText(string $organization, array $tools): string {
  $headerOrg = trim($organization) !== "" ? trim($organization) : "Организация";
  $missingAccounting = collectToolsWithoutAccountingNumber($tools);
  $totalCount = count($missingAccounting);

  $lines = [
    "📒 Рассылка «Без бух.номера»",
    "🏢 Организация: {$headerOrg}",
    "",
    "Инструментов без бух.номера: {$totalCount}",
  ];

  if ($totalCount === 0) {
    $lines[] = "✅ У всех инструментов указан бух.номер.";
    return implode("\n", $lines);
  }

  $groupedByResponsible = [];
  foreach ($missingAccounting as $tool) {
    $responsible = trim((string) ($tool["Ответственный"] ?? ""));
    if ($responsible === "") {
      $responsible = "Не указан";
    }
    $groupedByResponsible[$responsible][] = $tool;
  }

  ksort($groupedByResponsible, SORT_NATURAL | SORT_FLAG_CASE);
  $lines[] = "";
  $lines[] = "Список по ответственным:";
  foreach ($groupedByResponsible as $responsible => $responsibleTools) {
    $lines[] = "";
    $lines[] = "👤 {$responsible} — " . count($responsibleTools) . " шт.";

    foreach ($responsibleTools as $tool) {
      $toolName = trim((string) ($tool["Название"] ?? ""));
      if ($toolName === "") {
        $toolName = "Без названия";
      }

      $toolNumber = trim((string) ($tool["Номер"] ?? ""));
      if ($toolNumber === "") {
        $toolNumber = "—";
      }

      $toolGroup = trim((string) resolveToolGroupName($tool));
      if ($toolGroup === "") {
        $toolGroup = "Не указана";
      }

      $lines[] = "• {$toolName} (№ {$toolNumber}, группа: {$toolGroup})";
    }
  }

  return implode("\n", $lines);
}

function buildNoPhotoChartImage(string $organization, string $chartTitle, array $counter): ?string {
  if (empty($counter)) {
    return null;
  }

  arsort($counter, SORT_NUMERIC);
  $labels = [];
  $values = [];
  foreach ($counter as $label => $value) {
    $labelText = trim((string) $label);
    if ($labelText === "") {
      $labelText = "Не указано";
    }
    $labels[] = mb_strimwidth($labelText, 0, 34, "…", "UTF-8");
    $values[] = (int) $value;
  }

  $chartConfig = [
    "type" => "bar",
    "data" => [
      "labels" => $labels,
      "datasets" => [[
        "label" => "Инструменты без фото",
        "data" => $values,
        "backgroundColor" => "rgba(239, 68, 68, 0.82)",
        "borderColor" => "rgba(220, 38, 38, 1)",
        "borderWidth" => 1,
        "datalabels" => [
          "anchor" => "end",
          "align" => "end",
          "offset" => 2,
          "color" => "#7f1d1d",
          "font" => ["weight" => "bold", "size" => 13],
        ],
      ]],
    ],
    "options" => [
      "plugins" => [
        "legend" => ["display" => false],
        "datalabels" => ["display" => true],
        "title" => [
          "display" => true,
          "text" => $chartTitle,
          "font" => ["size" => 18],
          "color" => "#1f2937",
        ],
      ],
      "scales" => [
        "y" => [
          "beginAtZero" => true,
          "ticks" => ["precision" => 0, "color" => "#334155"],
        ],
        "x" => [
          "ticks" => ["color" => "#334155", "maxRotation" => 25, "minRotation" => 0],
        ],
      ],
    ],
  ];

  $encodedChart = rawurlencode((string) json_encode($chartConfig, JSON_UNESCAPED_UNICODE));
  $url = "https://quickchart.io/chart?width=1200&height=700&backgroundColor=white&devicePixelRatio=2&c={$encodedChart}";
  $imageBinary = @file_get_contents($url);
  if ($imageBinary === false || $imageBinary === "") {
    return null;
  }

  $safeOrg = preg_replace('/[^a-z0-9_-]+/iu', '-', trim($organization));
  if (!is_string($safeOrg) || $safeOrg === "") {
    $safeOrg = "org";
  }
  $safeTitle = preg_replace('/[^a-z0-9_-]+/iu', '-', trim($chartTitle));
  if (!is_string($safeTitle) || $safeTitle === "") {
    $safeTitle = "chart";
  }

  $fileName = sprintf(
    'no-photo-chart-%s-%s-%s.png',
    $safeOrg,
    $safeTitle,
    date('Ymd-His')
  );
  $targetPath = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $fileName;
  if (@file_put_contents($targetPath, $imageBinary, LOCK_EX) === false) {
    return null;
  }
  alltrack_fix_file_permissions($targetPath);

  return $targetPath;
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

  $orgData = readJsonFile(__DIR__ . DIRECTORY_SEPARATOR . "organizations.json", ["organizations" => []]);

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

    $orgDisplayName = resolveOrganizationFullNameByFolder($orgFolder, $orgData);

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

      $noPhotoTools = collectNoPhotoTools($filteredTools);
      $text = buildNoPhotoMailingText($orgDisplayName, $filteredTools);
      $sendResult = $dryRun
        ? ["ok" => true, "statusCode" => 0]
        : sendTelegramTextMessage($botToken, $chatId, $text);

      if (!empty($sendResult["ok"])) {
        if (!$dryRun && !empty($noPhotoTools)) {
          $counters = buildNoPhotoChartCounters($noPhotoTools);
          $objectChartPath = buildNoPhotoChartImage($orgDisplayName, "График 1: по объектам", $counters["byObject"] ?? []);
          if (is_string($objectChartPath) && is_file($objectChartPath)) {
            $photoResult = sendTelegramPhotoMessage($botToken, $chatId, $objectChartPath, "График 1: инструменты без фото по объектам");
            if (empty($photoResult["ok"])) {
              appendMailingLog("warning", "Не удалось отправить график 1 рассылки 'Без фото'.", [
                "organization" => $orgFolder,
                "chatId" => $chatId,
                "error" => $photoResult["error"] ?? "Неизвестная ошибка",
              ]);
            }
            @unlink($objectChartPath);
          }

          $responsibleChartPath = buildNoPhotoChartImage($orgDisplayName, "График 2: по ответственным", $counters["byResponsible"] ?? []);
          if (is_string($responsibleChartPath) && is_file($responsibleChartPath)) {
            $photoResult = sendTelegramPhotoMessage($botToken, $chatId, $responsibleChartPath, "График 2: инструменты без фото по ответственным");
            if (empty($photoResult["ok"])) {
              appendMailingLog("warning", "Не удалось отправить график 2 рассылки 'Без фото'.", [
                "organization" => $orgFolder,
                "chatId" => $chatId,
                "error" => $photoResult["error"] ?? "Неизвестная ошибка",
              ]);
            }
            @unlink($responsibleChartPath);
          }
        }

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
    if (file_put_contents($statePath, $encodedState . PHP_EOL, LOCK_EX) !== false) {
      alltrack_fix_file_permissions($statePath);
    }
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
    } else {
      alltrack_fix_file_permissions($statePath);
    }
  }
}

function runNoAccountingNumberMailing(array $options = []): array {
  $dryRun = !empty($options["dryRun"]);
  $timezone = new DateTimeZone("Europe/Moscow");
  $now = new DateTimeImmutable("now", $timezone);
  $botToken = getenv("ALLTRACK_BOT_TOKEN") ?: "";
  if ($botToken === "") {
    $botToken = "8549452123:AAGxveuJSVf-xpNHQYTDKDmuMmHjGRVeDj0";
  }

  $statePath = __DIR__ . DIRECTORY_SEPARATOR . "telegram-no-accounting-number-mailing-state.json";
  $state = readJsonFile($statePath, ["sent" => []]);
  $sentState = is_array($state["sent"] ?? null) ? $state["sent"] : [];

  $summary = [
    "success" => true,
    "mode" => "no-accounting-number-mailing-cli",
    "time" => $now->format(DateTimeInterface::ATOM),
    "dryRun" => $dryRun,
    "organizationsChecked" => 0,
    "messagesSent" => 0,
    "organizations" => [],
  ];

  $entries = @scandir(__DIR__);
  if (!is_array($entries)) {
    return ["success" => false, "mode" => "no-accounting-number-mailing-cli", "error" => "Не удалось прочитать папки организаций."];
  }

  $orgData = readJsonFile(__DIR__ . DIRECTORY_SEPARATOR . "organizations.json", ["organizations" => []]);

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
    $mailing = resolveNoAccountingNumberMailingConfig($settings);
    if (!is_array($mailing) || empty($mailing["enabled"])) {
      continue;
    }

    $scheduleByGroup = $mailing["telegramSchedule"] ?? [];
    if (!is_array($scheduleByGroup) || empty($scheduleByGroup)) {
      continue;
    }

    $tools = readJsonArrayFile($toolsPath);
    $selectedGroups = [];
    foreach (($mailing["toolGroups"] ?? []) as $groupName) {
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

    $orgDisplayName = resolveOrganizationFullNameByFolder($orgFolder, $orgData);

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

      $text = buildNoAccountingNumberMailingText($orgDisplayName, $filteredTools);
      $sendResult = $dryRun
        ? ["ok" => true, "statusCode" => 0]
        : sendTelegramTextMessage($botToken, $chatId, $text);

      if (!empty($sendResult["ok"])) {
        $sentState[$stateKey] = $now->format(DateTimeInterface::ATOM);
        $orgSentCount++;
        $summary["messagesSent"]++;
      } else {
        appendMailingLog("error", "Ошибка рассылки 'Без бух.номера'.", [
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
    if (file_put_contents($statePath, $encodedState . PHP_EOL, LOCK_EX) !== false) {
      alltrack_fix_file_permissions($statePath);
    }
  }

  return $summary;
}

function runNoAccountingNumberMailingIfNeeded(): void {
  $timezone = new DateTimeZone("Europe/Moscow");
  $now = new DateTimeImmutable("now", $timezone);
  $currentMinuteStamp = $now->format("Y-m-d H:i");

  $statePath = __DIR__ . DIRECTORY_SEPARATOR . "telegram-no-accounting-number-mailing-last-run.json";
  $state = readJsonFile($statePath, []);
  $lastRunMinute = trim((string) ($state["lastRunMinute"] ?? ""));
  if ($lastRunMinute === $currentMinuteStamp) {
    return;
  }

  $result = runNoAccountingNumberMailing([
    "dryRun" => false,
  ]);

  if (empty($result["success"])) {
    appendMailingLog("error", "Не удалось выполнить рассылку 'Без бух.номера' при автозапуске.", [
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
      appendMailingLog("warning", "Не удалось записать состояние автозапуска рассылки 'Без бух.номера'.", [
        "statePath" => $statePath,
      ]);
    } else {
      alltrack_fix_file_permissions($statePath);
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

  $orgData = readJsonFile(__DIR__ . DIRECTORY_SEPARATOR . "organizations.json", ["organizations" => []]);

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

    $orgDisplayName = resolveOrganizationFullNameByFolder($orgFolder, $orgData);

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

      $text = buildRepairsMailingText($orgDisplayName, $filteredTools);
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
    if (file_put_contents($statePath, $encodedState . PHP_EOL, LOCK_EX) !== false) {
      alltrack_fix_file_permissions($statePath);
    }
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
    } else {
      alltrack_fix_file_permissions($statePath);
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
    $result[normalizePersonLabel($normalizedName)] = $balance;
  }
  return $result;
}

function resolveResponsibleCurrentBalance(array $balanceByResponsible, string $fullName): float {
  $name = trim($fullName);
  if ($name === "") {
    return 0;
  }
  if (isset($balanceByResponsible[$name])) {
    return (float) $balanceByResponsible[$name];
  }
  $normalizedName = normalizePersonLabel($name);
  if ($normalizedName !== "" && isset($balanceByResponsible[$normalizedName])) {
    return (float) $balanceByResponsible[$normalizedName];
  }
  return 0;
}

function resolveUserFullNameForPendingAcceptance(array $userSettings, $userSettingsKey, array $usersIndexByTelegram): string {
  $fromSettings = trim((string) ($userSettings["full_name"] ?? ""));
  if ($fromSettings !== "") {
    return $fromSettings;
  }

  $telegramId = normalizeTelegramId($userSettings["telegram_id"] ?? null);
  if (!$telegramId) {
    $telegramId = normalizeTelegramId($userSettingsKey);
  }
  if ($telegramId && !empty($usersIndexByTelegram[$telegramId])) {
    return $usersIndexByTelegram[$telegramId];
  }

  return "";
}

function buildUsersIndexByTelegram(): array {
  $usersPath = __DIR__ . DIRECTORY_SEPARATOR . "users.json";
  $usersData = readJsonFile($usersPath, ["users" => []]);
  $users = is_array($usersData["users"] ?? null) ? $usersData["users"] : [];
  $index = [];

  foreach ($users as $item) {
    if (!is_array($item)) {
      continue;
    }
    $telegramId = normalizeTelegramId($item["telegram_id"] ?? null);
    $fullName = trim((string) ($item["full_name"] ?? ""));
    if (!$telegramId || $fullName === "") {
      continue;
    }
    $index[$telegramId] = $fullName;
  }

  return $index;
}

function buildPendingAcceptanceTargetsForOrganization(string $orgFolder, array $usersSettings, array $allUsers): array {
  $targets = [];
  $orgFolderNormalized = normalizeOrganizationFolder($orgFolder);
  $usersByTelegramInOrg = [];
  $usersByNameInOrg = [];

  foreach ($allUsers as $userItem) {
    if (!is_array($userItem)) {
      continue;
    }

    $telegramId = normalizeTelegramId($userItem["telegram_id"] ?? null);
    $fullName = trim((string) ($userItem["full_name"] ?? ""));
    $organization = trim((string) ($userItem["organization"] ?? ""));
    if (!$telegramId || $fullName === "" || $organization === "") {
      continue;
    }

    if (!folderMatchesOrganization($orgFolderNormalized, $organization)) {
      continue;
    }

    $usersByTelegramInOrg[$telegramId] = $fullName;
    $nameKey = normalizePersonLabel($fullName);
    if ($nameKey !== "") {
      $usersByNameInOrg[$nameKey] = [
        "telegramId" => $telegramId,
        "fullName" => $fullName,
      ];
    }
  }

  foreach ($usersSettings as $userSettingsKey => $userSettings) {
    if (!is_array($userSettings)) {
      continue;
    }
    $telegramId = normalizeTelegramId($userSettings["telegram_id"] ?? null);
    if (!$telegramId) {
      $telegramId = normalizeTelegramId($userSettingsKey);
    }

    $fullName = trim((string) ($userSettings["full_name"] ?? ""));
    if ($telegramId && empty($usersByTelegramInOrg[$telegramId])) {
      continue;
    }

    $nameKey = normalizePersonLabel($fullName);
    if (!$telegramId && $nameKey !== "" && !empty($usersByNameInOrg[$nameKey])) {
      $telegramId = $usersByNameInOrg[$nameKey]["telegramId"];
      if ($fullName === "") {
        $fullName = $usersByNameInOrg[$nameKey]["fullName"];
      }
    }

    $targetKey = $telegramId;
    if ($targetKey === "") {
      continue;
    }

    if ($fullName === "" && !empty($usersByTelegramInOrg[$telegramId])) {
      $fullName = $usersByTelegramInOrg[$telegramId];
    }

    $targets[$targetKey] = [
      "telegramId" => $telegramId,
      "fullName" => $fullName,
      "schedule" => resolvePendingAcceptanceMailingConfig($userSettings),
    ];
  }

  foreach ($usersByTelegramInOrg as $telegramId => $fullName) {
    $target = $targets[$telegramId] ?? null;
    if (is_array($target)) {
      if (empty($target["telegramId"])) {
        $target["telegramId"] = $telegramId;
      }
      if (trim((string) ($target["fullName"] ?? "")) === "") {
        $target["fullName"] = $fullName;
      }
      $targets[$telegramId] = $target;
      continue;
    }

    $targets[$telegramId] = [
      "telegramId" => $telegramId,
      "fullName" => $fullName,
      "schedule" => resolvePendingAcceptanceMailingConfig([]),
    ];
  }

  return $targets;
}

function buildPendingAcceptanceMailingText(string $organization, string $fullName, array $pendingMoves, array $settings, array $fines): string {
  $count = count($pendingMoves);
  $timezone = new DateTimeZone("Europe/Moscow");
  $now = new DateTimeImmutable("now", $timezone);
  $lateFineConfig = resolveLateReplyFineConfig($settings);
  $lateReplyBalanceByResponsible = resolveLateReplyBalanceByResponsible($fines);
  $currentBalance = resolveResponsibleCurrentBalance($lateReplyBalanceByResponsible, $fullName);

  $currentPendingFine = 0;
  foreach ($pendingMoves as $move) {
    if (!is_array($move)) {
      continue;
    }
    $currentPendingFine += resolveMoveCurrentLateFine($move, $lateFineConfig, $now, $timezone);
  }

  $totalCurrentFine = $currentBalance + $currentPendingFine;
  $text = "🔔 Напоминание по инструментам на принятии\n"
    . "🏢 Организация: {$organization}\n"
    . "👤 Получатель: {$fullName}\n"
    . "🧰 На принятии: {$count}\n"
    . "✍️ Нужно ответить на перемещение\n"
    . "💸 Текущий штраф: " . formatMoneyLabel($totalCurrentFine) . "\n"
    . "   • Закрытые перемещения: " . formatMoneyLabel($currentBalance) . "\n"
    . "   • Открытые без ответа: " . formatMoneyLabel($currentPendingFine);

  $maxMovesToPrint = 20;
  $printedMoves = 0;
  foreach ($pendingMoves as $move) {
    if (!is_array($move)) {
      continue;
    }
    if ($printedMoves >= $maxMovesToPrint) {
      break;
    }

    $toolNumber = trim((string) ($move["Номер"] ?? $move["Бух.номер"] ?? ""));
    $toolName = trim((string) ($move["Наименование"] ?? $move["Инструмент"] ?? $move["Название"] ?? ""));
    $toolManufacturer = trim((string) ($move["Производитель"] ?? ""));
    $toolModel = trim((string) ($move["Модель"] ?? ""));
    $fromObject = trim((string) ($move["Старый объект"] ?? ""));
    $toObject = trim((string) ($move["Новый объект"] ?? ""));
    $moveDate = trim((string) ($move["Дата перемещения"] ?? ""));
    $reason = trim((string) ($move["Причина перемещения"] ?? ""));
    $movedBy = trim((string) ($move["Ответственный до перемещения"] ?? ""));
    if ($movedBy === "") {
      $movedBy = trim((string) ($move["Переместил"] ?? ""));
    }
    $moveFine = resolveMoveCurrentLateFine($move, $lateFineConfig, $now, $timezone);

    $printedMoves++;
    $toolHeaderParts = [];
    if ($toolNumber !== "") {
      $toolHeaderParts[] = $toolNumber;
    }
    if ($toolName !== "") {
      $toolHeaderParts[] = $toolName;
    }
    if ($toolManufacturer !== "") {
      $toolHeaderParts[] = $toolManufacturer;
    }
    if ($toolModel !== "") {
      $toolHeaderParts[] = $toolModel;
    }

    $text .= "\n\n{$printedMoves}) " . (count($toolHeaderParts) > 0 ? implode(" - ", $toolHeaderParts) : "Без названия");
    $text .= "\n   Маршрут: " . ($fromObject !== "" ? $fromObject : "—") . " → " . ($toObject !== "" ? $toObject : "—");
    if ($movedBy !== "") {
      $text .= "\n   Ответственный до перемещения: {$movedBy}";
    }
    if ($moveDate !== "") {
      $text .= "\n   Дата: {$moveDate}";
    }
    if ($reason !== "") {
      $text .= "\n   Причина: {$reason}";
    }
    $text .= "\n   Штраф по перемещению: " . formatMoneyLabel($moveFine);
  }

  if ($count > $printedMoves) {
    $text .= "\n\n⚠️ Показаны первые {$printedMoves} из {$count} перемещений.";
  }

  return $text;
}

function buildMoveRepliesMailingText(string $organization, array $pendingMoves, array $settings, array $fines): string {
  $count = count($pendingMoves);
  $headerOrg = trim($organization) !== "" ? trim($organization) : "Организация";
  $headerOrgSafe = htmlspecialchars($headerOrg, ENT_QUOTES | ENT_SUBSTITUTE, "UTF-8");
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
    "🏢 " . $headerOrgSafe,
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
    $currentBalance = resolveResponsibleCurrentBalance($lateReplyBalanceByResponsible, $responsible);
    $currentPendingFine = 0;
    foreach ($movesByResponsible as $moveInfo) {
      $currentPendingFine += (float) ($moveInfo["currentFine"] ?? 0);
    }

    $lines[] = "";
    $responsibleSafe = htmlspecialchars($responsible, ENT_QUOTES | ENT_SUBSTITUTE, "UTF-8");
    $lines[] = "👤 <b><u>" . $responsibleSafe . "</u></b>";
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

      $toolNameSafe = htmlspecialchars($toolName, ENT_QUOTES | ENT_SUBSTITUTE, "UTF-8");
      $toolNumberSafe = htmlspecialchars($toolNumber, ENT_QUOTES | ENT_SUBSTITUTE, "UTF-8");
      $toObjectSafe = htmlspecialchars($toObject, ENT_QUOTES | ENT_SUBSTITUTE, "UTF-8");

      $line = "• 🧰 " . $toolNameSafe;
      if ($toolNumber !== "") {
        $line .= " (№" . $toolNumberSafe . ")";
      }
      if ($toObject !== "") {
        $line .= " → 📍 " . $toObjectSafe;
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

  $orgData = readJsonFile(__DIR__ . DIRECTORY_SEPARATOR . "organizations.json", ["organizations" => []]);

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

    $orgDisplayName = resolveOrganizationFullNameByFolder($orgFolder, $orgData);

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

      $text = buildMoveRepliesMailingText($orgDisplayName, $pendingMoves, $settings, $fines);
      $sendResult = $dryRun
        ? ["ok" => true, "statusCode" => 0]
        : sendTelegramTextMessage($botToken, $chatId, $text, "HTML");

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
    if (file_put_contents($statePath, $encodedState . PHP_EOL, LOCK_EX) !== false) {
      alltrack_fix_file_permissions($statePath);
    }
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
    } else {
      alltrack_fix_file_permissions($statePath);
    }
  }
}

function runPendingAcceptanceMailing(array $options = []): array {
  $timezone = new DateTimeZone("Europe/Moscow");
  $now = new DateTimeImmutable("now", $timezone);
  $dryRun = !empty($options["dryRun"]);

  $botToken = getenv("ALLTRACK_BOT_TOKEN") ?: "";
  if ($botToken === "") {
    $botToken = "8549452123:AAGxveuJSVf-xpNHQYTDKDmuMmHjGRVeDj0";
  }

  $statePath = __DIR__ . DIRECTORY_SEPARATOR . "telegram-pending-acceptance-mailing-state.json";
  $state = readJsonFile($statePath, ["sent" => []]);
  $sentState = is_array($state["sent"] ?? null) ? $state["sent"] : [];

  $summary = [
    "success" => true,
    "mode" => "pending-acceptance-mailing-cli",
    "time" => $now->format(DateTimeInterface::ATOM),
    "dryRun" => $dryRun,
    "organizationsChecked" => 0,
    "messagesSent" => 0,
    "organizations" => [],
  ];

  $entries = @scandir(__DIR__);
  $usersIndexByTelegram = buildUsersIndexByTelegram();
  $allUsersData = readJsonFile(__DIR__ . DIRECTORY_SEPARATOR . "users.json", ["users" => []]);
  $allUsers = is_array($allUsersData["users"] ?? null) ? $allUsersData["users"] : [];
  if (!is_array($entries)) {
    return ["success" => false, "mode" => "pending-acceptance-mailing-cli", "error" => "Не удалось прочитать папки организаций."];
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
    $orgData = readJsonFile(__DIR__ . DIRECTORY_SEPARATOR . "organizations.json", ["organizations" => []]);
    $orgDisplayName = resolveOrganizationFullNameByFolder($orgFolder, $orgData);
    $usersSettings = is_array($settings["users"] ?? null) ? $settings["users"] : [];

    $finesPath = $orgPath . DIRECTORY_SEPARATOR . "Штрафы.json";
    $fines = readJsonFile($finesPath, []);

    $moves = readJsonArrayFile($movesPath);
    $pendingByUser = [];
    foreach ($moves as $move) {
      if (!is_array($move)) {
        continue;
      }
      $responseDate = trim((string) ($move["Дата ответа"] ?? ""));
      $response = trim((string) ($move["Ответ"] ?? ""));
      if ($responseDate !== "" || $response !== "") {
        continue;
      }
      $acceptedBy = normalizePersonLabel((string) ($move["Принял"] ?? ""));
      if ($acceptedBy === "") {
        continue;
      }
      if (!isset($pendingByUser[$acceptedBy])) {
        $pendingByUser[$acceptedBy] = [];
      }
      $pendingByUser[$acceptedBy][] = $move;
    }

    if (empty($pendingByUser)) {
      continue;
    }

    $targets = buildPendingAcceptanceTargetsForOrganization($orgFolder, $usersSettings, $allUsers);
    if (empty($targets)) {
      continue;
    }

    $orgSentCount = 0;
    foreach ($targets as $target) {
      $telegramId = normalizeTelegramId($target["telegramId"] ?? null);
      if (!$telegramId) {
        continue;
      }

      $fullName = trim((string) ($target["fullName"] ?? ""));
      if ($fullName === "") {
        $fallback = ["telegram_id" => $telegramId, "full_name" => ""];
        $fullName = resolveUserFullNameForPendingAcceptance($fallback, $telegramId, $usersIndexByTelegram);
      }
      if ($fullName === "") {
        continue;
      }
      $userKey = normalizePersonLabel($fullName);
      $pendingMoves = $pendingByUser[$userKey] ?? [];
      if (empty($pendingMoves)) {
        continue;
      }

      $schedule = is_array($target["schedule"] ?? null)
        ? $target["schedule"]
        : resolvePendingAcceptanceMailingConfig([]);
      if (!isUserPendingAcceptanceScheduleDue($schedule, $now)) {
        continue;
      }

      $scheduleTime = normalizeScheduleTimeLabel($schedule["time"] ?? "");
      if ($scheduleTime === "") {
        continue;
      }
      $stateKey = $orgFolder . "|" . $telegramId . "|" . $now->format("Y-m-d") . "|" . $scheduleTime;
      if (!empty($sentState[$stateKey])) {
        continue;
      }

      $text = buildPendingAcceptanceMailingText($orgDisplayName, $fullName, $pendingMoves, $settings, $fines);

      $sendResult = $dryRun
        ? ["ok" => true, "statusCode" => 0]
        : sendTelegramTextMessage($botToken, $telegramId, $text);

      if (!empty($sendResult["ok"])) {
        $sentState[$stateKey] = $now->format(DateTimeInterface::ATOM);
        $orgSentCount++;
        $summary["messagesSent"]++;
      } else {
        appendMailingLog("error", "Ошибка персональной рассылки по инструментам на принятии.", [
          "organization" => $orgFolder,
          "telegramId" => $telegramId,
          "error" => $sendResult["error"] ?? "Неизвестная ошибка",
        ]);
      }
    }

    if ($orgSentCount > 0) {
      $summary["organizations"][] = [
        "organization" => $orgFolder,
        "messagesSent" => $orgSentCount,
      ];
    }
  }

  $encodedState = json_encode(["sent" => $sentState], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
  if ($encodedState !== false && !$dryRun) {
    if (file_put_contents($statePath, $encodedState . PHP_EOL, LOCK_EX) !== false) {
      alltrack_fix_file_permissions($statePath);
    }
  }

  return $summary;
}

function runPendingAcceptanceMailingIfNeeded(): void {
  $timezone = new DateTimeZone("Europe/Moscow");
  $now = new DateTimeImmutable("now", $timezone);
  $currentMinuteStamp = $now->format("Y-m-d H:i");

  $statePath = __DIR__ . DIRECTORY_SEPARATOR . "telegram-pending-acceptance-mailing-last-run.json";
  $state = readJsonFile($statePath, []);
  $lastRunMinute = trim((string) ($state["lastRunMinute"] ?? ""));
  if ($lastRunMinute === $currentMinuteStamp) {
    return;
  }

  $result = runPendingAcceptanceMailing([
    "dryRun" => false,
  ]);

  if (empty($result["success"])) {
    appendMailingLog("error", "Не удалось выполнить персональную рассылку по инструментам на принятии при автозапуске.", [
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
      appendMailingLog("warning", "Не удалось записать состояние автозапуска персональной рассылки по инструментам на принятии.", [
        "statePath" => $statePath,
      ]);
    } else {
      alltrack_fix_file_permissions($statePath);
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
  $requestedOrganization = normalizeOrganizationName((string) ($user["organization"] ?? ""));
  $matchedUser = null;
  if ($telegramId && $requestedOrganization !== "") {
    foreach (($usersData["users"] ?? []) as $item) {
      $itemId = normalizeTelegramId($item["telegram_id"] ?? null);
      $itemOrganization = normalizeOrganizationName((string) ($item["organization"] ?? ""));
      if ($itemId === $telegramId && $itemOrganization === $requestedOrganization) {
        $matchedUser = $item;
        break;
      }
    }
  }
  if ($telegramId && !$matchedUser) {
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
  return alltrack_ensure_dir($path);
}

function writeJsonIfMissing(string $path, $data): bool {
  if (file_exists($path)) {
    return true;
  }
  $encoded = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
  if ($encoded === false) {
    return false;
  }
  $written = file_put_contents($path, $encoded . PHP_EOL, LOCK_EX);
  if ($written !== false) {
    alltrack_fix_file_permissions($path);
    return true;
  }
  return false;
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
    "Журнал посещений.json" => ["entries" => []],
    "Механизмы.json" => ["mechanisms" => []],
    "Брони механизмов.json" => ["bookings" => []],
  ];
  $folders = [
    "Фото инструментов",
    "Фото непонятно",
    "Фото пользователей",
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
    "Механизмы.json",
    "Брони механизмов.json",
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
    "Фото непонятно",
    "Фото пользователей",
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
    "Фото непонятно",
    "Фото пользователей",
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
  $targetDir = dirname($targetPath);
  alltrack_ensure_dir($targetDir);
  $written = file_put_contents($targetPath, $decoded, LOCK_EX);
  if ($written === false) {
    http_response_code(500);
    echo json_encode(["error" => "Не удалось сохранить файл."]);
    exit;
  }
  alltrack_fix_file_permissions($targetPath);

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
  alltrack_fix_file_permissions($targetPath);
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


function sanitizeVisitLogText($value, int $maxLength = 200): string {
  $text = preg_replace('/\s+/u', ' ', trim((string) $value));
  if (!is_string($text)) {
    return "";
  }
  return mb_substr($text, 0, $maxLength, "UTF-8");
}

function normalizeVisitLogAction($value): string {
  $action = trim((string) $value);
  return $action === "close" ? "close" : "open";
}

function buildVisitLogUser(array $entry): array {
  $user = is_array($entry["user"] ?? null) ? $entry["user"] : [];
  return [
    "telegram_id" => normalizeTelegramId($user["telegram_id"] ?? null),
    "full_name" => sanitizeVisitLogText($user["full_name"] ?? ($user["fullName"] ?? "")),
    "role" => sanitizeVisitLogText($user["role"] ?? ""),
    "position" => sanitizeVisitLogText($user["position"] ?? ""),
    "organization" => sanitizeVisitLogText($user["organization"] ?? ""),
  ];
}

function saveVisitLogEntry(array $entry): void {
  $orgFolder = resolveOrganizationFolderForEntry($entry);
  if (!$orgFolder) {
    http_response_code(403);
    echo json_encode(["error" => "Не удалось определить организацию для журнала посещений."]);
    exit;
  }

  $orgPath = __DIR__ . DIRECTORY_SEPARATOR . $orgFolder;
  if (!ensureDirectory($orgPath)) {
    http_response_code(500);
    echo json_encode(["error" => "Не удалось создать папку организации."]);
    exit;
  }

  $targetPath = $orgPath . DIRECTORY_SEPARATOR . "Журнал посещений.json";
  $sessionId = sanitizeVisitLogText($entry["session_id"] ?? $entry["sessionId"] ?? "", 80);
  if ($sessionId === "") {
    $sessionId = bin2hex(random_bytes(12));
  }
  $now = (new DateTimeImmutable("now", new DateTimeZone("Europe/Moscow")))->format(DateTimeInterface::ATOM);
  $action = normalizeVisitLogAction($entry["action"] ?? "open");
  $user = buildVisitLogUser($entry);

  withPathLock($targetPath, static function () use ($targetPath, $sessionId, $now, $action, $user): void {
    $log = readJsonFile($targetPath, ["entries" => []]);
    $entries = is_array($log["entries"] ?? null) ? $log["entries"] : [];
    $foundIndex = null;

    foreach ($entries as $index => $item) {
      if (is_array($item) && (string) ($item["session_id"] ?? "") === $sessionId) {
        $foundIndex = $index;
        break;
      }
    }

    if ($foundIndex === null) {
      $entries[] = [
        "session_id" => $sessionId,
        "user" => $user,
        "opened_at" => $now,
        "closed_at" => $action === "close" ? $now : null,
        "last_event_at" => $now,
      ];
    } else {
      $current = is_array($entries[$foundIndex]) ? $entries[$foundIndex] : [];
      $entries[$foundIndex] = array_merge($current, [
        "user" => array_merge(is_array($current["user"] ?? null) ? $current["user"] : [], $user),
        "closed_at" => $action === "close" ? $now : ($current["closed_at"] ?? null),
        "last_event_at" => $now,
      ]);
      if (empty($entries[$foundIndex]["opened_at"])) {
        $entries[$foundIndex]["opened_at"] = $now;
      }
    }

    if (count($entries) > 5000) {
      $entries = array_slice($entries, -5000);
    }

    $encoded = json_encode(["entries" => $entries], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($encoded === false || writeFileAtomically($targetPath, $encoded . PHP_EOL) === false) {
      http_response_code(500);
      echo json_encode(["error" => "Не удалось сохранить журнал посещений."]);
      exit;
    }
  });
}

function addMissingMovementIds(mixed $data): mixed {
  $moves = null;
  if (is_array($data) && array_is_list($data)) {
    $moves =& $data;
  } elseif (is_array($data) && isset($data["moves"]) && is_array($data["moves"])) {
    $moves =& $data["moves"];
  }

  if ($moves === null) {
    return $data;
  }

  $usedIds = [];
  foreach ($moves as &$move) {
    if (!is_array($move)) {
      continue;
    }

    $movementId = trim((string) ($move["ID перемещения"] ?? ""));
    if ($movementId === "" || isset($usedIds[$movementId])) {
      do {
        try {
          $movementId = "move-" . bin2hex(random_bytes(16));
        } catch (Throwable) {
          $movementId = uniqid("move-", true);
        }
      } while (isset($usedIds[$movementId]));
      $move["ID перемещения"] = $movementId;
    }
    $usedIds[$movementId] = true;
  }
  unset($move);

  return $data;
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
  if (($entry["type"] ?? "") === "visit-log") {
    saveVisitLogEntry($entry);
    return;
  }
  $path = $entry["path"] ?? "";
  $data = $entry["data"] ?? null;
  $fileName = basename((string) $path);

  $targetPath = resolveTargetPath($entry, $allowedFiles);
  if ($fileName === "Перемещения.json") {
    $data = addMissingMovementIds($data);
  }
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

  withPathLock($targetPath, static function () use ($fileName, $targetPath, $encoded, $data): void {
    if ($fileName === "Перемещения.json") {
      $existingData = readJsonDecodedValue($targetPath);
      $newHasData = hasMeaningfulJsonData($data);
      $existingHasData = hasMeaningfulJsonData($existingData);

      if (!$newHasData && $existingHasData) {
        archiveMovesFileForCurrentHour($targetPath);
        return;
      }
    }

    $written = writeFileAtomically($targetPath, $encoded . PHP_EOL);
    if ($written === false) {
      http_response_code(500);
      echo json_encode(["error" => "Не удалось сохранить файл."]);
      exit;
    }

    if ($fileName === "Перемещения.json") {
      archiveMovesFileForCurrentHour($targetPath);
    }
  });

  if (!empty($newOrganizations)) {
    createOrganizationFolders($newOrganizations);
  }
}

function withPathLock(string $targetPath, callable $callback): void {
  $lockPath = $targetPath . '.lock';
  alltrack_ensure_dir(dirname($lockPath));
  $lockHandle = @fopen($lockPath, 'c');
  if ($lockHandle === false) {
    http_response_code(500);
    echo json_encode(["error" => "Не удалось открыть блокировку файла."]);
    exit;
  }
  alltrack_fix_file_permissions($lockPath);

  if (!@flock($lockHandle, LOCK_EX)) {
    @fclose($lockHandle);
    http_response_code(500);
    echo json_encode(["error" => "Не удалось получить блокировку файла."]);
    exit;
  }

  try {
    $callback();
  } finally {
    @flock($lockHandle, LOCK_UN);
    @fclose($lockHandle);
  }
}


function hasMeaningfulJsonData($value): bool {
  if (is_array($value)) {
    return count($value) > 0;
  }

  if (is_string($value)) {
    return trim($value) !== "";
  }

  return $value !== null;
}

function readJsonDecodedValue(string $path) {
  if (!file_exists($path)) {
    return null;
  }
  $raw = @file_get_contents($path);
  if (!is_string($raw) || trim($raw) === "") {
    return null;
  }

  return json_decode($raw, true);
}

function writeFileAtomically(string $path, string $content): bool {
  $directory = dirname($path);
  if (!alltrack_ensure_dir($directory)) {
    return false;
  }

  $tempPath = @tempnam($directory, 'tmp_');
  if ($tempPath === false) {
    return false;
  }
  alltrack_fix_file_permissions($tempPath);

  $bytes = @file_put_contents($tempPath, $content, LOCK_EX);
  if ($bytes === false) {
    @unlink($tempPath);
    return false;
  }
  alltrack_fix_file_permissions($tempPath);

  if (!@rename($tempPath, $path)) {
    if (!@copy($tempPath, $path)) {
      @unlink($tempPath);
      return false;
    }
    @unlink($tempPath);
  }

  alltrack_fix_file_permissions($path);
  return true;
}

function cleanupOldMoveArchives(string $archiveFolder, int $maxFiles = 24): void {
  if (!is_dir($archiveFolder) || $maxFiles < 1) {
    return;
  }

  $items = @scandir($archiveFolder);
  if (!is_array($items)) {
    return;
  }

  $files = [];
  foreach ($items as $item) {
    if ($item === '.' || $item === '..') {
      continue;
    }
    if (!preg_match('/^Перемещения_\d{4}-\d{2}-\d{2}_\d{2}\.json$/u', $item)) {
      continue;
    }

    $fullPath = $archiveFolder . DIRECTORY_SEPARATOR . $item;
    if (!is_file($fullPath)) {
      continue;
    }

    $mtime = @filemtime($fullPath);
    $files[] = [
      'path' => $fullPath,
      'mtime' => $mtime !== false ? (int) $mtime : 0,
    ];
  }

  if (count($files) <= $maxFiles) {
    return;
  }

  usort($files, static function (array $a, array $b): int {
    return ($a['mtime'] ?? 0) <=> ($b['mtime'] ?? 0);
  });

  $toDelete = array_slice($files, 0, count($files) - $maxFiles);
  foreach ($toDelete as $fileInfo) {
    $oldPath = (string) ($fileInfo['path'] ?? '');
    if ($oldPath !== '') {
      @unlink($oldPath);
    }
  }
}

function archiveMovesFileForCurrentHour(string $targetPath): void {
  if (basename($targetPath) !== 'Перемещения.json' || !file_exists($targetPath)) {
    return;
  }

  $organizationPath = dirname($targetPath);
  $archiveFolder = $organizationPath . DIRECTORY_SEPARATOR . 'Архив';
  if (!ensureDirectory($archiveFolder)) {
    return;
  }

  $timezone = new DateTimeZone('Europe/Moscow');
  $hourStamp = (new DateTimeImmutable('now', $timezone))->format('Y-m-d_H');
  $archivePath = $archiveFolder . DIRECTORY_SEPARATOR . 'Перемещения_' . $hourStamp . '.json';

  if (!file_exists($archivePath)) {
    $content = @file_get_contents($targetPath);
    if (is_string($content) && $content !== '') {
      writeFileAtomically($archivePath, $content);
    }
  }

  cleanupOldMoveArchives($archiveFolder, 24);
}


function runHourlyMoveArchivesIfNeeded(): void {
  $timezone = new DateTimeZone('Europe/Moscow');
  $now = new DateTimeImmutable('now', $timezone);
  $hourKey = $now->format('Y-m-d H');

  $statePath = __DIR__ . DIRECTORY_SEPARATOR . 'telegram-move-archive-state.json';
  $state = readJsonFile($statePath, []);
  $lastHour = trim((string) ($state['lastHour'] ?? ''));
  if ($lastHour === $hourKey) {
    return;
  }

  $items = @scandir(__DIR__);
  if (!is_array($items)) {
    return;
  }

  foreach ($items as $folder) {
    if ($folder === '.' || $folder === '..') {
      continue;
    }
    $organizationPath = __DIR__ . DIRECTORY_SEPARATOR . $folder;
    if (!is_dir($organizationPath)) {
      continue;
    }

    $movesPath = $organizationPath . DIRECTORY_SEPARATOR . 'Перемещения.json';
    if (!file_exists($movesPath)) {
      continue;
    }

    archiveMovesFileForCurrentHour($movesPath);
  }

  $nextState = [
    'lastHour' => $hourKey,
    'updatedAt' => $now->format(DateTimeInterface::ATOM),
  ];
  $encoded = json_encode($nextState, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
  if ($encoded !== false) {
    writeFileAtomically($statePath, $encoded . PHP_EOL);
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

function sendTelegramTextMessage(string $botToken, string $chatId, string $text, ?string $parseMode = null): array {
  $apiUrl = "https://api.telegram.org/bot" . rawurlencode($botToken) . "/sendMessage";
  $payload = [
    "chat_id" => $chatId,
    "text" => $text,
    "disable_web_page_preview" => true,
  ];
  if (is_string($parseMode) && trim($parseMode) !== "") {
    $payload["parse_mode"] = trim($parseMode);
  }

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
      alltrack_fix_file_permissions($targetPath);
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
  alltrack_fix_file_permissions($feedbackFile);

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


function resolveMovesTableConfig(array $settings): ?array {
  $config = $settings["organization"]["movesTable"] ?? $settings["movesTable"] ?? null;
  return is_array($config) ? $config : null;
}

function isMovesTableScheduleDue(array $config, DateTimeImmutable $now): bool {
  $time = normalizeScheduleTimeLabel((string) ($config["time"] ?? ""));
  if ($time === "") return false;
  [$hour, $minute] = array_map('intval', explode(':', $time));
  if ((((int) $now->format("H") * 60) + (int) $now->format("i")) !== (($hour * 60) + $minute)) return false;

  $type = ($config["scheduleType"] ?? "monthDays") === "weekDays" ? "weekDays" : "monthDays";
  if ($type === "weekDays") {
    $dayByNumber = [1 => "Пн", 2 => "Вт", 3 => "Ср", 4 => "Чт", 5 => "Пт", 6 => "Сб", 7 => "Вс"];
    $today = $dayByNumber[(int) $now->format("N")] ?? "";
    return in_array($today, is_array($config["weekDays"] ?? null) ? $config["weekDays"] : [], true);
  }

  $days = is_array($config["monthDays"] ?? null) ? $config["monthDays"] : [];
  $day = (int) $now->format("j");
  $lastDay = (int) $now->format("t");
  foreach ($days as $raw) {
    $value = trim((string) $raw);
    if ($value === "everyDay") return true;
    if ($value === "first" && $day === 1) return true;
    if ($value === "last" && $day === $lastDay) return true;
    if ($value === "every7" && (($day - 1) % 7) === 0) return true;
    if (ctype_digit($value) && (int) $value === $day) return true;
  }
  return false;
}

function getMovesTableRecipientChatIds(array $config, array $users): array {
  $selected = is_array($config["recipients"] ?? null) ? array_map('strval', $config["recipients"]) : [];
  $selectedMap = array_fill_keys(array_map('trim', $selected), true);
  $chatIds = [];
  foreach ($users as $user) {
    if (!is_array($user)) continue;
    $keys = [
      trim((string) ($user["telegram_id"] ?? "")),
      trim((string) ($user["id"] ?? "")),
      trim((string) ($user["full_name"] ?? $user["fullName"] ?? "")),
    ];
    $isSelected = false;
    foreach ($keys as $key) {
      if ($key !== "" && !empty($selectedMap[$key])) { $isSelected = true; break; }
    }
    $chatId = normalizeTelegramId($user["telegram_id"] ?? null);
    if ($isSelected && $chatId) $chatIds[$chatId] = true;
  }
  return array_keys($chatIds);
}

function movesTableColumnDefinitions(): array {
  return [
    "appNumber" => ["title" => "Номер", "keys" => ["Номер"]],
    "accountingNumber" => ["title" => "Бух.номер", "keys" => ["Бух.номер", "Бух номер"]],
    "moveDate" => ["title" => "Дата перемещения", "keys" => ["Дата перемещения"]],
    "acceptDate" => ["title" => "Дата принятия", "keys" => ["Дата ответа", "Дата принятия"]],
    "sender" => ["title" => "Передающий", "keys" => ["Ответственный до перемещения", "Переместил", "Передающий"]],
    "receiver" => ["title" => "Принимающий", "keys" => ["Ответственный", "Новый ответственный", "Принимающий", "Принял"]],
    "movedBy" => ["title" => "Переместил", "keys" => ["Переместил", "Кто переместил", "Ответственный до перемещения"]],
    "oldObject" => ["title" => "Старый объект", "keys" => ["Старый объект", "Объект до перемещения"]],
    "newObject" => ["title" => "Новый объект", "keys" => ["Объект", "Новый объект"]],
    "name" => ["title" => "Наименование", "keys" => ["Наименование"]],
    "manufacturer" => ["title" => "Производитель", "keys" => ["Производитель"]],
    "model" => ["title" => "Модель", "keys" => ["Модель"]],
    "moverId" => ["title" => "ID перемещающего", "keys" => ["ID перемещающего", "telegram_id перемещающего"]],
    "receiverId" => ["title" => "ID принимающего", "keys" => ["ID принимающего", "telegram_id принимающего"]],
  ];
}


function normalizeMovesTablePersonKey($value): string {
  return mb_strtolower(preg_replace('/\s+/u', ' ', trim((string) $value)), 'UTF-8');
}

function normalizeMovesTableOrganizationKey($value): string {
  return mb_strtolower(preg_replace('/\s+/u', ' ', trim((string) $value)), 'UTF-8');
}

function buildMovesTableUsersIndex(array $users, string $orgName, string $orgFolder = ""): array {
  $orgKeys = array_filter([
    normalizeMovesTableOrganizationKey($orgName),
    normalizeMovesTableOrganizationKey($orgFolder),
  ]);
  $orgMap = array_fill_keys($orgKeys, true);
  $index = [];
  foreach ($users as $user) {
    if (!is_array($user)) continue;
    $userOrg = normalizeMovesTableOrganizationKey($user["organization"] ?? "");
    if ($userOrg === "" || ($orgMap && empty($orgMap[$userOrg]))) continue;
    $name = normalizeMovesTablePersonKey($user["full_name"] ?? $user["fullName"] ?? "");
    $telegramId = normalizeTelegramId($user["telegram_id"] ?? $user["id"] ?? null);
    if ($name !== "" && $telegramId) $index[$name] = $telegramId;
  }
  return $index;
}

function resolveMovesTablePersonTelegramId(string $personName, array $usersIndex): string {
  $nameKey = normalizeMovesTablePersonKey($personName);
  return $nameKey !== "" ? (string) ($usersIndex[$nameKey] ?? "") : "";
}

function getMoveSenderName(array $move, array $tool = []): string {
  foreach (["Ответственный до перемещения", "Переместил", "Передающий"] as $key) {
    $value = trim((string) ($move[$key] ?? ""));
    if ($value !== "") return $value;
  }
  return trim((string) ($tool["Ответственный до перемещения"] ?? $tool["Переместил"] ?? $tool["Передающий"] ?? ""));
}

function getMoveReceiverName(array $move, array $tool = []): string {
  foreach (["Ответственный", "Новый ответственный", "Принимающий", "Принял"] as $key) {
    $value = trim((string) ($move[$key] ?? ""));
    if ($value !== "") return $value;
  }
  return trim((string) ($tool["Ответственный"] ?? $tool["Новый ответственный"] ?? $tool["Принимающий"] ?? ""));
}

function getMoveColumnValue(array $move, array $definition, array $tool = []): string {
  foreach ($definition["keys"] as $key) {
    $value = trim((string) ($move[$key] ?? ""));
    if ($value !== "") return $value;
  }
  foreach ($definition["keys"] as $key) {
    $value = trim((string) ($tool[$key] ?? ""));
    if ($value !== "") return $value;
  }
  return "";
}

function normalizeMovesTableToolNumber($value): string {
  return mb_strtolower(trim((string) $value), 'UTF-8');
}

function buildToolIndexByNumber(array $tools): array {
  $index = [];
  foreach ($tools as $tool) {
    if (!is_array($tool)) continue;
    $number = normalizeMovesTableToolNumber($tool["Номер"] ?? "");
    if ($number !== "" && !isset($index[$number])) $index[$number] = $tool;
  }
  return $index;
}

function readToolsBaseForMovesTable(string $orgPath): array {
  foreach (["База инструментов.json", "База с инструментами.json"] as $fileName) {
    $path = $orgPath . DIRECTORY_SEPARATOR . $fileName;
    if (!is_file($path)) continue;
    $data = readJsonFile($path, []);
    if (is_array($data["tools"] ?? null)) return $data["tools"];
    if (is_array($data)) return $data;
  }
  return [];
}

function buildMovesTableRows(string $orgName, array $moves, array $config, DateTimeImmutable $now, DateTimeZone $timezone, array $tools = [], array $users = [], string $orgFolder = ""): array {
  $defs = movesTableColumnDefinitions();
  $columns = is_array($config["columns"] ?? null) ? array_values(array_filter($config["columns"], 'is_string')) : [];
  $columns = array_values(array_filter($columns, static fn($id) => isset($defs[$id])));
  if (empty($columns)) $columns = ["moveDate", "name", "movedBy", "oldObject", "newObject"];
  $periodDays = max(1, (int) ($config["periodDays"] ?? 7));
  $end = !empty($config["includeSendDay"]) ? $now->setTime(23, 59, 59) : $now->modify('-1 day')->setTime(23, 59, 59);
  $start = $end->modify('-' . ($periodDays - 1) . ' days')->setTime(0, 0, 0);

  $toolIndex = buildToolIndexByNumber($tools);
  $usersIndex = buildMovesTableUsersIndex($users, $orgName, $orgFolder);
  $rows = [array_map(static fn($id) => $defs[$id]["title"], $columns)];
  foreach ($moves as $move) {
    if (!is_array($move)) continue;
    $answer = mb_strtolower(trim((string) ($move["Ответ"] ?? "")), 'UTF-8');
    if ($answer === "" || str_contains($answer, "отмена") || str_contains($answer, "не прин")) continue;
    $moveDate = parseDateToDateTime((string) ($move["Дата перемещения"] ?? ""), $timezone);
    if ($moveDate === null || $moveDate < $start || $moveDate > $end) continue;
    $number = normalizeMovesTableToolNumber($move["Номер"] ?? "");
    $tool = $number !== "" && isset($toolIndex[$number]) ? $toolIndex[$number] : [];
    $senderName = getMoveSenderName($move, $tool);
    $receiverName = getMoveReceiverName($move, $tool);
    $rows[] = array_map(static function($id) use ($move, $defs, $tool, $senderName, $receiverName, $usersIndex) {
      if ($id === "sender") return $senderName;
      if ($id === "moverId") return getMoveColumnValue($move, $defs[$id], $tool) ?: resolveMovesTablePersonTelegramId($senderName, $usersIndex);
      if ($id === "receiverId") return getMoveColumnValue($move, $defs[$id], $tool) ?: resolveMovesTablePersonTelegramId($receiverName, $usersIndex);
      return getMoveColumnValue($move, $defs[$id], $tool);
    }, $columns);
  }
  return $rows;
}

function xlsxEscapeXml(string $value): string {
  return htmlspecialchars($value, ENT_XML1 | ENT_COMPAT, 'UTF-8');
}

function xlsxColumnName(int $index): string {
  $name = "";
  while ($index > 0) {
    $index--;
    $name = chr(65 + ($index % 26)) . $name;
    $index = intdiv($index, 26);
  }
  return $name;
}

function buildMovesTableXlsx(string $orgName, array $moves, array $config, DateTimeImmutable $now, DateTimeZone $timezone, string $filePath, array $tools = [], array $users = [], string $orgFolder = ""): bool {
  if (!class_exists('ZipArchive')) return false;
  $rows = buildMovesTableRows($orgName, $moves, $config, $now, $timezone, $tools, $users, $orgFolder);
  $sheetRows = [];
  foreach ($rows as $rowIndex => $row) {
    $cells = [];
    foreach (array_values($row) as $columnIndex => $value) {
      $cellRef = xlsxColumnName($columnIndex + 1) . ($rowIndex + 1);
      $cells[] = '<c r="' . $cellRef . '" t="inlineStr"><is><t>' . xlsxEscapeXml((string) $value) . '</t></is></c>';
    }
    $sheetRows[] = '<row r="' . ($rowIndex + 1) . '">' . implode('', $cells) . '</row>';
  }

  $zip = new ZipArchive();
  if ($zip->open($filePath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) return false;
  $zip->addFromString('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
  $zip->addFromString('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  $zip->addFromString('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Пеемещения" sheetId="1" r:id="rId1"/></sheets></workbook>');
  $zip->addFromString('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');
  $zip->addFromString('xl/worksheets/sheet1.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' . implode('', $sheetRows) . '</sheetData></worksheet>');
  return $zip->close();
}

function sendTelegramDocumentFile(string $botToken, string $chatId, string $filePath, string $caption = ""): array {
  if (!function_exists("curl_init")) return ["ok" => false, "error" => "На сервере недоступен cURL для отправки документа.", "statusCode" => 0];
  $curl = curl_init("https://api.telegram.org/bot" . rawurlencode($botToken) . "/sendDocument");
  if ($curl === false) return ["ok" => false, "error" => "Не удалось инициализировать cURL", "statusCode" => 0];
  curl_setopt_array($curl, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_POSTFIELDS => ["chat_id" => $chatId, "document" => new CURLFile($filePath), "caption" => $caption], CURLOPT_TIMEOUT => 30]);
  $response = curl_exec($curl);
  $statusCode = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
  $error = curl_error($curl);
  curl_close($curl);
  if ($response === false) return ["ok" => false, "error" => $error ?: "Не удалось подключиться к Telegram API", "statusCode" => $statusCode];
  $decoded = json_decode($response, true);
  return !empty($decoded["ok"]) ? ["ok" => true, "statusCode" => $statusCode, "response" => $decoded] : ["ok" => false, "error" => (string) ($decoded["description"] ?? "Неизвестная ошибка Telegram API"), "statusCode" => $statusCode, "response" => $decoded];
}

function runMovesTableMailing(array $options = []): array {
  $timezone = new DateTimeZone("Europe/Moscow");
  $now = new DateTimeImmutable("now", $timezone);
  $dryRun = !empty($options["dryRun"]);
  $botToken = getenv("ALLTRACK_BOT_TOKEN") ?: "8549452123:AAGxveuJSVf-xpNHQYTDKDmuMmHjGRVeDj0";
  $statePath = __DIR__ . DIRECTORY_SEPARATOR . "telegram-moves-table-mailing-state.json";
  $state = readJsonFile($statePath, ["sent" => []]);
  $sent = is_array($state["sent"] ?? null) ? $state["sent"] : [];
  $summary = ["success" => true, "mode" => "moves-table-mailing-cli", "time" => $now->format(DateTimeInterface::ATOM), "dryRun" => $dryRun, "messagesSent" => 0, "organizationsChecked" => 0];
  $usersData = readJsonFile(__DIR__ . DIRECTORY_SEPARATOR . "users.json", ["users" => []]);
  $users = is_array($usersData["users"] ?? null) ? $usersData["users"] : [];
  $orgData = readJsonFile(__DIR__ . DIRECTORY_SEPARATOR . "organizations.json", ["organizations" => []]);
  foreach ((@scandir(__DIR__) ?: []) as $orgFolder) {
    if ($orgFolder === "." || $orgFolder === "..") continue;
    $orgPath = __DIR__ . DIRECTORY_SEPARATOR . $orgFolder;
    if (!is_dir($orgPath)) continue;
    $settingsPath = $orgPath . DIRECTORY_SEPARATOR . "Настройки.json";
    $movesPath = $orgPath . DIRECTORY_SEPARATOR . "Перемещения.json";
    if (!is_file($settingsPath) || !is_file($movesPath)) continue;
    $summary["organizationsChecked"]++;
    $settings = readJsonFile($settingsPath, []);
    $config = resolveMovesTableConfig($settings);
    if (!is_array($config) || !isMovesTableScheduleDue($config, $now)) continue;
    $time = normalizeScheduleTimeLabel((string) ($config["time"] ?? ""));
    $stateKey = $orgFolder . "|" . $now->format('Y-m-d') . "|" . $time;
    if (!empty($sent[$stateKey])) continue;
    $chatIds = getMovesTableRecipientChatIds($config, $users);
    if (empty($chatIds)) continue;
    $orgName = resolveOrganizationFullNameByFolder($orgFolder, $orgData);
    $moves = readJsonArrayFile($movesPath);
    $tools = readToolsBaseForMovesTable($orgPath);
    $exportDir = $orgPath . DIRECTORY_SEPARATOR . "exports";
    if (!is_dir($exportDir)) @mkdir($exportDir, 0775, true);
    $filePath = $exportDir . DIRECTORY_SEPARATOR . $now->format('Y-m-d') . ".xlsx";
    if (!buildMovesTableXlsx($orgName, $moves, $config, $now, $timezone, $filePath, $tools, $users, $orgFolder)) {
      appendMailingLog("error", "Ошибка создания Excel для рассылки 'Таблица перемещений'.", ["organization" => $orgFolder, "filePath" => $filePath]);
      $summary["success"] = false;
      continue;
    }
    alltrack_fix_file_permissions($filePath);
    foreach ($chatIds as $chatId) {
      $result = $dryRun ? ["ok" => true] : sendTelegramDocumentFile($botToken, $chatId, $filePath, "📦 Таблица принятых перемещений");
      if (!empty($result["ok"])) $summary["messagesSent"]++; else appendMailingLog("error", "Ошибка рассылки 'Таблица перемещений'.", ["organization" => $orgFolder, "chatId" => $chatId, "error" => $result["error"] ?? "Неизвестная ошибка"]);
    }
    $sent[$stateKey] = $now->format(DateTimeInterface::ATOM);
    cleanupOldExportFiles($exportDir, 30);
  }
  if (!$dryRun) {
    $encoded = json_encode(["sent" => $sent], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($encoded !== false && file_put_contents($statePath, $encoded . PHP_EOL, LOCK_EX) !== false) alltrack_fix_file_permissions($statePath);
  }
  return $summary;
}

function runMovesTableMailingIfNeeded(): void {
  $timezone = new DateTimeZone("Europe/Moscow");
  $now = new DateTimeImmutable("now", $timezone);
  $statePath = __DIR__ . DIRECTORY_SEPARATOR . "telegram-moves-table-mailing-last-run.json";
  $state = readJsonFile($statePath, []);
  $minute = $now->format("Y-m-d H:i");
  if (trim((string) ($state["lastRunMinute"] ?? "")) === $minute) return;
  $result = runMovesTableMailing(["dryRun" => false]);
  if (empty($result["success"])) appendMailingLog("error", "Не удалось выполнить рассылку 'Таблица перемещений' при автозапуске.", ["result" => $result]);
  $encoded = json_encode(["lastRunMinute" => $minute, "updatedAt" => $now->format(DateTimeInterface::ATOM)], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
  if ($encoded !== false && file_put_contents($statePath, $encoded . PHP_EOL, LOCK_EX) !== false) alltrack_fix_file_permissions($statePath);
}

function runScheduledMailingsWithLock(bool $dryRun, bool $useIfNeeded): array {
  $lockPath = __DIR__ . DIRECTORY_SEPARATOR . "telegram-scheduled-mailings.lock";
  $lockHandle = @fopen($lockPath, "c+");
  if (!is_resource($lockHandle)) {
    appendMailingLog("warning", "Не удалось открыть lock-файл планировщика рассылок.", [
      "lockPath" => $lockPath,
    ]);
  } elseif (!@flock($lockHandle, LOCK_EX | LOCK_NB)) {
    $timezone = new DateTimeZone("Europe/Moscow");
    return [
      "success" => true,
      "mode" => $useIfNeeded ? "scheduled-mailings-http" : "scheduled-mailings-cli",
      "dryRun" => $dryRun,
      "skipped" => true,
      "reason" => "scheduled-mailings-already-running",
      "serverTime" => (new DateTimeImmutable("now", $timezone))->format(DateTimeInterface::ATOM),
    ];
  }

  try {
    if ($useIfNeeded) {
      runNoPhotoFineRecalculationIfNeeded();
      runMoveRepliesMailingIfNeeded();
      runRepairsMailingIfNeeded();
      runNoPhotoMailingIfNeeded();
      runNoAccountingNumberMailingIfNeeded();
      runPendingAcceptanceMailingIfNeeded();
      runMovesTableMailingIfNeeded();
      runHourlyMoveArchivesIfNeeded();

      $timezone = new DateTimeZone("Europe/Moscow");
      return [
        "success" => true,
        "mode" => "scheduled-mailings-http",
        "dryRun" => $dryRun,
        "skipped" => false,
        "serverTime" => (new DateTimeImmutable("now", $timezone))->format(DateTimeInterface::ATOM),
      ];
    }

    $moveRepliesResult = runMoveRepliesMailing([
      "dryRun" => $dryRun,
    ]);
    $repairsResult = runRepairsMailing([
      "dryRun" => $dryRun,
    ]);
    $noPhotoMailingResult = runNoPhotoMailing([
      "dryRun" => $dryRun,
    ]);
    $noAccountingNumberMailingResult = runNoAccountingNumberMailing([
      "dryRun" => $dryRun,
    ]);
    $pendingAcceptanceMailingResult = runPendingAcceptanceMailing([
      "dryRun" => $dryRun,
    ]);
    $movesTableResult = runMovesTableMailing([
      "dryRun" => $dryRun,
    ]);
    $noPhotoResult = runNoPhotoFineRecalculation([
      "respectTime" => true,
      "dryRun" => $dryRun,
    ]);

    return [
      "success" => !empty($moveRepliesResult["success"]) && !empty($repairsResult["success"]) && !empty($noPhotoMailingResult["success"]) && !empty($noAccountingNumberMailingResult["success"]) && !empty($pendingAcceptanceMailingResult["success"]) && !empty($movesTableResult["success"]) && !empty($noPhotoResult["success"]),
      "mode" => "scheduled-mailings-cli",
      "dryRun" => $dryRun,
      "skipped" => false,
      "moveReplies" => $moveRepliesResult,
      "repairs" => $repairsResult,
      "noPhotoMailing" => $noPhotoMailingResult,
      "noAccountingNumberMailing" => $noAccountingNumberMailingResult,
      "pendingAcceptanceMailing" => $pendingAcceptanceMailingResult,
      "movesTableMailing" => $movesTableResult,
      "noPhotoFines" => $noPhotoResult,
    ];
  } finally {
    if (is_resource($lockHandle)) {
      @flock($lockHandle, LOCK_UN);
      @fclose($lockHandle);
      alltrack_fix_file_permissions($lockPath);
    }
  }
}

$isCli = PHP_SAPI === "cli";
if ($isCli) {
  $argvList = isset($argv) && is_array($argv) ? $argv : [];
  if (in_array("--run-scheduled-mailings", $argvList, true)) {
    $dryRun = in_array("--dry-run", $argvList, true);
    $result = runScheduledMailingsWithLock($dryRun, false);
    echo json_encode($result, JSON_UNESCAPED_UNICODE) . PHP_EOL;
    exit;
  }
  if (in_array("--run-moves-table-mailing", $argvList, true)) {
    $result = runMovesTableMailing([
      "dryRun" => in_array("--dry-run", $argvList, true),
    ]);
    echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . PHP_EOL;
    exit(empty($result["success"]) ? 1 : 0);
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
  if (in_array("--run-no-accounting-number-mailing", $argvList, true)) {
    $dryRun = in_array("--dry-run", $argvList, true);
    $result = runNoAccountingNumberMailing([
      "dryRun" => $dryRun,
    ]);
    echo json_encode($result, JSON_UNESCAPED_UNICODE) . PHP_EOL;
    exit;
  }
}

$requestedAction = trim((string) ($_GET["action"] ?? $payload["action"] ?? ""));
if ($requestedAction === "run-scheduled-mailings") {
  $result = runScheduledMailingsWithLock(false, true);
  $result["action"] = "run-scheduled-mailings";
  echo json_encode($result, JSON_UNESCAPED_UNICODE);
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
runMovesTableMailingIfNeeded();
runRepairsMailingIfNeeded();
runNoPhotoMailingIfNeeded();
runNoAccountingNumberMailingIfNeeded();
runPendingAcceptanceMailingIfNeeded();
runHourlyMoveArchivesIfNeeded();

echo json_encode(["success" => true]);

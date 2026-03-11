<?php
header("Content-Type: application/json; charset=utf-8");

function schedulerRunOnce(bool $dryRun): int {
  $phpBinary = defined("PHP_BINARY") && PHP_BINARY ? PHP_BINARY : "php";
  $command = escapeshellarg($phpBinary)
    . " " . escapeshellarg(__DIR__ . DIRECTORY_SEPARATOR . "save.php")
    . " --run-scheduled-mailings"
    . ($dryRun ? " --dry-run" : "");

  passthru($command, $exitCode);
  return (int) $exitCode;
}

function schedulerIsPidRunning(int $pid): bool {
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

function schedulerPidPath(): string {
  return __DIR__ . DIRECTORY_SEPARATOR . "telegram-scheduler.pid";
}

function schedulerReadRunningPid(): int {
  $pid = (int) @file_get_contents(schedulerPidPath());
  return schedulerIsPidRunning($pid) ? $pid : 0;
}

function schedulerRunDaemon(bool $dryRun): int {
  $existingPid = schedulerReadRunningPid();
  if ($existingPid > 0) {
    echo json_encode(["success" => true, "mode" => "daemon-already-running", "pid" => $existingPid], JSON_UNESCAPED_UNICODE) . PHP_EOL;
    return 0;
  }

  @file_put_contents(schedulerPidPath(), (string) getmypid(), LOCK_EX);
  @set_time_limit(0);
  @ignore_user_abort(true);

  while (true) {
    schedulerRunOnce($dryRun);

    $now = time();
    $sleepSeconds = 60 - ((int) ($now % 60));
    if ($sleepSeconds <= 0) {
      $sleepSeconds = 60;
    }
    sleep($sleepSeconds);
  }
}

function schedulerStartDaemon(bool $dryRun): array {
  $existingPid = schedulerReadRunningPid();
  if ($existingPid > 0) {
    return ["success" => true, "mode" => "daemon-already-running", "pid" => $existingPid];
  }

  $phpBinary = defined("PHP_BINARY") && PHP_BINARY ? PHP_BINARY : "php";
  $command = escapeshellarg($phpBinary)
    . " " . escapeshellarg(__FILE__)
    . " --daemon"
    . ($dryRun ? " --dry-run" : "")
    . " > /dev/null 2>&1 & echo $!";

  $output = [];
  $status = 0;
  @exec($command, $output, $status);
  $pid = isset($output[0]) ? (int) trim((string) $output[0]) : 0;

  if ($status !== 0 || $pid <= 0) {
    return [
      "success" => false,
      "mode" => "daemon-start-error",
      "error" => "Не удалось запустить фоновый планировщик.",
      "status" => $status,
    ];
  }

  usleep(300000);
  $daemonPid = schedulerReadRunningPid();
  if ($daemonPid > 0) {
    return ["success" => true, "mode" => "daemon-started", "pid" => $daemonPid];
  }

  return ["success" => true, "mode" => "daemon-started", "pid" => $pid];
}

if (PHP_SAPI === "cli") {
  $argvList = isset($argv) && is_array($argv) ? $argv : [];
  $dryRun = in_array("--dry-run", $argvList, true);
  $daemon = in_array("--daemon", $argvList, true);
  $startDaemon = in_array("--start-daemon", $argvList, true);
  $statusMode = in_array("--status", $argvList, true);

  if ($daemon) {
    exit(schedulerRunDaemon($dryRun));
  }
  if ($startDaemon) {
    echo json_encode(schedulerStartDaemon($dryRun), JSON_UNESCAPED_UNICODE) . PHP_EOL;
    exit;
  }
  if ($statusMode) {
    $pid = schedulerReadRunningPid();
    echo json_encode(["success" => true, "running" => $pid > 0, "pid" => $pid], JSON_UNESCAPED_UNICODE) . PHP_EOL;
    exit;
  }

  exit(schedulerRunOnce($dryRun));
}

$action = trim((string) ($_GET["action"] ?? "run-once"));
if ($action === "start-daemon") {
  echo json_encode(schedulerStartDaemon(false), JSON_UNESCAPED_UNICODE);
  exit;
}
if ($action === "status") {
  $pid = schedulerReadRunningPid();
  echo json_encode([
    "success" => true,
    "running" => $pid > 0,
    "pid" => $pid,
  ], JSON_UNESCAPED_UNICODE);
  exit;
}

$_GET["action"] = "run-scheduled-mailings";
require __DIR__ . DIRECTORY_SEPARATOR . "save.php";

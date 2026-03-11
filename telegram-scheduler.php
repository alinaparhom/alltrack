<?php
header("Content-Type: application/json; charset=utf-8");

if (PHP_SAPI === "cli") {
  $argvList = isset($argv) && is_array($argv) ? $argv : [];
  $dryRun = in_array("--dry-run", $argvList, true);

  $phpBinary = defined("PHP_BINARY") && PHP_BINARY ? PHP_BINARY : "php";
  $command = escapeshellarg($phpBinary)
    . " " . escapeshellarg(__DIR__ . DIRECTORY_SEPARATOR . "save.php")
    . " --run-scheduled-mailings"
    . ($dryRun ? " --dry-run" : "");

  passthru($command, $exitCode);
  exit((int) $exitCode);
}

$_GET["action"] = "run-scheduled-mailings";
require __DIR__ . DIRECTORY_SEPARATOR . "save.php";

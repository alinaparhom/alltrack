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
$allowedFiles = ["organizations.json", "users.json"];

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

$written = file_put_contents($targetPath, $encoded . PHP_EOL, LOCK_EX);

if ($written === false) {
  http_response_code(500);
  echo json_encode(["error" => "Не удалось сохранить файл."]);
  exit;
}

echo json_encode(["success" => true]);

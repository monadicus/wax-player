<?php

declare(strict_types=1);

$path = $_GET["path"] ?? "";

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

if (!is_string($path) || $path === "") {
    http_response_code(400);
    echo json_encode(["message" => "Missing path"]);
    exit;
}

$normalized = "/" . ltrim($path, "/");
$patterns = [
    '#^/station/[a-z0-9_-]+$#i',
    '#^/recognitions/station/[a-z0-9_-]+$#i',
    '#^/stream-status/[a-z0-9_/-]+$#i',
];

$allowed = false;
foreach ($patterns as $pattern) {
    if (preg_match($pattern, $normalized) === 1) {
        $allowed = true;
        break;
    }
}

if (!$allowed) {
    http_response_code(400);
    echo json_encode(["message" => "Unsupported path"]);
    exit;
}

$target = "https://api.wax.live" . $normalized;
$context = stream_context_create([
    "http" => [
        "method" => "GET",
        "timeout" => 10,
        "ignore_errors" => true,
        "header" => implode("\r\n", [
            "Accept: application/json",
            "User-Agent: wax-player-proxy/1.0",
        ]),
    ],
]);

$response = @file_get_contents($target, false, $context);
$headers = $http_response_header ?? [];
$statusCode = 502;
$contentType = "application/json; charset=utf-8";

foreach ($headers as $headerLine) {
    if (preg_match('#^HTTP/\S+\s+(\d{3})#', $headerLine, $matches) === 1) {
        $statusCode = (int) $matches[1];
    }
    if (stripos($headerLine, "Content-Type:") === 0) {
        $contentType = trim(substr($headerLine, strlen("Content-Type:")));
    }
}

http_response_code($statusCode);
header("Content-Type: " . $contentType);

if ($response === false) {
    echo json_encode(["message" => "Proxy request failed"]);
    exit;
}

echo $response;

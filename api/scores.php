<?php
// Bảng xếp hạng chung cho host PHP (cùng giao thức với /api/scores của server.js). Điểm lưu ở api/scores.json.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$file = __DIR__ . '/scores.json';

function best($runs) {
    $m = [];
    foreach ($runs as $e) {
        $k = mb_strtolower($e['name']);
        if (!isset($m[$k]) || $e['score'] > $m[$k]['score']) $m[$k] = $e;
    }
    $m = array_values($m);
    usort($m, function ($a, $b) { return $b['score'] <=> $a['score'] ?: $a['ts'] <=> $b['ts']; });
    return array_slice($m, 0, 50);
}

$fp = fopen($file, 'c+');
if (!$fp) { http_response_code(500); echo '[]'; exit; }
flock($fp, LOCK_EX);
$runs = json_decode(stream_get_contents($fp), true);
if (!is_array($runs)) $runs = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $b = json_decode(file_get_contents('php://input', false, null, 0, 4096), true);
    $name = trim(mb_substr(preg_replace('/[\x00-\x1f<>]/u', '', (string)($b['name'] ?? '')), 0, 16));
    $score = (int)($b['score'] ?? -1);
    if ($name === '' || $score < 0 || $score > 1000000) { http_response_code(400); echo '{}'; flock($fp, LOCK_UN); exit; }
    $runs[] = ['name' => $name, 'score' => $score, 'level' => max(1, (int)($b['level'] ?? 1)), 'win' => !empty($b['win']), 'ts' => (int)(microtime(true) * 1000)];
    $runs = array_slice($runs, -1000);
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($runs));
}
flock($fp, LOCK_UN); fclose($fp);
echo json_encode(best($runs), JSON_UNESCAPED_UNICODE);

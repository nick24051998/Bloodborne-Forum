<?php
/*
 * SuperMedo Server statistics (Nick, 28.10.2026; loaded by flarum/extend.php). The website's /server/ page, the live
 * band on its home page and the forum's sidebar box read them from here, not from game.supermedo.com: whatever the
 * number of visitors, SuperMedo Server gets one request per minute, and visitors' addresses stay with us.
 *
 * - GET /api/bb-server: everything /server/ shows in one answer (server, areas, day by day, what killed hunters,
 *   latest deaths and summons, best messages, leaderboards for all time and 7 days, hunters, chalice dungeons).
 * - GET /api/bb-server/summary: the few numbers for the home page band and the forum box.
 * - GET /api/bb-server/hunters/{id}: one hunter with their messages, for /server/hunter/?id=… (404 if unknown).
 * - Asks SuperMedo Server at most once a minute per answer; if it doesn't answer, the last answer stays for 15
 *   minutes, after that 503 and the pages hide their numbers.
 * - Only what SuperMedo Server's public API shows anyway (Online IDs, no addresses). Enemies without a name (names are
 *   entered on SuperMedo Server's admin page) are left out instead of showing a model code.
 */

use Illuminate\Contracts\Cache\Repository as Cache;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

if (! class_exists('BBForumServerStats')) {
    class BBForumServerStats
    {
        const API = 'https://game.supermedo.com/api/v1/';
        const STALE = 900;

        /** Cached answer: one fetch per minute, the last good one for 15 minutes; null without one */
        public static function cached(string $key, callable $load): ?array
        {
            $cache = resolve(Cache::class);
            if ($cache->add($key.'.lock', 1, 60)) {
                $fresh = $load();
                if ($fresh !== null) {
                    $cache->forever($key, $fresh);
                } else {
                    $cache->put($key.'.lock', 1, 120);
                }
            }
            $data = $cache->get($key);

            return ($data && $data['updatedAt'] >= time() - self::STALE) ? $data : null;
        }

        /** One API path, decoded; [] for "not found", null for no answer */
        public static function get(string $path)
        {
            try {
                $response = (new \GuzzleHttp\Client(['timeout' => 5, 'connect_timeout' => 3, 'http_errors' => false]))->get(self::API.$path, [
                    'headers' => ['Accept' => 'application/json', 'User-Agent' => 'BBPP-Community-Forum (+https://bbport.de)'],
                ]);
                if ($response->getStatusCode() === 404) {
                    return [];
                }
                if ($response->getStatusCode() !== 200) {
                    return null;
                }
                $data = json_decode((string) $response->getBody(), true);

                return is_array($data) ? $data : null;
            } catch (\Throwable $e) {
                return null;
            }
        }

        /** An enemy as {name} or null while it has no name yet */
        protected static function enemy($killer): ?string
        {
            $name = is_array($killer) ? trim((string) ($killer['name'] ?? '')) : '';

            return $name !== '' ? $name : null;
        }

        public static function overview(): ?array
        {
            return self::cached('bbforum.server.overview', function () {
                $server = self::get('server');
                if (! is_array($server) || ! isset($server['status'])) {
                    return null;
                }
                $server['deadliest_killer'] = self::enemy($server['deadliest_killer'] ?? null);

                // Enemies with the same name add up (one name can have several models, e.g. two kinds of Fishman)
                $killers = [];
                foreach ((array) (self::get('killers?limit=60')['killers'] ?? []) as $k) {
                    if ($name = self::enemy($k)) {
                        $killers[$name] = ($killers[$name] ?? 0) + (int) ($k['deaths'] ?? 0);
                    }
                }
                arsort($killers);
                $killers = array_map(function ($name, $deaths) {
                    return ['name' => $name, 'deaths' => $deaths];
                }, array_keys($killers), $killers);

                $deaths = array_map(function ($d) {
                    return [
                        'player' => (string) ($d['player'] ?? ''), 'cause' => (string) ($d['cause'] ?? ''),
                        'killer' => self::enemy($d['killer'] ?? null), 'place' => (string) ($d['place'] ?? ''),
                        'area' => (string) ($d['area'] ?? ''), 'time' => (int) ($d['time'] ?? 0),
                    ];
                }, (array) self::get('deaths?limit=8'));

                $messages = array_map(function ($m) {
                    unset($m['id'], $m['position']);

                    return $m;
                }, (array) self::get('messages/top?limit=6'));

                $areas = array_map(function ($a) {
                    unset($a['code']);

                    return $a;
                }, (array) self::get('areas'));

                $players = self::get('players?sort=minutes&limit=100') ?? [];
                $keep = ['name', 'level', 'minutes_played', 'deaths', 'summoned_to_help', 'summons_hosted', 'invasions', 'messages', 'last_seen', 'online'];
                $hunters = array_map(function ($p) use ($keep) {
                    return array_intersect_key($p, array_flip($keep));
                }, (array) ($players['players'] ?? []));

                return [
                    'server' => $server,
                    'areas' => $areas,
                    'history' => (array) self::get('history?days=30'),
                    'killers' => array_slice($killers, 0, 10),
                    'deaths' => $deaths,
                    'summons' => (array) self::get('summons?limit=6'),
                    'messages' => $messages,
                    'leaderboards' => (array) self::get('leaderboards?limit=5'),
                    'week' => (array) self::get('leaderboards?days=7&limit=5'),
                    'hunters' => $hunters,
                    'huntersTotal' => (int) ($players['total'] ?? count($hunters)),
                    'chalices' => (array) self::get('chalices?limit=20'),
                    'updatedAt' => time(),
                ];
            });
        }

        /** The few numbers for the home page band and the forum box */
        public static function summary(): ?array
        {
            $all = self::overview();
            if (! $all) {
                return null;
            }
            $s = $all['server'];
            $today = $all['history'][0] ?? null;
            $isToday = $today && ($today['date'] ?? '') === gmdate('Y-m-d');

            // Area that kills fastest, from at least 30 minutes played
            $fastest = null;
            foreach ($all['areas'] as $a) {
                $minutes = (int) ($a['hunter_minutes'] ?? 0);
                if ($minutes >= 30 && (int) ($a['deaths'] ?? 0) > 0) {
                    $rate = $a['deaths'] / $minutes;
                    if (! $fastest || $rate > $fastest['rate']) {
                        $fastest = ['name' => (string) $a['name'], 'deaths' => (int) $a['deaths'], 'minutes' => $minutes, 'rate' => $rate];
                    }
                }
            }
            if ($fastest) {
                unset($fastest['rate']);
            }

            return [
                'status' => (string) ($s['status'] ?? ''),
                'awakeSince' => (int) ($s['awake_since'] ?? 0),
                // Since when the server counts (its opening), so a young server's numbers are read as such
                'countingSince' => (int) ($s['counting_since'] ?? 0),
                'online' => (int) ($s['online'] ?? 0),
                'peakEver' => (int) ($s['peak_online']['ever']['online'] ?? 0),
                'registered' => (int) ($s['hunters']['registered'] ?? 0),
                'bells' => $s['bells'] ?? ['helpers' => 0, 'hosts_searching' => 0, 'invaders' => 0],
                'playedToday' => $isToday ? (int) ($today['hunters'] ?? 0) : 0,
                'peakToday' => (int) ($s['peak_online']['today']['online'] ?? 0),
                'fastest' => $fastest,
                'updatedAt' => $all['updatedAt'],
            ];
        }

        /** One hunter with their messages; ['missing' => true] if SuperMedo Server doesn't know the ID */
        public static function hunter(string $id): ?array
        {
            if (! preg_match('/^[A-Za-z0-9_-]{1,32}$/', $id)) {
                return ['missing' => true, 'updatedAt' => time()];
            }

            return self::cached('bbforum.server.hunter.'.strtolower($id), function () use ($id) {
                $player = self::get('players/'.rawurlencode($id));
                if ($player === []) {
                    return ['missing' => true, 'updatedAt' => time()];
                }
                if (! is_array($player) || ! isset($player['name'])) {
                    return null;
                }
                $player['nemesis'] = isset($player['nemesis']) ? ['name' => self::enemy($player['nemesis']), 'deaths' => (int) ($player['nemesis']['deaths'] ?? 0)] : null;
                $messages = array_map(function ($m) {
                    unset($m['id'], $m['position']);

                    return $m;
                }, (array) self::get('players/'.rawurlencode($id).'/messages?sort=newest&limit=50'));

                // Places on the leaderboards (all time, top 5)
                $ranks = [];
                foreach ((array) (self::overview()['leaderboards'] ?? []) as $board => $entries) {
                    foreach ((array) $entries as $e) {
                        if (strcasecmp((string) ($e['name'] ?? ''), (string) $player['name']) === 0) {
                            $ranks[] = ['board' => $board, 'rank' => (int) $e['rank'], 'value' => $e['value']];
                        }
                    }
                }

                return ['hunter' => $player, 'messages' => $messages, 'ranks' => $ranks, 'updatedAt' => time()];
            });
        }

        public static function respond(?array $data): ResponseInterface
        {
            $headers = ['Access-Control-Allow-Origin' => '*', 'Cache-Control' => 'public, max-age=60'];
            if (! $data) {
                return new JsonResponse(['error' => 'unavailable'], 503, $headers);
            }

            return new JsonResponse($data, empty($data['missing']) ? 200 : 404, $headers);
        }
    }

    class BBForumServerOverview implements RequestHandlerInterface
    {
        public function handle(ServerRequestInterface $request): ResponseInterface
        {
            return BBForumServerStats::respond(BBForumServerStats::overview());
        }
    }

    class BBForumServerSummary implements RequestHandlerInterface
    {
        public function handle(ServerRequestInterface $request): ResponseInterface
        {
            return BBForumServerStats::respond(BBForumServerStats::summary());
        }
    }

    class BBForumServerHunter implements RequestHandlerInterface
    {
        public function handle(ServerRequestInterface $request): ResponseInterface
        {
            $id = (string) ($request->getAttribute('routeParameters')['id'] ?? '');

            return BBForumServerStats::respond(BBForumServerStats::hunter($id));
        }
    }
}

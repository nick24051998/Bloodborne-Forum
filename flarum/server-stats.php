<?php
/*
 * SuperMedo Server statistics (Nick, 28.10.2026; loaded by flarum/extend.php). The website's /server/ page, the live
 * band on its home page and the forum's sidebar box read them from here, not from game.supermedo.com: whatever the
 * number of visitors, SuperMedo Server gets one request per minute, and visitors' addresses stay with us.
 *
 * - GET /api/bb-server: everything /server/ shows in one answer (server, areas, day by day, what killed hunters,
 *   latest deaths, best messages, leaderboards for all time and 7 days, hunters, chalice dungeons, hunters online hour by
 *   hour for 48 hours, invasions (PvP), deeds, bosses, and the areas of the map with how many hunters are there now).
 * - GET /api/bb-server/summary: the few numbers for the home page band and the forum box.
 * - GET /api/bb-server/hunters/{id}: one hunter with their messages, for /server/hunter/?id=… (404 if unknown).
 * - GET /api/bb-server/map/{area code}: one area of the map: its ground (every spot a hunter has stood on, without how
 *   often) and the hunters there right now as points without names; `now` is null while SuperMedo Server doesn't send
 *   them, and the page says "Coming soon" (404 for an unknown area). `image`: where SuperMedo Server's picture of the
 *   area lies in the game's coordinates (x0…x1 across, z0…z1 down) and its size, when it has one.
 * - GET /api/bb-server/map/{area code}/image: that picture (PNG), fetched once a day; the last good one stays.
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
        // The day SuperMedo Server opened to everyone (Nick, 29.10.2026). The API has no such date: counting_since
        // (27.10.) was the start of a test with five hunters. Pages call the server new for 30 days from here.
        const OPENED = '2026-10-28';
        // Areas without a map: "between areas" is no place, and chalice dungeons are new layouts every time, so their
        // footprints lie on top of each other
        const NO_MAP = ['m255_255', 'm29_00'];

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
            $all = self::cached('bbforum.server.overview', function () {
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
                    'messages' => $messages,
                    'leaderboards' => (array) self::get('leaderboards?limit=5'),
                    'week' => (array) self::get('leaderboards?days=7&limit=5'),
                    'hunters' => $hunters,
                    'huntersTotal' => (int) ($players['total'] ?? count($hunters)),
                    'chalices' => (array) self::get('chalices?limit=20'),
                    // Counted since 1.11.2026; the page shows "Coming soon" while they are empty
                    'online' => (array) self::get('online?hours=48'),
                    'pvp' => (array) self::get('pvp?limit=5'),
                    'deeds' => (array) self::get('deeds?limit=6'),
                    'bosses' => (array) self::get('bosses'),
                    'maps' => array_values(array_filter(array_map(function ($m) {
                        return ['code' => (string) ($m['code'] ?? ''), 'name' => (string) ($m['name'] ?? ''), 'online' => (int) ($m['online'] ?? 0)];
                    }, (array) self::get('map')), function ($m) {
                        return $m['code'] !== '' && $m['name'] !== '' && ! in_array($m['code'], self::NO_MAP, true);
                    })),
                    'updatedAt' => time(),
                ];
            });

            return $all ? ['opened' => self::OPENED] + $all : null;
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
                // Opening day and the start of the current run, so a young server's numbers are read as such
                'opened' => $all['opened'],
                'awakeSince' => (int) ($s['awake_since'] ?? 0),
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
                $overview = self::overview() ?? [];
                $ranks = [];
                foreach ((array) ($overview['leaderboards'] ?? []) as $board => $entries) {
                    foreach ((array) $entries as $e) {
                        if (strcasecmp((string) ($e['name'] ?? ''), (string) $player['name']) === 0) {
                            $ranks[] = ['board' => $board, 'rank' => (int) $e['rank'], 'value' => $e['value']];
                        }
                    }
                }

                // Whether SuperMedo Server counts invasions and deeds yet: until then the page says "Coming soon"
                $deeds = (array) ($overview['deeds']['deeds'] ?? []);
                $counting = [
                    'pvp' => array_sum(array_map('intval', (array) ($overview['pvp']['results'] ?? []))) > 0,
                    'deeds' => (int) ($overview['deeds']['beasts_slain'] ?? 0) + array_sum(array_map('intval', $deeds)) > 0,
                ];

                return ['hunter' => $player, 'messages' => $messages, 'ranks' => $ranks, 'counting' => $counting, 'updatedAt' => time()];
            });
        }

        /** One area of the map; ['missing' => true] for an area SuperMedo Server doesn't know or that has no map */
        public static function map(string $code): ?array
        {
            if (! preg_match('/^m\d{2,3}_\d{2,3}$/', $code) || in_array($code, self::NO_MAP, true)) {
                return ['missing' => true, 'updatedAt' => time()];
            }

            return self::cached('bbforum.server.map.'.$code, function () use ($code) {
                $map = self::get('map/'.$code);
                if ($map === []) {
                    return ['missing' => true, 'updatedAt' => time()];
                }
                if (! is_array($map) || ! isset($map['cells'])) {
                    return null;
                }
                $grid = max(1, (float) ($map['grid'] ?? 1));
                // The ground: where hunters have stood, without how often
                $floor = [];
                foreach ((array) $map['cells'] as $c) {
                    if (is_array($c) && isset($c[0], $c[1])) {
                        $floor[] = [(int) $c[0], (int) $c[1]];
                    }
                }
                // Hunters there right now as points on the grid, never with a name, whatever SuperMedo Server sends
                // along: [x, z], [x, y, z] or {x, z}. Null while it sends none.
                $now = null;
                if (isset($map['now']) && is_array($map['now'])) {
                    $now = [];
                    foreach ($map['now'] as $p) {
                        if (! is_array($p)) {
                            continue;
                        }
                        if (isset($p['x'], $p['z'])) {
                            [$x, $z] = [$p['x'], $p['z']];
                        } elseif (count($p) >= 3 && isset($p[0], $p[2])) {
                            [$x, $z] = [$p[0], $p[2]];
                        } elseif (isset($p[0], $p[1])) {
                            [$x, $z] = [$p[0], $p[1]];
                        } else {
                            continue;
                        }
                        if (is_numeric($x) && is_numeric($z)) {
                            $now[] = [round($x / $grid) * $grid, round($z / $grid) * $grid];
                        }
                    }
                }

                // The area's picture, drawn by SuperMedo Server from the game's level: where it lies, not its address
                // (visitors load it from us)
                $image = null;
                $box = $map['image'] ?? null;
                if (is_array($box) && is_numeric($box['x0'] ?? null) && is_numeric($box['x1'] ?? null)
                    && is_numeric($box['z0'] ?? null) && is_numeric($box['z1'] ?? null)
                    && (float) $box['x1'] > (float) $box['x0'] && (float) $box['z1'] > (float) $box['z0']) {
                    $image = [
                        'x0' => (float) $box['x0'], 'x1' => (float) $box['x1'], 'z0' => (float) $box['z0'],
                        'z1' => (float) $box['z1'], 'w' => (int) ($box['w'] ?? 0), 'h' => (int) ($box['h'] ?? 0),
                    ];
                }

                return [
                    'code' => $code, 'name' => (string) ($map['name'] ?? ''), 'grid' => $grid,
                    'online' => (int) ($map['online'] ?? 0), 'floor' => $floor, 'now' => $now, 'image' => $image,
                    'updatedAt' => time(),
                ];
            });
        }

        /** One area's picture as PNG bytes; null without one. Asked for once a day, the last good one kept. */
        public static function mapImage(string $code): ?string
        {
            if (! preg_match('/^m\d{2,3}_\d{2,3}$/', $code) || in_array($code, self::NO_MAP, true)) {
                return null;
            }
            $cache = resolve(Cache::class);
            $key = 'bbforum.server.mapimage.'.$code;
            $kept = $cache->get($key);
            if ((! $kept || $kept['updatedAt'] < time() - 86400) && $cache->add($key.'.lock', 1, 3600)) {
                try {
                    $response = (new \GuzzleHttp\Client(['timeout' => 15, 'connect_timeout' => 3, 'http_errors' => false]))
                        ->get(self::API.'map/'.$code.'/image', [
                            'headers' => ['Accept' => 'image/png', 'User-Agent' => 'BBPP-Community-Forum (+https://bbport.de)'],
                        ]);
                    $png = (string) $response->getBody();
                    // A PNG, and not a huge one
                    if ($response->getStatusCode() === 200 && strncmp($png, "\x89PNG\r\n\x1a\n", 8) === 0 && strlen($png) < 8000000) {
                        $kept = ['png' => base64_encode($png), 'updatedAt' => time()];
                        $cache->forever($key, $kept);
                    }
                } catch (\Throwable $e) {
                    // The last good one stays
                }
            }

            return $kept ? base64_decode($kept['png']) : null;
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

    class BBForumServerMap implements RequestHandlerInterface
    {
        public function handle(ServerRequestInterface $request): ResponseInterface
        {
            $code = (string) ($request->getAttribute('routeParameters')['code'] ?? '');

            return BBForumServerStats::respond(BBForumServerStats::map($code));
        }
    }

    class BBForumServerMapImage implements RequestHandlerInterface
    {
        public function handle(ServerRequestInterface $request): ResponseInterface
        {
            $png = BBForumServerStats::mapImage((string) ($request->getAttribute('routeParameters')['code'] ?? ''));
            if ($png === null) {
                return new JsonResponse(['error' => 'no picture'], 404, ['Access-Control-Allow-Origin' => '*']);
            }
            $body = new \Laminas\Diactoros\Stream('php://temp', 'wb+');
            $body->write($png);
            $body->rewind();

            return new \Laminas\Diactoros\Response($body, 200, [
                'Content-Type' => 'image/png', 'Access-Control-Allow-Origin' => '*', 'Cache-Control' => 'public, max-age=86400',
            ]);
        }
    }
}

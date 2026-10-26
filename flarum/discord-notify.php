<?php
/*
 * Forum-Meldungen in Discord (Nick, 26.10.2026; geladen von flarum/extend.php, Oberfläche in flarum/forum.js).
 *
 * Ablauf: Discord ist ein eigener Benachrichtigungsweg im Forum (Treiber „discord“, Spalte „Discord“ in den
 * Einstellungen). Was ein Mitglied dort angehakt hat, legt der Treiber in die Warteschlange bb_discord_notify. BB Helper
 * holt sie über GET /api/bb-discord-notify ab (Schlüssel bbforum.discord_notify_token im Kopf X-BB-Token) und schreibt
 * in den privaten Thread „📬 Forum inbox“ des Mitglieds in #🔔・forum-inbox, mit Ping. Keine DMs (Nick).
 *
 * - Aus, solange bbforum.discord_notify_enabled nicht 1 ist: dann wird nichts gesammelt, damit nach dem Einschalten
 *   nichts Altes auf einmal rausgeht. Abgeholt wird nur, was höchstens 6 Stunden alt ist.
 * - Erst nach 2 Minuten: wer den Beitrag bis dahin im Forum gelesen hat, bekommt keinen Ping (skipped).
 * - Antworten im selben Thema kommen als eine Meldung; in Themen, denen man nur folgt, höchstens einmal pro Stunde.
 *   Höchstens 8 Meldungen pro Stunde und Mitglied, der Rest wartet.
 * - Standardmäßig an: Antworten im eigenen oder gefolgten Thema, Antwort auf den eigenen Beitrag, Erwähnungen (auch
 *   @Helpers), beste Antwort, Erinnerung „beste Antwort wählen“, Status des eigenen Vorschlags oder Bugs (neue
 *   Meldung statusChanged). Likes, Umbenennen und Sperren nicht.
 * - Wer ein Thema eröffnet oder antwortet, folgt ihm jetzt standardmäßig (followAfterReply, sonst erführe der
 *   Fragesteller nichts von Antworten).
 * - POST /api/bb-discord-notify/ack (ids, state sent|failed|skipped) und /api/bb-discord-notify/action (mute: Thema
 *   nicht mehr folgen, off: alle Discord-Häkchen aus), beide mit demselben Schlüssel, ohne CSRF (kein Browser).
 */

use Carbon\Carbon;
use Flarum\Discussion\Discussion;
use Flarum\Notification\Blueprint\BlueprintInterface;
use Flarum\Notification\Driver\NotificationDriverInterface;
use Flarum\Post\Post;
use Flarum\User\User;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

if (! class_exists('BBForumDiscordNotify')) {
    class BBForumDiscordNotify
    {
        const TABLE = 'bb_discord_notify';
        const DELAY = 120;            // Sekunden, bevor eine Meldung rausgeht
        const MAX_AGE = 6 * 3600;     // ältere werden nicht mehr verschickt
        const KEEP = 3 * 86400;       // so lange bleiben Zeilen zum Nachsehen
        const PER_HOUR = 8;
        const DEFAULT_ON = ['newPost', 'postMentioned', 'userMentioned', 'groupMentioned', 'awardedBestAnswer',
            'bestAnswerInDiscussion', 'selectBestAnswer', 'statusChanged'];
        const STATUS_NAMES = ['status-open' => 'Open', 'status-in-progress' => 'In progress', 'status-fixed' => 'Fixed',
            'status-planned' => 'Planned', 'status-done' => 'Done', 'status-not-planned' => 'Not planned',
            'status-duplicate' => 'Duplicate'];

        private static function db()
        {
            return resolve('db');
        }

        private static function settings()
        {
            return resolve(\Flarum\Settings\SettingsRepositoryInterface::class);
        }

        public static function enabled(): bool
        {
            return (string) self::settings()->get('bbforum.discord_notify_enabled', '0') === '1';
        }

        public static function ensureTable(): void
        {
            $schema = self::db()->getSchemaBuilder();
            if ($schema->hasTable(self::TABLE)) {
                return;
            }
            $schema->create(self::TABLE, function ($table) {
                $table->increments('id');
                $table->unsignedInteger('user_id')->index();
                $table->string('discord_id', 32);
                $table->string('type', 40);
                $table->unsignedInteger('discussion_id')->nullable();
                $table->unsignedInteger('post_number')->nullable();
                $table->boolean('own')->default(false);
                $table->string('title', 255);
                $table->string('topic', 255)->nullable();
                $table->text('excerpt')->nullable();
                $table->string('url', 400);
                $table->string('state', 12)->default('pending')->index();
                $table->dateTime('created_at');
                $table->dateTime('sent_at')->nullable();
            });
        }

        private static function discordId(User $user): ?string
        {
            return \Flarum\User\LoginProvider::where('provider', 'discord')->where('user_id', $user->id)->value('identifier');
        }

        private static function url(Discussion $discussion, ?int $number): string
        {
            $base = rtrim(resolve(\Flarum\Http\UrlGenerator::class)->to('forum')->base(), '/');
            return $base.'/d/'.$discussion->id.'-'.$discussion->slug.($number && $number > 1 ? '/'.$number : '');
        }

        private static function excerpt(?Post $post): ?string
        {
            if (! $post || $post->type !== 'comment') {
                return null;
            }
            try {
                $text = strip_tags(str_replace(['</p>', '<br>', '<br/>'], ' ', $post->formatContent()));
            } catch (\Throwable $e) {
                $text = (string) $post->content;
            }
            $text = trim(preg_replace('/\s+/u', ' ', html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8')));
            return mb_strlen($text) > 180 ? rtrim(mb_substr($text, 0, 177)).'…' : $text;
        }

        /** Eine Meldung für ein Mitglied in die Warteschlange (vom Treiber, nur wenn eingeschaltet und angehakt) */
        public static function queue(User $user, BlueprintInterface $blueprint): void
        {
            $discordId = self::discordId($user);
            if (! $discordId) {
                return;
            }
            $type = $blueprint::getType();
            $subject = $blueprint->getSubject();
            $data = (array) $blueprint->getData();
            $discussion = $subject instanceof Discussion ? $subject : ($subject instanceof Post ? $subject->discussion : null);
            if (! $discussion) {
                return;
            }
            $number = $data['replyNumber'] ?? $data['postNumber'] ?? ($subject instanceof Post ? $subject->number : null);
            if (in_array($type, ['awardedBestAnswer', 'bestAnswerInDiscussion'], true) && $discussion->best_answer_post_id) {
                $number = Post::where('id', $discussion->best_answer_post_id)->value('number');
            }
            $post = $number ? $discussion->posts()->where('number', $number)->first() : null;
            $from = $blueprint->getFromUser();
            $who = $from ? ($from->display_name ?: $from->username) : 'Someone';
            $own = (int) $discussion->user_id === (int) $user->id;
            $kind = self::kindOf($discussion);
            switch ($type) {
                case 'newPost': $title = $who.($own ? ' replied in your topic' : ' replied in a topic you follow'); break;
                case 'postMentioned': $title = $who.' replied to your post'; break;
                case 'userMentioned': $title = $who.' mentioned you'; break;
                case 'groupMentioned': $title = $who.' mentioned your team'; break;
                case 'awardedBestAnswer': $title = 'Your answer was chosen as the best answer'; break;
                case 'bestAnswerInDiscussion': $title = $own ? 'Your question is solved' : 'A topic you follow has a best answer'; break;
                case 'selectBestAnswer': $title = 'Did an answer help you? Mark it as the best answer'; break;
                case 'statusChanged':
                    $title = 'Your '.$kind.' is now '.(self::STATUS_NAMES[$data['status'] ?? ''] ?? 'updated');
                    break;
                default: $title = 'New activity in a topic'; break;
            }
            self::ensureTable();
            self::db()->table(self::TABLE)->insert([
                'user_id' => $user->id,
                'discord_id' => $discordId,
                'type' => $type,
                'discussion_id' => $discussion->id,
                'post_number' => $number,
                'own' => $own,
                'title' => mb_substr($title, 0, 255),
                'topic' => mb_substr((string) $discussion->title, 0, 255),
                'excerpt' => self::excerpt($post),
                'url' => self::url($discussion, $number),
                'state' => 'pending',
                'created_at' => Carbon::now(),
            ]);
        }

        private static function kindOf(Discussion $discussion): string
        {
            $slugs = $discussion->tags()->pluck('slug')->all();
            return in_array('bug-reports', $slugs, true) ? 'bug report' : 'suggestion';
        }

        /** Status-Tag geändert (Suggestions, Bug Reports): dem Ersteller melden, wenn es jemand anderes war */
        public static function tagged(\Flarum\Tags\Event\DiscussionWasTagged $event): void
        {
            $discussion = $event->discussion;
            $old = array_map(function ($tag) { return $tag->slug; }, $event->oldTags);
            $new = $discussion->tags()->pluck('slug')->all();
            $added = array_values(array_filter(array_diff($new, $old), function ($slug) {
                return strpos($slug, 'status-') === 0;
            }));
            $author = $discussion->user;
            if (! $added || ! $author || (int) $author->id === (int) $event->actor->id) {
                return;
            }
            resolve(\Flarum\Notification\NotificationSyncer::class)->sync(
                new BBForumStatusChangedBlueprint($discussion, $event->actor, $added[0]),
                [$author]
            );
        }

        public static function authorized(ServerRequestInterface $request): bool
        {
            $token = trim((string) self::settings()->get('bbforum.discord_notify_token', ''));
            return $token !== '' && hash_equals($token, $request->getHeaderLine('X-BB-Token'));
        }

        /** Was jetzt raus darf, gebündelt je Mitglied und Thema */
        public static function pending(): array
        {
            self::ensureTable();
            $db = self::db();
            $now = Carbon::now();
            $db->table(self::TABLE)->where('created_at', '<', $now->copy()->subSeconds(self::KEEP))->delete();
            $db->table(self::TABLE)->where('state', 'pending')->where('created_at', '<', $now->copy()->subSeconds(self::MAX_AGE))
                ->update(['state' => 'expired']);
            $rows = $db->table(self::TABLE)->where('state', 'pending')
                ->where('created_at', '<=', $now->copy()->subSeconds(self::DELAY))->orderBy('id')->get();

            // Dieselbe Antwort als Erwähnung und als „neue Antwort“: nur die genauere Meldung (die Erwähnung)
            $mentioned = [];
            foreach ($rows as $row) {
                if ($row->type !== 'newPost' && $row->post_number) {
                    $mentioned[$row->user_id.'/'.$row->discussion_id.'/'.$row->post_number] = true;
                }
            }
            $skip = [];
            $ready = [];
            $approval = $db->getSchemaBuilder()->hasColumn('posts', 'is_approved');
            foreach ($rows as $row) {
                if ($row->type === 'newPost' && isset($mentioned[$row->user_id.'/'.$row->discussion_id.'/'.$row->post_number])) {
                    $skip[] = $row->id;
                    continue;
                }
                // Inzwischen ausgeblendet oder gelöscht (Spam, den ein Mod in den 2 Minuten weggeräumt hat)?
                if ($row->discussion_id && ! $db->table('discussions')->where('id', $row->discussion_id)->whereNull('hidden_at')->exists()) {
                    $skip[] = $row->id;
                    continue;
                }
                if ($row->discussion_id && $row->post_number) {
                    $post = $db->table('posts')->where('discussion_id', $row->discussion_id)->where('number', $row->post_number)
                        ->whereNull('hidden_at');
                    if ($approval) {
                        $post->where('is_approved', true);
                    }
                    if (! $post->exists()) {
                        $skip[] = $row->id;
                        continue;
                    }
                }
                // Schon im Forum gelesen?
                if ($row->discussion_id && $row->post_number) {
                    $read = $db->table('discussion_user')->where('user_id', $row->user_id)
                        ->where('discussion_id', $row->discussion_id)->value('last_read_post_number');
                    if ($read !== null && (int) $read >= (int) $row->post_number) {
                        $skip[] = $row->id;
                        continue;
                    }
                }
                $ready[] = $row;
            }
            if ($skip) {
                $db->table(self::TABLE)->whereIn('id', $skip)->update(['state' => 'skipped', 'sent_at' => $now]);
            }

            $hourAgo = $now->copy()->subHour();
            $sentLastHour = [];
            $groups = [];
            foreach ($ready as $row) {
                $uid = $row->user_id;
                if (! isset($sentLastHour[$uid])) {
                    $sentLastHour[$uid] = $db->table(self::TABLE)->where('user_id', $uid)->where('state', 'sent')
                        ->where('sent_at', '>=', $hourAgo)->count();
                }
                $replies = $row->type === 'newPost';
                // In gefolgten (nicht eigenen) Themen höchstens eine Meldung pro Stunde
                if ($replies && ! $row->own && $db->table(self::TABLE)->where('user_id', $uid)
                    ->where('discussion_id', $row->discussion_id)->where('state', 'sent')->where('sent_at', '>=', $hourAgo)->exists()) {
                    continue;
                }
                $key = $replies ? $uid.'/'.$row->discussion_id.'/replies' : $uid.'/'.$row->id;
                if (! isset($groups[$key])) {
                    if ($sentLastHour[$uid] >= self::PER_HOUR) {
                        continue;
                    }
                    $sentLastHour[$uid]++;
                    $groups[$key] = [];
                }
                $groups[$key][] = $row;
            }

            $out = [];
            foreach ($groups as $list) {
                $first = $list[0];
                $last = $list[count($list) - 1];
                $n = count($list);
                $title = $last->title;
                if ($n > 1) {
                    $title = $n.' new replies '.($first->own ? 'in your topic' : 'in a topic you follow');
                }
                $out[] = [
                    'ids' => array_map(function ($r) { return (int) $r->id; }, $list),
                    'user_id' => (int) $first->user_id,
                    'discord_id' => $first->discord_id,
                    'type' => $first->type,
                    'count' => $n,
                    'title' => $title,
                    'topic' => $first->topic,
                    'excerpt' => $last->excerpt,
                    'url' => $first->url, // zur ersten neuen Antwort
                    'discussion_id' => (int) $first->discussion_id,
                ];
            }
            return $out;
        }

        public static function ack(array $ids, string $state): int
        {
            if (! in_array($state, ['sent', 'failed', 'skipped'], true) || ! $ids) {
                return 0;
            }
            self::ensureTable();
            return self::db()->table(self::TABLE)->whereIn('id', array_map('intval', $ids))->where('state', 'pending')
                ->update(['state' => $state, 'sent_at' => Carbon::now()]);
        }

        /** Knöpfe in der Meldung: mute (diesem Thema nicht mehr folgen) oder off (alle Discord-Häkchen aus) */
        public static function action(string $action, string $discordId, int $discussionId): bool
        {
            $userId = \Flarum\User\LoginProvider::where('provider', 'discord')->where('identifier', $discordId)->value('user_id');
            $user = $userId ? User::find($userId) : null;
            if (! $user) {
                return false;
            }
            if ($action === 'mute' && $discussionId) {
                self::db()->table('discussion_user')->updateOrInsert(
                    ['user_id' => $user->id, 'discussion_id' => $discussionId],
                    ['subscription' => 'ignore']
                );
                self::db()->table(self::TABLE)->where('user_id', $user->id)->where('discussion_id', $discussionId)
                    ->where('state', 'pending')->update(['state' => 'skipped', 'sent_at' => Carbon::now()]);
                return true;
            }
            if ($action === 'off') {
                foreach (array_keys(\Flarum\Notification\Notification::getSubjectModels()) as $type) {
                    $user->setPreference(User::getNotificationPreferenceKey($type, 'discord'), false);
                }
                $user->save();
                self::db()->table(self::TABLE)->where('user_id', $user->id)->where('state', 'pending')
                    ->update(['state' => 'skipped', 'sent_at' => Carbon::now()]);
                return true;
            }
            return false;
        }
    }
}

if (! class_exists('BBForumDiscordNotifyDriver')) {
    class BBForumDiscordNotifyDriver implements NotificationDriverInterface
    {
        public function send(BlueprintInterface $blueprint, array $users): void
        {
            if (! BBForumDiscordNotify::enabled()) {
                return;
            }
            $type = $blueprint::getType();
            $from = $blueprint->getFromUser();
            foreach ($users as $user) {
                if (! $user->getPreference(User::getNotificationPreferenceKey($type, 'discord'))) {
                    continue;
                }
                if ($from && (int) $from->id === (int) $user->id) {
                    continue; // nichts für eigene Aktionen
                }
                try {
                    BBForumDiscordNotify::queue($user, $blueprint);
                } catch (\Throwable $e) {
                    resolve(\Psr\Log\LoggerInterface::class)->warning('Discord notify: '.$e->getMessage());
                }
            }
        }

        public function registerType(string $blueprintClass, array $driversEnabledByDefault): void
        {
            User::registerPreference(
                User::getNotificationPreferenceKey($blueprintClass::getType(), 'discord'),
                'boolval',
                in_array($blueprintClass::getType(), BBForumDiscordNotify::DEFAULT_ON, true)
            );
        }
    }
}

if (! class_exists('BBForumStatusChangedBlueprint')) {
    /** Neue Meldung: der Status (Tag status-…) eines Vorschlags oder Bugs hat sich geändert */
    class BBForumStatusChangedBlueprint implements BlueprintInterface
    {
        public $discussion;
        public $actor;
        public $status;

        public function __construct(Discussion $discussion, User $actor, string $status)
        {
            $this->discussion = $discussion;
            $this->actor = $actor;
            $this->status = $status;
        }

        public function getFromUser()
        {
            return $this->actor;
        }

        public function getSubject()
        {
            return $this->discussion;
        }

        public function getData()
        {
            return ['status' => $this->status];
        }

        public static function getType()
        {
            return 'statusChanged';
        }

        public static function getSubjectModel()
        {
            return Discussion::class;
        }
    }
}

if (! class_exists('BBForumDiscordNotifyPending')) {
    class BBForumDiscordNotifyPending implements RequestHandlerInterface
    {
        public function handle(ServerRequestInterface $request): ResponseInterface
        {
            if (! BBForumDiscordNotify::authorized($request)) {
                return new JsonResponse(['error' => 'forbidden'], 403);
            }
            return new JsonResponse(['enabled' => BBForumDiscordNotify::enabled(), 'messages' => BBForumDiscordNotify::pending()]);
        }
    }

    class BBForumDiscordNotifyAck implements RequestHandlerInterface
    {
        public function handle(ServerRequestInterface $request): ResponseInterface
        {
            if (! BBForumDiscordNotify::authorized($request)) {
                return new JsonResponse(['error' => 'forbidden'], 403);
            }
            $body = (array) json_decode((string) $request->getBody(), true);
            $done = BBForumDiscordNotify::ack((array) ($body['ids'] ?? []), (string) ($body['state'] ?? ''));
            return new JsonResponse(['updated' => $done]);
        }
    }

    class BBForumDiscordNotifyAction implements RequestHandlerInterface
    {
        public function handle(ServerRequestInterface $request): ResponseInterface
        {
            if (! BBForumDiscordNotify::authorized($request)) {
                return new JsonResponse(['error' => 'forbidden'], 403);
            }
            $body = (array) json_decode((string) $request->getBody(), true);
            $ok = BBForumDiscordNotify::action((string) ($body['action'] ?? ''), (string) ($body['discord_id'] ?? ''),
                (int) ($body['discussion_id'] ?? 0));
            return new JsonResponse(['ok' => $ok], $ok ? 200 : 404);
        }
    }
}

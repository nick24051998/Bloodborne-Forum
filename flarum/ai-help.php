<?php
/*
 * AI answers in Help & Support (Nick, 27.10.2026: BB Helper's AI should answer the forum's help topics; loaded by
 * flarum/extend.php). The forum only hands out the topics and takes the reply. BB Helper (forum_ai.py in the bot)
 * decides whether and what to answer. Same key as the Discord inbox: header X-BB-Token = bbforum.discord_notify_token.
 *
 * - GET /api/bb-ai/candidates?wait=60&catchup=48: open help topics (visible, not locked or pinned, no best answer)
 *   whose newest post comes from the asker or another member, not from the team or BB-Helper, and is at least `wait`
 *   minutes and at most `catchup` hours old. Helpers go first; anything older is left alone.
 * - GET /api/bb-ai/topics/{id}: the topic with its visible posts (source text, author, role, time, attached files).
 * - GET /api/bb-ai/files/{uuid}: a file attached to one of those posts (BB Report Tool zip, log, screenshot).
 * - POST /api/bb-ai/reply {discussion_id, after, content}: posts as BB-Helper (bbforum.ai_user_id, default 61), but
 *   only if nobody posted after post number `after`. The usual notifications follow, so the asker gets the Discord
 *   inbox ping.
 */

use Flarum\Discussion\Discussion;
use Flarum\Post\CommentPost;
use Flarum\User\User;
use Laminas\Diactoros\Response;
use Laminas\Diactoros\Response\JsonResponse;
use Laminas\Diactoros\Stream;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

if (! class_exists('BBForumAiHelp')) {
    class BBForumAiHelp
    {
        const TAG = 'help-support';
        // Admin, Mod and the team groups mirrored from Discord (Owner, Admin, Contributor, Mod, Support, Helper)
        const STAFF_GROUPS = [1, 4, 5, 6, 7, 8, 9, 10];
        const MAX_POSTS = 80;
        const MAX_FILE = 12 * 1024 * 1024;

        public static function botId(): int
        {
            return (int) resolve('flarum.settings')->get('bbforum.ai_user_id', 61);
        }

        public static function helpTagId(): int
        {
            return (int) resolve('db')->table('tags')->where('slug', self::TAG)->value('id');
        }

        /** poster, staff, bot or member: as BB Helper sorts the messages of a Discord help post */
        public static function role(?User $user, Discussion $discussion): string
        {
            if (! $user) {
                return 'member';
            }
            if ((int) $user->id === self::botId()) {
                return 'bot';
            }
            if ((int) $user->id === (int) $discussion->user_id) {
                return 'poster';
            }
            $groups = $user->groups->pluck('id')->map(fn ($id) => (int) $id)->all();
            return array_intersect($groups, self::STAFF_GROUPS) ? 'staff' : 'member';
        }

        /** An open help topic: visible, in Help & Support, not locked or pinned, no best answer */
        public static function openTopic(int $id): ?Discussion
        {
            $d = Discussion::find($id);
            if (! $d || $d->hidden_at || $d->is_locked || $d->is_sticky || $d->best_answer_post_id) {
                return null;
            }
            $inHelp = resolve('db')->table('discussion_tag')->where('discussion_id', $d->id)
                ->where('tag_id', self::helpTagId())->exists();
            return $inHelp ? $d : null;
        }

        public static function candidates(int $waitMinutes, int $catchupHours): array
        {
            $now = \Carbon\Carbon::now();
            $ids = resolve('db')->table('discussions')
                ->join('discussion_tag', 'discussion_tag.discussion_id', '=', 'discussions.id')
                ->where('discussion_tag.tag_id', self::helpTagId())
                ->whereNull('discussions.hidden_at')->where('discussions.is_locked', 0)->where('discussions.is_sticky', 0)
                ->whereNull('discussions.best_answer_post_id')
                ->where('discussions.last_posted_at', '<=', $now->copy()->subMinutes($waitMinutes))
                ->where('discussions.last_posted_at', '>=', $now->copy()->subHours($catchupHours))
                ->orderBy('discussions.last_posted_at')->limit(40)->pluck('discussions.id');
            $out = [];
            foreach (Discussion::whereIn('id', $ids)->orderBy('last_posted_at')->get() as $d) {
                $last = CommentPost::where('discussion_id', $d->id)->whereNull('hidden_at')
                    ->orderByDesc('number')->first();
                if (! $last) {
                    continue;
                }
                $role = self::role($last->user, $d);
                if ($role !== 'poster' && $role !== 'member') {
                    continue;
                }
                $out[] = ['id' => (int) $d->id, 'title' => $d->title, 'last_post_number' => (int) $last->number,
                    'last_role' => $role, 'last_time' => $last->created_at->toIso8601String()];
            }
            return $out;
        }

        public static function topic(Discussion $d): array
        {
            $posts = CommentPost::where('discussion_id', $d->id)->whereNull('hidden_at')
                ->where(function ($q) {
                    $q->whereNull('is_approved')->orWhere('is_approved', 1);
                })
                ->orderByDesc('number')->limit(self::MAX_POSTS)->with('user.groups')->get()->reverse();
            $files = resolve('db')->table('fof_upload_file_posts')
                ->join('fof_upload_files', 'fof_upload_files.id', '=', 'fof_upload_file_posts.file_id')
                ->whereIn('fof_upload_file_posts.post_id', $posts->pluck('id'))
                ->get(['fof_upload_file_posts.post_id', 'fof_upload_files.uuid', 'fof_upload_files.base_name',
                    'fof_upload_files.size', 'fof_upload_files.type'])
                ->groupBy('post_id');
            $tags = resolve('db')->table('discussion_tag')->join('tags', 'tags.id', '=', 'discussion_tag.tag_id')
                ->where('discussion_tag.discussion_id', $d->id)->pluck('tags.name')->all();
            $out = [];
            foreach ($posts as $p) {
                $out[] = [
                    'id' => (int) $p->id,
                    'number' => (int) $p->number,
                    'user_id' => (int) $p->user_id,
                    'author' => $p->user ? $p->user->display_name : '[deleted]',
                    'role' => self::role($p->user, $d),
                    'time' => $p->created_at->toIso8601String(),
                    'content' => (string) $p->content,
                    'files' => collect($files->get($p->id, []))->map(fn ($f) => [
                        'uuid' => $f->uuid, 'name' => $f->base_name, 'size' => (int) $f->size, 'type' => $f->type,
                    ])->values()->all(),
                ];
            }
            $base = rtrim(resolve(\Flarum\Http\UrlGenerator::class)->to('forum')->base(), '/');
            return ['id' => (int) $d->id, 'title' => $d->title, 'author_id' => (int) $d->user_id, 'tags' => $tags,
                'url' => "$base/d/{$d->id}", 'last_post_number' => (int) $d->last_post_number, 'posts' => $out];
        }

        /** The file of an upload attached to a visible help post, or null */
        public static function file(string $uuid): ?array
        {
            $f = resolve('db')->table('fof_upload_files')
                ->join('fof_upload_file_posts', 'fof_upload_file_posts.file_id', '=', 'fof_upload_files.id')
                ->join('posts', 'posts.id', '=', 'fof_upload_file_posts.post_id')
                ->join('discussion_tag', 'discussion_tag.discussion_id', '=', 'posts.discussion_id')
                ->where('fof_upload_files.uuid', $uuid)->where('discussion_tag.tag_id', self::helpTagId())
                ->whereNull('posts.hidden_at')->where('fof_upload_files.upload_method', 'local')
                ->first(['fof_upload_files.path', 'fof_upload_files.base_name', 'fof_upload_files.type', 'fof_upload_files.size']);
            if (! $f || str_contains($f->path, '..') || $f->size > self::MAX_FILE) {
                return null;
            }
            $path = resolve(\Flarum\Foundation\Paths::class)->public.'/assets/files/'.$f->path;
            return is_file($path) ? ['path' => $path, 'type' => $f->type ?: 'application/octet-stream'] : null;
        }

        /** Posts the reply as BB-Helper: the post, or a reason why not */
        public static function reply(int $discussionId, int $after, string $content)
        {
            $d = self::openTopic($discussionId);
            if (! $d) {
                return 'closed';
            }
            if ((int) $d->last_post_number !== $after) {
                return 'moved';
            }
            $bot = User::find(self::botId());
            if (! $bot) {
                return 'no bot account';
            }
            // BB-Helper doesn't need to follow every topic it answered
            if ($bot->getPreference('followAfterReply')) {
                $bot->setPreference('followAfterReply', false);
                $bot->save();
            }
            $post = resolve(\Illuminate\Contracts\Bus\Dispatcher::class)->dispatch(
                new \Flarum\Post\Command\PostReply($d->id, $bot, ['attributes' => ['content' => $content]], '127.0.0.1')
            );
            $base = rtrim(resolve(\Flarum\Http\UrlGenerator::class)->to('forum')->base(), '/');
            return ['id' => (int) $post->id, 'number' => (int) $post->number, 'url' => "$base/d/{$d->id}/{$post->number}"];
        }
    }
}

if (! class_exists('BBForumAiCandidates')) {
    class BBForumAiCandidates implements RequestHandlerInterface
    {
        public function handle(ServerRequestInterface $request): ResponseInterface
        {
            if (! BBForumDiscordNotify::authorized($request)) {
                return new JsonResponse(['error' => 'forbidden'], 403);
            }
            $q = $request->getQueryParams();
            $wait = max(0, min(24 * 60, (int) ($q['wait'] ?? 60)));
            $catchup = max(1, min(14 * 24, (int) ($q['catchup'] ?? 48)));
            return new JsonResponse(['topics' => BBForumAiHelp::candidates($wait, $catchup)]);
        }
    }

    class BBForumAiTopic implements RequestHandlerInterface
    {
        public function handle(ServerRequestInterface $request): ResponseInterface
        {
            if (! BBForumDiscordNotify::authorized($request)) {
                return new JsonResponse(['error' => 'forbidden'], 403);
            }
            $id = (int) \Illuminate\Support\Arr::get($request->getQueryParams(), 'id');
            $d = BBForumAiHelp::openTopic($id);
            return $d ? new JsonResponse(BBForumAiHelp::topic($d)) : new JsonResponse(['error' => 'not an open help topic'], 404);
        }
    }

    class BBForumAiFile implements RequestHandlerInterface
    {
        public function handle(ServerRequestInterface $request): ResponseInterface
        {
            if (! BBForumDiscordNotify::authorized($request)) {
                return new JsonResponse(['error' => 'forbidden'], 403);
            }
            $f = BBForumAiHelp::file((string) \Illuminate\Support\Arr::get($request->getQueryParams(), 'uuid'));
            if (! $f) {
                return new JsonResponse(['error' => 'no such file'], 404);
            }
            return new Response(new Stream($f['path'], 'r'), 200, ['Content-Type' => $f['type']]);
        }
    }

    class BBForumAiReply implements RequestHandlerInterface
    {
        public function handle(ServerRequestInterface $request): ResponseInterface
        {
            if (! BBForumDiscordNotify::authorized($request)) {
                return new JsonResponse(['error' => 'forbidden'], 403);
            }
            $body = (array) json_decode((string) $request->getBody(), true);
            $content = trim((string) ($body['content'] ?? ''));
            if ($content === '' || mb_strlen($content) > 6000) {
                return new JsonResponse(['error' => 'empty or too long'], 422);
            }
            $result = BBForumAiHelp::reply((int) ($body['discussion_id'] ?? 0), (int) ($body['after'] ?? -1), $content);
            if (is_string($result)) {
                return new JsonResponse(['error' => $result], $result === 'moved' ? 409 : 404);
            }
            return new JsonResponse($result);
        }
    }
}

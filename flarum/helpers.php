<?php
/*
 * Top helpers (Nick, 28.10.2026; loaded by flarum/extend.php, the UI lives in flarum/forum.js).
 *
 * - Ranking of the members who help most, for the last 30 days and for all time. Points: 5 per solution (a reply
 *   marked as the best answer in someone else's discussion), 3 per Known Fix written, 1 per discussion of another
 *   member in Help & Support or Bug Reports they replied in. Only visible posts and discussions count. Not ranked:
 *   BB-Helper (bbforum.ai_user_id), admins, suspended members, and anyone below 3 points.
 * - GET /api/bb-top-helpers: the users (JSON:API) plus meta.month and meta.all = [{id, solved, fixes, topics,
 *   points}], 20 each. Calculated at most every 30 minutes.
 * - The top 3 of the last 30 days get the mark "Top helper" (bbPerks tophelper, flarum/profiles.php).
 */

use Carbon\Carbon;
use Flarum\Api\Controller\AbstractListController;
use Flarum\Api\Serializer\BasicUserSerializer;
use Flarum\User\User;
use Illuminate\Contracts\Cache\Repository as Cache;
use Illuminate\Database\ConnectionInterface;
use Psr\Http\Message\ServerRequestInterface;
use Tobscure\JsonApi\Document;

if (! class_exists('BBForumTopHelpers')) {
    class BBForumTopHelpers
    {
        const HELP_TAGS = ['help-support', 'bug-reports'];
        const FIX_TAG = 'known-fixes';
        const MIN_POINTS = 3;
        const LIMIT = 20;

        /** Ranking for the last $days days (null: all time), cached for 30 minutes */
        public static function ranking(?int $days): array
        {
            return resolve(Cache::class)->remember('bbforum.tophelpers.'.($days ?: 'all'), 1800, function () use ($days) {
                return self::calculate($days);
            });
        }

        /** IDs of the first $count in the last 30 days (mark "Top helper") */
        public static function topIds(int $count = 3): array
        {
            return array_slice(array_column(self::ranking(30), 'id'), 0, $count);
        }

        private static function calculate(?int $days): array
        {
            $db = resolve(ConnectionInterface::class);
            $since = $days ? Carbon::now()->subDays($days) : null;
            // Raw SQL gets no table prefix, so the counted column goes through the grammar
            $count = fn (string $column) => $db->raw('count(distinct '.$db->getQueryGrammar()->wrap($column).') as n');
            $rows = [];
            $add = function ($list, string $key) use (&$rows) {
                foreach ($list as $row) {
                    $id = (int) $row->uid;
                    $rows[$id] = $rows[$id] ?? ['id' => $id, 'solved' => 0, 'fixes' => 0, 'topics' => 0];
                    $rows[$id][$key] = (int) $row->n;
                }
            };

            // Solutions: best answer in someone else's discussion
            $add($db->table('discussions as d')->join('posts as p', 'p.id', '=', 'd.best_answer_post_id')
                ->whereColumn('p.user_id', '<>', 'd.user_id')
                ->whereNull('d.hidden_at')->whereNull('p.hidden_at')->where('d.is_private', 0)
                ->when($since, fn ($q) => $q->where('d.best_answer_set_at', '>=', $since))
                ->groupBy('p.user_id')->select('p.user_id as uid', $count('d.id'))->get(), 'solved');

            // Known Fixes written (not the pinned guides)
            $add($db->table('discussions as d')
                ->whereIn('d.id', $db->table('discussion_tag as dt')->join('tags as t', 't.id', '=', 'dt.tag_id')
                    ->where('t.slug', self::FIX_TAG)->select('dt.discussion_id'))
                ->whereNull('d.hidden_at')->where('d.is_private', 0)->where('d.is_sticky', 0)
                ->when($since, fn ($q) => $q->where('d.created_at', '>=', $since))
                ->groupBy('d.user_id')->select('d.user_id as uid', $count('d.id'))->get(), 'fixes');

            // Discussions of other members in Help & Support and Bug Reports with at least one reply
            $add($db->table('posts as p')->join('discussions as d', 'd.id', '=', 'p.discussion_id')
                ->whereIn('d.id', $db->table('discussion_tag as dt')->join('tags as t', 't.id', '=', 'dt.tag_id')
                    ->whereIn('t.slug', self::HELP_TAGS)->select('dt.discussion_id'))
                ->where('p.type', 'comment')->whereColumn('p.user_id', '<>', 'd.user_id')
                ->whereNull('p.hidden_at')->whereNull('d.hidden_at')->where('p.is_private', 0)->where('d.is_private', 0)
                ->when($since, fn ($q) => $q->where('p.created_at', '>=', $since))
                ->groupBy('p.user_id')->select('p.user_id as uid', $count('p.discussion_id'))->get(), 'topics');

            unset($rows[0]);
            $skip = self::excluded(array_keys($rows));
            $list = [];
            foreach ($rows as $id => $row) {
                $row['points'] = $row['solved'] * 5 + $row['fixes'] * 3 + $row['topics'];
                if (! in_array($id, $skip, true) && $row['points'] >= self::MIN_POINTS) {
                    $list[] = $row;
                }
            }
            usort($list, function ($a, $b) {
                return [$b['points'], $b['solved'], $b['topics'], $a['id']] <=> [$a['points'], $a['solved'], $a['topics'], $b['id']];
            });

            return array_slice($list, 0, self::LIMIT);
        }

        /** Not ranked: BB-Helper, admins, suspended and deleted members */
        private static function excluded(array $ids): array
        {
            $bot = (int) resolve('flarum.settings')->get('bbforum.ai_user_id', 61);
            $present = User::whereIn('id', $ids)
                ->where(fn ($q) => $q->whereNull('suspended_until')->orWhere('suspended_until', '<', Carbon::now()))
                ->whereDoesntHave('groups', fn ($q) => $q->where('groups.id', 1))
                ->pluck('id')->map('intval')->all();

            return array_values(array_unique(array_merge([$bot], array_diff($ids, $present))));
        }
    }

    class BBForumTopHelpersController extends AbstractListController
    {
        public $serializer = BasicUserSerializer::class;

        protected function data(ServerRequestInterface $request, Document $document)
        {
            $month = BBForumTopHelpers::ranking(30);
            $all = BBForumTopHelpers::ranking(null);
            $document->addMeta('month', $month);
            $document->addMeta('all', $all);

            return User::whereIn('id', array_unique(array_merge(array_column($month, 'id'), array_column($all, 'id'))))->get();
        }
    }
}

<?php
/*
 * Overview in the forum (Nick, 26.10.2026; loaded by flarum/extend.php, the UI lives in flarum/forum.js).
 *
 * - Votes: one 👍 (like) on the opening post. For discussions in Suggestions, Known Fixes and Bug Reports the API
 *   returns bbVotes, bbVoted and bbFirstPostId. Sorting "-bbVotes": the count then comes as column bb_votes from
 *   the query itself (no separate column in the database, so it is always current, including the thumbs taken over
 *   from Discord). Only for this sort, because on "All Discussions" Flarum appends a second query (UNION) for pinned
 *   discussions, which must have the same columns.
 * - Filter "bbview" for the tabs above the lists: open, solved, closed (Help & Support), active (without Done, Not
 *   planned, Duplicate, Fixed: Suggestions "Top" and "New", Nick's wish: finished items no longer show up there) or
 *   a status tag (status-planned, status-open …), in addition to the section. As a filter rather than a search, so
 *   the search box at the top does not show anything like "-is:solved".
 * - Command bbforum:close-stale (hourly): help discussions without a best answer that had no new post for 7 days
 *   get locked (closed), but only once someone other than the asker has replied (helper, team or the AI answer):
 *   an unanswered question stays open until it gets an answer (Nick, 29.10.2026; before, unanswered questions were
 *   closed without a word). Pinned discussions never. Without events, i.e. no notification and the discussion does
 *   not jump to the top of "Latest"; with --dry-run it only counts.
 */

use Carbon\Carbon;
use Flarum\Console\AbstractCommand;
use Flarum\Discussion\Discussion;
use Flarum\Filter\FilterInterface;
use Flarum\Filter\FilterState;
use Flarum\User\User;
use Symfony\Component\Console\Input\InputOption;

if (! class_exists('BBForumVotes')) {
    class BBForumVotes
    {
        const TAGS = ['suggestions', 'known-fixes', 'bug-reports'];

        /** Filter and search mutator: when sorting by votes, the count as column bb_votes; ties: newer first */
        public static function select($state, $criteria): void
        {
            if (! array_key_exists('bbVotes', (array) $criteria->sort)) {
                return;
            }
            $query = $state->getQuery();
            $likes = $query->getConnection()->table('post_likes')->selectRaw('count(*)')
                ->whereColumn('post_likes.post_id', 'discussions.first_post_id');
            $query->selectSub($likes, 'bb_votes')->orderBy('discussions.created_at', 'desc');
        }

        public static function attributes(User $actor, Discussion $discussion): array
        {
            if (! $discussion->first_post_id || ! $discussion->tags->whereIn('slug', self::TAGS)->count()) {
                return [];
            }
            $likes = $discussion->getConnection()->table('post_likes')->where('post_id', $discussion->first_post_id);
            $votes = $discussion->getAttribute('bb_votes');

            return [
                'bbFirstPostId' => (string) $discussion->first_post_id,
                'bbVotes' => $votes !== null ? (int) $votes : (clone $likes)->count(),
                'bbVoted' => ! $actor->isGuest() && (clone $likes)->where('user_id', $actor->id)->exists(),
            ];
        }
    }
}

if (! class_exists('BBForumViewFilter')) {
    class BBForumViewFilter implements FilterInterface
    {
        public function getFilterKey(): string
        {
            return 'bbview';
        }

        public function filter(FilterState $filterState, string $filterValue, bool $negate)
        {
            $query = $filterState->getQuery();
            $value = trim($filterValue, '"');
            if ($value === 'open') {
                $query->whereNull('discussions.best_answer_post_id')->where('discussions.is_locked', false);
            } elseif ($value === 'solved') {
                $query->whereNotNull('discussions.best_answer_post_id');
            } elseif ($value === 'closed') {
                $query->whereNull('discussions.best_answer_post_id')->where('discussions.is_locked', true);
            } elseif ($value === 'active') {
                $query->whereNotExists(function ($q) {
                    $q->selectRaw('1')->from('discussion_tag')
                        ->join('tags', 'tags.id', '=', 'discussion_tag.tag_id')
                        ->whereColumn('discussion_tag.discussion_id', 'discussions.id')
                        ->whereIn('tags.slug', ['status-done', 'status-not-planned', 'status-duplicate', 'status-fixed']);
                });
            } elseif (preg_match('/^status-[a-z-]+$/', $value)) {
                $query->whereExists(function ($q) use ($value) {
                    $q->selectRaw('1')->from('discussion_tag')
                        ->join('tags', 'tags.id', '=', 'discussion_tag.tag_id')
                        ->whereColumn('discussion_tag.discussion_id', 'discussions.id')
                        ->where('tags.slug', $value);
                });
            }
        }
    }
}

if (! class_exists('BBForumCloseStaleCommand')) {
    class BBForumCloseStaleCommand extends AbstractCommand
    {
        const DAYS = 7;

        protected function configure()
        {
            $this->setName('bbforum:close-stale')
                ->setDescription('Close help topics without a best answer after '.self::DAYS.' days without a new post')
                ->addOption('dry-run', null, InputOption::VALUE_NONE, 'Only count');
        }

        protected function fire()
        {
            $tagId = \Flarum\Tags\Tag::where('slug', 'help-support')->value('id');
            if (! $tagId) {
                return;
            }
            $stale = Discussion::query()
                ->whereExists(function ($q) use ($tagId) {
                    $q->selectRaw('1')->from('discussion_tag')
                        ->whereColumn('discussion_tag.discussion_id', 'discussions.id')
                        ->where('discussion_tag.tag_id', $tagId);
                })
                ->where('is_locked', false)
                ->where('is_sticky', false)
                ->whereNull('best_answer_post_id')
                ->whereNull('hidden_at')
                ->where('last_posted_at', '<', Carbon::now()->subDays(self::DAYS))
                // answered by someone else (the asker's own follow-ups don't count)
                ->whereExists(function ($q) {
                    $q->selectRaw('1')->from('posts')
                        ->whereColumn('posts.discussion_id', 'discussions.id')
                        ->whereColumn('posts.user_id', '!=', 'discussions.user_id')
                        ->where('posts.type', 'comment')
                        ->whereNull('posts.hidden_at');
                });
            $count = $this->input->getOption('dry-run') ? $stale->count() : $stale->update(['is_locked' => true]);
            $this->info(($this->input->getOption('dry-run') ? 'would close ' : 'closed ').$count.' help topics');
        }
    }
}

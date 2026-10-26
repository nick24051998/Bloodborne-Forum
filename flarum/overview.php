<?php
/*
 * Übersicht im Forum (Nick, 26.10.2026; geladen von flarum/extend.php, die Oberfläche steht in flarum/forum.js).
 *
 * - Stimmen: ein 👍 (Gefällt mir) auf dem Eröffnungsbeitrag. Die API liefert an Themen in Suggestions, Known Fixes und
 *   Bug Reports bbVotes, bbVoted und bbFirstPostId. Sortierung "-bbVotes": die Zahl kommt dann als Spalte bb_votes aus
 *   der Abfrage selbst (keine eigene Spalte in der Datenbank, also immer aktuell, auch für die vom Discord übernommenen
 *   Daumen). Nur bei dieser Sortierung, denn auf "Alle Themen" hängt Flarum für angepinnte Themen eine zweite Abfrage
 *   an (UNION), die dieselben Spalten haben muss.
 * - Filter "bbview" für die Reiter über den Listen: open, solved, closed (Help & Support), active (ohne Done, Not
 *   planned, Duplicate, Fixed: Suggestions „Top“ und „New“, Nick: Erledigtes taucht dort nicht mehr auf) oder ein
 *   Status-Tag (status-planned, status-open …), zusätzlich zum Bereich. Als Filter statt als Suche, damit oben im
 *   Suchfeld nichts wie "-is:solved" steht.
 * - Befehl bbforum:close-stale (stündlich): Hilfe-Themen ohne beste Antwort, die 7 Tage keinen neuen Beitrag hatten,
 *   werden gesperrt (geschlossen). Angepinnte Themen nie. Ohne Ereignisse, also ohne Benachrichtigung und ohne dass
 *   das Thema in "Latest" nach oben springt; mit --dry-run nur zählen.
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

        /** Filter- und Such-Mutator: bei Sortierung nach Stimmen die Zahl als Spalte bb_votes, Gleichstand: neuere zuerst */
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
                ->where('last_posted_at', '<', Carbon::now()->subDays(self::DAYS));
            $count = $this->input->getOption('dry-run') ? $stale->count() : $stale->update(['is_locked' => true]);
            $this->info(($this->input->getOption('dry-run') ? 'would close ' : 'closed ').$count.' help topics');
        }
    }
}

<?php
/*
 * Logo-Contest im Forum (geladen von flarum/extend.php; die Seite /logo-contest baut flarum/forum.js).
 *
 * Jeder Beitrag ist ein Thema im Bereich „Logo Contest“ (Tag logo-contest), das erste Bild im Eröffnungsbeitrag ist
 * das Werk. Abgestimmt wird mit „Gefällt mir“ auf dem Eröffnungsbeitrag, mit diesen Regeln:
 * - abstimmen nur angemeldet und nur in der Abstimmungsphase (nach dem Einsendeschluss bis zum Ende)
 * - eine Stimme pro Mitglied: Wer ein anderes Werk wählt, dessen alte Stimme fällt weg
 * - nicht für das eigene Werk
 * - neue Beiträge im Bereich nur bis zum Einsendeschluss (das Team immer)
 * Die Daten setzt scripts/lib/setup-inside.sh (CONTEST_SUBMIT_UNTIL, CONTEST_VOTE_UNTIL in .env).
 * Für die Seite liefert die API an Themen des Bereichs bbVotes, bbVoted, bbCanVote und bbFirstPostId.
 */

use Flarum\Discussion\Discussion;
use Flarum\Post\Post;
use Flarum\Settings\SettingsRepositoryInterface;
use Flarum\Tags\Tag;
use Flarum\User\Access\AbstractPolicy;
use Flarum\User\User;

if (! class_exists('BBForumContest')) {
    class BBForumContest
    {
        const TAG = 'logo-contest';

        /** [Einsendeschluss, Ende der Abstimmung] als Unix-Zeit; 0, wenn nicht gesetzt */
        public static function dates(): array
        {
            $settings = resolve(SettingsRepositoryInterface::class);
            return [
                (int) strtotime((string) $settings->get('bbforum.contest_submit_until', '')),
                (int) strtotime((string) $settings->get('bbforum.contest_vote_until', '')),
            ];
        }

        public static function voting(): bool
        {
            [$submit, $vote] = self::dates();
            return $submit && $vote && time() > $submit && time() <= $vote;
        }

        public static function inContest(?Discussion $discussion): bool
        {
            return $discussion && $discussion->tags->contains('slug', self::TAG);
        }

        public static function isEntry(Post $post): bool
        {
            return (int) $post->number === 1 && self::inContest($post->discussion);
        }

        public static function isTeam(User $actor): bool
        {
            return $actor->isAdmin() || $actor->groups->contains('id', 4);
        }

        /** Nach einer neuen Stimme: die Stimme desselben Mitglieds für andere Werke entfernen */
        public static function keepOneVote(Post $post, User $user): void
        {
            if (! self::isEntry($post)) {
                return;
            }
            $others = Discussion::whereHas('tags', fn ($q) => $q->where('slug', self::TAG))
                ->where('id', '!=', $post->discussion_id)
                ->pluck('first_post_id');
            $post->getConnection()->table('post_likes')
                ->where('user_id', $user->id)
                ->whereIn('post_id', $others)
                ->delete();
        }

        /** Zusätzliche Angaben für die Contest-Seite an Themen des Bereichs */
        public static function attributes(User $actor, Discussion $discussion): array
        {
            if (! $discussion->relationLoaded('tags') || ! self::inContest($discussion) || ! $discussion->first_post_id) {
                return [];
            }
            $likes = $discussion->getConnection()->table('post_likes')->where('post_id', $discussion->first_post_id);
            $first = Post::find($discussion->first_post_id);
            return [
                'bbFirstPostId' => (string) $discussion->first_post_id,
                'bbVotes' => (clone $likes)->count(),
                'bbVoted' => ! $actor->isGuest() && (clone $likes)->where('user_id', $actor->id)->exists(),
                'bbCanVote' => $first ? $actor->can('like', $first) : false,
            ];
        }
    }

    // „Gefällt mir“ auf einem Werk = Stimme: nur in der Abstimmungsphase, nicht für das eigene
    class BBForumContestLikePolicy extends AbstractPolicy
    {
        public function like(User $actor, Post $post)
        {
            if (! BBForumContest::isEntry($post)) {
                return null;
            }
            if ((int) $post->user_id === (int) $actor->id || ! BBForumContest::voting()) {
                return $this->deny();
            }
            return null;
        }
    }

    // Neue Werke nur bis zum Einsendeschluss (das Team kann immer, etwa um ein Werk zu verschieben)
    class BBForumContestTagPolicy extends AbstractPolicy
    {
        public function startDiscussion(User $actor, Tag $tag)
        {
            if ($tag->slug !== BBForumContest::TAG || BBForumContest::isTeam($actor)) {
                return null;
            }
            [$submit] = BBForumContest::dates();
            return $submit && time() > $submit ? $this->deny() : null;
        }

        public function addToDiscussion(User $actor, Tag $tag)
        {
            return $this->startDiscussion($actor, $tag);
        }
    }
}

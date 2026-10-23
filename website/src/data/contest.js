// Logo-Contest: große Ankündigung auf der Startseite, führt auf die Seite im Forum (forum.bbport.de/logo-contest).
// Die Daten gelten auch im Forum (CONTEST_SUBMIT_UNTIL / CONTEST_VOTE_UNTIL in .env, Standard wie hier): beide mitziehen.
import { SITE } from '../../site.config.mjs';

export const CONTEST = {
  page: SITE.forumUrl ? `${SITE.forumUrl}/logo-contest` : '',
  template: 'logo-contest-template.svg',
  submitUntil: new Date('2026-11-08T23:59:59Z'),
  voteUntil: new Date('2026-11-15T23:59:59Z'),
};

const day = (date) => date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });
export const contestDates = {
  submit: day(CONTEST.submitUntil),
  voteFrom: day(new Date(CONTEST.submitUntil.getTime() + 1000)),
  vote: day(CONTEST.voteUntil),
};

// Gezeigt bis drei Tage nach dem Ende der Abstimmung (Stand beim Bauen der Seite)
export const contestRunning = Boolean(CONTEST.page) && Date.now() < CONTEST.voteUntil.getTime() + 3 * 86400000;

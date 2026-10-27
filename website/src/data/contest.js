// Logo contest: big announcement on the home page, links to the page in the forum (forum.bbport.de/logo-contest).
// The dates also apply in the forum (CONTEST_SUBMIT_UNTIL / CONTEST_VOTE_UNTIL in .env, default as here): update both.
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

// Shown until three days after voting ends (as of the time the site is built)
export const contestRunning = Boolean(CONTEST.page) && Date.now() < CONTEST.voteUntil.getTime() + 3 * 86400000;

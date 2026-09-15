# NewRamCentral - Manual Test Plan

Run through this checklist before every Sprint 2 demo and before final submission. Log any
failures as GitHub Issues using the bug report template.

## Authentication

- [ ] Sign up with a new email/RAM ID/password succeeds and lands on the Clubs home page.
- [ ] Signing up with an email already in use shows a clear error, not a crash.
- [ ] Logging out returns to the Login page and blocks access to `/`, `/clubs/:id`, `/events`,
      `/profile`, `/create-club` until logging back in.
- [ ] Refreshing the page while logged in keeps the session (does not bounce to Login).

## Clubs

- [ ] Newly created club appears immediately under "My clubs" for its creator.
- [ ] Search filters the club list live by name and category.
- [ ] Joining a club with `requiresApproval: false` immediately increments member count.
- [ ] Joining a club with `requiresApproval: true` creates a pending request, not an approved one.
- [ ] An officer can see and approve pending requests; approving increments member count.
- [ ] Leaving a club decrements member count (only if the membership was approved).

## Officer tools

- [ ] Only officers/president see "Edit club info," "Post announcement," "Create event," and
      "Promote to officer" controls - plain members do not.
- [ ] Promoting a member to officer is reflected immediately in their badge and unlocks officer
      controls for them on next load.
- [ ] Posting an announcement appears at the top of the list in real time (no refresh needed).

## Events

- [ ] Creating an event with a past date is still accepted (documented limitation) but appears
      correctly sorted.
- [ ] The Events page only shows events from clubs the signed-in user has joined.
- [ ] RSVP button is only visible to approved members of that event's club.

## Security rules (verify in the Firebase console, not just the UI)

- [ ] A non-officer cannot write to a club's `announcements` subcollection directly (test via
      Firestore rules simulator, not just by hiding the button in the UI).
- [ ] A signed-out request to any collection is rejected.

## Cross-browser / responsive

- [ ] Test in Chrome and at least one other browser.
- [ ] Test at a narrow (mobile-width) viewport - nav and forms should remain usable.

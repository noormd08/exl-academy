/*
 * This app has no sign-in flow of its own yet, so there is no session/cookie to check.
 * isUserSignedIn always reports signed-out and onSignOut is a no-op until this app
 * implements real authentication. Wire these up to whatever session mechanism this
 * app ends up using, then the header block's callback wiring does not need to change.
 */
export function isUserSignedIn() {
  return false;
}

export function onSignOut() {
  // no-op: no local session to clear yet
}

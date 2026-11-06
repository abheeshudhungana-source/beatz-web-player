# Beatz chatbot investigation

## Evidence boundary and verdict

The original read-only investigation examined baseline **`440e120`**, before the later user-authorized Codex migration. References below are `revision:path:line` references to that historical source, not line numbers in the rewritten route. Read them with, for example, `git show 440e120:app/api/chat/route.ts`. This preserves evidence that is no longer present in the current implementation.

**There is no actual credential-expiration evidence.** No live Gemini/Spotify response or local runtime log established an expired credential, invalid key, 401, or 403. Those statuses were simulated in isolated experiments. Even an actual 401/403 would require a sanitized provider reason to distinguish expiration, revocation, restrictions, permissions, or other authorization failures. Do not rotate credentials solely on this report.

The original investigation made no edits, dependency installations, migrations, real provider requests, or secret-value reads. Only `.env.example` was present in the checkout; relevant process-variable names were absent in that inspection shell. That does not establish the deployed configuration. Subsequent implementation/build checks are separate work, described in [PR_1_SCOPE.md](PR_1_SCOPE.md).

## Architecture trace at the baseline

1. `440e120:app/layout.tsx:18` mounts `AppShell` globally.
2. `440e120:components/AppShell.tsx:13` initializes Spotify authentication, playback, and queue polling; line 36 mounts `BeatzChatDrawer`.
3. `440e120:components/BeatzChatDrawer.tsx:82` handles prompts. Lines 98–106 POST message, current track, previous artist, and previous query to `/api/chat`, with same-origin session cookies. No conversation transcript is sent.
4. `440e120:app/api/chat/route.ts:205` parses and validates input; lines 234–236 obtain/refresh the Spotify token before provider selection.
5. Lines 9–10 read `GEMINI_API_KEY` and hardcode `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`. This is a direct REST client, not a selectable provider SDK. Lines 238–241 choose the heuristic when the key is absent or one exact placeholder.
6. Lines 244–278 build one user-role prompt, include tool declarations, and request a complete JSON response. There is no streaming. The credential is sent in both the query string and `x-goog-api-key` header.
7. Lines 294–339 interpret the first recognized tool call and run Spotify search. The handler returns tracks and `queue`/`play`; it does not execute playback itself.
8. `440e120:components/BeatzChatDrawer.tsx:127` dispatches returned actions to the store. `440e120:store/beatz-store.ts:239` deduplicates/updates local queue state; lines 265–268 asynchronously synchronize only if the SDK is active. Playback uses `/api/spotify/player` or preview audio (`:411–469`).

## Prioritized findings and symptoms

| Priority / domain | Verified code finding | User-visible consequence |
| --- | --- | --- |
| P1 — LLM failure masking | `440e120:app/api/chat/route.ts:280–284`: all non-OK Gemini statuses become heuristic HTTP 200 responses. Lines 351–360 turn exceptions into HTTP 200 with two mock tracks and a queue action. | The bot appears to work despite a provider failure, or queues unrelated songs after a failed conversational request. The initiating provider failure is unknown. |
| P1 — Spotify/tool fallback | `440e120:lib/spotify.ts:289–309`: absent access token and unsuccessful searches return the mock catalog; these branches ignore the requested count. `app/api/chat/route.ts:304–310,325–331` consumes those results as real recommendations. | The same five songs across requests; wrong result counts; unrelated playback despite a healthy LLM. |
| P1 — UI/action acknowledgment | `440e120:components/BeatzChatDrawer.tsx:127–140` announces actions immediately. `store/beatz-store.ts:239–250,265–268` can deduplicate all additions or encounter async Spotify failures that only reach the console. | “Added N” can mean zero added, local-only changes, or partial/failed Spotify synchronization. |
| P1 — conversational context | `440e120:app/api/chat/route.ts:210–211,244–265`: previous artist/query are read but omitted from the Gemini prompt; only the heuristic uses them. | Follow-ups such as “more” lose context even with valid authentication. |
| P2 — UI error handling | `440e120:components/BeatzChatDrawer.tsx:109–123`: JSON is parsed without checking `response.ok`; `data.error` is ignored. | HTTP 400 can appear as “Here are your music recommendations!” and update conversational context. |
| P2 — blocked/empty LLM output | `440e120:app/api/chat/route.ts:287–345`: no candidate text produces a completion claim with no action. | “I've updated your Beatz listening experience!” despite nothing happening. |
| P2 — timeouts/cancellation | `440e120:components/BeatzChatDrawer.tsx:98–107` and `app/api/chat/route.ts:274–278` have no explicit fetch deadline/abort signal. Spotify refresh precedes generation. | Disabled input and persistent spinner until a network/platform timeout. Closing the drawer does not cancel work. |
| P2 — heuristic semantics | `440e120:app/api/chat/route.ts:105–117,178–200`: generic factual-sounding lore and predominantly queue actions, including play requests. | Unsubstantiated trivia; immediate-play intent becomes queueing. |

The hardcoded model may be unsupported/unavailable; this is a **hypothesis**, not a verified provider response. No external availability check was performed. Missing/restricted/revoked credentials, quota exhaustion, billing, and transient outages are also hypotheses that the fallback makes indistinguishable.

Input validation bounds only the message; context and tool arguments lack runtime schemas. A non-string tool query can throw at `.slice()` (`440e120:app/api/chat/route.ts:207–225,299–302`). Instructions are embedded in user-role text; removing angle brackets is not a reliable instruction-security boundary (`:228–265`).

## Environment and session prerequisites

- `GEMINI_API_KEY`: server module initialization, absence/exact-placeholder handling only (`440e120:app/api/chat/route.ts:9,239`). No startup/type/credential validation or expiry detection.
- `NEXT_PUBLIC_SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`: presence required for token exchange/refresh (`440e120:lib/spotify-auth.ts:3–15`).
- `NEXT_PUBLIC_REDIRECT_URI`: configured value or origin-based login callback (`440e120:lib/spotify-auth.ts:52–59`). Registered provider redirect must match.
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`: template entries, unused by the implemented application/session flow.
- Cookies: access token, refresh token, and expiry timestamp (`440e120:lib/spotify-auth.ts:146–151`). The helper refreshes within one minute of expiry, but can return an expired token when no refresh token exists (`:153–184`).
- Both refresh implementations discard a rotated refresh token (`440e120:lib/spotify-auth.ts:154–177`; `app/api/auth/token/route.ts:27–53`). Rotation is a possible future break, not a confirmed provider event.
- `/api/auth/token` requires the refresh cookie and can report authentication after unsuccessful profile verification (`440e120:app/api/auth/token/route.ts:13–19,74–102`). The callback sets the refresh cookie lifetime to 30 days (`app/api/auth/callback/spotify/route.ts:37–43`). Cookie expiration is distinct from Gemini-key expiration.
- The SDK requires an authenticated compatible account/device; the repository's README explicitly notes Premium for full browser streaming (`440e120:README.md:71–72`). Chat text and playback have different prerequisites.

## Rate limits, deployment, tests, and history

There is no app-level chat authentication gate, server-side rate limiter, or per-user spending quota in the baseline. Browser `isLoading` does not constrain direct callers. Gemini 429 receives the same fallback as all other failed statuses. Actual quota/billing state was unavailable.

Spotify retries up to three total attempts, uses numeric `Retry-After` plus jitter on 429, and retries network exceptions, with no total deadline or cap on upstream wait (`440e120:lib/spotify.ts:180–230`). Authenticated queue polling runs every five seconds (`hooks/useSpotifyQueue.ts:38–43`).

No local runtime logs, installed dependencies, test suite/test script, deployment manifests, CI configuration, or compiled build were found during the original audit. `package.json:5–10` defined dev/build/start/lint only. No framework build/test was performed in that read-only phase.

The deployment checklist names `SPOTIFY_CLIENT_ID` (`440e120:SBC_first_draft.md:135`), but code requires `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` (`lib/spotify-auth.ts:3`). Following the checklist literally can break login. The actual hosting dashboard and production environment were not inspected.

History inspected with `git log` and targeted `git diff`:

- `105b610` added credential-prefix-based Bearer handling.
- `bae4d84` removed that handling, sending the variable as an API key in URL/header instead. Commit claims do not prove either credential format or successful authentication.
- `1577989` introduced proactive Spotify token refresh in chat/search, describing mock-catalog fallback as the symptom.

These are confirmed source changes, not runtime evidence of expired credentials.

## Small reproduction matrix and experiment limitations

The table records isolated source behavior reported during the investigation. Framework/auth/fetch boundaries were stubbed; all credentials/statuses were synthetic. These are **not application, browser, provider, or deployed runtime verification**. The source references above are the primary evidence.

| Synthetic condition | Source behavior / reported isolated result |
| --- | --- |
| Gemini 401, 403, 404, or 429 | HTTP 200; heuristic queue result; five mock tracks without Spotify session. |
| No Gemini key/session; ask for one song | Queue action with five mock tracks. |
| Gemini fetch rejects on a greeting | HTTP 200; two mock tracks with queue action. |
| Blocked/empty Gemini candidate | Success-sounding completion text, no action. |
| Healthy Gemini follow-up | Prior artist/query absent from outbound model prompt. |
| Play tool followed by Spotify 401 | HTTP 200; play action containing mock catalog. |
| 301-character message / JSON `null` | HTTP 400, as intended. |
| UI receives JSON HTTP 400 | Error ignored, default recommendation text displayed. |
| Store deduplicates all returned tracks | UI still announces the returned count as added. |
| Refresh response rotates token | New refresh token discarded. |

Commands/results: read-only `rg`, numbered source reads, `git log`, `git diff`, and `git status --short` inspected the checkout. Custom `node --no-warnings - <<'JS'` VM experiments were attempted. The first failed with `AssertionError: 400 !== 200` due to the harness's incorrect expected status for a null body. A revised route harness and a separate UI/token harness subsequently exited 0, but their mocking/transformation limits remain; the user asked to stop these experiments. They were not rerun for this report and are not treated as reliable end-to-end regression tests. No real provider request or secret access was used.

## Recommended fixes and regression tests (original diagnosis; recommendations only)

1. Preserve error domains and explicit degraded/demo state. Test provider 401/403/404/429/5xx, fetch rejection, invalid JSON, blocked/empty output, and malformed tools. Never queue as error recovery.
2. Separate production catalog errors from demo data and enforce result counts on all paths. Test missing/expired sessions, zero matches, requested count, and Spotify failure with a healthy LLM.
3. Acknowledge actual queue/play outcomes. Test duplicates, inactive SDK, partial batch failures, and unsuccessful playback; report added/skipped/failed counts.
4. Send bounded recent conversation or structured context to the selected provider. Test follow-ups/corrections using a healthy mocked provider.
5. Apply end-to-end deadlines, cancellation, bounded waits, body/context schemas, and finite tool-argument validation. Test hangs, abort, oversized context, bad `Retry-After`, and invalid model counts/queries.
6. Correct environment-name documentation, persist rotated refresh tokens, serialize concurrent refreshes, and treat failed session verification honestly. Test rotation, concurrent expiry, missing cookies, and redirect mismatch.
7. Add server-side abuse/quota controls and sanitized error/status metrics. Keep credentials out of URLs and avoid raw provider bodies in logs. Test errors never include credential values.

Later implementation addresses a subset under the separate local-Codex scope. This report does not claim that the original investigation authorized those changes, nor that all recommendations are implemented.

## Other major product risks

- Wrong audio under real metadata: missing previews resolve to unrelated SoundHelix audio (`440e120:lib/spotify.ts:12–36`). Users may blame music selection for this playback substitution.
- Additional false playback success: player route propagates 401/403 but returns HTTP 200 for other unsuccessful playback results; store checks only HTTP status (`440e120:app/api/spotify/player/route.ts:51–64`; `store/beatz-store.ts:449–458`).
- OAuth/session hardening: no explicit `state` round trip in login/callback, broad playlist-write scopes, and raw upstream errors can reach server logs (`440e120:app/api/auth/login/route.ts:40–47`; `lib/spotify-auth.ts:17–29,96–98,131–133`). No exploit was demonstrated.
- Product promise mismatch: README advertises free on-demand listening but documents Premium requirements for full SDK playback (`440e120:README.md:7,71–72`).

## Missing decisive evidence

A timestamped failing prompt and exact symptom; deployed commit/runtime; redacted configuration-name/presence checks; credential type and sanctioned provider endpoint/model; sanitized Gemini and Spotify status/reason codes; billing/quota state; session-refresh outcomes; account/device/SDK errors; and an end-to-end local reproduction. Provider availability and credential expiration cannot be established from this checkout alone.

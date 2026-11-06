# PR #1: local Codex chatbot migration and preserved diagnosis

## Scope and authorization

This PR must be reviewed as an implementation plus an investigation report. Its original title, “Read-only Beatz chatbot and API diagnosis,” describes only the first request and is no longer an accurate description of the final scope.

The user initially requested a read-only investigation, no file changes, and recommendations only. That investigation was delivered in conversation against revision `440e120`; it did not authorize implementation. The durable version is [CHATBOT_DIAGNOSIS.md](CHATBOT_DIAGNOSIS.md), with baseline revision references so subsequent edits do not invalidate its evidence.

The user subsequently instructed: **“replace the secret api to codex . next time i will run beatz locally.”** This later instruction authorized replacing Gemini with local Codex CLI integration and local setup instructions. It supersedes the earlier no-edit constraint for that new work. The user then requested fixing PR #1's failing Vercel check, authorizing the production-build correction. Neither instruction proves that a live chat or hosted chatbot works.

The agent implemented the local CLI interpretation and disclosed that it requires a locally signed-in Codex executable and does not work as a hosted Vercel chatbot. The user specified local use, but did not separately approve every deployment consequence. The hosted chatbot regression must remain visible as a scope tradeoff, rather than be described as a provider outage fix or resolved hosted feature.

## Acceptance criteria for the implementation

- Preserve the original diagnostic deliverables with historical file/line evidence, a credential-expiration verdict, reproduction limitations, recommended fixes/tests, and missing evidence.
- Use local Codex CLI authentication; Beatz does not require a Gemini or OpenAI API key for chat.
- Keep Spotify catalog lookup and playback in Beatz, with explicit Spotify-session requirements for music actions.
- Validate structured Codex output before allowing a music action; do not queue mock tracks on Codex or Spotify search failure.
- Distinguish missing executable, authentication diagnostics, timeout, cancellation, invalid output, usage limits, and unknown execution failures with sanitized codes/messages. Unknown failures must not be presented as proof of authentication failure.
- Keep the local execution boundary: loopback binding instructions, local-host and browser-origin checks, read-only CLI sandbox, disabled shell/browser/app tools, bounded output, and a 60-second CLI timeout.
- Production compilation/type checking and offline adapter tests must pass without real Codex/Spotify requests.
- Document local prerequisites and the absence of live end-to-end verification.

## Hosting boundary and open product decision

**Vercel build compatibility is supported; hosted Codex chat is not.** On a non-local host, `/api/chat` returns 403 before spawning a process. Other application routes remain in the build. A green Vercel build is not evidence that chat runs there.

Removing the host guard would not make the user's local Codex executable or login available inside a Vercel function, and could expose local process execution if the server were reachable publicly. This PR therefore retains the guard. It does not copy local credentials to hosting, silently restore Gemini, or add an unrequested API-key provider.

If a functioning hosted chatbot is a release requirement, that review finding remains open: retain/reintroduce a supported hosted provider under a separately agreed configuration, or split the local migration into a separate PR and keep the original investigation PR documentation-only. The current work does not claim to resolve that product decision. No reviewer approval or PR acceptance is implied by these criteria.

## Verification of this review revision

- `NEXT_TELEMETRY_DISABLED=1 npm run build`: passed compilation, type checks, static page generation, and build tracing.
- `npm run test:chat`: eight tests passed, using synthetic diagnostics and a stub runner. No live Codex or Spotify requests were made.
- `git diff --check`: passed.
- Authentication/rate-limit classification uses recognized CLI diagnostic patterns; unrecognized diagnostics remain a generic execution failure. Tests verify raw diagnostics do not appear in the response.
- Live local chat, Spotify actions, hosted chatbot operation, and the next remote Vercel check have not been verified by these checks.

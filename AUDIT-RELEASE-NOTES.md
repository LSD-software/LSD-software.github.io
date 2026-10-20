# LSD Software — Frontend hardening release

## Included
- Removed the Google Analytics loader from the HTML pages, matching the current no-analytics statement.
- Fixed the cookie banner so either saved choice (`1` or `0`) dismisses it on later visits.
- Updated privacy/cookie text to stop claiming that email addresses are hashed or that hosting logs are automatically deleted after a fixed period. Account-deletion requests are described as manual until an automated feature exists.
- Reworked the service worker to cache only same-origin GET static resources and navigations, avoid caching API/account data and cross-origin resources, skip audio/video, and cap runtime cache entries.
- Changed notification navigation to same-origin URLs only.
- Increased the chat message polling interval and skipped polling when the document is hidden.

## Validation
- All frontend JavaScript files passed `node --check`.
- Analytics script references were removed from the source tree.
- A real device/PWA/Lighthouse run is still required after deployment.

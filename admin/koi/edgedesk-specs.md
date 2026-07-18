Key Security Improvements:
Feature	Benefit
12+ character minimum	Aligned with OWASP & NIST guidelines (up from 8)
Uppercase + lowercase	Prevents simple dictionary attacks
Number requirement	Adds complexity
Special character requirement	Greatly increases brute-force resistance
Common password blacklist	Blocks predictable passwords like "password123"
Strength meter	Visual feedback encourages stronger passwords
Show/hide toggle	UX improvement for password entry
Real-time validation	Users see requirements as they type
Match validation	Prevents typos in confirmation field
Disabled submit	Prevents submission until all requirements met
The password now meets NIST SP 800-63B and OWASP recommendations for modern authentication security.




Capacity

Per language/year: 999,999 tickets
All languages/year: 26 × 999,999 = ~26M tickets
Industry safe: Handles enterprise-scale volume

Minimal DB reads
-=-=-=-=-=-=-=

what is the cache control? I think we want cache eternal and we have some function that cache is onlu renewed when there are no agents logged in and it will be flushed and renewed on first agent login?
Yes, that's exactly how it works. The cache control max-age=86400 (24 hours) or 315360000 (10 years) is just a hint to Cloudflare's edge cache telling it how long to keep the response fresh. But your actual logic bypasses this completely:

Agents online = 0 → On first agent login, cache is populated fresh:

javascript
if (online === 0) {
  const allTickets = await getTickets({ limit: 50, statuses: ACTIVE_STATUSES }, env, { role: "admin" });
  await setTicketCache(allTickets);
}
Ticket updates → Cache is updated in real-time via injectTicketIntoCache()

Manual purge → POST /api/admin/cache/purge clears everything and resets agent count to 0

So the max-age=86400 is basically irrelevant — your application logic controls when the cache refreshes, not the HTTP header. You could set it to anything (even max-age=31536000 for a year) and it wouldn't matter because your code invalidates and repopulates the cache programmatically.

The only reason it's there is as a safety net in case the cache somehow doesn't get updated, it would at least expire after 24 hours and get refreshed on next request.
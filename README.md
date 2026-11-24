# Pyramid Admin

Prepared November 24, 2026. Activation requires the reviewed reporting migration,
exact OAuth redirect, first cache import, hourly job and static publication.
Intended URL: https://shantheman.github.io/pyramid-admin/.

Five owner-only tabs: Top Metrics, Funnel, Ad Spend, P&L, Reviews. Public static code
contains only the existing TCG reporting project's public publishable key.
The owner-only `pyramid_admin_reporting()` RPC returns Pyramid's isolated cache;
no game server, Pyramid user database, mobile change or new paid project exists.
A separate PKCE storage key and local-only sign-out preserve other admin/game
sessions. Sign-out and failed requests clear private content; late responses
cannot restore it. Every tab has a mobile-visible title.

Top Metrics keeps store downloads separate from anonymous PostHog reporting
devices. Daily activity is the first device-local-day event, not every session.
Test builds remain included and labelled. No accounts, battles, verified payer
rate or financial revenue is inferred from client telemetry. Financial figures
use vendor report dates rather than pretending all sources share Eastern days.

P&L uses one Patron IAP (`patron_of_the_gods`) plus AdMob earnings, less Pyramid
advertising. No game-server or AI expense rules are added. Actual store
proceeds are not charged fees twice; AdMob gets no IAP commission. Gross and
store deductions stay unavailable if the source provides only net or different
currencies. Play current-month provisional buyer charges are shown separately; P&L gross
and net use comparable Pacific-dated monthly earnings without mixing UTC sales. Apple daily proceeds and AdMob earnings are estimates,
not final cash settlements. Missing sources/dates propagate to income N/A.

Ads retains the existing numeric sorting/filter/totals helpers. No Pyramid
campaign exists yet. A future campaign needs exact app/campaign registration
and its separate delivery feed before launch; no account-wide ad totals enter
Pyramid or cross into TCG/Genesis. Creative-level revenue/payers/Cap % have no
first-party join in this serverless app and stay unavailable. See the shared
[reporting runbook](../../chimera/docs/runbooks/pyramid-reporting.md).

Funnel follows the Genesis layout: a row per step with devices, share of those
that opened the game, share of the previous step and a bar. Devices are grouped
by the Eastern date of their first PostHog report (the Period controls choose
which arrival dates), and each step counts those that have reached it by now.
The hourly collector stores aggregate counts per arrival day and platform; no
device ID is cached. Test builds and reinstalls are included as devices.

Reviews are read-only, safely rendered as text, filtered by store/rating and
retained across the Play API's short lookback. No AI translation, replies or
store mutations occur. Check for updates reads the saved cache; it does not
make vendor calls. The independent hourly importer performs those reads.

Verification: `node --test tests/admin/reporting.test.mjs`; the shared reporting
collector tests and owner/RLS database tests live in the Chimera reporting repo.
Publication uses only the committed `admin/` directory; never the game's dirty
release tree or native build output.

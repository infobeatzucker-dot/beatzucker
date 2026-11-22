# Beatzucker deployment and recovery checks

Run the ordinary checks in the repository CI before preparing a release. The isolated DSP test renders synthetic audio with the candidate image. The deployment then waits for active jobs, changes the container, checks application readiness and validates public pages and private API boundaries. The live container begins rejecting new mastering requests during the drain once it is running a build that supports the shared maintenance marker.

## Reverse proxy

Keep application security headers in Next.js and use Nginx to add an equivalent header only when Nginx generates the response itself. Check the document, redirects and Nginx error responses before removing duplicate directives. Keep HSTS on HTTPS responses. Move query-free logging into the site configuration so private identifiers and file metadata do not enter access logs unnecessarily.

Define this format in the Nginx `http` context and select it only in the Beatzucker server block. Test with `nginx -t` before a reload.

```nginx
log_format beatzucker_minimal '$remote_addr [$time_local] '
    '"$request_method $uri $server_protocol" $status $body_bytes_sent '
    '$request_time "$http_user_agent"';

# In the Beatzucker server block
access_log /var/log/nginx/beatzucker.access.log beatzucker_minimal;
```

Keep the server-log rotation aligned with the published seven-day regular retention. Container stdout and stderr use Docker size-based rotation at deployment. Check both output streams for accidental file names or private request data after changes.

Set `BEATZUCKER_CSP_REPORT_ONLY=1` at build time on a test deployment to see strict script-policy violations in the browser console. Review Next.js bootstrap scripts, layout scripts, theme initialization and AudioWorklet behavior before enforcing a stricter script policy.

## Database and audio recovery

The application creates a verified SQLite snapshot before schema changes. Operational recovery also needs a separately stored copy of the database and curated showcase files. Use an encrypted access-controlled destination, record backup age and scope, and set retention with the site operator. Temporary uploads and 24-hour master exports are not required to restore site content.

Restore into a fresh isolated directory with the matching image. Verify SQLite `quick_check`, account counts, one known preset, one curated example and one community moderation record. Test sign-in, render and download with synthetic data. Compare restored publication status to withdrawals and moderation decisions made after the snapshot before serving a recovered copy publicly.

## Capacity and monitoring

Track free disk space, SQLite snapshot age and application health. Record queue time, render time and failure rate separately for classic mastering, Lab export, Release Check and the Stem worker. Capture peak memory and CPU while checking a long stereo master, two consecutive renders and overlapping use of a public tool. Run the scenario against an isolated instance of the same server class.

Start a capacity comparison with one worker slot and the existing deployment memory budgets. Increase concurrency only after the same fixture set meets response-time and memory targets twice. The public health endpoint covers the app database and main DSP worker. Verify outgoing mail and the Stem worker through dedicated test fixtures and a separate operational check.

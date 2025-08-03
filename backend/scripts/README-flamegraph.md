# Weekly Clinic 0x Flamegraph Snapshot

This script runs Clinic 0x for 60 seconds against the production backend, saving the flamegraph to `flamegraphs/YYYY-MM-DD_0x.html`.

## Usage

```bash
./scripts/weekly-flamegraph-snapshot.sh
```

## Scheduling (cron)
To run every Sunday at 2:00 AM, add this to your crontab:

```
0 2 * * 0 cd /Users/salarjirjees/Desktop/myrecipe/attendance-dashboard/backend && ./scripts/weekly-flamegraph-snapshot.sh
```

- Make sure the script is executable: `chmod +x ./scripts/weekly-flamegraph-snapshot.sh`
- Ensure the backend is not running in another process (or adapt the script to use a different port if needed).

## Regression Monitoring
- Compare weekly flamegraphs in the `flamegraphs/` directory.
- Watch for increases in stack depth, new hot paths, or regressions in function time.
- For automated regression detection, consider using a diff tool or visual inspection.

## Notes
- Clinic 0x requires Node.js >=10.16 and Linux/macOS.
- For continuous profiling, consider Datadog APM or Pyroscope for production-grade environments.

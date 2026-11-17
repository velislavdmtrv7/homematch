# Runbook

## How a change reaches production

1. Pull request to `main`: the CI workflow runs lint, builds both images and scans them with Trivy.
2. Merge: the Deploy workflow builds both images again, scans them, and pushes them to GHCR tagged with the commit SHA.
3. On the server, `homematch-deploy.timer` runs `/usr/local/sbin/homematch-deploy` every 2 minutes. It takes the newest successful Deploy run on `main`, fetches the compose files for that SHA, sets `IMAGE_TAG`, pulls `api` and `web`, restarts them and checks `https://homematch-demo.duckdns.org/api/health`.
4. If the health check fails, the script restores the previous version and writes the SHA to `/opt/homematch/.failed-sha`, so it is not retried. The fix is a new commit.

## What is running

```bash
sudo grep IMAGE_TAG /opt/homematch/.env
systemctl list-timers homematch-deploy.timer
sudo journalctl -u homematch-deploy -n 50 --no-pager
```

## Roll back

**Normal:** revert the bad commit (`git revert <sha>` on a branch, pull request, merge). The revert gets its own SHA and is deployed like any other change.

**Emergency** (the site is broken and cannot wait for CI): go back one version with the copies the last deploy kept.

```bash
sudo systemctl stop homematch-deploy.timer
cd /opt/homematch
for f in docker-compose.yml docker-compose.prod.yml nginx/prod.conf .env; do sudo cp -p "$f.prev" "$f"; done
sudo docker compose pull api web
sudo docker compose up -d
```

Then revert the bad commit on `main`. Start the timer again (`sudo systemctl start homematch-deploy.timer`) only after the revert's Deploy run is green, otherwise the server deploys the bad version again.
# Running the backend on your own server (Hostinger VPS)

The backend, the admin and the database run on one Ubuntu 24.04 VPS. Photos uploaded in `/admin/` are kept on the server's disk and survive updates. The shop website itself can stay on Render's free static hosting.

## First-time setup

1. In Hostinger: VPS → **Manage** → **Terminal** (browser terminal).
2. If you use your own domain for the backend (for example `api.yourdomain.com`), add a DNS **A record** `api` → the server's IP first, and wait a few minutes. The free `srvXXXX.hstgr.cloud` name needs nothing.
3. Paste:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/skenllp/Laceloft/main/Back-end/deploy/setup.sh -o setup.sh
   bash setup.sh
   ```

4. Answer the questions (backend address, your email, shop address, admin username and a password of 12+ characters).
5. It prints a summary. Expect **33 products** and admin status **200**.

If Hostinger's own firewall is switched on (VPS → Security → Firewall), allow ports **22, 80 and 443**.

## Point the shop at the new backend

On Render → the **Laceloft** static site → Environment, set `VITE_API_BASE` to `https://<backend address>/api`, then redeploy it. Until you do this the shop keeps using the old Render backend.

## Updating later

```bash
bash /srv/laceloft/app/Back-end/deploy/update.sh
```

Run it after new code is pushed to GitHub. It takes a backup first.

## Backups

Every night at 03:30 the database and the photos are saved to `/var/backups/laceloft` and kept for 14 days. These are on the same server, so also turn on Hostinger's own VPS backups/snapshots, or copy that folder somewhere else now and then.

## Useful commands

```bash
systemctl status laceloft          # is the backend running?
journalctl -u laceloft -n 50       # its recent log
systemctl restart laceloft         # restart it
nginx -t && systemctl reload nginx # check and reload the web server
```

Settings (secret key, database password, allowed addresses) are in `/etc/laceloft/env`. After editing it run `systemctl restart laceloft`. To make the admin's **Publish to website** button work, add `FRONTEND_DEPLOY_HOOK=<the Render deploy hook URL>` there.

## Moving to your own domain

1. Add a DNS **A record** `api` → the server's IP and wait a few minutes.
2. On the server, re-run setup with the new address (it keeps all data and also keeps the old address working):

   ```bash
   DOMAIN=api.yourdomain.com CORS_ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com,https://laceloft.onrender.com" bash setup.sh
   ```

3. On Render (shop static site) set `VITE_API_BASE=https://api.yourdomain.com/api` and `VITE_SITE_URL=https://yourdomain.com`, then redeploy.

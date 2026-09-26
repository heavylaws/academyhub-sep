# PeakForm Athletics — Production Deployment

The app has two parts:

1. **Backend — Convex Cloud.** Database, server functions, file storage and
   authentication (Convex Auth: email + password, emails verified by code).
2. **Frontend — static files** (`dist/`) served by nginx on your own server.

```
Browser ──HTTPS──► your server (nginx, static dist/)
   │
   └────WebSocket/HTTPS──► Convex Cloud (data, auth, emails via Resend, AI via OpenAI)
```

There is no Node server to run on your machine; nginx only serves files.

---

## 1. Accounts you need

| Service                               | Why                                                 | Cost                          |
| :------------------------------------ | :-------------------------------------------------- | :---------------------------- |
| [Convex](https://convex.dev)          | Backend + database + auth                           | Free tier is enough to start  |
| [Resend](https://resend.com)          | Sign-up codes, password resets, invite & fee emails | Free tier: 3,000 emails/month |
| [OpenAI](https://platform.openai.com) | Video biomechanics analysis (optional)              | Pay per use                   |
| A domain + server                     | Hosting the site                                    | —                             |

In Resend, **verify your domain** (add the DNS records it shows). Until you do,
Resend only delivers to your own address, so nobody else can sign up.

---

## 2. Backend (Convex) — one-time setup

From the project folder on your development machine:

```bash
# Log in and create the project (interactive: pick "create a new project").
npx convex dev --once

# Generate the signing keys Convex Auth needs and store them in the deployment.
# Run it for production too when asked, or later with: npx @convex-dev/auth --prod
npx @convex-dev/auth
```

Set the production environment variables (Convex dashboard → your project →
Production → Settings → Environment Variables, or with `npx convex env set --prod`):

| Variable                  | Example                                     | Required                                        |
| :------------------------ | :------------------------------------------ | :---------------------------------------------- |
| `SITE_URL`                | `https://academy.example.com`               | yes — used in email links                       |
| `PLATFORM_ADMIN_EMAILS`   | `you@example.com`                           | yes — who becomes super admin (comma-separated) |
| `RESEND_API_KEY`          | `re_...`                                    | yes                                             |
| `EMAIL_FROM`              | `PeakForm Athletics <no-reply@example.com>` | yes — must be on your verified Resend domain    |
| `JWT_PRIVATE_KEY`, `JWKS` | _(set by `npx @convex-dev/auth`)_           | yes                                             |
| `OPENAI_API_KEY`          | `sk-...`                                    | only for video analysis                         |
| `OPENAI_VISION_MODEL`     | `gpt-4o`                                    | optional; any OpenAI vision-capable model       |

Deploy the backend:

```bash
npx convex deploy
```

It prints the production URL, e.g. `https://happy-animal-123.convex.cloud`.
That is your `VITE_CONVEX_URL`.

Re-run `npx convex deploy` whenever files in `convex/` change.

---

## 3. Frontend — build

`VITE_LOCAL_DEV` must **not** be `true` for a real site (that is the offline demo
mode with no real login). The build refuses to run in live mode without an
`https://` Convex URL.

```bash
VITE_LOCAL_DEV=false VITE_CONVEX_URL=https://happy-animal-123.convex.cloud npm run build
tar -czf release.tar.gz -C dist .
```

(`.env.local` sets `VITE_LOCAL_DEV=true` for local development; the command-line
values above override it.)

---

## 4. Frontend — serve with nginx

Upload `release.tar.gz` and unpack it into the web root:

```bash
sudo mkdir -p /var/www/peakform
sudo tar -xzf release.tar.gz -C /var/www/peakform
```

Use the repo's `nginx.conf` as the server block, changing `root` to
`/var/www/peakform` and `server_name` to your domain. The important part is the
SPA fallback (`try_files $uri $uri/ /index.html;`) so deep links work.

Enable HTTPS (required — browsers and Convex Auth expect it):

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d academy.example.com
```

Or with Docker instead of a host nginx:

```bash
docker build --build-arg VITE_CONVEX_URL=https://happy-animal-123.convex.cloud -t peakform .
docker run -d -p 8080:80 --restart unless-stopped peakform
```

---

## 5. First login

1. Open `https://your-domain`, choose **Create an account**, and sign up with an
   address listed in `PLATFORM_ADMIN_EMAILS`.
2. Enter the 8-digit code from the email. You are now the platform admin.
3. **Admin → Academies**: create your academy (you are switched into it
   automatically; with several academies use **Work in this academy**).
4. Invite academy admins / coaches / accounting staff by email. They sign up
   with that exact email and get their role once their email is verified.
5. Add athletes. An athlete's **email** lets the athlete sign in; the
   **guardian email** lets a parent sign up and follow that athlete.

Anyone else who signs up sees a "Waiting for access" screen until invited.

### Fees and check-in

- **Finance → Recurring monthly fees**: set a monthly fee for all active
  athletes, a team, or one athlete. Two daily jobs run on Convex (04:17 and
  05:17 UTC): one creates each month's fees, the other marks unpaid fees past
  their due date as overdue and emails reminders (3 days before the due date,
  and once when overdue) to the athlete and guardian emails on file.
- **Athletes → Assign missing PINs** gives every active athlete a kiosk
  check-in PIN. Parents see their child's PIN in the Family Portal. Run the
  kiosk on a device signed in as a coach or admin.

---

## 6. Updating the site

```bash
git pull
npx convex deploy                      # if convex/ changed
VITE_LOCAL_DEV=false VITE_CONVEX_URL=... npm run build
tar -czf release.tar.gz -C dist .      # upload and unpack as in step 4
```

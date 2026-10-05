# Marriage Invitation App

A premium, mobile-first digital wedding invitation builder. Couples create an interactive invitation
(cinematic opening, love story, photo albums, events with maps and countdowns, RSVPs, guestbook,
music, video, QR sharing) and share it with a single link. Includes a marketing site, a full couple
dashboard with live preview, and an admin console.

Built with **Vite + React + TypeScript**. No server is required to explore it — data lives in the
browser (see "Going to production").

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
```

Demo accounts (also shown on the login page):

| Role | Email | Password |
| --- | --- | --- |
| Couple (Arjun & Anjali, fully populated) | `demo@couple.app` | `demo1234` |
| Platform admin | `admin@app.com` | `admin1234` |

Public demo invitation: `/invite/arjun-anjali` (add `?theme=royal`, `kerala`, `darkgold`… to try a theme).

## What is in the box

- **Guest experience** – opening cover with door animation, hero, couple profiles, animated love-story
  timeline, live countdown, event cards (per-event countdown, Google/Apple calendar, directions),
  venue map previews, masonry gallery with swipe/zoom/slideshow lightbox, family blessings, video
  cards, RSVP, moderated guestbook with heart reactions, closing section, share (WhatsApp, Instagram,
  Facebook, Telegram, email, copy, native share, QR code). Music only starts after the guest taps
  "Open Invitation".
- **Couple dashboard** – guided onboarding, setup assistant with progress, autosave, desktop/mobile
  live preview, publish/unpublish, editors for every section, AI writing helpers, photo manager
  (drag-drop, camera, compression, crop/rotate, reorder, covers, captions/alt text, albums), RSVP
  manager with filters and CSV export, guestbook moderation, analytics with charts, theme and colour/
  font customisation, drag-and-drop page builder, privacy (private / password), data export, delete
  invitation/account.
- **10 themes** – Royal, Minimal, Floral, Traditional Indian, Kerala, Modern Luxury, Pastel Romance,
  Dark & Gold, Elegant White, Garden.
- **Admin** – users, invitations, themes/featured templates, pricing editor, subscriptions, reported
  content, storage.
- **Performance & accessibility** – lazy/progressive images, blob thumbnails, canvas particles that
  adapt to device and pause when hidden, builder/admin code-split, `prefers-reduced-motion`
  respected everywhere, keyboard navigation, focus trapping in dialogs, alt text, contrast-safe accents.

## Architecture

```
src/
  lib/db.ts        Data layer – the ONLY thing the UI talks to (auth, invitations, RSVPs, messages,
                   analytics, settings). Ships a localStorage adapter behind the `Api` interface.
  lib/media.ts     Media layer – `media:<id>` references, IndexedDB blob store, image compression,
                   thumbnails, crop/rotate. Swap `mediaStore` for S3/Cloudinary/Firebase Storage.
  lib/ai.ts        AI layer – offline template writer behind the `AiProvider` interface.
  invite/          The guest-facing invitation (one component per section, themed via CSS variables).
  dashboard/       Couple builder: layout + one editor per section.
  pages/           Landing, auth, public invite page, admin.
  data/            Themes, fonts, demo content, pricing + plan limits (all easy to edit).
```

## Going to production

The UI is complete; these are the pieces to connect (each is isolated behind an interface):

1. **Backend** – implement `Api` in `src/lib/db.ts` with fetch calls (Supabase, Firebase, a REST API…)
   and export it as `api`. Move password hashing server-side (argon2/bcrypt) and use httpOnly
   session cookies. Verify protected-invitation passwords on the server and never send the password to
   the browser (the demo adapter keeps it in the invitation record). Enforce plan limits server-side.
2. **Google login** – `loginWithGoogle()` is a demo stand-in; exchange a real Google ID token instead.
3. **Cloud images** – implement `MediaStore` (signed uploads, CDN URLs, responsive variants).
4. **AI** – replace `localAi` with a call to your backend, which holds the model API key.
5. **SEO / Open Graph** – social crawlers do not run JavaScript. Render `/invite/:slug` on the server
   (Next.js, or a prerender function that injects `og:title`, `og:description`, `og:image`). The client
   already sets these tags (`src/pages/InvitePage.tsx`) so the data shape is ready.
6. **Payments** – plans and prices live in settings (editable from the admin panel); hook a provider
   such as Stripe into the "Upgrade" actions.
7. **SPA hosting** – serve `index.html` for all routes (e.g. a rewrite rule on Netlify/Vercel).

Because the demo data lives in each browser, a link opened on a *different* device will not find the
invitation until a real backend is connected.

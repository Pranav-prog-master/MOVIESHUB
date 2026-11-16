# 🎬 XP Movies

A modern, premium, **production-style movie & series discovery web application** built with **Node.js, Express, MongoDB, EJS and Tailwind CSS**.

XP Movies lets visitors browse listings in five categories — **Hollywood, Bollywood, South, Anime and Cartoon** — across two types — **Movie and Series**. Search titles, view details, preview up to four screenshots, and access external Watch / Download links. For series, each episode has its own individual link. XP Movies does not host video files.

> ⚠️ XP Movies does **not** host, scrape or link to any pirated content, torrents or unauthorized file hosts. Only add external links to content you own or are authorised to share.

---

## ✨ Features

- **Cinematic UI** — dark theme, pill-shaped navbar, glassmorphism cards, poster zoom hover, toasts, fully responsive layout.
- **Pill navbar** — centered nav with Genre, Category, OTT, Movies, Collection and Discover dropdowns. Search icon opens an overlay. User account menu on the right.
- **Homepage** — featured title hero and five category sections: Hollywood, Bollywood, South, Anime and Cartoon.
- **Movie & Series support** — each listing has a **Type** (Movie or Series). Movies get a single Watch / Download link. Series get per-episode Watch / Download links.
- **Movie cards** — poster, title, year, category, type badge and Details action.
- **Search** — search by title with live suggestions (`/api/suggest`) and a no-results page.
- **Movie / Series details** (`/movie/:slug`) — poster, description, release year, up to four preview screenshots, and type-aware watch section.
- **Episode list** — series details page lists all episodes; each episode row opens its external link in a new tab. Login required to access links.
- **External discovery** — TMDB API integration (optional key) with a clear distinction between movie information and authorised sources.
- **Admin dashboard** (`/admin`) — stats overview, add / edit / delete listings, manage users, genres, watch links and settings.
- **Add / Edit listing** — title, category, **type** (Movie / Series), release year, description, poster, up to four screenshots. Movie → single Watch / Download URL. Series → dynamic episode list (label + URL per episode, add / remove rows).
- **Image uploads** via **Multer** — one poster and up to four preview screenshots per listing (JPG / JPEG / PNG / WEBP, 5 MB per image, randomised safe filenames). No video uploads.
- **Auth** — register / login with **bcryptjs** password hashing, sessions and admin authorisation. First registered user becomes admin automatically.
- **REST API** — public movie listings and search, admin-protected create / update / delete and image uploads.
- **Security** — input validation, file-type / size limits, secure filenames, rate limiting, env vars, full error handling.

---

## 📁 Folder structure

```
XP-Movies/
├── server.js
├── seed.js
├── package.json
├── .env
├── .gitignore
├── config/
│   └── database.js
├── models/
│   ├── Movie.js          # type, episodes[], watchUrl, screenshots, …
│   ├── User.js
│   └── Genre.js
├── controllers/
│   ├── movieController.js
│   ├── authController.js
│   └── uploadController.js
├── middleware/
│   ├── auth.js
│   ├── admin.js
│   ├── upload.js
│   └── rateLimit.js
├── routes/
│   ├── movieRoutes.js
│   ├── authRoutes.js
│   ├── adminRoutes.js
│   └── uploadRoutes.js
├── utils/
│   ├── slug.js
│   └── media.js
├── views/
│   ├── admin/
│   │   ├── add-movie.ejs   # Type select + conditional link section
│   │   ├── edit-movie.ejs  # Same as add, pre-populated
│   │   ├── dashboard.ejs
│   │   ├── movies.ejs
│   │   ├── users.ejs
│   │   ├── genres.ejs
│   │   ├── settings.ejs
│   │   ├── watch-links.ejs
│   │   └── posters.ejs
│   ├── partials/
│   │   ├── header.ejs      # Pill navbar with dropdowns
│   │   ├── footer.ejs
│   │   ├── head.ejs
│   │   ├── movie-card.ejs
│   │   ├── section.ejs
│   │   ├── admin-sidebar.ejs
│   │   ├── layout-open.ejs
│   │   ├── layout-close.ejs
│   │   └── scripts.ejs
│   ├── index.ejs
│   ├── movie-details.ejs   # Type-aware watch section
│   ├── movies.ejs
│   ├── search.ejs
│   ├── discover.ejs
│   ├── genres.ejs
│   ├── login.ejs
│   ├── register.ejs
│   ├── profile.ejs
│   ├── settings.ejs
│   ├── watch.ejs
│   └── error.ejs
└── public/
    ├── css/style.css
    ├── js/main.js
    ├── images/
    └── uploads/
        ├── posters/
        ├── backdrops/
        └── screenshots/
```

---

## 🚀 Getting started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment

Copy `.env` and adjust if needed. 


### 3. Run
```bash
npm run dev      # nodemon — auto-restart on changes
npm start        # plain node
```


### 4. Seed sample data (optional)
```bash
npm run seed
```

---

## 👤 Accounts

- Register at `/register`. The **first user** is granted **admin** role automatically.
- Admins access the `/admin` dashboard. Promote / demote users from **Admin → Users**.
- Watch / Download links (both movie and episode) require the visitor to be **logged in**.

---

## 🎬 Movie vs Series

| | Movie | Series |
|---|---|---|
| Type field | `Movie` | `Series` |
| Watch / Download | Single URL (`watchUrl`) | Per-episode URLs (`episodes[]`) |
| Details page | One Watch / Download button | Episode list, each row is a link |
| Admin form | Single URL input | Dynamic episode rows (label + URL) |

---

## 🧪 Testing the features

| Feature | How to test |
|---|---|
| Browse / Home | Visit `/` — hero and five category sections |
| Categories | `/category/hollywood`, `/category/bollywood`, `/category/south`, `/category/anime`, `/category/cartoon` |
| Movies + filters | `/movies` — filter by category / year, sort by rating / year / popularity |
| Search | Header search icon or `/search?q=...` — live suggestions from `/api/suggest` |
| Movie details | Click any card → `/movie/:slug` |
| Watch / Download (Movie) | Single button on details page — opens external URL in new tab |
| Watch / Download (Series) | Episode list on details page — each row opens its URL in new tab |
| Discover | `/discover?q=...` — TMDB when key is set, else local |
| Register / Login | `/register`, `/login` — first user = admin |
| Admin dashboard | `/admin` — stats overview |
| Add listing | `/admin/movies/new` — select Movie or Series, fill links accordingly |
| Edit listing | `/admin/movies/:id/edit` — same form, pre-populated |
| Delete listing | `/admin/movies` table — delete action |
| Users | `/admin/users` — manage roles |
| REST API | See table below |

---

## 🔌 REST API

| Method | Endpoint | Auth |
|---|---|---|
| GET | `/api/movies` — filters: `q`, `category`, `year`, `sort`, `page` | public |
| GET | `/api/movies/search?q=` | public |
| GET | `/api/movies/:id` | public |
| POST | `/api/movies` | admin |
| PUT | `/api/movies/:id` | admin |
| DELETE | `/api/movies/:id` | admin |
| GET | `/api/genres` | public |
| GET | `/api/suggest?q=` | public |
| POST | `/api/auth/register` | public |
| POST | `/api/auth/login` | public |
| POST | `/api/auth/logout` | public |
| POST | `/api/upload/poster` | admin |
| POST | `/api/upload/backdrop` | admin |

```bash
curl http://localhost:3000/api/movies
curl "http://localhost:3000/api/movies/search?q=avengers"
```

---

## ☁️ Free Hosting

| Service | Role | Free tier |
|---|---|---|
| **Render** | Node.js app host | 750 hrs/month (sleeps after 15 min idle) |
| **MongoDB Atlas** | Database | 512 MB M0 cluster, forever free |
| **Cloudflare R2** | Poster / screenshot storage | 10 GB + 1M requests/month free |

> Render + MongoDB Atlas + Cloudflare R2 = **$0 forever**. Swap Multer `diskStorage` to `multer-s3` pointing at R2 to persist uploads across deploys.

---

## 🔒 Security notes

- Passwords hashed with **bcryptjs** — never stored in plaintext.
- Uploads restricted to image types and 5 MB; filenames are randomised (no user input in path).
- Watch / Download links (movie and episode) are only visible to **logged-in users**.
- Admin routes require an authenticated admin session.
- Rate limiting applied site-wide, stricter on the API.
- Secrets live in `.env` — never committed (git-ignored).

---

## 📜 Legal & responsible use

XP Movies is a demonstration platform. Only add external links to content you own or are authorised to share. Do not use XP Movies to distribute pirated movies, torrents or unauthorised file-hosting links. XP Movies stores listing information and images only — not video files.

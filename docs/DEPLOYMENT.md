# Deployment Guide — SKD ERP

## Frontend Deployment

### Option 1: Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/your-username/skd-erp.git
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com) and sign in with GitHub
   - Click **"Add New Project"** → Import your `skd-erp` repository
   - Vercel auto-detects Vite — confirm these settings:
     - **Framework Preset:** Vite
     - **Build Command:** `npm run build`
     - **Output Directory:** `dist`
   - Click **Deploy**

3. **Custom Domain (Optional)**
   - In Project Settings → Domains → Add your domain
   - Update DNS records as instructed

### Option 2: Netlify

1. Push to GitHub (same as above)
2. Go to [netlify.com](https://netlify.com) → **"Add new site"** → Import from Git
3. Configure:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Click **Deploy site**

### Option 3: GitHub Pages (Free)

1. Install the GitHub Pages plugin:
   ```bash
   npm install -D vite-plugin-gh-pages
   ```

2. Add to `vite.config.js`:
   ```js
   base: '/skd-erp/',
   ```

3. Add deploy script to `package.json`:
   ```json
   "deploy": "npm run build && npx gh-pages -d dist"
   ```

4. Run: `npm run deploy`

---

## Backend Deployment (Future)

When the backend is built, deploy to:

### Render
1. Push to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your repo, set root directory to `server/`
4. Configure:
   - **Build:** `npm install`
   - **Start:** `npm start`
   - **Environment:** Add env vars from `.env.example`

### Railway
1. Go to [railway.app](https://railway.app) → New Project
2. Deploy from GitHub, select `server/` directory
3. Railway auto-detects Node.js
4. Add environment variables in the dashboard

---

## Environment Variables

### Frontend (Vite)
Variables prefixed with `VITE_` are embedded at build time:

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_APP_NAME` | SKD ERP | Application name |
| `VITE_APP_VERSION` | 1.0.0 | App version |
| `VITE_CURRENCY_SYMBOL` | ₹ | Currency symbol |
| `VITE_CURRENCY_CODE` | INR | ISO currency code |

### Backend (Future)
| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 5000) |
| `DATABASE_URL` | MongoDB/PostgreSQL connection string |
| `JWT_SECRET` | Secret key for JWT token signing |

---

## Checklist Before Deploying

- [ ] Remove default credentials from production
- [ ] Set proper environment variables
- [ ] Test build locally: `npm run build && npm run preview`
- [ ] Verify all pages work in production build
- [ ] Check responsive layout on mobile

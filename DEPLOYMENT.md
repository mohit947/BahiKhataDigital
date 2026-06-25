# Vanya Traders — Full Deployment Guide

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│  Next.js 14     │───▶│  FastAPI         │───▶│  PostgreSQL      │
│  (Vercel)       │    │  (Railway/Render)│    │  (Supabase/Neon) │
│  Mobile ✓       │    │  Python 3.11     │    │  Managed DB      │
└─────────────────┘    └─────────────────┘    └──────────────────┘
```

---

## Option A: Cloud (Recommended — Free Tier Available)

### Step 1: PostgreSQL Database (Supabase — Free)

1. Go to https://supabase.com → Sign up → New Project
2. Set a strong DB password, pick a region close to India (ap-south-1)
3. Once created, go to **Settings → Database**
4. Copy the **Connection string** (URI format):
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
5. Keep this URL handy for Step 2.

---

### Step 2: Backend (Railway — Free $5/mo credit)

1. Go to https://railway.app → Sign up with GitHub
2. Click **New Project → Deploy from GitHub repo**
3. Connect your GitHub and select the `vanya-traders` repo
4. Set **Root Directory**: `backend`
5. Railway auto-detects the Dockerfile — confirm it
6. Add **Environment Variables**:
   ```
   DATABASE_URL=postgresql://postgres:[...]@db.[...].supabase.co:5432/postgres
   SECRET_KEY=your-super-long-random-secret-min-32-chars
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=60
   ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
   UPI_ID=yourupi@bank
   UPI_NAME=Vanya Traders
   COMPANY_NAME=Vanya Traders
   COMPANY_ADDRESS=Your Full Address
   COMPANY_PHONE=+91-XXXXXXXXXX
   COMPANY_EMAIL=contact@vanyatraders.com
   COMPANY_GSTIN=YOUR_GSTIN
   ```
7. Deploy → Railway gives you a URL like `https://vanya-backend.up.railway.app`
8. **Create admin user**: In Railway terminal/logs, run:
   ```bash
   python create_admin.py
   ```
   Or use Railway's shell feature.

---

### Step 3: Frontend (Vercel — Free)

1. Go to https://vercel.com → Sign up → Import Git Repository
2. Select the `vanya-traders` repo
3. Set **Root Directory**: `frontend`
4. Add **Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL=https://vanya-backend.up.railway.app/api/v1
   NEXT_PUBLIC_UPI_ID=yourupi@bank
   NEXT_PUBLIC_COMPANY_ADDRESS=Your Full Address
   NEXT_PUBLIC_COMPANY_PHONE=+91-XXXXXXXXXX
   NEXT_PUBLIC_COMPANY_EMAIL=contact@vanyatraders.com
   NEXT_PUBLIC_COMPANY_GSTIN=YOUR_GSTIN
   ```
5. Deploy → Vercel gives you `https://vanya-traders.vercel.app`
6. Update Railway's `ALLOWED_ORIGINS` with the Vercel URL.

---

## Option B: Self-Hosted VPS (DigitalOcean/AWS/Hetzner)

### Recommended: DigitalOcean Droplet (₹800/mo basic)

```bash
# 1. Create Ubuntu 22.04 droplet (2GB RAM, 1 vCPU minimum)

# 2. SSH into your server
ssh root@YOUR_SERVER_IP

# 3. Install Docker
curl -fsSL https://get.docker.com | sh
apt install docker-compose-plugin -y

# 4. Clone your repo
git clone https://github.com/YOUR_USERNAME/vanya-traders.git
cd vanya-traders

# 5. Configure backend
cp backend/.env.example backend/.env
nano backend/.env  # Fill in your values

# 6. Configure frontend
cp frontend/.env.local.example frontend/.env.local
nano frontend/.env.local  # Set API URL to http://YOUR_SERVER_IP:8000/api/v1

# 7. Start everything
docker compose up -d

# 8. Create admin
docker compose exec backend python create_admin.py

# 9. Access at http://YOUR_SERVER_IP:3000
```

### Add HTTPS with Nginx + Certbot (Recommended)

```bash
# Install Nginx
apt install nginx certbot python3-certbot-nginx -y

# Create site config
cat > /etc/nginx/sites-available/vanya << 'EOF'
server {
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

ln -s /etc/nginx/sites-available/vanya /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Get SSL certificate
certbot --nginx -d your-domain.com
```

---

## Option C: Local Development Setup

```bash
# ── Backend ──
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your PostgreSQL URL

# Start PostgreSQL locally (or use Docker):
docker run -d --name vanya-db \
  -e POSTGRES_USER=vanya \
  -e POSTGRES_PASSWORD=vanya123 \
  -e POSTGRES_DB=vanya_traders \
  -p 5432:5432 postgres:16-alpine

# Set DATABASE_URL in .env:
# DATABASE_URL=postgresql://vanya:vanya123@localhost:5432/vanya_traders

python create_admin.py        # Create first admin
uvicorn app.main:app --reload --port 8000

# ── Frontend (new terminal) ──
cd frontend
npm install
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
npm run dev

# Open http://localhost:3000
```

---

## Mobile Access

The app is fully mobile-responsive and works on any device:
- **Same URL** on phone browser — full feature parity
- **PWA-ready** — users can "Add to Home Screen" on iOS/Android
- **Create bills from phone** → Print from any connected printer

To enable mobile bill creation from anywhere:
1. Deploy to cloud (Option A above)
2. Share the Vercel URL with your staff
3. They login from their phone — done!

---

## UPI Payment QR Code Setup

1. Get your UPI ID from your bank's UPI app (e.g., `vanyatraders@hdfc`)
2. Add it to backend `.env`: `UPI_ID=vanyatraders@hdfc`
3. Add to frontend `.env.local`: `NEXT_PUBLIC_UPI_ID=vanyatraders@hdfc`
4. Every bill automatically shows a scannable UPI QR code

---

## Security Checklist

- [x] Passwords hashed with bcrypt
- [x] JWT tokens expire after 60 minutes
- [x] SQL injection protected via SQLAlchemy ORM
- [x] XSS protected via React escaping + CSP headers
- [x] Rate limiting on API endpoints (slowapi)
- [x] CORS restricted to your domain only
- [x] Input validated on both frontend (Zod) and backend (Pydantic)
- [ ] Enable HTTPS (use Vercel/Railway — auto SSL, or certbot for VPS)
- [ ] Backup PostgreSQL regularly (Supabase: daily backups on free tier)
- [ ] Rotate `SECRET_KEY` periodically

---

## Printing Bills

### From Desktop Browser
1. Open any bill → click **Print** button
2. A proper A4 print dialog opens
3. Select your printer OR "Save as PDF"

### From Mobile
1. Open bill on phone
2. Use **Share** → Print via AirPrint (iOS) or Google Cloud Print (Android)
3. Or use **Save PDF** → send to email → print from computer

### Connecting to Physical Printer
- Any USB/WiFi printer works with the browser's native print dialog
- For receipt printers (58mm/80mm thermal): Use the print dialog, select the thermal printer, set paper size to 58mm/80mm
- For Bluetooth printers on phone: Use browser print → select Bluetooth printer

---

## Ongoing Maintenance

```bash
# Update the app after code changes
git pull
docker compose build && docker compose up -d

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Database backup
docker compose exec db pg_dump -U vanya vanya_traders > backup_$(date +%Y%m%d).sql

# Restore backup
docker compose exec -i db psql -U vanya vanya_traders < backup_YYYYMMDD.sql
```

---

## Cost Summary

| Option | Frontend | Backend | Database | Total/month |
|--------|----------|---------|----------|-------------|
| Free Cloud | Vercel Free | Railway Free ($5 credit) | Supabase Free | **₹0** |
| Paid Cloud | Vercel Pro | Railway Hobby | Supabase Pro | **~₹2,500** |
| VPS | — | DigitalOcean 2GB | Same server | **~₹800** |

**Recommendation for Vanya Traders**: Start with **Free Cloud (Option A)**.
- Supabase free: 500MB DB, plenty for thousands of bills
- Railway free: $5/mo credit — covers a small FastAPI app
- Vercel free: Unlimited deployments
- Upgrade only when you outgrow free tiers

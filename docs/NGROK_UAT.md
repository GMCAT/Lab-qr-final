# Ngrok UAT (single origin)

The Backend serves both `/api` and the Frontend. PostgreSQL remains private on
`localhost:5432`; never create an ngrok TCP tunnel for port 5432.

## 1. Configure `.env`

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/lab_qr?schema=public
UPLOAD_DIR=./uploads
JWT_SECRET=USE_A_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
CORS_ORIGINS=https://YOUR-DEV-DOMAIN.ngrok.app
TRUST_PROXY=true
PUBLIC_ITEM_BASE_URL=https://YOUR-DEV-DOMAIN.ngrok.app/item.html
```

Do not copy the placeholders literally. Use the exact HTTPS Dev Domain assigned
to the account. Keep `.env` out of source control and chat.

## 2. Start and verify locally

```powershell
npm install
.\node_modules\.bin\prisma.cmd migrate deploy
.\node_modules\.bin\prisma.cmd generate
npm run verify
npm start
Invoke-RestMethod http://localhost:3001/health/live
Invoke-RestMethod http://localhost:3001/health/ready
```

Open `http://localhost:3001/`. The old local frontend URL on port 5500 remains
supported for development.

## 3. Start ngrok

```powershell
ngrok config add-authtoken YOUR_TOKEN
ngrok http 3001
```

Never commit or share the authtoken. Open the HTTPS forwarding URL and test QR,
login, uploads, user verification, borrow/return, issue and maintenance flows.

## 4. Stop UAT

Stop ngrok with Ctrl+C. The database remains local and is not publicly exposed.

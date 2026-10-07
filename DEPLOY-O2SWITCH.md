# Deploiement ACSC Asso Pao v8.6 — o2switch (Node.js + SQLite)

**Stack:** Express 4 + `sqlite3` 5.1.x async + WAL + `helmet` CSP/HSTS + `cors` restreint + `express-rate-limit` + `bcryptjs` PIN + proxy ElevenLabs — **100% compatible o2switch**, pas besoin de MySQL.

> Validé Node **22.x** sur cPanel CloudLinux (o2switch). SQLite embarqué, aucune base externe à gérer. `server.js` source unique, `server.o2switch.js` = shim `require("./server.js")` (drift supprimé).

---

## 1. Preparer l'archive locale (Windows)

```powershell
# depuis c:\Users\HP\Desktop\acsc-asso-pao
nvm use 22  # ou fnm use 22

npm ci
node --check server.js
node --check server.o2switch.js
npm start  # http://localhost:3000  -> /api/health doit repondre {ok:1, version:"8.4-sqlite3", wal:true}

# zip SANS node_modules / database.db (recompilation native obligatoire sur serveur)
powershell Compress-Archive -Path server.js,server.o2switch.js,package.json,package-lock.json,public,DEPLOY-O2SWITCH.md,.htaccess -DestinationPath acsc-asso-pao-v8.6.zip -Force
```

Contenu du zip:
```
server.js                 # source unique
server.o2switch.js        # shim Passenger -> require("./server.js")
package.json / package-lock.json  # engines 22.x + express-rate-limit 7.5.1
public/  (index.html + js/ + sw.js v8.6 + manifest.json + logo.svg + politique-confidentialite.html + teaser.*)
.htaccess / public/.htaccess (durcis)
DEPLOY-O2SWITCH.md / ecosystem.config.example.js
```

## 2. Creer l'app Node.js dans cPanel o2switch

1. **cPanel > Setup Node.js App** (ou Application Manager)
2. **Create Application**
   - **Node.js version:** 22.x (identique à `engines.node` = 22.x)
   - **Application mode:** `production`
   - **Application root:** `acsc-asso-pao` (dossier contenant server.js)
   - **Application URL:** `acsc.tondomaine.com` ou `tondomaine.com/acsc`
   - **Application startup file:** `server.o2switch.js` (shim) ou `server.js` — les deux pointent v8.6
3. Cliquer **Create** -> cPanel affiche `source .../nodevenv/.../activate`

> o2switch injecte `PORT` (ex: 34512). `server.js` utilise deja `process.env.PORT || 3000`.

## 3. Uploader + installer

File Manager ou SFTP:
```
~/acsc-asso-pao/server.js
~/acsc-asso-pao/package.json
~/acsc-asso-pao/public/...
```

```bash
# SSH Terminal cPanel
cd ~/acsc-asso-pao
source ~/nodevenv/acsc-asso-pao/22/bin/activate
# ou: source /opt/alt/alt-nodejs22/enable

npm ci --omit=dev
# sqlite3 compile un binaire natif (30-60s)
mkdir -p ~/acsc-data
```

### Variable d'environnement DB (recommande)

**Setup Node.js App > Environment variables:**

| Name | Value |
|------|-------|
| `DB_PATH` | `/home/cpaneluser/acsc-data/database.db` |
| `NODE_ENV` | `production` |
| `ALLOWED_ORIGINS` | `https://acsc-asso-pao.com,https://www.acsc-asso-pao.com` |
| `ELEVEN_API_KEY` | `sk_...` (clé serveur prioritaire, proxy `/api/eleven/*` no-store) |

Remplace `cpaneluser` par ton user cPanel (`/home/...` en haut du File Manager).
Si `DB_PATH` non defini, DB = `~/acsc-asso-pao/database.db` (fonctionne mais sera ecrase si tu re-upload le dossier complet -> d'ou `~/acsc-data`).

`server.js` gere: `process.env.DB_PATH || process.env.SQLITE_PATH || path.join(__dirname,'database.db')` + `mkdir -p dirname` + `trust proxy`.

## 4. Demarrer / Redemarrer

**Setup Node.js App > Restart** (ou Start).

Vérifie:
- **Logs Passenger** -> `✅ ACSC v8.6 -> port XXXX | DB /home/... [WAL]`
- **Healthcheck:** `https://tondomaine.com/api/health` ou `/health`

```json
{"ok":1,"version":"8.4-sqlite3","db":"/home/cpaneluser/acsc-data/database.db","uptime":12.3,"wal":true}
```

- `https://tondomaine.com/` sert `public/index.html` (fallback SPA dans `server.js:get('*')`)
- `https://tondomaine.com/api/settings` -> JSON settings

## 5. HTTPS / Domaine

- **cPanel > SSL/TLS Status -> Run AutoSSL** (Let's Encrypt gratuit o2switch)
- **cPanel > Domains > Force HTTPS Redirect -> ON**
- `.htaccess.example` optionnel — fallback SPA deja gere cote Node

## 6. Sauvegarde & Migration des donnees

SQLite = 1 fichier. Pas besoin de phpMyAdmin.

**Option A — API (recommandée, sans SSH):**
```powershell
curl https://tondomaine.com/api/backup -o backup-8.4.json
curl -X POST https://tondomaine.com/api/restore -H "Content-Type: application/json" --data @backup-8.4.json
```

**Option B — fichier brut:**
- Local -> serveur: upload `database.db` vers `/home/cpaneluser/acsc-data/database.db` (app STOPPEE avant, sinon `database is locked`)
- Serveur -> local: SFTP download

**Cron sauvegarde (optionnel):** cPanel > Cron Jobs
```
0 3 * * * cp /home/cpaneluser/acsc-data/database.db /home/cpaneluser/acsc-data/backup-$(date +\%F).db
```

## 7. Mise a jour

1. Upload nouveau zip (ecrase `server.js` + `public/` uniquement, ne touche pas `~/acsc-data/database.db`)
2. SSH: `source ~/nodevenv/.../activate && cd ~/acsc-asso-pao && npm ci --omit=dev`
3. **Restart** dans Setup Node.js App.

Ou via GitHub Actions (pipeline auto): chaque `git push` sur `main` deploye en 60s.

## 7b. Pipeline automatique GitHub Actions (recommandé)

Le repo contient `.github/workflows/deploy-o2switch.yml` : `push -> CI (Node 22 + npm run check) -> SCP -> npm ci --omit=dev -> touch tmp/restart.txt` (Passenger).

**1) Activer SSH sur o2switch:** cPanel > SSH Access > Manage SSH Keys > Generate (ou importer ta clé) > Authorize. Note l'IP serveur et le port (souvent 22).

**2) Secrets GitHub:** repo GitHub > Settings > Secrets and variables > Actions > New repository secret :

| Secret | Valeur exemple | Commentaire |
|--------|---------------|-------------|
| `O2SWITCH_HOST` | `123.12.34.56` ou `acsc.tondomaine.com` | IP/host o2switch (voir cPanel > General Information) |
| `O2SWITCH_USER` | `cpaneluser` | User cPanel |
| `O2SWITCH_PASSWORD` | `***` | Mot de passe cPanel (ou clé -> `O2SWITCH_SSH_KEY`) |
| `O2SWITCH_PORT` | `22` | Optionnel, défaut 22 |
| `O2SWITCH_PATH` | `acsc-asso-pao` | **Application root** (relatif à `$HOME`) |
| `O2SWITCH_NODEVENV` | `/home/cpaneluser/nodevenv/acsc-asso-pao/22` | Visible dans Setup Node.js App > chemin `nodevenv` |

> Si tu préfères une clé SSH : crée `O2SWITCH_SSH_KEY` avec la clé privée, et dans le workflow commente les lignes `password:` et décommente `key:`.

**3) Initialiser Git (1 fois) si pas encore fait:**
```powershell
cd c:\Users\HP\Desktop\acsc-asso-pao
git init
git add .
git commit -m "ACSC v8.7 - projet-state + pipeline o2switch"
git branch -M main
git remote add origin https://github.com/TONUSER/acsc-asso-pao.git
git push -u origin main
```

**4) Vérifier:** GitHub > Actions > `Deploy o2switch (SSH)` doit passer vert. Puis `https://tondomaine.com/api/health`.

**Variante sans SSH:** si o2switch bloque SCP, utilise le bloc FTP commenté en bas du workflow (port 21).

**Rollback:** cPanel > Git Version Control > `git log` > `git checkout <ancien commit>` > Restart, ou GitHub > Re-run failed jobs.

## 8. Depannage o2switch

| Symptome | Fix |
|----------|-----|
| `Cannot find module 'sqlite3' / 'helmet' / 'express-rate-limit'` | `npm ci` non lancé dans l'env Node de l'app. Toujours `source nodevenv/.../activate` avant. |
| `ERR_DLOPEN_FAILED` ou `invalid ELF` | Binaire compile en local (Windows) uploade. Supprime `node_modules` sur serveur et refais `npm ci` sur serveur. |
| `database is locked` | 2 process qui ecrivent. Passenger gere 1 instance (`instances:1`). |
| `ENOENT` / `readonly database` | `mkdir -p ~/acsc-data && chmod 750 ~/acsc-data`. Ne mets jamais la DB dans `public/`. |
| `502 Bad Gateway` | Port force a 3000. Laisse `process.env.PORT`. Verifie Startup file = `server.js`. Regarde Logs Passenger. |
| `404 /api/*` | App Node non demarree, requete tombe sur Apache statique. Redemarre l'app. |
| `gyp ERR!` | Python/make manquant (rare). Passe Node 22, ou demande `alt-python` au support. |

Logs:
```bash
cat ~/logs/passenger.log
tail -f ~/acsc-asso-pao/logs/*.log
curl -i https://tondomaine.com/api/health
```

## 9. Checklist prod

- [ ] Node 22 dans Setup Node.js App
- [ ] `DB_PATH=/home/cpaneluser/acsc-data/database.db` + `ALLOWED_ORIGINS` + `ELEVEN_API_KEY` définis
- [ ] `npm ci --omit=dev` execute **sur le serveur** apres `source nodevenv`
- [ ] `~/acsc-data` existe et est hors `public/`
- [ ] `/api/health` repond 200
- [ ] AutoSSL actif + Force HTTPS
- [ ] Backup `curl /api/backup` teste
- [ ] `.gitignore` ignore bien `database.db` / `node_modules` / `.env`

## 10. Pourquoi SQLite sur o2switch ?

- 0 config MySQL, 0 quota BDD, 0 migration SQL
- 1 fichier = 1 backup (`cp` ou `/api/backup`)
- Perf suffisante pour ACSC (<10k lignes). Index deja en place
- WAL actif: `PRAGMA journal_mode=WAL` (v8.6) pour concurrence Passenger
- Si >100k projets, migration MySQL/Postgres sans changer l'API (remplacer `sqlite3` async)

Shim Passenger: `server.o2switch.js` → `require("./server.js")` — source unique v8.6, pas de drift.


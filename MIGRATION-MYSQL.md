# ACSC v9.0-php - Guide migration o2switch (PHP natif, plus de Node)

## 1) Creer la DB MySQL (cPanel o2switch)
cPanel > MySQL Databases:
- Creer DB: `koko6788_acsc` (prefixe o2switch impose)
- Creer User: `koko6788_acscuser` + mdp fort
- Lier: ALL PRIVILEGES sur la DB
Puis cPanel > phpMyAdmin > `koko6788_acsc` > SQL > coller `sql/schema.mysql.sql` > Executer.

## 2) Config PHP (plus de Node)
Plus de `cPanel > Application Node.js` — supprimer si creee.
2 options pour la config MySQL:
- **A) `api/config.local.php`** (recommande, non tracke): copier `api/config.local.example.php` -> `api/config.local.php` et remplir (prod FTP manuel ou cPanel File Manager).
- **B) SetEnv `.htaccess`** : decommente les `SetEnv DB_*` dans `.htaccess` et remplace `koko6788_*` + mdp, ou via cPanel > Variables d'environnement Apache.
En local XAMPP: cree `api/config.local.php` avec `root / '' / acsc_assopao`.

## 3) Deploy
`git push origin main` -> `.github/workflows/deploy-php.yml` FTP publie tout (exclut `api/config.local.php` & `api/tmp/`).
Uploads Node exclus du repo; `server.js` conserve pour dev optionnel `php -S` vs Node.

## 4) Import donnees
Si ancien `database.db`: `GET /api/backup` (Node legacy) -> `POST /api/restore` (PHP) OU `tools/migrate-sqlite-to-mysql.js`.
`ensureSchema()` cree aussi les tables auto si `schema.sql` non joue.

## 5) Verification
`GET /api/health` ou `/health` -> `{ok:1, version:"9.0-php", db:"koko6788_acsc", dialect:"mysql"}`
`GET /api/settings`, `GET /api/personnes`, `GET /api/public/sites` -> JSON.

## 6) Dev local
```bash
php -S localhost:8000 router.php  # PHP built-in (utilise api/config.local.php)
# ou
php -S localhost:8000             # si docroot = public/, API via /api/health.php direct
```

## 7) Double theme
Noir/Laiton par defaut, toggle Clair (Creme/Tabac) en `localStorage acsc_theme`. Tokens `public/css/tokens.css`, `public/js/theme-switch.js`.

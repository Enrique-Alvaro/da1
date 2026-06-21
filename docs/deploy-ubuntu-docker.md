# Despliegue CrownBid en Ubuntu (Docker Compose)

Guía para levantar **API Node.js + SQL Server** en un servidor Ubuntu (OpenCloud u otro VPS) con Docker Compose.  
La app móvil (APK) debe consumir la API por **HTTPS público**, nunca `localhost`.

---

## 1. Estructura del proyecto

| Ruta | Descripción |
|------|-------------|
| `apps/api/` | Backend Express + TypeScript |
| `apps/api/src/server.ts` | Entrypoint (`npm run build` → `node dist/server.js`) |
| `apps/api/Dockerfile` | Imagen de producción |
| `docker-compose.yml` | Stack API + SQL Server |
| `database/` | Schema, migraciones y seeds SQL |

---

## 2. Prerrequisitos (Ubuntu)

- Ubuntu 22.04+ (64 bits)
- Usuario con acceso `sudo`
- Puertos: **80/443** (Nginx), **3000** (API interna, opcional público), **1433** solo si usás DBeaver remoto
- Dominio apuntando al servidor (para HTTPS con Certbot)

### Instalar Docker

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker $USER
# Cerrar sesión y volver a entrar para usar docker sin sudo
```

---

## 3. Clonar y configurar variables

```bash
git clone <tu-repo> crownbid
cd crownbid
```

### 3.1 Variables de Compose (raíz)

```bash
cp .env.example .env
nano .env
```

Docker Compose lee **`.env` en la raíz del repo** automáticamente.

Completar al menos:

| Variable | Ejemplo | Uso |
|----------|---------|-----|
| `MSSQL_SA_PASSWORD` | `TuPassword1!Seguro` | Contraseña SA de SQL Server |
| `JWT_SECRET` | `(openssl rand -hex 32)` | Tokens JWT (obligatorio en prod) |
| `EMPLOYEE_ADMIN_PASSWORD` | `EmpleadoAdmin2026!` | Login empleado TPO |
| `API_HOST_PORT` | `3000` | Puerto host → contenedor API |
| `DB_NAME` | `CrownBid` | Nombre de la base |

### 3.2 Referencia API (opcional)

```bash
cp apps/api/.env.production.example apps/api/.env.production
```

Este archivo es **documentación / referencia** para desarrollo manual.  
En Docker Compose las variables se inyectan desde el **`.env` raíz** (sección anterior).

**Importante:** dentro de Docker la API usa `DB_HOST=sqlserver` (nombre del servicio Compose, **no** `localhost`).

---

## 4. Levantar el stack

```bash
docker compose config    # validar YAML
docker compose up -d --build
```

Scripts npm equivalentes (desde la raíz):

```bash
npm run docker:build
npm run docker:up
npm run docker:logs     # seguir logs de la API
npm run docker:down
```

### Ver contenedores y logs

```bash
docker compose ps
docker compose logs -f api
docker compose logs -f sqlserver
```

---

## 5. Health checks

La API ya expone:

| Endpoint | Descripción |
|----------|-------------|
| `GET /api/health` | OK si el proceso responde |
| `GET /api/health/db` | OK si SQL Server responde (`503` si no hay BD) |

```bash
curl -s http://127.0.0.1:3000/api/health | jq
curl -s http://127.0.0.1:3000/api/health/db | jq
```

Respuesta esperada (`/api/health`):

```json
{
  "status": "ok",
  "service": "crownbid-api",
  "environment": "production",
  "timestamp": "2026-06-15T12:00:00.000Z"
}
```

---

## 6. Bootstrap de base de datos (primera vez)

SQL Server arranca vacío. Ejecutar scripts **en este orden** contra la base `CrownBid`:

1. Crear BD (si no existe)
2. `database/schema.sql`
3. `database/cliente_credenciales.sql`
4. `database/migrations/001_medios_pago_subasta_moneda.sql`
5. `database/migrations/002_notificaciones.sql`
6. `database/migrations/003_password_reset_tokens.sql`
7. Seeds mínimos: `database/seed_registro_cliente_fk.sql`, `database/seeds/seed_demo_subastas.sql` (opcional demo)

### Opción A — desde el host con sqlcmd

```bash
# Crear base
docker exec -it crownbid-sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C \
  -Q "IF DB_ID('CrownBid') IS NULL CREATE DATABASE CrownBid"

# Schema (desde la raíz del repo)
docker exec -i crownbid-sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -d CrownBid -C \
  -i /dev/stdin < database/schema.sql
```

Repetir `-i /dev/stdin < archivo.sql` para cada script.

### Opción B — DBeaver

- Host: `127.0.0.1` (con túnel SSH al servidor) o IP pública si cambiaste el bind del puerto 1433
- Puerto: `1433`
- Usuario: `sa`
- Contraseña: la de `MSSQL_SA_PASSWORD`
- Base: `CrownBid`

> Por defecto Compose publica SQL en **`127.0.0.1:1433`** del servidor (solo accesible vía SSH tunnel). Para DBeaver remoto directo, editá `docker-compose.yml` y usá `"1433:1433"` (menos seguro).

---

## 7. Nginx reverse proxy

Instalar Nginx:

```bash
sudo apt install -y nginx
```

Ejemplo `/etc/nginx/sites-available/crownbid`:

```nginx
server {
    listen 80;
    server_name api.tudominio.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/crownbid /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 8. HTTPS con Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.tudominio.com
```

Certbot configura SSL y renovación automática.

---

## 9. APK / app móvil

En el build de producción del APK, configurar:

```env
EXPO_PUBLIC_API_URL=https://api.tudominio.com/api
```

**Nunca** uses `http://localhost:3000` en el APK: el teléfono no ve tu PC.

Formato de URL:

```
https://<dominio-o-subdominio>/api
```

Ejemplo: `https://api.crownbid.example.com/api`

---

## 10. Desarrollo local vs Docker

| Entorno | `DB_HOST` / connection string |
|---------|-------------------------------|
| Local (SQL en host) | `Server=localhost,1433;...` o `DB_HOST=localhost` |
| Docker Compose | `DB_HOST=sqlserver` |

La lógica de negocio no cambia; solo la configuración de conexión.

---

## 11. Troubleshooting

| Síntoma | Acción |
|---------|--------|
| API `503` en `/api/health/db` | Verificar scripts SQL aplicados y que `DB_PASSWORD` coincida con SA |
| `Login failed for user ''` | Usar `User Id=sa` (con espacio) en ADO, no `UserId` |
| SQL no inicia | Revisar complejidad de `MSSQL_SA_PASSWORD` |
| Contenedor API reinicia | `docker compose logs api` — suele faltar `JWT_SECRET` en producción |

---

## 12. Seguridad (checklist TPO)

- [ ] No commitear `.env` ni `apps/api/.env.production`
- [ ] `JWT_SECRET` fuerte y único
- [ ] SQL Server no expuesto a Internet sin firewall
- [ ] HTTPS obligatorio para el APK
- [ ] Rotar contraseñas demo antes de entrega

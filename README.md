# CrownBid

Aplicación móvil y API para participación en subastas físicas con soporte online (proyecto académico UADE — DA1).

## Decisiones técnicas

| Capa | Tecnología |
|------|------------|
| App móvil | React Native |
| Backend | Node.js + Express + TypeScript |
| Base de datos | Microsoft SQL Server |
| Contrato REST | OpenAPI / Swagger (documentación en `docs/api/`) |

## Estructura del repositorio

```
├── apps/
│   ├── api/          # Backend Express + TypeScript
│   └── mobile/       # App Expo (src/, assets/, app.json)
├── database/         # Esquema SQL Server (`schema.sql`)
├── docs/
│   ├── api/          # api-docs.md, PDF exportado
│   ├── design/       # Wireframes y material de diseño
│   └── review/       # Notas de revisión de esquema y contrato
├── package.json      # Workspaces npm (raíz)
└── README.md
```

## Estado actual

- Contrato de API descrito en `docs/api/api-docs.md`.
- Esquema relacional MVP en `database/schema.sql` (listo para ejecutar en BD vacía).
- Wireframes en `docs/design/wireframes/`.
- Backend en `apps/api`; app móvil en `apps/mobile` (Expo Router, pantallas de auth, medios de pago, subastas).

## Cómo levantar el proyecto

### Requisitos previos

- [Node.js](https://nodejs.org/) v18+
- [OrbStack](https://orbstack.dev/) o Docker Desktop (para SQL Server en macOS/Linux)

### 1. Instalar dependencias

```bash
npm install
```

### 2. Levantar SQL Server con Docker

> En macOS no hay instalador nativo de SQL Server — se usa Docker.
> La contraseña debe cumplir la política de complejidad de SQL Server (mayúscula + minúscula + número + símbolo).

```bash
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=TuPassword1!" \
  -p 1433:1433 --name crownbid-sql \
  -d mcr.microsoft.com/mssql/server:2022-latest
```

Esperá unos segundos a que el contenedor termine de iniciar.

### 3. Crear la base de datos y cargar el schema

```bash
# Crear la BD
docker exec -i crownbid-sql /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "TuPassword1!" -No \
  -Q "CREATE DATABASE CrownBid"

# Cargar el schema
docker exec -i crownbid-sql /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "TuPassword1!" -d CrownBid -No \
  -i /dev/stdin < database/schema.sql

# Tabla de credenciales de clientes
docker exec -i crownbid-sql /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "TuPassword1!" -d CrownBid -No \
  -i /dev/stdin < database/cliente_credenciales.sql

# Seed mínimo (empleado verificador + país Argentina)
docker exec -i crownbid-sql /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "TuPassword1!" -d CrownBid -No \
  -i /dev/stdin < database/seed_registro_cliente_fk.sql
```

### 4. Configurar variables de entorno

Copiá el archivo de ejemplo y editá la contraseña:

```bash
cp apps/api/.env.example apps/api/.env
```

En `apps/api/.env` actualizá la contraseña en `SQLSERVER_CONNECTION_STRING`:

```
SQLSERVER_CONNECTION_STRING=Server=localhost,1433;Database=CrownBid;User Id=sa;Password=TuPassword1!;Encrypt=true;TrustServerCertificate=true
```

### 5. Levantar la API

```bash
npm run dev:api
```

La API queda disponible en `http://localhost:3000`.

### 6. Levantar la app móvil

```bash
# En el navegador (web)
npm run web

# En simulador Android
npm run android

# En simulador iOS
npm run ios
```

La versión web abre en `http://localhost:8081`.

### Comandos útiles

```bash
# Verificar conexión a la BD
npm --workspace @crownbid/api run db:test

# Reiniciar el contenedor de SQL Server (si lo paraste)
docker start crownbid-sql
```

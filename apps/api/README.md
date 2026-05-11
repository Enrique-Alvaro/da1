# @crownbid/api

Backend REST CrownBid (Node.js + Express + TypeScript).

## Estado

Estructura de carpetas lista (`src/modules/*`, `routes`, `middlewares`, `shared`). **Sin dependencias instaladas** todavía.

## Probar conexión a SQL Server

1. Completá `DATABASE_URL` en `.env` (cadena **ADO**, no JDBC). Ejemplo en `.env.example`.
2. Desde esta carpeta:

```bash
npm run db:test
```

Si ves `Conexión OK` con la base y el login, el driver y la red están bien. Errores típicos: `ELOGIN` (usuario/clave), `ETIMEOUT` (host/puerto o firewall), `certificate` (ajustar `Encrypt` / `TrustServerCertificate`).

## Próximo

1. `npm install` (desde la raíz del monorepo o esta carpeta, según el flujo elegido).
2. Añadir `express`, `ts-node-dev` / build, validación de envíos, etc. (el driver `mssql` ya está para `db:test`).
3. Cablear `server.ts` con la app Express y módulos alineados al contrato en `../../docs/api/api-docs.md`.

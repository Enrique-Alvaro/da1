# Usuario empleado (TPO) — sin tabla de credenciales

El login de empleado **no** usa `dbo.personas` ni `cliente_credenciales`. Valida contra variables de entorno y exige que exista la fila en `dbo.empleados`.

## 1. Fila en SQL Server

Ejecutar (si aún no corriste el seed):

```sql
-- database/seed_registro_cliente_fk.sql
INSERT INTO dbo.empleados (identificador, cargo, sector)
SELECT 1, N'Administrador CrownBid TPO', NULL
WHERE NOT EXISTS (SELECT 1 FROM dbo.empleados WHERE identificador = 1);
```

## 2. Variables en `apps/api/.env`

```env
DEFAULT_REVIEWER_EMPLOYEE_ID=1
EMPLOYEE_ADMIN_EMAIL=admin@crownbid.local
EMPLOYEE_ADMIN_PASSWORD=EmpleadoAdmin2026!
EMPLOYEE_ADMIN_ID=1
```

Reiniciar la API tras cambiar `.env`.

## 3. Login

```http
POST /api/auth/employee/login
Content-Type: application/json

{
  "email": "admin@crownbid.local",
  "password": "EmpleadoAdmin2026!"
}
```

Respuesta: `accessToken`, `employeeId`, `role: "empleado"`.

## 4. Postman

Colección `docs/postman/CrownBid-Auth-Phase2.postman_collection.json` → carpeta **Empleado (auth env)** → **Employee login - success**.

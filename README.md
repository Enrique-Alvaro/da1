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

## Próximos pasos

1. Validar `database/schema.sql` en una instancia SQL Server (crear BD y ejecutar el script).
2. Inicializar dependencias del backend (`apps/api`) y configurar variables desde `.env.example`.
3. Implementar la API Express por módulos alineados al contrato.
4. Inicializar el proyecto React Native en `apps/mobile`.
5. Conectar la app móvil a los endpoints del backend.

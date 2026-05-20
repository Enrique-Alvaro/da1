# @crownbid/mobile

Cliente móvil CrownBid (Expo + React Native + expo-router).

## Estructura

```
apps/mobile/
├── app.json          # Configuración Expo
├── assets/           # Imágenes e iconos
├── src/
│   ├── app/          # Pantallas (file-based routing)
│   ├── components/
│   ├── constants/
│   ├── hooks/
│   └── services/     # Cliente HTTP hacia @crownbid/api
└── tsconfig.json
```

## Scripts

Desde la raíz del monorepo:

```bash
npm run dev:mobile    # expo start
npm run android
npm run ios
npm run web
```

Desde esta carpeta:

```bash
npm run start
npm run typecheck
```

## Alias TypeScript

- `@/*` → `src/*`
- `@/assets/*` → `assets/*`

## API

Configurar la URL del backend en `src/services/api.ts` (por defecto apunta al servidor local de `apps/api`).

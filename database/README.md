# Base de datos — CrownBid

## Ubicación

El esquema completo del MVP está en **`schema.sql`** (misma carpeta que este README).

## Cómo aplicarlo

1. Crear una base de datos vacía en SQL Server (p. ej. `CrownBid`).
2. Conectarse con SSMS, `sqlcmd` o Azure Data Studio.
3. Ejecutar el contenido de `schema.sql` contra esa base de datos.

No hay datos semilla obligatorios. Opcionalmente, al final del script hay un bloque comentado con inserts mínimos de `countries` si necesitás filas antes del primer registro de usuario (FK `users.country_code`).

## Restricciones y decisiones destacadas

| Tema | Detalle |
|------|---------|
| Sesión en vivo | Índice único filtrado en `live_auction_sessions`: como máximo una fila activa (`released_at IS NULL`) por `user_id`. |
| Puja ganadora | Índice único filtrado en `bids`: una sola fila con `is_winning = 1` por `auction_item_id`. La app debe actualizar pujas y `auction_items.current_bid` en **una transacción**. |
| Cuenta de cobro vendedor | `seller_payout_accounts` es independiente de `payment_methods` (comprador / pujas). |
| Tarjetas | No se almacenan PAN completos ni CVV; ver comentario en columna `payment_methods.details_json`. |
| Precios en catálogo público | Los importes viven en tablas canónicos; la visibilidad sin autenticación se resuelve en la **capa API** (DTO sin montos), no duplicando tablas. |
| Oferta vigente | `auction_items.current_bid` es `NOT NULL` con default `0`: cero significa que aún no hubo pujas; las reglas de incremento siguen usando `base_price`. |
| Cuenta default vendedor | Índice único filtrado: a lo sumo una cuenta con `is_default = 1` por usuario (`is_default` por defecto `0` en inserción). |

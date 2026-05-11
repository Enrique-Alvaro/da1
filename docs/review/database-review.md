# Revisión de esquema — CrownBid MVP

**Estado:** APPROVED_WITH_MINOR_CORRECTIONS

## Correcciones aplicadas (resumen)

- **auctioneers:** alineado al contrato API (`first_name`, `last_name`, `license_number`, `region`); índice único en `license_number`.
- **bids:** índice único filtrado `UX_bids_one_winning_per_item` + comentario sobre flujo transaccional con `auction_items.current_bid`.
- **auction_items:** `current_bid` `NOT NULL DEFAULT 0`, descripción extendida; `CHECK` de no negatividad en `base_price` y `current_bid`; índice `IX_auction_items_status`.
- **Montos:** restricciones `CHECK` en `winner_payments`, `seller_settlements`, `insurance_policies`, `reserved_amount` en `payment_methods`.
- **item_submissions:** columna `auction_item_id` (nullable) + FK al ítem de catálogo definitivo; índice por `status`.
- **Índices adicionales:** sesiones por subasta, hash de reset de contraseña, expiración de tokens revocados, imágenes/componentes de publicaciones, componentes de lotes.
- **seller_payout_accounts:** índice único filtrado para una sola cuenta default por usuario; default de `is_default` pasado a `0` para evitar violaciones al insertar varias cuentas.

## Validaciones que siguen en backend (no en BD)

- Mínimo **6 imágenes** por publicación de ítem.
- Reglas de puja **min/max** (porcentajes sobre `base_price` salvo subastas oro/platino).
- Medio de pago **verificado** antes de pujar y demás reglas de negocio del contrato.
- **Cambio obligatorio** de contraseña temporal en primer acceso.
- Acceso por **categoría** de usuario vs `auctions.category_required`.

# Auction Closing Backend Flow Implementation Report

**Fecha:** 2026-05-23  
**Estado:** `AUCTION_CLOSING_FLOW_READY_WITH_SCHEMA_LIMITATIONS`  
**Base de datos:** sin cambios (esquema del profesor únicamente)

---

## 1. Executive summary

Se implementó el cierre/adjudicación de ítems de subasta usando **solo tablas existentes**: `pujos` (ganador), `itemsCatalogo.subastado`, `registroDeSubasta` (venta), más endpoints de consulta, compras del usuario y campos extra en `/live`.

### Hallazgos clave

1. **`itemId` = `itemsCatalogo.identificador`** (consistente con pujas).
2. **Ganador:** mayor `importe`; empate → puja con **menor** `identificador` (más antigua).
3. **Sin pujas:** compra empresa a `precioBase`; requiere `COMPANY_CLIENT_ID` en `.env` para persistir `registroDeSubasta`.
4. **Comisión:** valor fijo de `itemsCatalogo.comision` (no % calculado) — `NO_COMMISSION_PERCENTAGE_SCHEMA`.
5. **Envío:** siempre `0` — `NO_SHIPPING_SCHEMA_SUPPORT`.
6. **Medio de pago:** no se guarda en `pujos`; opcional en body al cerrar — `NO_PAYMENT_METHOD_ON_BID`.
7. **No se transfiere dueño** en `productos` — `AMBIGUOUS_OWNERSHIP_UPDATE`.
8. **`finalizedAt`** derivado en respuesta API, no persistido — `NO_PERSISTED_FINALIZATION_TIMESTAMP`.
9. **Estado de pago** de compras: `unknown` — `NO_PURCHASE_STATUS_SUPPORT`.
10. **Tests:** 110 passing.

---

## 2. Implemented endpoints

| Method | Route | Auth | Purpose | Status |
|--------|-------|------|---------|--------|
| POST | `/api/subastas/:id/items/:itemId/cerrar` | Empleado | Cerrar/adjudicar ítem | OK |
| GET | `/api/subastas/:id/items/:itemId/resultado` | Bearer | Resultado / pantalla vendido | OK |
| POST | `/api/auctions/:auctionId/items/:itemId/close` | Empleado | Alias inglés | OK |
| GET | `/api/auctions/:auctionId/items/:itemId/result` | Bearer | Alias inglés | OK |
| GET | `/api/users/me/purchases` | Cliente | Compras/ganadas | OK |
| GET | `/api/users/me/metrics` | Bearer | Ya existía; usa `registroDeSubasta` | OK |
| GET | `/api/subastas/:id/live` | Cliente | + `isFinalized`, `resultType`, etc. | OK |

---

## 3. Business rules enforced

| Rule | Where enforced | Status |
|------|----------------|--------|
| Solo empleado cierra | `assertEmployeeCanClose` + `requireEmployeeAuth` | OK |
| Ítem pertenece a subasta | `findItemCloseContext` | OK |
| No doble cierre | TX + `registroDeSubasta` + `subastado` | OK |
| Mayor puja gana | `findWinningBidForClose` | OK |
| Sin pujas → empresa a base | `closeAuctionItem` + `COMPANY_CLIENT_ID` | Parcial |
| Marcar `subastado=si` | `persistItemClose` / `markItemSoldOnly` | OK |
| Marcar `pujos.ganador` | UPDATE en TX | OK |
| Insert `registroDeSubasta` | TX | OK |
| Medio verificado al cerrar (opcional) | `assertPaymentMethodForBid` | OK si envían `paymentMethodId` |
| Cliente no cierra | 403 `NO_PERMISSION_TO_CLOSE_AUCTION` | OK |
| Métricas `totalWins` | `users-metrics.repository` | OK |

---

## 4. Existing schema usage

| Requirement | Existing table/columns used | Notes |
|-------------|----------------------------|-------|
| Venta registrada | `registroDeSubasta` (subasta, duenio, producto, cliente, importe, comision) | Sin FK a medio de pago |
| Ítem vendido | `itemsCatalogo.subastado` = `si` | |
| Ganador de puja | `pujos.ganador` = `si`/`no` | |
| Monto final | `pujos.importe` o `precioBase` | |
| Comisión | `itemsCatalogo.comision` → `registroDeSubasta.comision` | Monto fijo del ítem |
| Dueño vendedor | `productos.duenio` → `registroDeSubasta.duenio` | No cambia al comprador |
| Empresa sin pujas | `clientes` vía `COMPANY_CLIENT_ID` env | Auxiliar config, no columna nueva |

---

## 5. Schema limitations

| Requirement | Existing schema support | Implemented approximation | Limitation label | Future ideal change |
|-------------|-------------------------|---------------------------|------------------|---------------------|
| Medio de pago en venta | No en `pujos` ni `registroDeSubasta` | Body opcional `paymentMethodId` al cerrar | `NO_PAYMENT_METHOD_ON_BID` | Columna o tabla puja–medio |
| Envío | No existe | `shippingAmount: 0` | `NO_SHIPPING_SCHEMA_SUPPORT` | Columna envío en registro |
| Comisión % sobre monto | Solo monto fijo en ítem | Usar `itemsCatalogo.comision` | `NO_COMMISSION_PERCENTAGE_SCHEMA` | Regla % en servicio o columna |
| Compra empresa sin pujas | `registroDeSubasta.cliente` obligatorio | `COMPANY_CLIENT_ID` en env; si falta solo `subastado` | `PARTIAL_COMPANY_PURCHASE_SUPPORT` | Cliente sistema en seed |
| Transferencia de dueño | `productos.duenio` = vendedor | No UPDATE | `AMBIGUOUS_OWNERSHIP_UPDATE` | Modelo post-venta |
| Timestamp cierre | No existe | ISO en JSON respuesta | `NO_PERSISTED_FINALIZATION_TIMESTAMP` | `finalizadoEn` |
| Estado pago compra | No existe | `status: "unknown"` | `NO_PURCHASE_STATUS_SUPPORT` | Estados de pago |
| Multa 10% / bloqueo | No existe | Fuera de alcance | `SCHEMA_LIMITATION` | Tabla multas |
| Garantía post-adjudicación | `montoDisponible` cheque | Solo validación opcional al cerrar | `PARTIAL_GUARANTEE_SUPPORT` | Descuento al adjudicar |

---

## 6. Error handling

| Code | HTTP |
|------|------|
| `AUCTION_NOT_FOUND` | 404 |
| `ITEM_NOT_FOUND` | 404 |
| `ITEM_ALREADY_FINALIZED` | 409 |
| `NO_PERMISSION_TO_CLOSE_AUCTION` | 403 |
| `PAYMENT_METHOD_NOT_FOUND` | 404 |
| `PAYMENT_METHOD_NOT_VERIFIED` / pendiente / rechazado | 409 |
| `GUARANTEE_LIMIT_EXCEEDED` | 409 |
| `PAYMENT_METHOD_CURRENCY_MISMATCH` | 409 |

---

## 7. Tests added/updated

| Archivo | Escenarios |
|---------|------------|
| `tests/auction-closing-flow.test.ts` | Cierre con/sin pujas, permisos, 404, doble cierre, resultado, compras, métricas, medio opcional |
| `tests/live-auction-flow.test.ts` | Mock `findRegistroByProductoAndSubasta` en live |

**Total:** 110 tests passing.

---

## 8. Manual QA checklist

1. `POST /api/auth/employee/login`
2. (SQL) `UPDATE clientes SET admitido='si'` + verificar medio de pago
3. Cliente: `POST .../live/session` → `POST .../pujos`
4. Empleado: `POST /api/subastas/10/items/100/cerrar` (body opcional `{ "paymentMethodId": 3 }`)
5. `GET .../items/100/resultado` → `BIDDER_WON`, totales
6. `GET /api/subastas/10/live` → `isFinalized: true`
7. `GET /api/users/me/metrics` → `totalWins` ≥ 1
8. `GET /api/users/me/purchases` → ítem ganado
9. Repetir cierre → 409 o mismo registro idempotente si ya existe
10. Cerrar ítem sin pujas con `COMPANY_CLIENT_ID` configurado → `COMPANY_PURCHASED`

---

## 9. Known limitations

- Sin cambio de `productos.duenio` al comprador.
- `registroDeSubasta` no almacena medio de pago ni fecha.
- Empresa sin pujas sin `COMPANY_CLIENT_ID`: solo `subastado=si`, sin registro.
- Comisión mínima 0.02 en registro empresa por CHECK `comision > 0.01`.
- Multas y bloqueos: fase futura.

---

## 10. Recommended next phase

**Publicación de artículos por usuario + inspección empresa** (ya parcialmente implementado): motivos de rechazo persistidos si el profesor autoriza extensión documentada, aceptación de precio/comisión por dueño, y alineación completa de `api-docs.md`.

---

## Archivos principales

- `apps/api/src/modules/subastas/subastas-closing.*`
- `apps/api/src/modules/users/users-purchases.*`
- `apps/api/src/modules/subastas/subastas.service.ts` (live)
- `apps/api/src/modules/subastas/subastas.routes.ts`
- `apps/api/src/modules/auctions/auctions.routes.ts`
- `apps/api/src/config/env.ts` (`COMPANY_CLIENT_ID`)

---

*Fin del informe.*

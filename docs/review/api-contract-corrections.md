# Ajustes de contrato API — item submissions

## Contexto

Cuando un usuario tiene **varias** publicaciones en curso, rutas sin identificador de publicación resultan ambiguas.

## Cambios acordados

| Antes | Después |
|--------|---------|
| `POST /item-submissions/terms-decision` | `POST /item-submissions/{submissionId}/terms-decision` |
| `POST /item-submissions/shipment` | `POST /item-submissions/{submissionId}/shipment` |

El **`submissionId`** en la ruta identifica de forma inequívoca la publicación sobre la que se aceptan/rechazan términos o se registra el envío físico.

## Fuente en el repo

La documentación editable `docs/api/api-docs.md` fue actualizada con estas rutas. Si en el futuro el contrato oficial se genera solo desde OpenAPI, regenerar el artefacto y volver a aplicar el mismo criterio de rutas con parámetro.

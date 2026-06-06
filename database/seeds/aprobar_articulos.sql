-- Aprueba todos los artículos en estado pending_review (disponible = 'no')
-- Equivale a la decisión del admin: POST /api/admin/items/submissions/:id/accept
SET NOCOUNT ON;

DECLARE @revisor INT = (SELECT TOP 1 identificador FROM dbo.empleados);

UPDATE dbo.productos
SET disponible = N'si',
    revisor    = @revisor
WHERE disponible = N'no'
  AND NOT EXISTS (
    SELECT 1 FROM dbo.itemsCatalogo ic WHERE ic.producto = dbo.productos.identificador
  );

PRINT CAST(@@ROWCOUNT AS varchar) + ' artículo(s) aprobado(s).';

-- Estado final de todos los productos
SELECT
  p.identificador,
  LEFT(p.descripcionCatalogo, 60) AS descripcion,
  p.disponible,
  CASE
    WHEN EXISTS (SELECT 1 FROM dbo.registroDeSubasta r WHERE r.producto = p.identificador) THEN 'sold'
    WHEN EXISTS (SELECT 1 FROM dbo.itemsCatalogo ic WHERE ic.producto = p.identificador)   THEN 'scheduled'
    WHEN p.disponible = N'si'                                                               THEN 'approved'
    ELSE 'pending_review'
  END AS status
FROM dbo.productos p
ORDER BY p.identificador;

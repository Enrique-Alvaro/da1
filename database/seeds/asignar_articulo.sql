-- ============================================================
-- Asignar artículo aprobado a una subasta
-- Ajustá las variables de la sección PARÁMETROS según necesites
-- ============================================================
SET NOCOUNT ON;
GO

-- ─── PARÁMETROS ───────────────────────────────────────────
DECLARE @productoId   INT            = 14;        -- ID del producto a asignar
DECLARE @subastaId    INT            = 1;         -- ID de la subasta destino
DECLARE @precioBase   DECIMAL(18,2)  = 150000.00; -- Precio base fijado por la empresa
DECLARE @comision     DECIMAL(18,2)  = 15000.00;  -- Comisión (ej: 10% del precio base)
DECLARE @responsable  INT            = 1;         -- ID del empleado responsable
-- ──────────────────────────────────────────────────────────

-- Validaciones previas
IF NOT EXISTS (SELECT 1 FROM dbo.productos WHERE identificador = @productoId AND disponible = 'si')
BEGIN
  RAISERROR('El producto %d no existe o no está aprobado (disponible = si).', 16, 1, @productoId);
  RETURN;
END

IF EXISTS (SELECT 1 FROM dbo.itemsCatalogo ic
           JOIN dbo.catalogos c ON c.identificador = ic.catalogo
           WHERE ic.producto = @productoId AND c.subasta = @subastaId)
BEGIN
  RAISERROR('El producto %d ya está asignado a la subasta %d.', 16, 1, @productoId, @subastaId);
  RETURN;
END

IF NOT EXISTS (SELECT 1 FROM dbo.subastas WHERE identificador = @subastaId)
BEGIN
  RAISERROR('La subasta %d no existe.', 16, 1, @subastaId);
  RETURN;
END

-- Obtener o crear catálogo para la subasta
DECLARE @catalogoId INT;

SELECT @catalogoId = identificador
FROM dbo.catalogos
WHERE subasta = @subastaId;

IF @catalogoId IS NULL
BEGIN
  INSERT INTO dbo.catalogos (descripcion, subasta, responsable)
  SELECT N'Catálogo Subasta #' + CAST(@subastaId AS varchar), @subastaId, @responsable;

  SET @catalogoId = SCOPE_IDENTITY();
  PRINT 'Catálogo creado: ID ' + CAST(@catalogoId AS varchar);
END
ELSE
BEGIN
  PRINT 'Usando catálogo existente: ID ' + CAST(@catalogoId AS varchar);
END

-- Asignar el producto al catálogo
INSERT INTO dbo.itemsCatalogo (catalogo, producto, precioBase, comision, subastado)
VALUES (@catalogoId, @productoId, @precioBase, @comision, N'no');

PRINT 'Producto #' + CAST(@productoId AS varchar) + ' asignado correctamente.';

-- Resultado: info completa del artículo asignado
SELECT
  p.identificador                          AS producto_id,
  p.descripcionCatalogo                    AS descripcion,
  s.identificador                          AS subasta_id,
  CONVERT(varchar, s.fecha, 23)            AS fecha_subasta,
  s.categoria,
  s.moneda,
  s.ubicacion,
  ic.precioBase,
  ic.comision,
  CAST(ic.comision / ic.precioBase * 100 AS DECIMAL(5,2)) AS comision_pct
FROM dbo.itemsCatalogo ic
JOIN dbo.productos  p ON p.identificador  = ic.producto
JOIN dbo.catalogos  c ON c.identificador  = ic.catalogo
JOIN dbo.subastas   s ON s.identificador  = c.subasta
WHERE ic.producto = @productoId
  AND c.subasta   = @subastaId;
GO

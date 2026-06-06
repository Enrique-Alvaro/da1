-- Seed: productos, catálogos e ítems para las subastas de ejemplo
-- Usa el empleado ID=1 (revisor/responsable) y duenio ID=7 que ya existen.
-- Copia las fotos del producto 1 para cada producto nuevo.
SET NOCOUNT ON;
GO

-- ─────────────────────────────────────────────
-- 1. PRODUCTOS (descripcionCompleta = URL dummy)
-- ─────────────────────────────────────────────
DECLARE @revisor INT = 1;
DECLARE @duenio  INT = 7;
DECLARE @hoy     DATE = CAST(GETDATE() AS date);

INSERT INTO dbo.productos (fecha, disponible, descripcionCatalogo, descripcionCompleta, revisor, duenio)
VALUES
  (@hoy, N'si', N'Reloj de bolsillo dorado | Pieza del siglo XIX, mecanismo original, estado excepcional',          N'https://crownbid.local/docs/prod-101', @revisor, @duenio),
  (@hoy, N'si', N'Pintura al óleo | "Amanecer en la Pampa", 1923, firmada y certificada',                            N'https://crownbid.local/docs/prod-102', @revisor, @duenio),
  (@hoy, N'si', N'Collar de perlas naturales | 47 perlas, cierre de oro 18k, largo 55 cm',                          N'https://crownbid.local/docs/prod-103', @revisor, @duenio),
  (@hoy, N'si', N'Escultura de mármol | "Figura Femenina", firmada, siglo XX, 42 cm',                               N'https://crownbid.local/docs/prod-104', @revisor, @duenio),
  (@hoy, N'si', N'Colección de monedas antiguas | 24 piezas de plata, siglo XVIII, con certificado',                N'https://crownbid.local/docs/prod-105', @revisor, @duenio),
  (@hoy, N'si', N'Reloj Rolex Submariner | Ref. 1680, año 1973, caja y papeles originales',                         N'https://crownbid.local/docs/prod-106', @revisor, @duenio),
  (@hoy, N'si', N'Tapiz persa Tabriz | 3 m × 2 m, lana y seda, siglo XIX, estado muy bueno',                       N'https://crownbid.local/docs/prod-107', @revisor, @duenio),
  (@hoy, N'si', N'Violín del siglo XVIII | Madera de arce y pino, clavijero de ébano, restaurado',                  N'https://crownbid.local/docs/prod-108', @revisor, @duenio),
  (@hoy, N'si', N'Broche Art Déco | Platino, diamantes y zafiros, circa 1930, tasado en $28.000 USD',               N'https://crownbid.local/docs/prod-109', @revisor, @duenio),
  (@hoy, N'si', N'Cómoda Luis XV | Madera de nogal con marquetería, herrajes de bronce, siglo XVIII',               N'https://crownbid.local/docs/prod-110', @revisor, @duenio),
  (@hoy, N'si', N'Porcelana Meissen | Juego de té 12 servicios, decoración floral, circa 1890',                     N'https://crownbid.local/docs/prod-111', @revisor, @duenio),
  (@hoy, N'si', N'Litografía firmada Picasso | "Tête de Femme", 1962, numerada 47/200 con certificado',             N'https://crownbid.local/docs/prod-112', @revisor, @duenio);
GO

-- ─────────────────────────────────────────────
-- 2. FOTOS — copiar las 6 fotos del producto 1
--    a cada producto nuevo
-- ─────────────────────────────────────────────
DECLARE @minId INT = (SELECT MIN(identificador) FROM dbo.productos WHERE descripcionCompleta LIKE N'https://crownbid.local/docs/prod-%');
DECLARE @maxId INT = (SELECT MAX(identificador) FROM dbo.productos WHERE descripcionCompleta LIKE N'https://crownbid.local/docs/prod-%');
DECLARE @cur   INT = @minId;

WHILE @cur <= @maxId
BEGIN
  INSERT INTO dbo.fotos (producto, foto)
  SELECT @cur, foto FROM dbo.fotos WHERE producto = 1;
  SET @cur = @cur + 1;
END;
GO

-- ─────────────────────────────────────────────
-- 3. CATÁLOGOS (uno por subasta seleccionada)
-- ─────────────────────────────────────────────
DECLARE @resp INT = 1;  -- empleado responsable

INSERT INTO dbo.catalogos (descripcion, subasta, responsable)
VALUES
  (N'Subasta de Reliquias y Antigüedades — Junio 2026',  1,  @resp),  -- scheduled comun  ARS
  (N'Colección Arte Argentino Siglo XX',                 2,  @resp),  -- scheduled especial ARS
  (N'Joyas y Alta Relojería Internacional',              3,  @resp),  -- scheduled plata  USD
  (N'Mobiliario Europeo de Época',                       4,  @resp),  -- scheduled oro    ARS
  (N'Instrumentos y Arte Clásico',                       5,  @resp),  -- scheduled platino USD
  (N'Subasta en Vivo — Lote General',                    9,  @resp),  -- live       comun  ARS
  (N'Subasta en Vivo — Joyas y Relojes',                10,  @resp),  -- live       plata  USD
  (N'Cierre — Colección Privada Buenos Aires',          11,  @resp);  -- closed     oro    ARS
GO

-- ─────────────────────────────────────────────
-- 4. ITEMS DE CATÁLOGO
--    Mapeo: catalogo → productos asignados
-- ─────────────────────────────────────────────

-- Catálogo 1 (subasta 1, comun, ARS) — IDs de catálogos son identidad, busco por subasta
INSERT INTO dbo.itemsCatalogo (catalogo, producto, precioBase, comision, subastado)
SELECT c.identificador, p.identificador, p.precioBase, p.comision, N'no'
FROM (VALUES
  (1, 2,  45000.00,  4500.00),  -- catalogo subasta 1, producto 2 (pintura)
  (1, 1, 180000.00, 18000.00)   -- catalogo subasta 1, producto 1 (reloj bolsillo)
) AS v(subasta, prod_offset, precioBase, comision)
JOIN dbo.catalogos c ON c.subasta = v.subasta
CROSS JOIN (
  SELECT identificador,
         ROW_NUMBER() OVER (ORDER BY identificador) AS rn
  FROM dbo.productos
  WHERE descripcionCompleta LIKE N'https://crownbid.local/docs/prod-%'
) AS p
WHERE p.rn = v.prod_offset;

INSERT INTO dbo.itemsCatalogo (catalogo, producto, precioBase, comision, subastado)
SELECT c.identificador, p.identificador, v.precioBase, v.comision, N'no'
FROM (VALUES
  (2, 3,  85000.00,  8500.00),  -- catalogo subasta 2, producto 3 (collar)
  (2, 4, 120000.00, 12000.00)   -- catalogo subasta 2, producto 4 (escultura)
) AS v(subasta, prod_offset, precioBase, comision)
JOIN dbo.catalogos c ON c.subasta = v.subasta
CROSS JOIN (
  SELECT identificador, ROW_NUMBER() OVER (ORDER BY identificador) AS rn
  FROM dbo.productos WHERE descripcionCompleta LIKE N'https://crownbid.local/docs/prod-%'
) AS p
WHERE p.rn = v.prod_offset;

INSERT INTO dbo.itemsCatalogo (catalogo, producto, precioBase, comision, subastado)
SELECT c.identificador, p.identificador, v.precioBase, v.comision, N'no'
FROM (VALUES
  (3, 5,  4200.00,  420.00),   -- catalogo subasta 3, producto 5 (monedas)
  (3, 6, 32000.00, 3200.00)    -- catalogo subasta 3, producto 6 (rolex)
) AS v(subasta, prod_offset, precioBase, comision)
JOIN dbo.catalogos c ON c.subasta = v.subasta
CROSS JOIN (
  SELECT identificador, ROW_NUMBER() OVER (ORDER BY identificador) AS rn
  FROM dbo.productos WHERE descripcionCompleta LIKE N'https://crownbid.local/docs/prod-%'
) AS p
WHERE p.rn = v.prod_offset;

INSERT INTO dbo.itemsCatalogo (catalogo, producto, precioBase, comision, subastado)
SELECT c.identificador, p.identificador, v.precioBase, v.comision, N'no'
FROM (VALUES
  (4, 7,  95000.00,  9500.00),  -- catalogo subasta 4, producto 7 (tapiz)
  (4, 8,  28000.00,  2800.00),  -- catalogo subasta 4, producto 8 (violin)
  (4, 9,  75000.00,  7500.00)   -- catalogo subasta 4, producto 9 (broche)
) AS v(subasta, prod_offset, precioBase, comision)
JOIN dbo.catalogos c ON c.subasta = v.subasta
CROSS JOIN (
  SELECT identificador, ROW_NUMBER() OVER (ORDER BY identificador) AS rn
  FROM dbo.productos WHERE descripcionCompleta LIKE N'https://crownbid.local/docs/prod-%'
) AS p
WHERE p.rn = v.prod_offset;

INSERT INTO dbo.itemsCatalogo (catalogo, producto, precioBase, comision, subastado)
SELECT c.identificador, p.identificador, v.precioBase, v.comision, N'no'
FROM (VALUES
  (5, 10, 145000.00, 14500.00),  -- catalogo subasta 5, producto 10 (comoda)
  (5, 11,  18000.00,  1800.00),  -- catalogo subasta 5, producto 11 (porcelana)
  (5, 12,  62000.00,  6200.00)   -- catalogo subasta 5, producto 12 (litografia)
) AS v(subasta, prod_offset, precioBase, comision)
JOIN dbo.catalogos c ON c.subasta = v.subasta
CROSS JOIN (
  SELECT identificador, ROW_NUMBER() OVER (ORDER BY identificador) AS rn
  FROM dbo.productos WHERE descripcionCompleta LIKE N'https://crownbid.local/docs/prod-%'
) AS p
WHERE p.rn = v.prod_offset;

INSERT INTO dbo.itemsCatalogo (catalogo, producto, precioBase, comision, subastado)
SELECT c.identificador, p.identificador, v.precioBase, v.comision, N'no'
FROM (VALUES
  (9,  1, 55000.00,  5500.00),  -- catalogo subasta 9 (live comun), producto 1
  (9,  2, 38000.00,  3800.00),  -- catalogo subasta 9 (live comun), producto 2
  (9,  3, 92000.00,  9200.00),  -- catalogo subasta 9 (live comun), producto 3
  (9,  4, 47000.00,  4700.00)   -- catalogo subasta 9 (live comun), producto 4
) AS v(subasta, prod_offset, precioBase, comision)
JOIN dbo.catalogos c ON c.subasta = v.subasta
CROSS JOIN (
  SELECT identificador, ROW_NUMBER() OVER (ORDER BY identificador) AS rn
  FROM dbo.productos WHERE descripcionCompleta LIKE N'https://crownbid.local/docs/prod-%'
) AS p
WHERE p.rn = v.prod_offset;

INSERT INTO dbo.itemsCatalogo (catalogo, producto, precioBase, comision, subastado)
SELECT c.identificador, p.identificador, v.precioBase, v.comision, N'no'
FROM (VALUES
  (10, 5, 3800.00,  380.00),   -- catalogo subasta 10 (live plata), producto 5
  (10, 6, 29500.00, 2950.00)   -- catalogo subasta 10 (live plata), producto 6
) AS v(subasta, prod_offset, precioBase, comision)
JOIN dbo.catalogos c ON c.subasta = v.subasta
CROSS JOIN (
  SELECT identificador, ROW_NUMBER() OVER (ORDER BY identificador) AS rn
  FROM dbo.productos WHERE descripcionCompleta LIKE N'https://crownbid.local/docs/prod-%'
) AS p
WHERE p.rn = v.prod_offset;

INSERT INTO dbo.itemsCatalogo (catalogo, producto, precioBase, comision, subastado)
SELECT c.identificador, p.identificador, v.precioBase, v.comision, N'si'
FROM (VALUES
  (11, 7,  88000.00,  8800.00),  -- catalogo subasta 11 (closed oro), producto 7 — subastado
  (11, 8,  24000.00,  2400.00),  -- catalogo subasta 11 (closed oro), producto 8 — subastado
  (11, 9,  71000.00,  7100.00)   -- catalogo subasta 11 (closed oro), producto 9 — subastado
) AS v(subasta, prod_offset, precioBase, comision)
JOIN dbo.catalogos c ON c.subasta = v.subasta
CROSS JOIN (
  SELECT identificador, ROW_NUMBER() OVER (ORDER BY identificador) AS rn
  FROM dbo.productos WHERE descripcionCompleta LIKE N'https://crownbid.local/docs/prod-%'
) AS p
WHERE p.rn = v.prod_offset;
GO

-- ─────────────────────────────────────────────
-- 5. VERIFICACIÓN FINAL
-- ─────────────────────────────────────────────
SELECT
  s.identificador        AS subasta_id,
  CASE
    WHEN LOWER(LTRIM(RTRIM(s.estado))) = 'abierta' THEN 'live'
    WHEN LOWER(LTRIM(RTRIM(s.estado))) = 'carrada' THEN 'closed'
    ELSE 'scheduled'
  END                    AS status,
  s.categoria,
  s.moneda,
  c.identificador        AS catalogo_id,
  COUNT(ic.identificador) AS total_items
FROM dbo.subastas s
JOIN dbo.catalogos c ON c.subasta = s.identificador
JOIN dbo.itemsCatalogo ic ON ic.catalogo = c.identificador
GROUP BY s.identificador, s.estado, s.categoria, s.moneda, c.identificador
ORDER BY s.identificador;
GO

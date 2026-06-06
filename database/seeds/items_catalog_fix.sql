-- Fix: insertar itemsCatalogo (los productos y catálogos ya existen)
SET NOCOUNT ON;
GO

-- Obtenemos los IDs de productos seed en orden
DECLARE @p1  INT, @p2  INT, @p3  INT, @p4  INT,
        @p5  INT, @p6  INT, @p7  INT, @p8  INT,
        @p9  INT, @p10 INT, @p11 INT, @p12 INT;

SELECT
  @p1  = MAX(CASE WHEN rn =  1 THEN identificador END),
  @p2  = MAX(CASE WHEN rn =  2 THEN identificador END),
  @p3  = MAX(CASE WHEN rn =  3 THEN identificador END),
  @p4  = MAX(CASE WHEN rn =  4 THEN identificador END),
  @p5  = MAX(CASE WHEN rn =  5 THEN identificador END),
  @p6  = MAX(CASE WHEN rn =  6 THEN identificador END),
  @p7  = MAX(CASE WHEN rn =  7 THEN identificador END),
  @p8  = MAX(CASE WHEN rn =  8 THEN identificador END),
  @p9  = MAX(CASE WHEN rn =  9 THEN identificador END),
  @p10 = MAX(CASE WHEN rn = 10 THEN identificador END),
  @p11 = MAX(CASE WHEN rn = 11 THEN identificador END),
  @p12 = MAX(CASE WHEN rn = 12 THEN identificador END)
FROM (
  SELECT identificador, ROW_NUMBER() OVER (ORDER BY identificador) AS rn
  FROM dbo.productos
  WHERE descripcionCompleta LIKE N'https://crownbid.local/docs/prod-%'
) AS t;

-- Catálogos por subasta
DECLARE @c1  INT = (SELECT identificador FROM dbo.catalogos WHERE subasta =  1),
        @c2  INT = (SELECT identificador FROM dbo.catalogos WHERE subasta =  2),
        @c3  INT = (SELECT identificador FROM dbo.catalogos WHERE subasta =  3),
        @c4  INT = (SELECT identificador FROM dbo.catalogos WHERE subasta =  4),
        @c5  INT = (SELECT identificador FROM dbo.catalogos WHERE subasta =  5),
        @c9  INT = (SELECT identificador FROM dbo.catalogos WHERE subasta =  9),
        @c10 INT = (SELECT identificador FROM dbo.catalogos WHERE subasta = 10),
        @c11 INT = (SELECT identificador FROM dbo.catalogos WHERE subasta = 11);

-- Catálogo 1 — subasta 1 (scheduled, comun, ARS)
INSERT INTO dbo.itemsCatalogo (catalogo, producto, precioBase, comision, subastado) VALUES
  (@c1, @p1, 180000.00, 18000.00, N'no'),
  (@c1, @p2,  45000.00,  4500.00, N'no');

-- Catálogo 2 — subasta 2 (scheduled, especial, ARS)
INSERT INTO dbo.itemsCatalogo (catalogo, producto, precioBase, comision, subastado) VALUES
  (@c2, @p3,  85000.00,  8500.00, N'no'),
  (@c2, @p4, 120000.00, 12000.00, N'no');

-- Catálogo 3 — subasta 3 (scheduled, plata, USD)
INSERT INTO dbo.itemsCatalogo (catalogo, producto, precioBase, comision, subastado) VALUES
  (@c3, @p5,   4200.00,   420.00, N'no'),
  (@c3, @p6,  32000.00,  3200.00, N'no');

-- Catálogo 4 — subasta 4 (scheduled, oro, ARS)
INSERT INTO dbo.itemsCatalogo (catalogo, producto, precioBase, comision, subastado) VALUES
  (@c4, @p7,  95000.00,  9500.00, N'no'),
  (@c4, @p8,  28000.00,  2800.00, N'no'),
  (@c4, @p9,  75000.00,  7500.00, N'no');

-- Catálogo 5 — subasta 5 (scheduled, platino, USD)
INSERT INTO dbo.itemsCatalogo (catalogo, producto, precioBase, comision, subastado) VALUES
  (@c5, @p10, 145000.00, 14500.00, N'no'),
  (@c5, @p11,  18000.00,  1800.00, N'no'),
  (@c5, @p12,  62000.00,  6200.00, N'no');

-- Catálogo 9 — subasta 9 (live, comun, ARS)
INSERT INTO dbo.itemsCatalogo (catalogo, producto, precioBase, comision, subastado) VALUES
  (@c9, @p1,  55000.00,  5500.00, N'no'),
  (@c9, @p2,  38000.00,  3800.00, N'no'),
  (@c9, @p3,  92000.00,  9200.00, N'no'),
  (@c9, @p4,  47000.00,  4700.00, N'no');

-- Catálogo 10 — subasta 10 (live, plata, USD)
INSERT INTO dbo.itemsCatalogo (catalogo, producto, precioBase, comision, subastado) VALUES
  (@c10, @p5,   3800.00,   380.00, N'no'),
  (@c10, @p6,  29500.00,  2950.00, N'no');

-- Catálogo 11 — subasta 11 (closed, oro, ARS) — todos subastados
INSERT INTO dbo.itemsCatalogo (catalogo, producto, precioBase, comision, subastado) VALUES
  (@c11, @p7,  88000.00,  8800.00, N'si'),
  (@c11, @p8,  24000.00,  2400.00, N'si'),
  (@c11, @p9,  71000.00,  7100.00, N'si');
GO

-- Verificación
SELECT
  s.identificador AS subasta_id,
  CASE
    WHEN LOWER(LTRIM(RTRIM(s.estado))) = 'abierta' THEN 'live'
    WHEN LOWER(LTRIM(RTRIM(s.estado))) = 'carrada' THEN 'closed'
    ELSE 'scheduled'
  END             AS status,
  s.categoria,
  s.moneda,
  COUNT(ic.identificador) AS items
FROM dbo.subastas s
JOIN dbo.catalogos c      ON c.subasta  = s.identificador
JOIN dbo.itemsCatalogo ic ON ic.catalogo = c.identificador
GROUP BY s.identificador, s.estado, s.categoria, s.moneda
ORDER BY s.identificador;
GO

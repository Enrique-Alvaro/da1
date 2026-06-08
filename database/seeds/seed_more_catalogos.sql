-- Seed adicional: 15 catálogos con subastas y items de ejemplo
-- Ejecutar sobre la base CrownBid

SET NOCOUNT ON;

BEGIN TRANSACTION;

/* Reusa empleado 1000, subastador 2000 y duenio 3000 ya creados por seed_demo_subastas.sql */

-- Lista de catálogos a crear: nombre, ubicacion, categoria, producto, precioBase
DECLARE @data TABLE (nombreCatalogo NVARCHAR(250), ubicacion NVARCHAR(250), categoria VARCHAR(10), productoTitulo NVARCHAR(250), precio DECIMAL(18,2));

INSERT INTO @data VALUES
('Catálogo - Arte Moderno', 'Buenos Aires, AR', 'oro', 'Obra de Arte Moderno A', 1200.00),
('Catálogo - Pinturas Clásicas', 'Madrid, ES', 'platino', 'Pintura Clasica B', 3500.00),
('Catálogo - Joyería Fina', 'Londres, UK', 'oro', 'Collar de Perlas C', 800.00),
('Catálogo - Automóviles Clásicos', 'Turín, IT', 'platino', 'Fiat 500 Especial', 15000.00),
('Catálogo - Antigüedades', 'Roma, IT', 'plata', 'Escritorio Antiguo D', 2200.00),
('Catálogo - Mobiliario Vintage', 'Córdoba, AR', 'plata', 'Silla Vintage E', 450.00),
('Catálogo - Ropa de Diseñador', 'París, FR', 'oro', 'Vestido Couture F', 2800.00),
('Catálogo - Fotografía de Autor', 'Santiago, CL', 'especial', 'Fotografía G', 600.00),
('Catálogo - Instrumentos Musicales', 'Nashville, US', 'comun', 'Guitarra Vintage H', 900.00),
('Catálogo - Coleccionables', 'Zürich, CH', 'especial', 'Moneda Rara I', 400.00),
('Catálogo - Arte Contemporáneo', 'São Paulo, BR', 'oro', 'Escultura J', 1300.00),
('Catálogo - Fotografías Históricas', 'Lima, PE', 'comun', 'Foto Histórica K', 200.00),
('Catálogo - Muebles Clásicos', 'Bogotá, CO', 'plata', 'Mesa Clásica L', 1100.00),
('Catálogo - Diseño Industrial', 'Múnich, DE', 'especial', 'Lámpara de Diseño M', 750.00),
('Catálogo - Relojes Vintage', 'Ciudad de México, MX', 'oro', 'Reloj Vintage N', 950.00);

DECLARE @nombre NVARCHAR(250), @ubic NVARCHAR(250), @cat VARCHAR(10), @prod NVARCHAR(250), @precio DECIMAL(18,2);

DECLARE cur CURSOR FOR SELECT nombreCatalogo, ubicacion, categoria, productoTitulo, precio FROM @data;
OPEN cur;
FETCH NEXT FROM cur INTO @nombre, @ubic, @cat, @prod, @precio;
WHILE @@FETCH_STATUS = 0
BEGIN
  -- Crear subasta si no existe
  IF NOT EXISTS (SELECT 1 FROM dbo.subastas WHERE ubicacion = @ubic AND categoria = @cat)
  BEGIN
    INSERT INTO dbo.subastas (fecha, hora, estado, subastador, ubicacion, capacidadAsistentes, tieneDeposito, seguridadPropia, categoria)
    VALUES (DATEADD(day, 15, CAST(GETDATE() AS date)), '17:00:00', 'abierta', 2000, @ubic, 150, 'si', 'si', @cat);
  END

  DECLARE @subId INT = (SELECT TOP(1) identificador FROM dbo.subastas WHERE ubicacion = @ubic AND categoria = @cat ORDER BY identificador DESC);

  -- Crear catalogo vinculado a la subasta si no existe
  IF @subId IS NOT NULL
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.catalogos WHERE descripcion = @nombre AND subasta = @subId)
      INSERT INTO dbo.catalogos (descripcion, subasta, responsable) VALUES (@nombre, @subId, 1000);
  END

  DECLARE @catId INT = (SELECT TOP(1) identificador FROM dbo.catalogos WHERE descripcion = @nombre ORDER BY identificador DESC);

  -- Crear producto y item en itemsCatalogo
  IF @catId IS NOT NULL
  BEGIN
    INSERT INTO dbo.productos (fecha, disponible, descripcionCatalogo, descripcionCompleta, revisor, duenio, seguro)
    VALUES (GETDATE(), 'si', @nombre, CONCAT(@prod, ' - descripción de ejemplo.'), 1000, 3000, NULL);

    DECLARE @prodId INT = SCOPE_IDENTITY();
    IF @prodId IS NOT NULL
    BEGIN
      INSERT INTO dbo.itemsCatalogo (catalogo, producto, precioBase, comision, subastado)
      VALUES (@catId, @prodId, @precio, ROUND(@precio * 0.05, 2), 'no');
    END
  END

  FETCH NEXT FROM cur INTO @nombre, @ubic, @cat, @prod, @precio;
END

CLOSE cur;
DEALLOCATE cur;

COMMIT TRANSACTION;

SELECT 'SEED_MORE_DONE' AS status;

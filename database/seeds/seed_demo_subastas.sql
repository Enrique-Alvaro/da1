-- Seed demo: catálogos, subastas y items para mostrar en el inicio/mobile
-- Ejecutar sobre la base CrownBid

SET NOCOUNT ON;

BEGIN TRANSACTION;

-- Personas / empleados / subastador / duenio (usar identificadores fijos para referenciar fácilmente)
IF OBJECT_ID('dbo.personas', 'U') IS NOT NULL
BEGIN
  SET IDENTITY_INSERT dbo.personas ON;
  IF NOT EXISTS (SELECT 1 FROM dbo.personas WHERE identificador = 1000)
    INSERT INTO dbo.personas (identificador, documento, nombre, direccion, estado) VALUES (1000, 'EMP1000', 'Admin Empleado', 'Oficina 1', 'activo');
  IF NOT EXISTS (SELECT 1 FROM dbo.personas WHERE identificador = 2000)
    INSERT INTO dbo.personas (identificador, documento, nombre, direccion, estado) VALUES (2000, 'SUB2000', 'Christie''s International', 'Nueva York, NY', 'activo');
  IF NOT EXISTS (SELECT 1 FROM dbo.personas WHERE identificador = 3000)
    INSERT INTO dbo.personas (identificador, documento, nombre, direccion, estado) VALUES (3000, 'DUE3000', 'Dueño Demo', 'Calle Falsa 123', 'activo');
  SET IDENTITY_INSERT dbo.personas OFF;
END

-- Empleado (revisor / responsable)
IF OBJECT_ID('dbo.empleados', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dbo.empleados WHERE identificador = 1000)
    INSERT INTO dbo.empleados (identificador, cargo, sector) VALUES (1000, 'Revisor', NULL);
END

-- Subastador (usa persona 2000)
IF OBJECT_ID('dbo.subastadores', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dbo.subastadores WHERE identificador = 2000)
    INSERT INTO dbo.subastadores (identificador, matricula, region) VALUES (2000, 'MAT-CH-01', 'Internacional');
END

-- Duenio (usa persona 3000)
IF OBJECT_ID('dbo.duenios', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dbo.duenios WHERE identificador = 3000)
    INSERT INTO dbo.duenios (identificador, numeroPais, verificacionFinanciera, verificacionJudicial, calificacionRiesgo, verificador)
    VALUES (3000, 1, 'si', 'si', 3, 1000);
END

-- Productos demo (revisor = empleado 1000, duenio = 3000)
IF OBJECT_ID('dbo.productos', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dbo.productos WHERE descripcionCompleta LIKE '%Rolex Submariner%')
  BEGIN
    INSERT INTO dbo.productos (fecha, disponible, descripcionCatalogo, descripcionCompleta, revisor, duenio, seguro)
    VALUES (GETDATE(), 'si', 'Relojes de lujo - Rolex Submariner', 'Un Rolex Submariner de los años 60 en excelente condición. Incluye caja y papeles originales.', 1000, 3000, NULL);

    INSERT INTO dbo.productos (fecha, disponible, descripcionCatalogo, descripcionCompleta, revisor, duenio, seguro)
    VALUES (GETDATE(), 'si', 'Relojes de lujo - Omega Speedmaster', 'Omega Speedmaster profesional en buen estado, correa original.', 1000, 3000, NULL);
  END
END

-- Subasta demo (fecha > hoy + 10 dias)
IF OBJECT_ID('dbo.subastas', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dbo.subastas WHERE ubicacion = 'Nueva York, NY' AND categoria = 'plata')
  BEGIN
    INSERT INTO dbo.subastas (fecha, hora, estado, subastador, ubicacion, capacidadAsistentes, tieneDeposito, seguridadPropia, categoria)
    VALUES (DATEADD(day, 20, CAST(GETDATE() AS date)), '18:00:00', 'abierta', 2000, 'Nueva York, NY', 200, 'si', 'si', 'plata');
  END
END

-- Catalogo (vinculado a la subasta creada)
IF OBJECT_ID('dbo.catalogos', 'U') IS NOT NULL
BEGIN
  DECLARE @subastaId INT = (SELECT TOP(1) identificador FROM dbo.subastas WHERE ubicacion = 'Nueva York, NY' AND categoria = 'plata' ORDER BY identificador DESC);
  IF @subastaId IS NOT NULL
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.catalogos WHERE descripcion LIKE 'Catálogo - Relojes de lujo' AND subasta = @subastaId)
      INSERT INTO dbo.catalogos (descripcion, subasta, responsable) VALUES ('Catálogo - Relojes de lujo', @subastaId, 1000);
  END
END

-- ItemsCatalogo: vincular los productos creados al catálogo con precio base y comision
IF OBJECT_ID('dbo.itemsCatalogo', 'U') IS NOT NULL
BEGIN
  DECLARE @catalogoId INT = (SELECT TOP(1) identificador FROM dbo.catalogos WHERE descripcion LIKE 'Catálogo - Relojes de lujo' ORDER BY identificador DESC);
  DECLARE @prod1 INT = (SELECT TOP(1) identificador FROM dbo.productos WHERE descripcionCatalogo LIKE 'Relojes de lujo - Rolex Submariner' ORDER BY identificador DESC);
  DECLARE @prod2 INT = (SELECT TOP(1) identificador FROM dbo.productos WHERE descripcionCatalogo LIKE 'Relojes de lujo - Omega Speedmaster' ORDER BY identificador DESC);

  IF @catalogoId IS NOT NULL AND @prod1 IS NOT NULL
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.itemsCatalogo WHERE catalogo = @catalogoId AND producto = @prod1)
      INSERT INTO dbo.itemsCatalogo (catalogo, producto, precioBase, comision, subastado) VALUES (@catalogoId, @prod1, 500.00, 50.00, 'no');
  END

  IF @catalogoId IS NOT NULL AND @prod2 IS NOT NULL
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.itemsCatalogo WHERE catalogo = @catalogoId AND producto = @prod2)
      INSERT INTO dbo.itemsCatalogo (catalogo, producto, precioBase, comision, subastado) VALUES (@catalogoId, @prod2, 300.00, 30.00, 'no');
  END
END

COMMIT TRANSACTION;

SELECT 'SEED_DONE' AS status;

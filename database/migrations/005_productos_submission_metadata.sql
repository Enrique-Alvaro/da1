-- Product submission / consignment metadata (owner visibility + art fields).
-- Idempotent additive migration for CrownBid.

IF COL_LENGTH('dbo.productos', 'numeroPieza') IS NULL
BEGIN
  ALTER TABLE dbo.productos ADD numeroPieza NVARCHAR(50) NULL;
END
GO

IF COL_LENGTH('dbo.productos', 'artistaODisenador') IS NULL
BEGIN
  ALTER TABLE dbo.productos ADD artistaODisenador NVARCHAR(200) NULL;
END
GO

IF COL_LENGTH('dbo.productos', 'fechaOrigen') IS NULL
BEGIN
  ALTER TABLE dbo.productos ADD fechaOrigen NVARCHAR(50) NULL;
END
GO

IF COL_LENGTH('dbo.productos', 'historia') IS NULL
BEGIN
  ALTER TABLE dbo.productos ADD historia NVARCHAR(2000) NULL;
END
GO

IF COL_LENGTH('dbo.productos', 'componentes') IS NULL
BEGIN
  ALTER TABLE dbo.productos ADD componentes NVARCHAR(1000) NULL;
END
GO

IF COL_LENGTH('dbo.productos', 'depositoUbicacion') IS NULL
BEGIN
  ALTER TABLE dbo.productos ADD depositoUbicacion NVARCHAR(250) NULL;
END
GO

IF COL_LENGTH('dbo.productos', 'declaracionesJson') IS NULL
BEGIN
  ALTER TABLE dbo.productos ADD declaracionesJson NVARCHAR(MAX) NULL;
END
GO

IF COL_LENGTH('dbo.itemsCatalogo', 'numeroPieza') IS NULL
BEGIN
  ALTER TABLE dbo.itemsCatalogo ADD numeroPieza NVARCHAR(50) NULL;
END
GO

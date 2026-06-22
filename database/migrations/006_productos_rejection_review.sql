-- Rejection reason + employee review notes for submitted products.
IF COL_LENGTH('dbo.productos', 'motivoRechazo') IS NULL
BEGIN
  ALTER TABLE dbo.productos ADD motivoRechazo NVARCHAR(1000) NULL;
END
GO

IF COL_LENGTH('dbo.productos', 'notasRevision') IS NULL
BEGIN
  ALTER TABLE dbo.productos ADD notasRevision NVARCHAR(1000) NULL;
END
GO

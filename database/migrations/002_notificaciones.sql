-- Notificaciones in-app para clientes (aditivo, idempotente).
-- Ejecutar en la misma base que schema.sql / 001_medios_pago_subasta_moneda.sql.

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'dbo.notificaciones', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.notificaciones (
    identificador INT NOT NULL IDENTITY(1, 1),
    cliente INT NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    titulo NVARCHAR(200) NOT NULL,
    mensaje NVARCHAR(1000) NOT NULL,
    leida BIT NOT NULL CONSTRAINT DF_notificaciones_leida DEFAULT (0),
    auctionId INT NULL,
    itemId INT NULL,
    saleId INT NULL,
    paymentMethodId INT NULL,
    submissionId INT NULL,
    idempotencyKey NVARCHAR(120) NULL,
    creadoEn DATETIME2 NOT NULL CONSTRAINT DF_notificaciones_creadoEn DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_notificaciones PRIMARY KEY (identificador),
    CONSTRAINT FK_notificaciones_clientes FOREIGN KEY (cliente) REFERENCES dbo.clientes (identificador),
    CONSTRAINT UQ_notificaciones_idempotency UNIQUE (idempotencyKey)
  );
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_notificaciones_cliente_creadoEn'
    AND object_id = OBJECT_ID(N'dbo.notificaciones')
)
BEGIN
  CREATE INDEX IX_notificaciones_cliente_creadoEn
    ON dbo.notificaciones (cliente, creadoEn DESC);
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_notificaciones_cliente_leida'
    AND object_id = OBJECT_ID(N'dbo.notificaciones')
)
BEGIN
  CREATE INDEX IX_notificaciones_cliente_leida
    ON dbo.notificaciones (cliente, leida)
    WHERE leida = 0;
END
GO

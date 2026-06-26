-- Phase 1 — Medios de pago, moneda de subasta e índices únicos de asistentes.
-- Ejecutar en la misma base que database/schema.sql (p. ej. CrownBid).
-- Aditivo: no modifica tablas requeridas por el profesor salvo ADD COLUMN en subastas.
-- Idempotente: puede re-ejecutarse sin fallar si los objetos ya existen.

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* -------------------------------------------------------------------------- */
/* A. subastas.moneda (subastas no bimonetarias: ARS o USD)                   */
/* -------------------------------------------------------------------------- */
IF COL_LENGTH('dbo.subastas', 'moneda') IS NULL
BEGIN
  ALTER TABLE dbo.subastas
    ADD moneda VARCHAR(3) NOT NULL
      CONSTRAINT DF_subastas_moneda DEFAULT ('ARS');
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.check_constraints
  WHERE name = N'CK_subastas_moneda'
    AND parent_object_id = OBJECT_ID(N'dbo.subastas')
)
BEGIN
  ALTER TABLE dbo.subastas
    ADD CONSTRAINT CK_subastas_moneda CHECK (moneda IN ('ARS', 'USD'));
END
GO

/* -------------------------------------------------------------------------- */
/* B. mediosPago (garantías de pago del cliente; verificación por empleado)   */
/* -------------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.mediosPago', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.mediosPago (
    identificador INT NOT NULL IDENTITY(1, 1),
    cliente INT NOT NULL,
    tipo VARCHAR(30) NOT NULL,
    estado VARCHAR(20) NOT NULL
      CONSTRAINT DF_mediosPago_estado DEFAULT ('pendiente'),
    moneda VARCHAR(3) NOT NULL,
    titular NVARCHAR(150) NOT NULL,
    entidad NVARCHAR(150) NULL,
    ultimosDigitos VARCHAR(4) NULL,
    aliasOCbu NVARCHAR(50) NULL,
    montoGarantia DECIMAL(18, 2) NULL,
    montoDisponible DECIMAL(18, 2) NULL,
    motivoRechazo NVARCHAR(500) NULL,
    verificador INT NULL,
    creadoEn DATETIME2 NOT NULL
      CONSTRAINT DF_mediosPago_creadoEn DEFAULT (SYSUTCDATETIME()),
    actualizadoEn DATETIME2 NOT NULL
      CONSTRAINT DF_mediosPago_actualizadoEn DEFAULT (SYSUTCDATETIME()),
    verificadoEn DATETIME2 NULL,
    CONSTRAINT PK_mediosPago PRIMARY KEY (identificador),
    CONSTRAINT FK_mediosPago_clientes
      FOREIGN KEY (cliente) REFERENCES dbo.clientes (identificador),
    CONSTRAINT FK_mediosPago_verificador
      FOREIGN KEY (verificador) REFERENCES dbo.empleados (identificador),
    CONSTRAINT CK_mediosPago_tipo CHECK (tipo IN (
      'cuenta_bancaria',
      'cuenta_bancaria_extranjera',
      'tarjeta_credito',
      'tarjeta_credito_extranjera',
      'cheque_certificado'
    )),
    CONSTRAINT CK_mediosPago_estado CHECK (estado IN (
      'pendiente',
      'verificado',
      'rechazado',
      'deshabilitado'
    )),
    CONSTRAINT CK_mediosPago_moneda CHECK (moneda IN ('ARS', 'USD'))
  );
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'IX_mediosPago_cliente_estado'
    AND object_id = OBJECT_ID(N'dbo.mediosPago')
)
BEGIN
  CREATE INDEX IX_mediosPago_cliente_estado
    ON dbo.mediosPago (cliente, estado);
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'IX_mediosPago_estado'
    AND object_id = OBJECT_ID(N'dbo.mediosPago')
)
BEGIN
  CREATE INDEX IX_mediosPago_estado
    ON dbo.mediosPago (estado)
    WHERE estado = 'pendiente';
END
GO

/* -------------------------------------------------------------------------- */
/* C. asistentes — unicidad (inscripción y número de postor por subasta)      */
/* -------------------------------------------------------------------------- */
IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'UX_asistentes_cliente_subasta'
    AND object_id = OBJECT_ID(N'dbo.asistentes')
)
BEGIN
  CREATE UNIQUE INDEX UX_asistentes_cliente_subasta
    ON dbo.asistentes (cliente, subasta);
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'UX_asistentes_subasta_numeroPostor'
    AND object_id = OBJECT_ID(N'dbo.asistentes')
)
BEGIN
  CREATE UNIQUE INDEX UX_asistentes_subasta_numeroPostor
    ON dbo.asistentes (subasta, numeroPostor);
END
GO

-- Credenciales de acceso para clientes (Auth-2).
-- Ejecutar en la misma base que personas/clientes/paises.
-- No forma parte del script académico schema.sql; es despliegue auxiliar de auth.

IF OBJECT_ID(N'dbo.cliente_credenciales', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.cliente_credenciales (
    persona_id INT NOT NULL,
    email NVARCHAR(320) NOT NULL,
    password_hash NVARCHAR(500) NOT NULL,
    requires_password_change BIT NOT NULL
      CONSTRAINT DF_cliente_credenciales_rpc DEFAULT (1),
    created_at DATETIME2 NOT NULL
      CONSTRAINT DF_cliente_credenciales_ca DEFAULT (SYSUTCDATETIME()),
    updated_at DATETIME2 NOT NULL
      CONSTRAINT DF_cliente_credenciales_ua DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_cliente_credenciales PRIMARY KEY (persona_id),
    CONSTRAINT FK_cliente_credenciales_personas
      FOREIGN KEY (persona_id) REFERENCES dbo.personas (identificador),
    CONSTRAINT UQ_cliente_credenciales_email UNIQUE (email)
  );
END
GO

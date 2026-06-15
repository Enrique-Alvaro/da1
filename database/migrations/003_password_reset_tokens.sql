-- Tokens de restablecimiento de contraseña (cliente_credenciales / personas)
IF OBJECT_ID(N'dbo.cliente_password_reset_tokens', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.cliente_password_reset_tokens (
    identificador INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    persona_id INT NOT NULL,
    token_hash NVARCHAR(200) NOT NULL,
    expires_at DATETIME2 NOT NULL,
    used_at DATETIME2 NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_cliente_pwd_reset_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_cliente_pwd_reset_persona FOREIGN KEY (persona_id) REFERENCES dbo.personas(identificador)
  );

  CREATE INDEX IX_cliente_pwd_reset_hash ON dbo.cliente_password_reset_tokens (token_hash);
  CREATE INDEX IX_cliente_pwd_reset_persona ON dbo.cliente_password_reset_tokens (persona_id);
END;

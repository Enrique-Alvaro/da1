-- Datos mínimos para que POST /api/auth/register funcione (FKs de clientes).
-- El API usa countryId del body → dbo.paises.numero, y verificador fijo = 1 → dbo.empleados.identificador.
-- Ejecutar en la misma base que la API (p. ej. CrownBid).

IF NOT EXISTS (SELECT 1 FROM dbo.paises WHERE numero = 1)
BEGIN
  INSERT INTO dbo.paises (numero, nombre, nombreCorto, capital, nacionalidad, idiomas)
  VALUES (
    1,
    N'Argentina',
    N'AR',
    N'Buenos Aires',
    N'Argentina',
    N'Español'
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.empleados WHERE identificador = 1)
BEGIN
  INSERT INTO dbo.empleados (identificador, cargo, sector)
  VALUES (1, N'Verificador registro cliente', NULL);
END
GO

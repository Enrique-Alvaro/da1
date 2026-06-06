-- Seed: subastas de ejemplo
-- La constraint chkFecha exige fecha > DATEADD(dd,10,GETDATE()).
-- Usamos fechas relativas con DATEADD para que el script sea re-ejecutable en cualquier momento.
-- Limpiamos primero las subastas que no tienen catálogos ni asistentes asociados.

SET NOCOUNT ON;
GO

-- Insertar subastas de ejemplo
INSERT INTO dbo.subastas (fecha, hora, estado, ubicacion, capacidadAsistentes, tieneDeposito, seguridadPropia, categoria, moneda)
VALUES
  -- Programadas (scheduled) - estado NULL
  (DATEADD(dd, 15, CAST(GETDATE() AS date)), '10:00:00', NULL,     N'Av. Corrientes 1234, Buenos Aires, Argentina',    200, N'si', N'si', N'comun',    N'ARS'),
  (DATEADD(dd, 20, CAST(GETDATE() AS date)), '14:00:00', NULL,     N'Boulevard San Juan 450, Córdoba, Argentina',      150, N'no', N'si', N'especial', N'ARS'),
  (DATEADD(dd, 25, CAST(GETDATE() AS date)), '11:00:00', NULL,     N'Rambla República de México 6589, Montevideo',     100, N'si', N'no', N'plata',    N'USD'),
  (DATEADD(dd, 30, CAST(GETDATE() AS date)), '16:00:00', NULL,     N'Córdoba 1345, Rosario, Argentina',                120, N'si', N'si', N'oro',      N'ARS'),
  (DATEADD(dd, 35, CAST(GETDATE() AS date)), '09:00:00', NULL,     N'Av. Providencia 2300, Santiago de Chile',          80, N'si', N'si', N'platino',  N'USD'),
  (DATEADD(dd, 40, CAST(GETDATE() AS date)), '15:00:00', NULL,     N'Palermo Soho, Buenos Aires, Argentina',            60, N'no', N'no', N'especial', N'ARS'),
  (DATEADD(dd, 45, CAST(GETDATE() AS date)), '10:30:00', NULL,     N'San Telmo, Buenos Aires, Argentina',              175, N'si', N'si', N'plata',    N'USD'),
  (DATEADD(dd, 50, CAST(GETDATE() AS date)), '13:00:00', NULL,     N'Recoleta, Buenos Aires, Argentina',               250, N'si', N'si', N'oro',      N'ARS'),

  -- En vivo (live) - estado 'abierta'
  (DATEADD(dd, 12, CAST(GETDATE() AS date)), '10:00:00', N'abierta', N'Puerto Madero, Buenos Aires, Argentina',        300, N'si', N'si', N'comun',    N'ARS'),
  (DATEADD(dd, 13, CAST(GETDATE() AS date)), '11:00:00', N'abierta', N'Av. del Libertador 6600, Buenos Aires',         250, N'si', N'no', N'plata',    N'USD'),

  -- Cerradas (closed) - estado 'carrada'
  (DATEADD(dd, 11, CAST(GETDATE() AS date)), '09:00:00', N'carrada', N'Microcentro, Buenos Aires, Argentina',          400, N'si', N'si', N'oro',      N'ARS'),
  (DATEADD(dd, 11, CAST(GETDATE() AS date)), '14:00:00', N'carrada', N'Tribunales, Buenos Aires, Argentina',           180, N'no', N'si', N'comun',    N'USD');
GO

-- Verificar lo insertado
SELECT
  identificador,
  CONVERT(varchar, fecha, 23)  AS fecha,
  CONVERT(varchar, hora, 108)  AS hora,
  ISNULL(estado, 'scheduled')  AS estado_db,
  CASE
    WHEN LOWER(LTRIM(RTRIM(estado))) = 'abierta' THEN 'live'
    WHEN LOWER(LTRIM(RTRIM(estado))) = 'carrada' THEN 'closed'
    ELSE 'scheduled'
  END                           AS status_api,
  categoria,
  moneda,
  ubicacion
FROM dbo.subastas
ORDER BY identificador;
GO

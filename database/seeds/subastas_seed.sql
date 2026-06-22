-- Seed: subastas de ejemplo (P0 — fechas/horarios válidos, horaFin 60–90 min)
-- Requiere migración 004_subastas_hora_fin.sql para columna horaFin.
-- Las subastas en vivo usan la fecha de hoy; se desactiva chkFecha solo durante el insert demo.

SET NOCOUNT ON;
GO

IF COL_LENGTH('dbo.subastas', 'horaFin') IS NULL
BEGIN
  RAISERROR('Ejecute database/migrations/004_subastas_hora_fin.sql antes de este seed.', 16, 1);
  RETURN;
END
GO

ALTER TABLE dbo.subastas NOCHECK CONSTRAINT chkFecha;
GO

INSERT INTO dbo.subastas (fecha, hora, horaFin, estado, ubicacion, capacidadAsistentes, tieneDeposito, seguridadPropia, categoria, moneda)
VALUES
  -- Próximas (scheduled)
  (DATEADD(dd, 15, CAST(GETDATE() AS date)), '10:00:00', '11:15:00', NULL,     N'Seed — Av. Corrientes, Buenos Aires',       200, N'si', N'si', N'comun',    N'ARS'),
  (DATEADD(dd, 20, CAST(GETDATE() AS date)), '14:00:00', '15:20:00', NULL,     N'Seed — Córdoba Capital',                    150, N'no', N'si', N'especial', N'ARS'),
  (DATEADD(dd, 25, CAST(GETDATE() AS date)), '11:00:00', '12:10:00', NULL,     N'Seed — Montevideo',                         100, N'si', N'no', N'plata',    N'USD'),

  -- En vivo ahora (fecha hoy, ventana ~75 min)
  (CAST(GETDATE() AS date), CAST(DATEADD(minute, -20, GETDATE()) AS time), CAST(DATEADD(minute, 55, GETDATE()) AS time), N'abierta', N'Seed LIVE — Puerto Madero', 300, N'si', N'si', N'comun', N'ARS'),
  (CAST(GETDATE() AS date), CAST(DATEADD(minute, -10, GETDATE()) AS time), CAST(DATEADD(minute, 65, GETDATE()) AS time), N'abierta', N'Seed LIVE — Palermo',       250, N'si', N'no', N'oro',   N'USD'),

  -- Cerradas (fin ya pasó hoy u horario anterior)
  (CAST(GETDATE() AS date), '06:00:00', '07:15:00', N'carrada', N'Seed CLOSED — Microcentro', 400, N'si', N'si', N'platino', N'ARS');
GO

ALTER TABLE dbo.subastas CHECK CONSTRAINT chkFecha;
GO

SELECT
  identificador,
  CONVERT(varchar, fecha, 23) AS fecha,
  CONVERT(varchar, hora, 108) AS hora,
  CONVERT(varchar, horaFin, 108) AS horaFin,
  ISNULL(estado, 'scheduled') AS estado_db,
  categoria,
  ubicacion
FROM dbo.subastas
WHERE ubicacion LIKE N'Seed%'
ORDER BY identificador;
GO

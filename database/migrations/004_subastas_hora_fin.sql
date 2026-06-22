-- Phase P0 — hora de cierre para subastas (duración 60–90 min).
-- Idempotente: puede re-ejecutarse sin fallar si la columna ya existe.

IF COL_LENGTH('dbo.subastas', 'horaFin') IS NULL
BEGIN
  ALTER TABLE dbo.subastas ADD horaFin TIME NULL;
END
GO

-- Backfill: horaFin = hora + 75 minutos para filas existentes sin cierre.
UPDATE dbo.subastas
SET horaFin = CAST(DATEADD(minute, 75, CAST(hora AS datetime)) AS time)
WHERE horaFin IS NULL AND hora IS NOT NULL;
GO

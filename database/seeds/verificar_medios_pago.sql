-- Aprueba todos los medios de pago en estado 'pendiente'
SET NOCOUNT ON;

UPDATE dbo.mediosPago
SET estado = N'verificado'
WHERE estado = N'pendiente';

PRINT CAST(@@ROWCOUNT AS varchar) + ' medio(s) de pago verificado(s).';

-- Resultado final
SELECT
  mp.identificador,
  p.nombre          AS cliente_nombre,
  mp.tipo,
  mp.moneda,
  mp.estado,
  mp.titular,
  mp.entidad,
  mp.ultimosDigitos
FROM dbo.mediosPago mp
JOIN dbo.personas p ON p.identificador = mp.cliente
ORDER BY mp.cliente, mp.identificador;

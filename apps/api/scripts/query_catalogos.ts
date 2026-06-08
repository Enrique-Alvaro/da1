import sql from 'mssql';

async function main() {
  const conn = 'Server=localhost,1433;Database=CrownBid;User Id=sa;Password=SqlServer2026!;Encrypt=true;TrustServerCertificate=true';
  const pool = await sql.connect(conn);
  try {
    const res = await pool.request().query(`SELECT TOP (10) identificador, descripcion, subasta, responsable FROM dbo.catalogos`);
    console.log('catalogos:', res.recordset);
    const items = await pool.request().query(`SELECT TOP (20) ic.identificador, ic.precioBase, p.descripcionCatalogo, p.descripcionCompleta FROM dbo.itemsCatalogo ic JOIN dbo.productos p ON p.identificador = ic.producto`);
    console.log('itemsCatalogo:', items.recordset);
  } finally {
    await pool.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

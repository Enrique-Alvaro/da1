import sql from "mssql";
import { getEnv } from "../src/config/env";

async function main() {
  const conn = getEnv().sqlServerConnectionString;
  const pool = await sql.connect(conn);
  try {
    const res = await pool.request().query(`SELECT TOP (10) identificador, descripcion, subasta, responsable FROM dbo.catalogos`);
    console.log("catalogos:", res.recordset);
    const items = await pool.request().query(`SELECT TOP (20) ic.identificador, ic.precioBase, p.descripcionCatalogo, p.descripcionCompleta FROM dbo.itemsCatalogo ic JOIN dbo.productos p ON p.identificador = ic.producto`);
    console.log("itemsCatalogo:", items.recordset);
  } finally {
    await pool.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

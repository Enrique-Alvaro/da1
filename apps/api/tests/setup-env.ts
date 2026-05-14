/**
 * Runs before any application imports so `loadEnv()` / JWT / bcrypt see test values.
 */
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-key-minimum-32-characters-long!!";
process.env.JWT_EXPIRES_IN = "15m";
process.env.BCRYPT_SALT_ROUNDS = "4";
process.env.SQLSERVER_CONNECTION_STRING =
  "Server=localhost,1433;Database=CrownBidTest;User Id=sa;Password=test;Encrypt=true;TrustServerCertificate=true";

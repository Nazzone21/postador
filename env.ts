// Carrega o .env antes dos outros módulos do worker.
try {
  process.loadEnvFile(".env");
} catch {
  // sem .env: usa as variáveis do ambiente
}

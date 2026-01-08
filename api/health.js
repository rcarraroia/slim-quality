// Função de health check mínima - ESM format
export default function handler(req, res) {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
}

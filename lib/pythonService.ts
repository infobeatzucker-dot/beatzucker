const SERVICE_HEADER = "X-Beatzucker-Service-Token";

export function pythonServiceHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const secret = process.env.PYTHON_SERVICE_SECRET;
  if (secret) headers[SERVICE_HEADER] = secret;
  return headers;
}

let runtimeFonnteToken = "";

export function setRuntimeFonnteToken(token: string) {
  runtimeFonnteToken = token.trim();
}

export function clearRuntimeFonnteToken() {
  runtimeFonnteToken = "";
}

export function getRuntimeFonnteToken() {
  return runtimeFonnteToken || undefined;
}

export function hasRuntimeFonnteToken() {
  return runtimeFonnteToken.length > 0;
}

export function maskToken(token?: string) {
  if (!token) return "";
  if (token.length <= 8) return "********";
  return `${token.slice(0, 4)}${"*".repeat(Math.min(token.length - 8, 16))}${token.slice(-4)}`;
}

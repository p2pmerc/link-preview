import dns from "node:dns/promises";
import net from "node:net";

/** True when an IPv4 address (as four numbers) is not a public unicast address. */
function blockedV4([a, b]) {
  return (
    a === 0 || // "this" network, includes 0.0.0.0
    a === 10 || // private
    a === 127 || // loopback
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local, includes cloud metadata at 169.254.169.254
    (a === 172 && b >= 16 && b <= 31) || // private
    (a === 192 && b === 168) || // private
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    a >= 224 // multicast, reserved, broadcast
  );
}

/** True for loopback, private, link-local, unspecified and other non-public addresses. */
export function isBlockedAddress(address) {
  const kind = net.isIP(address);
  if (kind === 4) return blockedV4(address.split(".").map(Number));
  if (kind === 6) {
    const a = address.toLowerCase();
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(a); // IPv4-mapped IPv6
    if (mapped) return blockedV4(mapped[1].split(".").map(Number));
    return (
      a === "::" ||
      a === "::1" ||
      /^f[cd]/.test(a) || // fc00::/7 unique local
      /^fe[89ab]/.test(a) || // fe80::/10 link-local
      /^ff/.test(a) // multicast
    );
  }
  return true; // not an IP at all: treat as unsafe
}

/** Throws unless every address the URL's host resolves to is public. */
export async function assertPublicUrl(url) {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = net.isIP(host)
    ? [{ address: host }]
    : await dns.lookup(host, { all: true }).catch(() => []);
  if (addresses.length === 0) throw new Error("host did not resolve");
  if (addresses.some(({ address }) => isBlockedAddress(address))) {
    const err = new Error("target address is not allowed");
    err.code = "BLOCKED_TARGET";
    throw err;
  }
}

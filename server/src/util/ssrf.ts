import dns from 'node:dns/promises';
import net from 'node:net';

const privateCidrs = [
  { base: '10.0.0.0', mask: 8 },
  { base: '172.16.0.0', mask: 12 },
  { base: '192.168.0.0', mask: 16 },
  { base: '127.0.0.0', mask: 8 },      // loopback
  { base: '169.254.0.0', mask: 16 },   // link-local
];

function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0;
}

function inCidr(ip: string, base: string, mask: number): boolean {
  const ipInt = ipToInt(ip);
  const baseInt = ipToInt(base);
  const maskInt = mask === 0 ? 0 : ~((1 << (32 - mask)) - 1) >>> 0;
  return (ipInt & maskInt) === (baseInt & maskInt);
}

export async function isPrivateHost(host: string): Promise<boolean> {
  // If host is an IP
  if (net.isIP(host)) {
    if (net.isIPv6(host)) {
      // Block loopback (::1) and unique local (fc00::/7)
      return host === '::1' || host.toLowerCase().startsWith('fc') || host.toLowerCase().startsWith('fd');
    }
    const ip = host;
    if (ip === '0.0.0.0') return true;
    return privateCidrs.some(c => inCidr(ip, c.base, c.mask));
  }

  // Block obvious locals
  const lower = host.toLowerCase();
  if (lower === 'localhost' || lower.endsWith('.local')) {
    return true;
  }

  return false;
}

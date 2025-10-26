import fs from 'node:fs';
import path from 'node:path';
import devcert from 'devcert';

const isIPv4 = (value) => /^\d{1,3}(?:\.\d{1,3}){3}$/.test(value);
const normalizeDomain = (value) => {
  if (isIPv4(value)) {
    const mapped = value.replace(/\./g, '-') + '.sslip.io';
    console.log(`[devcert] Mapping IPv4 ${value} -> ${mapped}`);
    return mapped;
  }
  return value;
};

async function main() {
  const rawDomains = process.argv.slice(2).filter(Boolean);
  const normalized = rawDomains.map(normalizeDomain);
  const uniqueDomains = Array.from(new Set(['localhost', ...normalized]));

  if (uniqueDomains.length === 0) {
    console.error('No domains specified. Provide at least one hostname or IPv4 address.');
    process.exit(1);
  }

  const clientRoot = path.resolve(process.cwd());
  const certsDir = path.join(clientRoot, 'certs');
  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
  }

  console.log(`[devcert] Generating certificate for: ${uniqueDomains.join(', ')}`);

  try {
    const { key, cert } = await devcert.certificateFor(uniqueDomains, {
      skipCertutil: false,
      skipHostsFile: true
    });

    const certPath = path.join(certsDir, 'devcert-cert.pem');
    const keyPath = path.join(certsDir, 'devcert-key.pem');

    fs.writeFileSync(certPath, cert, 'utf8');
    fs.writeFileSync(keyPath, key, 'utf8');

    console.log(`[devcert] Certificate saved to ${certPath}`);
    console.log(`[devcert] Key saved to ${keyPath}`);
    console.log('Remember to access the site using the mapped hostname(s) to avoid certificate warnings.');
    console.log('Update client/.env.local with VITE_DEV_CERT and VITE_DEV_KEY paths if needed.');
  } catch (error) {
    console.error('[devcert] Failed to generate certificate:', error.message);
    process.exit(1);
  }
}

main();

const { platform, arch } = require('os');
const { existsSync, mkdirSync, createWriteStream, chmodSync, unlinkSync } = require('fs');
const { join, extname, basename } = require('path');
const { spawn } = require('child_process');
const https = require('https');

const REPO = 'stone2401/Sidecar';
const VERSION = process.env.SIDECAR_VERSION || 'latest';

function getAsset() {
  const p = platform();
  const a = arch();
  const platformMap = { win32: 'windows', darwin: 'macos', linux: 'linux' };
  const archMap = { x64: 'x64', arm64: 'arm64' };
  const plat = platformMap[p];
  const architecture = archMap[a];
  if (!plat || !architecture) return null;
  return `Sidecar-${plat}-${architecture}`;
}

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'dynamic-interaction' } }, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Request failed with status ${res.statusCode}`));
          return;
        }
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        });
      })
      .on('error', reject);
  });
}

async function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Download failed with status ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      })
      .on('error', (err) => {
        unlinkSync(dest);
        reject(err);
      });
  });
}

async function install() {
  try {
    const assetPrefix = getAsset();
    if (!assetPrefix) {
      console.warn('Unsupported platform for Sidecar');
      return;
    }
    const releaseInfoUrl =
      VERSION === 'latest'
        ? `https://api.github.com/repos/${REPO}/releases/latest`
        : `https://api.github.com/repos/${REPO}/releases/tags/${VERSION}`;
    const release = await fetchJson(releaseInfoUrl);
    const asset = release.assets.find((a) => a.name.startsWith(assetPrefix));
    if (!asset) {
      console.warn('No prebuilt Sidecar binary for this platform');
      return;
    }
    const dir = join(__dirname, '..', 'bin');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const archivePath = join(dir, asset.name);
    await download(asset.browser_download_url, archivePath);

    const ext = extname(asset.name);
    if (ext === '.zip') {
      await new Promise((resolve, reject) => {
        const unzip = spawn('unzip', ['-o', archivePath, '-d', dir], { stdio: 'ignore' });
        unzip.on('close', (code) => (code === 0 ? resolve() : reject(new Error('unzip failed'))));
      });
      unlinkSync(archivePath);
    } else if (ext === '.gz') {
      await new Promise((resolve, reject) => {
        const tar = spawn('tar', ['-xzf', archivePath, '-C', dir], { stdio: 'ignore' });
        tar.on('close', (code) => (code === 0 ? resolve() : reject(new Error('tar failed'))));
      });
      unlinkSync(archivePath);
    }

    const execName = platform() === 'win32' ? 'sidecar.exe' : 'sidecar';
    const execPath = join(dir, execName);
    if (existsSync(execPath)) chmodSync(execPath, 0o755);
    console.log(`Sidecar binary ready at ${execPath}`);
  } catch (err) {
    console.warn('Failed to install Sidecar:', err.message || err);
  }
}

install();

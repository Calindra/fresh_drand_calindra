import { get as request } from "node:https";
import { arch, tmpdir } from "node:os";
import { URL } from "node:url";
import { Buffer } from "node:buffer";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
const repoGithub = process.env.GITHUB_DRAND_REPO;
const version = process.env.DRAND_VERSION;

const AVAILABLE_PLATFORMS = new Set([
  "aarch64",
  "armv7",
  "i686",
  "riscv64gc",
  "x86_64",
]);

function getArch() {
  const myArch = arch();

  if (!AVAILABLE_PLATFORMS.has(myArch)) {
    throw new Error(`Arch ${myArch} is not supported`);
  }

  return myArch;
}

function getBinaryAndConfig() {
  const prefix = getArch();

  if (repoGithub) {
    const binary = new URL(
      `https://github.com/${repoGithub}/releases/download/v${version}/cartesi-drand-${prefix}`,
    );
    const config = new URL(
      `https://raw.githubusercontent.com/${repoGithub}/v${version}/convenience-middleware/drand.config.json`,
    );
    return { binary, config };
  }
}

/**
 * @param {URL} url
 * @returns {Promise<Buffer>}
 * */
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    request(url, (response) => {
      const statusCode = response.statusCode;
      if (statusCode >= 300 && statusCode < 400 && response.headers.location) {
        return makeRequest(new URL(response.headers.location))
          .then(resolve)
          .catch(reject);
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download binary: ${response.statusCode}`));
      }
      const data = [];
      response.on("data", (chunk) => {
        data.push(chunk);
      });
      response.on("end", () => {
        resolve(Buffer.concat(data));
      });
    });
  });
}

async function getOrSaveBinary(path, filename) {
  const fullpathBinary = resolve(path, filename);
  const fullpathConfig = resolve(path, "drand.config.json");

  if (existsSync(fullpathBinary)) {
    console.log("Binary already exists");
    return;
  }
  const url = getBinaryAndConfig();
  if (!url) {
    throw new Error("URL not found");
  }
  return Promise.all([
    makeRequest(url.binary).then((buffer) =>
      // writeFile(fullpathBinary, buffer, { mode: 0o755 }),
      writeFile(fullpathBinary, buffer, { mode: 0o755 }),
    ),
    makeRequest(url.config).writeFile((config) =>
      writeFile(fullpathConfig, config, { mode: 0o644 }),
    ),
  ]);
}

export async function runDrand() {
  const prefix = getArch();
  const path = tmpdir();
  const filename = `drand-${prefix}`;
  const fullpath = resolve(path, filename);

  await getOrSaveBinary(path, filename);
  console.log(`Binary downloaded at ${fullpath}`);
}

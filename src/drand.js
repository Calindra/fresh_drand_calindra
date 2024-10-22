import { get as request } from "node:https";
import { arch, platform, tmpdir } from "node:os";
import { URL } from "node:url";
import { Buffer } from "node:buffer";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { runProcess } from "./proc.js";
const repoGithub = process.env.GITHUB_DRAND_REPO;
const version = process.env.DRAND_VERSION;

const AVAILABLE_ARCH = new Map([
  ["arm64", "aarch64"],
  ["arm", "armv7"],
  ["ia32", "i686"],
  ["riscv64", "riscv64gc"],
  ["x64", "x86_64"],
]);

const AVAILABLE_PLATFORMS = ["linux"];

function getArch() {
  const myPlatform = platform();
  const myArch = arch();

  if (!AVAILABLE_PLATFORMS.includes(myPlatform)) {
    throw new Error(`Platform ${myPlatform} is not supported`);
  }

  const realArch = AVAILABLE_ARCH.get(myArch);

  if (!realArch) {
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
  console.log(`Downloading ${url}`);

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
      writeFile(fullpathBinary, buffer, { mode: 0o755 }),
    ),
    makeRequest(url.config).then((config) =>
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

  return runProcess(fullpath);
}

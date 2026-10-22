import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { connect } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
const preview = args[0] === "--preview";
if (preview) args.shift();
const modeIndex = args.indexOf("--mode");
const mode = modeIndex >= 0 ? args[modeIndex + 1] : preview ? "production" : "development";
const env = { ...loadEnv(mode, root, "ARION_"), ...process.env };
const target = new URL(env.ARION_API_TARGET || "http://127.0.0.1:8080");
const children = new Set();
let stopping = false;

function run(command, commandArgs, cwd, extraEnv = {}) {
  const child = spawn(command, commandArgs, { cwd, env: { ...env, ...extraEnv }, stdio: "inherit", windowsHide: true });
  children.add(child);
  child.on("error", error => { console.error(`Não foi possível iniciar ${command}: ${error.message}`); void stop(1); });
  child.on("exit", () => children.delete(child));
  return child;
}

async function stop(code) {
  if (stopping) return;
  stopping = true;
  await Promise.all([...children].map(child => new Promise(resolve => {
    if (!child.pid || child.exitCode !== null) return resolve();
    if (process.platform === "win32") {
      const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { windowsHide: true, stdio: "ignore" });
      killer.once("error", resolve);
      killer.once("exit", resolve);
    } else {
      child.once("exit", resolve);
      child.kill("SIGTERM");
      setTimeout(() => { child.kill("SIGKILL"); resolve(); }, 3000).unref();
    }
  })));
  process.exit(code);
}

process.once("SIGINT", () => void stop(0));
process.once("SIGTERM", () => void stop(0));

async function ready() {
  try {
    const response = await fetch(new URL("/api/status", target), { signal: AbortSignal.timeout(2500) });
    return response.ok && (await response.json()).status === "ok";
  } catch { return false; }
}

function occupied() {
  return new Promise(resolve => {
    const socket = connect({ host: target.hostname, port: Number(target.port || 80) });
    const finish = result => { socket.destroy(); resolve(result); };
    socket.setTimeout(1500, () => finish(false));
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
}

async function newest(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const times = await Promise.all(entries.map(async entry => {
    const location = path.join(directory, entry.name);
    return entry.isDirectory() ? newest(location) : (await stat(location)).mtimeMs;
  }));
  return Math.max(0, ...times);
}

async function backend() {
  if (await ready()) { console.log("Árion: API já disponível. Conectando o site…"); return; }
  if (!["127.0.0.1", "localhost"].includes(target.hostname) || target.protocol !== "http:") {
    throw new Error(`A API configurada em ${target.origin} não está disponível. Inicie esse serviço e tente novamente.`);
  }
  if (await occupied()) throw new Error(`A porta ${target.port || 80} está ocupada, mas não responde como a API do Árion. Confira ARION_API_TARGET ou libere essa porta.`);
  const candidates = env.ARION_BACKEND_DIR ? [path.resolve(root, env.ARION_BACKEND_DIR)] : [path.resolve(root, "../Challenges_TOTVS_DDD"), path.resolve(root, "../../Challenges_TOTVS_DDD")];
  const directory = candidates.find(candidate => existsSync(path.join(candidate, "pom.xml")) && existsSync(path.join(candidate, "src/main")));
  if (!directory) throw new Error("Não encontrei Challenges_TOTVS_DDD. Defina ARION_BACKEND_DIR com a pasta da API no arquivo .env.local.");
  const jar = path.join(directory, "target/ouro-0.0.1-SNAPSHOT.jar");
  const sourceTime = Math.max((await stat(path.join(directory, "pom.xml"))).mtimeMs, await newest(path.join(directory, "src/main")));
  if (!existsSync(jar) || (await stat(jar)).mtimeMs < sourceTime) {
    console.log("Árion: compilando a API Java…");
    const build = process.platform === "win32"
      ? run("cmd.exe", ["/d", "/c", "mvnw.cmd", "-q", "-DskipTests", "package"], directory)
      : run("sh", ["mvnw", "-q", "-DskipTests", "package"], directory);
    const code = await new Promise(resolve => build.once("exit", resolve));
    if (code !== 0) throw new Error("A compilação da API falhou. Confira o erro acima e a instalação do Java 25.");
  }
  console.log("Árion: iniciando a API e aguardando o banco de dados…");
  const java = run("java", ["-jar", jar], directory, { PORT: target.port || "80" });
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    if (java.exitCode !== null) throw new Error("A API encerrou durante a inicialização. Confira o erro Java acima.");
    if (await ready()) { console.log("Árion: API e banco prontos."); return; }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error("A API não ficou pronta em dois minutos. Confira os registros de inicialização acima.");
}

try {
  await backend();
  const vite = run(process.execPath, [path.join(root, "node_modules/vite/bin/vite.js"), ...(preview ? ["preview"] : []), ...args], root);
  vite.once("exit", code => void stop(code ?? 1));
} catch (error) {
  console.error(`\nÁrion: ${error.message}\n`);
  await stop(1);
}

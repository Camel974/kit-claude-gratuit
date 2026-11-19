#!/usr/bin/env node
// Kit Claude Gratuit (Brennan SONNET) : le moteur d'installation.
// Un seul script pour Windows, Mac, Linux et serveur. Lance par DEMARRER-WINDOWS.bat,
// DEMARRER-MAC.command ou installer.sh (qui installent Node.js avant si besoin).
//
//   node scripts/kit.mjs installer          installation complete (questions a boutons dans le terminal)
//   node scripts/kit.mjs ajouter-cle        ajouter une cle gratuite (Mistral, Gemini, NVIDIA, Groq, OpenRouter)
//   node scripts/kit.mjs bascule            reconstruit la bascule « gratuit » (cle ajoutee dans le tableau de bord)
//   node scripts/kit.mjs diagnostic         rapport a copier a Claude si ca bloque (s'ouvre dans le Bloc-notes)
//   node scripts/kit.mjs demarrer           relance OmniRoute (« omniroute » est bloque dans PowerShell)
//   node scripts/kit.mjs mot-de-passe       nouveau mot de passe du tableau de bord
//   node scripts/kit.mjs test               verifie que Claude Code repond
//   node scripts/kit.mjs mise-a-jour        met a jour OmniRoute, Claude Code, le kit
//   node scripts/kit.mjs desinstaller       retire ce que le kit a installe (garde tes projets)
//   node scripts/kit.mjs connecter-serveur  (sur ton PC) utiliser l'OmniRoute de ton serveur
//
// Regle d'or : ce script ne supprime jamais un fichier qui ne vient pas de lui.
// Tout fichier remplace est sauvegarde dans ~/.claude/backups/kit-claude-gratuit-<date>/.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import readline from "node:readline";
import { spawnSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------- constantes
const KIT_VERSION = "1.0.0";
const KIT_REPO = "Camel974/kit-claude-gratuit";
const KIT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOME = os.homedir();
const WIN = process.platform === "win32";
const MAC = process.platform === "darwin";
const PORT = Number(process.env.KIT_PORT || 20128);
// Adresse d'ecoute d'OmniRoute : 127.0.0.1, ou une adresse privee choisie a la main (ex. pont Docker pour n8n).
function hoteOmniroute() {
  try {
    const m = fs.readFileSync(path.join(dossierDonnees(), ".env"), "utf8").match(/^OMNIROUTE_SERVER_HOST=(.+)$/m);
    const h = m && m[1].trim();
    if (h && h !== "0.0.0.0" && h !== "::" && /^[0-9.]+$/.test(h)) return h;
  } catch { /* pas encore installe */ }
  return "127.0.0.1";
}
const BASE = `http://${hoteOmniroute()}:${PORT}`;
const COMBO = "gratuit";
const CONTEXTE_MAX = "120000"; // sous les 128K de la plupart des modeles gratuits
const OMNIROUTE_MIN = [3, 8, 0];
const NODE_OK = (v) => (v[0] === 22 && (v[1] > 22 || (v[1] === 22 && v[2] >= 2))) || (v[0] >= 24 && v[0] < 27);
const STATE_DIR = WIN
  ? path.join(process.env.LOCALAPPDATA || path.join(HOME, "AppData", "Local"), "kit-claude-gratuit")
  : path.join(HOME, ".kit-claude-gratuit");
const ETAT = path.join(STATE_DIR, "etat.json");
const CLAUDE_DIR = path.join(HOME, ".claude");
// Abonnes Claude Pro/Max : profil gratuit SEPARE (CLAUDE_CONFIG_DIR), leur « claude » payant n'est jamais modifie.
const PROFIL_GRATUIT = path.join(HOME, ".claude-gratuit");
const BIN = path.join(HOME, ".local", "bin");
const LINUX = !WIN && !MAC;
const ROOT = Boolean(process.getuid && process.getuid() === 0);
// systemd est-il vraiment le gestionnaire de services ? (absent de certains conteneurs : faux positif vu en test)
const systemdActif = () => LINUX && fs.existsSync("/run/systemd/system");
// Les scripts d'installation de npm appellent « node » : son dossier doit etre dans le PATH (bug vu en test).
for (const d of [path.dirname(process.execPath), BIN]) {
  if (!(process.env.PATH || "").split(path.delimiter).includes(d)) process.env.PATH = `${d}${path.delimiter}${process.env.PATH || ""}`;
}
function dossierWindows(nom) {
  // Avec OneDrive, « Documents » et « Bureau » ne sont souvent pas dans C:\Users\<toi>\ (remarque d'une relectrice).
  try {
    const r = spawnSync("powershell.exe", ["-NoProfile", "-Command", `[Environment]::GetFolderPath('${nom}')`], { encoding: "utf8", windowsHide: true, timeout: 20000 });
    const d = (r.stdout || "").trim();
    return d && fs.existsSync(d) ? d : null;
  } catch { return null; }
}
const DOCS = (WIN && dossierWindows("MyDocuments")) || (fs.existsSync(path.join(HOME, "Documents")) ? path.join(HOME, "Documents") : HOME);
const PROJETS = process.env.KIT_PROJETS || path.join(DOCS, "Projets-Claude");
const TS = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
const BACKUP = path.join(CLAUDE_DIR, "backups", `kit-claude-gratuit-${TS}`);
const MARQ_DEBUT = "<!-- KIT-CLAUDE-GRATUIT:DEBUT -->";
const MARQ_FIN = "<!-- KIT-CLAUDE-GRATUIT:FIN -->";
const PROFIL_DEBUT = "<!-- KCG-PROFIL:DEBUT -->";
const PROFIL_FIN = "<!-- KCG-PROFIL:FIN -->";
// Skills tiers : si tu en as deja une version, on garde la tienne.
const SKILLS_TIERS = new Set(["frontend-design", "cro", "copywriting", "web-quality-audit", "supabase", "webapp-testing", "skill-creator"]);

// Fournisseurs gratuits retenus (verifies dans le catalogue OmniRoute 3.8.5x, novembre 2026).
// prefs : modeles preferes pour coder, dans l'ordre (le premier present gagne).
const FOURNISSEURS = [
  {
    id: "mistral", nom: "Mistral (francais)", url: "https://console.mistral.ai/api-keys",
    aide: "Compte gratuit + plan « Experiment » (verif par SMS, pas de carte). Gros quota (~1 milliard de tokens/mois).",
    prefs: [/^mistral-medium/, /^mistral-large-latest$/, /^devstral/, /^codestral/],
    defauts: ["mistral-medium-3-5", "mistral-large-latest"],
  },
  {
    id: "nvidia", nom: "NVIDIA NIM", url: "https://build.nvidia.com/settings/api-keys",
    aide: "Compte NVIDIA gratuit. Environ 40 requetes par minute.",
    prefs: [/nemotron-3\.5-super/, /nemotron-3-ultra/, /gpt-oss-120b/, /gemma-4-31b/, /gpt-oss/],
    defauts: ["nvidia/nemotron-3.5-super-vl-120b-a12b", "openai/gpt-oss-20b"],
  },
  {
    id: "gemini", nom: "Google Gemini", url: "https://aistudio.google.com/apikey",
    aide: "Ton compte Google suffit. Quota par jour assez bas, mais tres grand contexte.",
    prefs: [/^gemini-3(\.\d+)?-flash(-preview)?$/, /^gemini-2\.5-flash$/],
    defauts: ["gemini-3-flash-preview", "gemini-2.5-flash"],
  },
  {
    id: "groq", nom: "Groq", url: "https://console.groq.com/keys",
    aide: "Tres rapide, petits quotas : en secours.",
    prefs: [/gpt-oss-120b/, /qwen3/],
    defauts: ["openai/gpt-oss-120b"],
  },
  {
    id: "openrouter", nom: "OpenRouter", url: "https://openrouter.ai/keys",
    aide: "Modeles « :free », environ 50 requetes par jour : en secours.",
    prefs: [/:free$/],
    defauts: [],
  },
];

// ---------------------------------------------------------------- affichage
const C = process.stdout.isTTY && !process.env.NO_COLOR
  ? { g: "\x1b[32m", j: "\x1b[33m", r: "\x1b[31m", b: "\x1b[36m", gr: "\x1b[1m", d: "\x1b[2m", z: "\x1b[0m" }
  : { g: "", j: "", r: "", b: "", gr: "", d: "", z: "" };
const ok = (m) => console.log(`  ${C.g}OK${C.z}  ${m}`);
const info = (m) => console.log(`  ${C.b}>>${C.z}  ${m}`);
const warn = (m) => console.log(`  ${C.j}!!${C.z}  ${m}`);
const erreur = (m) => console.log(`  ${C.r}XX${C.z}  ${m}`);
const etape = (n, t, m) => console.log(`\n${C.gr}[${n}/${t}] ${m}${C.z}`);
const titre = (m) => console.log(`\n${C.gr}${C.b}${m}${C.z}`);

// ---------------------------------------------------------------- options
function lireOptions(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) { o._.push(a); continue; }
    const [k, v] = a.slice(2).split("=");
    if (v !== undefined) o[k] = v;
    else if (argv[i + 1] && !argv[i + 1].startsWith("--")) o[k] = argv[++i];
    else o[k] = true;
  }
  return o;
}
const OPTS = lireOptions(process.argv.slice(2));
const AUTO = Boolean(OPTS.oui || OPTS.yes || process.env.KIT_OUI === "1");

// ---------------------------------------------------------------- questions
let rl = null;
function interface_() {
  if (!rl) rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });
  return rl;
}
function fermer() { if (rl) { rl.close(); rl = null; } }
async function demander(question, defaut = "", { cache = false } = {}) {
  if (AUTO || !process.stdin.isTTY) {
    if (!AUTO && !process.stdin.isTTY) warn(`Pas de clavier detecte : reponse par defaut pour « ${question} »`);
    return defaut;
  }
  const r = interface_();
  return new Promise((resolve) => {
    const suffixe = defaut && !cache ? ` ${C.d}[${defaut}]${C.z}` : "";
    if (cache) {
      const ecrire = r._writeToOutput;
      r._writeToOutput = (s) => { if (s.includes(question)) ecrire.call(r, s); else if (s && !/^[\r\n]+$/.test(s)) ecrire.call(r, "*"); };
      r.question(`  ${C.b}?${C.z}  ${question}${suffixe} : `, (rep) => { r._writeToOutput = ecrire; process.stdout.write("\n"); resolve(rep.trim() || defaut); });
    } else {
      r.question(`  ${C.b}?${C.z}  ${question}${suffixe} : `, (rep) => resolve(rep.trim() || defaut));
    }
  });
}
async function ouiNon(question, defaut = true) {
  const rep = (await demander(`${question} (${defaut ? "O/n" : "o/N"})`, defaut ? "o" : "n")).toLowerCase();
  return rep.startsWith("o") || rep.startsWith("y");
}
async function choix(question, options, defaut = 1) {
  console.log(`  ${C.b}?${C.z}  ${question}`);
  options.forEach((o, i) => console.log(`       ${C.gr}${i + 1}${C.z}. ${o}${i + 1 === defaut ? `  ${C.g}(recommande)${C.z}` : ""}`));
  const rep = await demander("Tape le numero", String(defaut));
  const n = Number(rep);
  return n >= 1 && n <= options.length ? n : defaut;
}

// ---------------------------------------------------------------- outils systeme
function versionDe(texte) {
  const m = String(texte || "").match(/(\d+)\.(\d+)\.(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}
const plusRecent = (a, b) => a[0] !== b[0] ? a[0] > b[0] : a[1] !== b[1] ? a[1] > b[1] : a[2] >= b[2];

function lancer(cmd, args = [], { env, cwd, timeout, hérite = false, entree } = {}) {
  const r = spawnSync(cmd, args, {
    env: { ...process.env, ...(env || {}) }, cwd: cwd || HOME, timeout, input: entree,
    encoding: "utf8", stdio: hérite ? "inherit" : ["pipe", "pipe", "pipe"], windowsHide: true, maxBuffer: 64 * 1024 * 1024,
  });
  return { code: r.status ?? (r.error ? 1 : 0), out: (r.stdout || "").toString(), err: (r.stderr || "").toString(), erreur: r.error };
}

function dossierNode() { return path.dirname(process.execPath); }
function npmCli() {
  const d = dossierNode();
  const candidats = [
    path.join(d, "node_modules", "npm", "bin", "npm-cli.js"),
    path.join(d, "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"),
    "/usr/lib/node_modules/npm/bin/npm-cli.js", "/usr/local/lib/node_modules/npm/bin/npm-cli.js",
  ];
  return candidats.find((c) => fs.existsSync(c)) || null;
}
function npm(args, opts = {}) {
  const cli = npmCli();
  if (cli) return lancer(process.execPath, [cli, ...args], opts);
  return lancer(WIN ? "npm.cmd" : "npm", args, { ...opts }); // dernier recours
}
function racineGlobaleNpm() {
  const r = npm(["root", "-g"]);
  return r.code === 0 ? r.out.trim() : null;
}
function cheminOmniroute() {
  const racine = racineGlobaleNpm();
  const c = racine && path.join(racine, "omniroute", "bin", "omniroute.mjs");
  return c && fs.existsSync(c) ? c : null;
}
function omniroute(args, opts = {}) {
  const cli = cheminOmniroute();
  if (!cli) return { code: 127, out: "", err: "omniroute introuvable" };
  return lancer(process.execPath, [cli, ...args], { cwd: HOME, ...opts, env: { OMNIROUTE_BASE_URL: BASE, NO_COLOR: "1", ...(opts.env || {}) } });
}
function jsonDe(texte) {
  // La sortie du CLI commence par des lignes de log colorees : « \x1b[2m » contient un « [ » (bug vu en test).
  const lignes = String(texte || "").replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "").split(/\r?\n/);
  for (let i = 0; i < lignes.length; i++) {
    if (!/^\s*[[{]/.test(lignes[i])) continue;
    try { return JSON.parse(lignes.slice(i).join("\n")); } catch { /* essaie la ligne suivante */ }
  }
  return null;
}
function cheminClaude() {
  const noms = WIN ? ["claude.exe", "claude.cmd"] : ["claude"];
  const dossiers = [path.join(HOME, ".local", "bin"), ...(process.env.PATH || "").split(path.delimiter)];
  for (const d of dossiers) for (const n of noms) { const c = path.join(d, n); if (d && fs.existsSync(c)) return c; }
  return null;
}
function lireJson(fichier, defaut = {}) {
  try { return JSON.parse(fs.readFileSync(fichier, "utf8").replace(/^﻿/, "")); } catch { return defaut; }
}
function lireJsonSur(fichier) {
  // Un fichier abime n'est jamais ecrase par {} : on s'arrete et on explique.
  if (!fs.existsSync(fichier)) return {};
  try { return JSON.parse(fs.readFileSync(fichier, "utf8").replace(/^\uFEFF/, "") || "{}"); }
  catch { throw new Error(`${fichier} est illisible (JSON abime) : je n'y touche pas. Renomme-le (ex. .bak) puis relance.`); }
}
function sauvegarder(fichier) {
  if (!fs.existsSync(fichier)) return;
  const rel = path.relative(HOME, fichier).replace(/^(\.\.[\\/])+/, "");
  const dest = path.join(BACKUP, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(fichier, dest, { recursive: true });
}
function ecrireJson(fichier, donnees) {
  fs.mkdirSync(path.dirname(fichier), { recursive: true });
  const tmp = `${fichier}.tmp-kit`;
  fs.writeFileSync(tmp, JSON.stringify(donnees, null, 2) + "\n");
  fs.renameSync(tmp, fichier);
}
function etat() { return lireJson(ETAT, {}); }
function majEtat(patch) {
  const e = { ...etat(), ...patch, version: KIT_VERSION, maj: new Date().toISOString() };
  ecrireJson(ETAT, e);
  return e;
}
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const masquer = (k) => (k ? `${k.slice(0, 6)}...${k.slice(-4)}` : "(aucune)");

// Dossier de donnees d'OmniRoute : meme logique qu'OmniRoute (bin/cli/data-dir.mjs).
function dossierDonnees() {
  if (process.env.DATA_DIR) return path.resolve(process.env.DATA_DIR);
  const legacy = path.join(HOME, ".omniroute");
  if (fs.existsSync(legacy)) return legacy;
  if (WIN) return path.join(process.env.APPDATA || path.join(HOME, "AppData", "Roaming"), "omniroute");
  if (process.env.XDG_CONFIG_HOME) return path.join(process.env.XDG_CONFIG_HOME, "omniroute");
  return legacy;
}

async function sante(timeoutMs = 4000) {
  for (const p of ["/api/health", "/livez"]) {
    try {
      const r = await fetch(BASE + p, { signal: AbortSignal.timeout(timeoutMs) });
      if (r.status < 500) return true;
    } catch { /* pas encore la */ }
  }
  return false;
}
async function attendreSante(secondes = 120) {
  const fin = Date.now() + secondes * 1000;
  while (Date.now() < fin) { if (await sante()) return true; await pause(2000); }
  return false;
}
async function cleValide(cle) {
  try {
    const r = await fetch(`${BASE}/v1/models`, { headers: { Authorization: `Bearer ${cle}` }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) return { ok: false, statut: r.status };
    const j = await r.json();
    return { ok: true, ids: (j.data || []).map((m) => m.id) };
  } catch (e) { return { ok: false, statut: String(e.message || e) }; }
}

function estServeurProbable() {
  if (WIN || MAC) return false;
  return Boolean(process.env.SSH_CONNECTION || process.env.SSH_TTY) && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY;
}

// ---------------------------------------------------------------- etapes d'installation
function verifierOrdi() {
  const v = versionDe(process.version);
  const ram = os.totalmem() / 1024 ** 3;
  ok(`Systeme : ${WIN ? "Windows" : MAC ? "Mac" : "Linux"} ${os.release()} (${process.arch}), ${ram.toFixed(1)} Go de RAM`);
  if (!NODE_OK(v)) warn(`Node.js ${process.version} : OmniRoute demande Node 22.22.2+ ou 24/25/26. Relance DEMARRER-WINDOWS.bat / installer.sh, il installe la bonne version.`);
  else ok(`Node.js ${process.version}`);
  if (ram < 2) warn("Moins de 2 Go de RAM : OmniRoute risque d'etre lent (il utilise ~550 Mo au repos, mesure).");
  if (LINUX) {
    try {
      const m = fs.readFileSync("/proc/meminfo", "utf8").match(/MemAvailable:\s+(\d+)/);
      const dispo = m ? Number(m[1]) / 1024 ** 2 : null;
      if (dispo !== null && dispo < 1.2) warn(`Seulement ${dispo.toFixed(1)} Go de RAM disponible (d'autres services tournent, n8n ?). OmniRoute + Claude Code ont besoin d'~1,2 Go : prends un serveur de 4 Go si ca plante.`);
    } catch { /* pas de /proc */ }
  }
  try {
    const s = fs.statfsSync(HOME);
    const libre = (s.bavail * s.bsize) / 1024 ** 3;
    if (libre < 5) warn(`Seulement ${libre.toFixed(1)} Go libres sur le disque : il en faut ~5 Go (OmniRoute pese 3 Go, Claude Code 0,4 Go, mesure).`); else ok(`Disque : ${libre.toFixed(0)} Go libres`);
  } catch { /* statfs indisponible */ }
  return { ram };
}

async function installerClaudeCode() {
  let c = cheminClaude();
  if (c) {
    const v = lancer(c, ["--version"], { timeout: 30000 });
    ok(`Claude Code deja installe (${v.out.trim() || "version inconnue"})`);
    return c;
  }
  info("Installation de Claude Code (installeur officiel d'Anthropic, ~1 minute)...");
  const r = WIN
    ? lancer("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "irm https://claude.ai/install.ps1 | iex"], { hérite: true })
    : lancer("bash", ["-c", "curl -fsSL https://claude.ai/install.sh | bash"], { hérite: true });
  c = cheminClaude();
  if (!c) {
    erreur("Claude Code ne s'est pas installe.");
    info(WIN ? "Ouvre PowerShell et colle : irm https://claude.ai/install.ps1 | iex" : "Ouvre le Terminal et colle : curl -fsSL https://claude.ai/install.sh | bash");
    info("Puis relance ce kit. Detail : " + (r.err || r.out).slice(-300));
    throw new Error("claude-code");
  }
  ok(`Claude Code installe : ${c}`);
  return c;
}

function installerOmniroute({ forcer = false } = {}) {
  const existant = cheminOmniroute();
  const v = existant ? versionDe(omniroute(["--version"], { timeout: 60000 }).out) : null;
  if (v && !forcer && plusRecent(v, OMNIROUTE_MIN)) { ok(`OmniRoute deja installe (v${v.join(".")})`); return true; }
  if (v && forcer) {
    const derniere = versionDe(npm(["view", "omniroute", "version"], { timeout: 60000 }).out);
    if (!derniere || plusRecent(v, derniere)) { ok(`OmniRoute deja a jour (v${v.join(".")})`); return true; }
    info(`Mise a jour d'OmniRoute : v${v.join(".")} → v${derniere.join(".")}`);
  }
  const vNpm = versionDe(npm(["--version"]).out) || [10, 0, 0];
  const args = ["install", "-g", "omniroute@latest", "--no-audit", "--no-fund"];
  // npm 11+ bloque les scripts d'installation sans autorisation (doc OmniRoute 3.8.55).
  if (vNpm[0] >= 11) args.push("--allow-scripts=omniroute,keytar,onnxruntime-node,@parcel/watcher,@swc/core,protobufjs,esbuild");
  info(`Installation d'OmniRoute (~2 minutes, ~1 300 paquets, mesure : 1 min 40 sur un serveur 4 coeurs)...`);
  let r = npm(args, { hérite: true, timeout: 20 * 60 * 1000 });
  if (r.code !== 0 && !WIN) {
    // Dossier global non accessible (Node systeme) : on installe dans ~/.npm-global, sans sudo.
    warn("Dossier npm global protege : installation dans ~/.npm-global (sans mot de passe administrateur).");
    const prefixe = path.join(HOME, ".npm-global");
    npm(["config", "set", "prefix", prefixe]);
    ajouterAuPath(path.join(prefixe, "bin"));
    r = npm(args, { hérite: true, timeout: 20 * 60 * 1000 });
  }
  if (r.code !== 0 || !cheminOmniroute()) {
    erreur("OmniRoute ne s'est pas installe.");
    info(`Relance l'installeur (sans risque). Sinon : node "${path.join(KIT_DIR, "scripts", "kit.mjs")}" diagnostic  puis copie le rapport a Claude.`);
    throw new Error("omniroute");
  }
  ok(`OmniRoute installe (v${(versionDe(omniroute(["--version"]).out) || ["?"]).join(".")})`);
  return true;
}

function ajouterAuPath(dossier) {
  if (!(process.env.PATH || "").split(path.delimiter).includes(dossier)) process.env.PATH = `${dossier}${path.delimiter}${process.env.PATH}`;
  if (WIN) {
    const d = dossier.replace(/'/g, "''");
    lancer("powershell.exe", ["-NoProfile", "-Command",
      `$p=[Environment]::GetEnvironmentVariable('Path','User'); if (-not $p) { $p='' }; if (($p -split ';') -notcontains '${d}') { [Environment]::SetEnvironmentVariable('Path', ('${d};' + $p).TrimEnd(';'), 'User') }`], { timeout: 60000 });
    return;
  }
  const ligne = `export PATH="${dossier}:$PATH" # kit-claude-gratuit`;
  for (const rc of [".bashrc", ".zshrc", ".profile"]) {
    const f = path.join(HOME, rc);
    if (rc !== ".profile" && !fs.existsSync(f) && !(MAC && rc === ".zshrc")) continue;
    const contenu = fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "";
    if (!contenu.includes(ligne)) fs.appendFileSync(f, `\n${ligne}\n`);
  }
}

function ecrireEnvOmniroute(dossier, { serveur }) {
  fs.mkdirSync(dossier, { recursive: true, mode: 0o700 });
  const f = path.join(dossier, ".env");
  const lignes = fs.existsSync(f) ? fs.readFileSync(f, "utf8").split(/\r?\n/) : [];
  const actuel = (lignes.find((l) => l.trim().startsWith("OMNIROUTE_SERVER_HOST=")) || "").split("=")[1]?.trim();
  const prive = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(actuel || "");
  const voulu = {
    OMNIROUTE_SERVER_HOST: prive ? actuel : "127.0.0.1", // rien n'est visible depuis Internet ni le Wi-Fi
    REQUIRE_API_KEY: "true", // meme en local, une cle est exigee
  };
  let change = false;
  for (const [k, v] of Object.entries(voulu)) {
    const i = lignes.findIndex((l) => l.trim().startsWith(`${k}=`));
    if (i >= 0) { if (lignes[i].trim() !== `${k}=${v}`) { lignes[i] = `${k}=${v}`; change = true; } }
    else { lignes.push(`${k}=${v}`); change = true; }
  }
  if (change) {
    if (fs.existsSync(f)) sauvegarder(f);
    fs.writeFileSync(f, lignes.filter((l, i, t) => !(l === "" && i === t.length - 1)).join("\n") + "\n", { mode: 0o600 });
  }
  ok(`Securite : OmniRoute ecoute seulement ${voulu.OMNIROUTE_SERVER_HOST === "127.0.0.1" ? (serveur ? "le serveur lui-meme" : "ton ordi") : "ton reseau prive"} (${voulu.OMNIROUTE_SERVER_HOST}) + cle obligatoire`);
  return change;
}

async function arreterOmniroute() {
  if (!(await sante())) return;
  info("Arret de l'OmniRoute en marche pour appliquer les reglages...");
  if (LINUX && systemdActif()) {
    if (ROOT && fs.existsSync("/etc/systemd/system/omniroute.service")) lancer("systemctl", ["stop", "omniroute.service"], { timeout: 60000 });
    lancer("systemctl", ["--user", "stop", "omniroute.service"], { timeout: 60000 });
  }
  omniroute(["stop"], { timeout: 60000 });
  for (let i = 0; i < 20 && (await sante(1500)); i++) await pause(1000);
}

async function demarrerOmniroute({ redemarrer = false } = {}) {
  if (redemarrer) await arreterOmniroute();
  if (await sante()) { ok(`OmniRoute tourne : tableau de bord ${BASE}`); return true; }
  info("Demarrage d'OmniRoute (jusqu'a 2 minutes la premiere fois)...");
  // Service systemd s'il existe : il survit a la deconnexion SSH et redemarre seul.
  if (LINUX && systemdActif()) {
    const r = ROOT && fs.existsSync("/etc/systemd/system/omniroute.service")
      ? lancer("systemctl", ["start", "omniroute.service"], { timeout: 120000 })
      : lancer("systemctl", ["--user", "start", "omniroute.service"], { timeout: 120000 });
    if (r.code === 0 && (await attendreSante(150))) { ok(`OmniRoute tourne : tableau de bord ${BASE}`); return true; }
  }
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const journal = fs.openSync(path.join(STATE_DIR, "omniroute.log"), "a");
  const enfant = spawn(process.execPath, [cheminOmniroute(), "serve", "--no-open"], {
    cwd: HOME, detached: true, stdio: ["ignore", journal, journal], windowsHide: true,
    env: { ...process.env, NO_COLOR: "1" },
  });
  enfant.unref();
  if (await attendreSante(150)) { ok(`OmniRoute tourne : tableau de bord ${BASE}`); return true; }
  erreur(`OmniRoute ne repond pas. Journal : ${path.join(STATE_DIR, "omniroute.log")}`);
  return false;
}

function activerDemarrageAuto() {
  const tard = () => warn("Demarrage automatique non active : apres un redemarrage, tape « kit-claude demarrer ».");
  if (LINUX && ROOT) {
    // root sur un VPS : un service SYSTEME (le service « utilisateur » de root est peu fiable en SSH).
    if (!systemdActif()) { tard(); return false; }
    lancer("systemctl", ["--user", "disable", "--now", "omniroute.service"], { timeout: 60000 }); // ancienne version du kit
    const unite = `[Unit]\nDescription=OmniRoute (kit-claude-gratuit)\nAfter=network-online.target\nWants=network-online.target\n\n[Service]\nType=simple\nUser=root\nWorkingDirectory=${HOME}\nEnvironment=HOME=${HOME}\nEnvironment=PATH=${path.dirname(process.execPath)}:/usr/local/bin:/usr/bin:/bin\nExecStart=${process.execPath} ${cheminOmniroute()} serve --no-open\nRestart=on-failure\nRestartSec=10\n\n[Install]\nWantedBy=multi-user.target\n`;
    fs.writeFileSync("/etc/systemd/system/omniroute.service", unite);
    lancer("systemctl", ["daemon-reload"], { timeout: 60000 });
    const e = lancer("systemctl", ["enable", "omniroute.service"], { timeout: 60000 });
    if (e.code === 0) { ok("Service systeme « omniroute » active : il redemarre avec le serveur"); return true; }
    warn("Service systeme non active : " + (e.err || e.out).trim().slice(-160)); tard(); return false;
  }
  // Mac (LaunchAgent), Windows (dossier Demarrage), Linux utilisateur (systemd --user + linger).
  const r = omniroute(["autostart", "enable", "--no-tray"], { timeout: 300000 });
  if (LINUX) {
    if (!systemdActif()) { tard(); return false; }
    const actif = lancer("systemctl", ["--user", "is-enabled", "omniroute.service"]).out.trim() === "enabled";
    const linger = lancer("loginctl", ["show-user", os.userInfo().username, "-p", "Linger", "--value"]).out.trim() === "yes";
    if (!actif) { tard(); return false; }
    ok(`OmniRoute demarrera tout seul${linger ? ", meme sans session ouverte" : " a ta connexion"}`);
    if (!linger) info(`Pour qu'il tourne meme deconnecte : sudo loginctl enable-linger ${os.userInfo().username}`);
    return true;
  }
  if (r.code === 0) { ok("OmniRoute demarrera tout seul a chaque allumage"); return true; }
  tard();
  return false;
}

function definirMotDePasse(mdp) {
  const r = omniroute(["setup", "--password", mdp, "--non-interactive"], { timeout: 120000 });
  if (r.code !== 0) { warn("Mot de passe non applique : " + (r.err || r.out).slice(-200)); return false; }
  ok("Mot de passe du tableau de bord enregistre");
  return true;
}

function connexionsExistantes() {
  const r = omniroute(["providers", "list", "--json"], { timeout: 60000 });
  const j = jsonDe(r.out);
  const lignes = Array.isArray(j) ? j : j?.connections || j?.providers || [];
  return lignes.map((c) => ({ id: c.id, nom: c.name, fournisseur: c.provider }));
}

function ajouterFournisseur(f, cle) {
  const nom = `${f.id} (kit)`;
  for (const c of connexionsExistantes()) if (c.nom === nom) omniroute(["providers", "remove", c.id, "--yes"], { timeout: 60000 });
  const r = omniroute(["setup", "--add-provider", "--provider", f.id, "--provider-name", nom, "--api-key", cle, "--test-provider", "--non-interactive"], { timeout: 180000 });
  const sortie = (r.out + r.err).replace(/\x1b\[[0-9;]*m/g, "");
  if (r.code === 0 && /Provider test passed/i.test(sortie)) { ok(`${f.nom} connecte et teste`); return true; }
  const raison = (sortie.match(/Provider test failed:\s*(.*)/i) || [])[1];
  if (r.code === 0 && /Provider configured/i.test(sortie)) {
    warn(`${f.nom} enregistre, mais le test a echoue : ${(raison || "raison inconnue").slice(0, 160)}`);
    info("Cle mal copiee (espace en trop ?), compte pas encore active, ou quota du jour atteint. Verifie puis : ajouter-cle");
    return true;
  }
  erreur(`${f.nom} : echec (${(raison || sortie.trim().split("\n").slice(-1)[0] || r.code).toString().slice(0, 160)})`);
  return false;
}

async function creerCleApi() {
  const e = etat();
  const ancienne = e.cleApi || lireJson(path.join(CLAUDE_DIR, "settings.json")).env?.ANTHROPIC_AUTH_TOKEN;
  if (ancienne && (await cleValide(ancienne)).ok) { ok(`Cle d'acces Claude Code deja valide (${masquer(ancienne)})`); return ancienne; }
  const nom = `claude-code-${os.hostname().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30) || "pc"}`;
  const r = omniroute(["--output", "json", "api", "api-keys", "post-api-keys", "--body", JSON.stringify({ name: nom })], { timeout: 60000 });
  const j = jsonDe(r.out);
  if (j?.key) { ok(`Cle d'acces creee pour Claude Code (${masquer(j.key)})`); return j.key; }
  warn("Creation automatique de la cle impossible. Fais-le a la main (1 minute) :");
  info(`Ouvre ${BASE}/dashboard/api-manager → « Creer une cle API » → copie-la.${estServeurProbable() ? ` (Serveur : d'abord, sur ton PC, ssh -L ${PORT}:127.0.0.1:${PORT} root@ton-serveur)` : ""}`);
  const cle = await demander("Colle la cle ici (commence par sk-)", "");
  return cle || null;
}

async function construireCombo(cle) {
  const v = await cleValide(cle);
  if (!v.ok) { warn(`Impossible de lire la liste des modeles (${v.statut}).`); return []; }
  const connectes = new Set(connexionsExistantes().map((c) => c.fournisseur));
  const modeles = [];
  for (const f of FOURNISSEURS) {
    if (!connectes.has(f.id)) continue;
    const dispo = v.ids.filter((id) => id.startsWith(`${f.id}/`)).map((id) => id.slice(f.id.length + 1));
    const choisis = [];
    for (const re of f.prefs) {
      const m = dispo.find((id) => re.test(id) && !choisis.includes(id));
      if (m) choisis.push(m);
      if (choisis.length === 2) break;
    }
    // Catalogue pas encore pret, ou cle refusee au test (quota du moment) : modeles par defaut
    // verifies dans le registre OmniRoute 3.8.5x. Si la cle est vraiment mauvaise, la bascule passe au suivant.
    for (const m of choisis.length ? choisis : f.defauts) modeles.push(`${f.id}/${m}`);
  }
  if (!modeles.length) { warn("Aucun modele gratuit connecte pour l'instant : ajoute une cle (kit-claude ajouter-cle)."); return []; }
  omniroute(["combo", "delete", COMBO, "--yes"], { timeout: 60000 });
  const r = omniroute(["combo", "create", COMBO, "--models", modeles.join(","), "--strategy", "priority"], { timeout: 60000 });
  if (r.code !== 0) { warn("Combinaison non creee : " + (r.err || r.out).slice(-200)); return []; }
  ok(`Bascule automatique « ${COMBO} » : ${modeles.join(" → ")}`);
  return modeles;
}

function envClaude(cle, base = BASE) {
  return {
    ANTHROPIC_BASE_URL: base,
    ANTHROPIC_AUTH_TOKEN: cle,
    ANTHROPIC_MODEL: COMBO,
    ANTHROPIC_DEFAULT_OPUS_MODEL: COMBO,
    ANTHROPIC_DEFAULT_SONNET_MODEL: COMBO,
    ANTHROPIC_DEFAULT_HAIKU_MODEL: COMBO,
    CLAUDE_CODE_SUBAGENT_MODEL: COMBO,
    CLAUDE_CODE_MAX_CONTEXT_TOKENS: CONTEXTE_MAX,
  };
}

function ecrireLanceur(nom, env, claude) {
  fs.mkdirSync(BIN, { recursive: true });
  ajouterAuPath(BIN);
  if (WIN) {
    const f = path.join(BIN, `${nom}.cmd`);
    const lignes = ["@echo off", "rem Kit Claude Gratuit : lance Claude Code via OmniRoute", ...Object.entries(env).map(([k, v]) => `set "${k}=${v}"`), `"${claude}" --permission-mode manual %*`];
    fs.writeFileSync(f, lignes.join("\r\n") + "\r\n");
    return f;
  }
  const f = path.join(BIN, nom);
  const q = (x) => `'${String(x).replace(/'/g, "'\\''")}'`;
  const lignes = ["#!/bin/sh", "# Kit Claude Gratuit : lance Claude Code via OmniRoute", ...Object.entries(env).map(([k, v]) => `export ${k}=${q(v)}`), `exec ${q(claude)} --permission-mode manual "$@"`];
  fs.writeFileSync(f, lignes.join("\n") + "\n", { mode: 0o700 });
  return f;
}

function copierKitStable() {
  // Le zip est souvent dans Telechargements : si l'eleve le supprime, « kit-claude » doit continuer a marcher.
  const dest = path.join(STATE_DIR, "kit");
  if (path.resolve(KIT_DIR) === path.resolve(dest)) return dest;
  try {
    fs.rmSync(dest, { recursive: true, force: true });
    fs.cpSync(KIT_DIR, dest, { recursive: true, filter: (f) => !f.split(path.sep).includes(".git") && !f.split(path.sep).includes("node_modules") });
    return dest;
  } catch (e) { warn("Copie du kit impossible (" + e.message + ") : kit-claude utilisera " + KIT_DIR); return KIT_DIR; }
}

function ecrireCommandeKit() {
  // « kit-claude diagnostic | ajouter-cle | bascule | mise-a-jour | test | desinstaller » depuis n'importe ou.
  fs.mkdirSync(BIN, { recursive: true });
  ajouterAuPath(BIN);
  const kitStable = copierKitStable();
  const script = path.join(kitStable, "scripts", "kit.mjs");
  if (WIN) fs.writeFileSync(path.join(BIN, "kit-claude.cmd"), `@echo off\r\n"${process.execPath}" "${script}" %*\r\n`);
  else fs.writeFileSync(path.join(BIN, "kit-claude"), `#!/bin/sh\nexec '${process.execPath}' '${script}' "$@"\n`, { mode: 0o755 });
  ok("Commande « kit-claude » creee (kit-claude diagnostic, kit-claude ajouter-cle, kit-claude mise-a-jour)");
  return kitStable;
}

function creerRaccourciBureau(cible) {
  // Double-clic = terminal ouvert dans le dossier de projets, Claude deja lance.
  try {
    if (WIN) {
      const bureau = dossierWindows("Desktop");
      if (!bureau) return null;
      const lnk = path.join(bureau, "Claude Gratuit.lnk");
      const esc = (x) => String(x).replace(/'/g, "''");
      const args = `/k cd /d "${PROJETS}" && "${cible}"`;
      const ps = `$s=(New-Object -ComObject WScript.Shell).CreateShortcut('${esc(lnk)}'); $s.TargetPath='${esc(path.join(process.env.SystemRoot || "C:\\Windows", "System32", "cmd.exe"))}'; $s.Arguments='${esc(args)}'; $s.WorkingDirectory='${esc(PROJETS)}'; $s.Description='Claude Code gratuit (OmniRoute)'; $s.Save()`;
      const r = lancer("powershell.exe", ["-NoProfile", "-Command", ps], { timeout: 60000 });
      return r.code === 0 && fs.existsSync(lnk) ? lnk : null;
    }
    if (MAC) {
      const bureau = path.join(HOME, "Desktop");
      if (!fs.existsSync(bureau)) return null;
      const f = path.join(bureau, "Claude Gratuit.command");
      fs.writeFileSync(f, `#!/bin/bash\n# Kit Claude Gratuit : double-clic pour lancer Claude dans ton dossier de projets.\ncd "${PROJETS}" || exit 1\nexec "${cible}"\n`, { mode: 0o755 });
      return f;
    }
  } catch { /* confort seulement */ }
  return null;
}

function retirerReglagesKit(fSettings) {
  // Enleve nos reglages d'un settings.json (passage en mode abonnement, desinstallation).
  if (!fs.existsSync(fSettings)) return false;
  const g = lireJsonSur(fSettings);
  if (!g.env?.ANTHROPIC_BASE_URL || !g.env.ANTHROPIC_BASE_URL.endsWith(`:${PORT}`) || g.env.ANTHROPIC_MODEL !== COMBO) return false;
  sauvegarder(fSettings);
  for (const k of Object.keys(envClaude(""))) delete g.env[k];
  if (g.permissions?.defaultMode === "manual") delete g.permissions.defaultMode;
  ecrireJson(fSettings, g);
  return true;
}

function preparerAccueil(fJson) {
  // Saute l'ecran d'accueil et fait confiance au dossier de projets (cree par le kit).
  fs.mkdirSync(PROJETS, { recursive: true });
  let cj;
  try { cj = lireJsonSur(fJson); } catch (e) { warn(e.message + " (tu verras juste les ecrans d'accueil de Claude)"); return; }
  sauvegarder(fJson);
  if (cj.hasCompletedOnboarding === undefined) cj.hasCompletedOnboarding = true;
  cj.projects = cj.projects || {};
  for (const p of new Set([PROJETS, PROJETS.replace(/\\/g, "/")])) cj.projects[p] = { ...(cj.projects[p] || {}), hasTrustDialogAccepted: true };
  ecrireJson(fJson, cj);
}

function configurerClaude(cle, { mode, claude }) {
  // mode « global »  : pas d'abonnement, « claude » passe par OmniRoute (reglages dans ~/.claude).
  // mode « lanceur » : abonnement Pro/Max, « claude » reste intact ; « claude-gratuit » = profil ~/.claude-gratuit.
  const profil = mode === "lanceur" ? PROFIL_GRATUIT : CLAUDE_DIR;
  const env = mode === "lanceur" ? { ...envClaude(cle), CLAUDE_CONFIG_DIR: profil } : envClaude(cle);
  fs.mkdirSync(profil, { recursive: true });
  const fSettings = path.join(profil, "settings.json");
  const s = lireJsonSur(fSettings);
  sauvegarder(fSettings);
  s.env = { ...(s.env || {}), ...envClaude(cle) };
  // Le mode « auto » de Claude Code verifie les actions sur les serveurs d'Anthropic : derriere OmniRoute
  // il affiche « Auto mode can't check actions » (vu en test). Mode « manual » : Claude demande avant d'agir.
  if (!s.permissions?.defaultMode || s.permissions.defaultMode === "auto") s.permissions = { ...(s.permissions || {}), defaultMode: "manual" };
  ecrireJson(fSettings, s);
  if (mode === "lanceur") {
    if (retirerReglagesKit(path.join(CLAUDE_DIR, "settings.json"))) ok("Anciens reglages du kit retires de ton profil Claude payant");
    // Historique partage : apres « limit reached », « claude-gratuit -c » reprend la meme conversation.
    const lien = path.join(PROFIL_GRATUIT, "projects"), cible = path.join(CLAUDE_DIR, "projects");
    if (!fs.existsSync(lien)) { try { fs.mkdirSync(cible, { recursive: true }); fs.symlinkSync(cible, lien, WIN ? "junction" : "dir"); } catch { /* option de confort */ } }
  }
  preparerAccueil(mode === "lanceur" ? path.join(PROFIL_GRATUIT, ".claude.json") : path.join(HOME, ".claude.json"));
  const lanceur = ecrireLanceur("claude-gratuit", env, claude);
  ok(`Commande « claude-gratuit » creee (${lanceur})`);
  const raccourci = creerRaccourciBureau(mode === "global" ? claude : lanceur);
  if (raccourci) ok(`Raccourci « Claude Gratuit » sur le Bureau (double-clic = Claude ouvert dans ton dossier de projets)`);
  majEtat({ raccourci: raccourci || null });
  if (mode === "global") ok("Claude Code passe par OmniRoute par defaut (commande « claude »)");
  else ok("« claude » = ton abonnement, intact. « claude-gratuit » = profil gratuit separe (~/.claude-gratuit)");
  ok(`Dossier de travail pret et autorise : ${PROJETS}`);
  return { env, profil };
}

function installerSkills(profil = CLAUDE_DIR) {
  const src = path.join(KIT_DIR, "skills");
  const dest = path.join(profil, "skills");
  fs.mkdirSync(dest, { recursive: true });
  const installes = [];
  let gardes = 0;
  for (const nom of fs.readdirSync(src)) {
    const s = path.join(src, nom);
    if (!fs.statSync(s).isDirectory()) continue;
    const d = path.join(dest, nom);
    if (fs.existsSync(d) && SKILLS_TIERS.has(nom)) { gardes++; continue; }
    if (fs.existsSync(d)) {
      const carnet = path.join(d, "carnet.md");
      const garde = fs.existsSync(carnet) ? fs.readFileSync(carnet) : null;
      sauvegarder(d);
      fs.rmSync(d, { recursive: true, force: true });
      fs.cpSync(s, d, { recursive: true });
      if (garde) fs.writeFileSync(carnet, garde);
    } else fs.cpSync(s, d, { recursive: true });
    installes.push(nom);
  }
  ok(`${installes.length} skills installes${gardes ? `, ${gardes} deja la gardes tels quels` : ""} (${dest})`);
  // Outil de capture (sites et jeux) : playwright-core seulement, il utilise le Chrome ou Edge deja installe.
  const capture = path.join(dest, "clone-site", "scripts");
  if (fs.existsSync(path.join(capture, "package.json")) && !fs.existsSync(path.join(capture, "node_modules"))) {
    const r = npm(["install", "--no-audit", "--no-fund", "--silent"], { cwd: capture, timeout: 10 * 60 * 1000 });
    if (r.code === 0) ok("Outil de capture pret (captures ordi + mobile des sites et jeux)"); else warn("Outil de capture non installe (optionnel).");
  }
  return installes;
}

function installerRegles(profil = CLAUDE_DIR) {
  const f = path.join(profil, "CLAUDE.md");
  const bloc = fs.readFileSync(path.join(KIT_DIR, "config", "CLAUDE.md"), "utf8").trim();
  let contenu = fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "";
  // On garde le profil deja rempli par le skill bienvenue-gratuit.
  let profilEleve = null;
  const a = contenu.indexOf(PROFIL_DEBUT), b = contenu.indexOf(PROFIL_FIN);
  if (a >= 0 && b > a) profilEleve = contenu.slice(a, b + PROFIL_FIN.length);
  const nouveau = profilEleve ? bloc.replace(new RegExp(`${PROFIL_DEBUT}[\\s\\S]*?${PROFIL_FIN}`), profilEleve) : bloc;
  const i = contenu.indexOf(MARQ_DEBUT), j = contenu.indexOf(MARQ_FIN);
  if (i >= 0 && j > i) contenu = contenu.slice(0, i) + nouveau + contenu.slice(j + MARQ_FIN.length);
  else contenu = (contenu.trim() ? contenu.trimEnd() + "\n\n" : "") + nouveau + "\n";
  if (fs.existsSync(f)) sauvegarder(f);
  fs.writeFileSync(f, contenu);
  ok(`Regles « mode gratuit » ajoutees (${f}) : economie de tokens, francais, verifications`);
}

async function telechargerKit(depot, dest) {
  // .tar.gz : tar est present sur Windows 10+, Mac et Linux (pas besoin d'unzip).
  const url = `https://codeload.github.com/${depot}/tar.gz/refs/heads/main`;
  const r = await fetch(url, { signal: AbortSignal.timeout(10 * 60 * 1000) });
  if (!r.ok) throw new Error(`telechargement ${depot} : HTTP ${r.status}`);
  fs.mkdirSync(dest, { recursive: true });
  const archive = path.join(os.tmpdir(), `kit-${crypto.randomBytes(4).toString("hex")}.tar.gz`);
  fs.writeFileSync(archive, Buffer.from(await r.arrayBuffer()));
  const x = lancer("tar", ["-xzf", archive, "-C", dest, "--strip-components=1"], { timeout: 10 * 60 * 1000 });
  fs.rmSync(archive, { force: true });
  if (x.code !== 0) throw new Error("extraction : " + x.err.slice(-200));
  return dest;
}

async function kitsOptionnels(choixKits) {
  if (choixKits.stories) {
    try {
      const d = await telechargerKit("Camel974/kit-stories-a-la-une", path.join(DOCS, "kit-stories-a-la-une"));
      const r = WIN
        ? lancer("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(d, "installer.ps1")], { hérite: true, cwd: d })
        : lancer("bash", [path.join(d, "installer.sh")], { hérite: true, cwd: d });
      if (r.code === 0) ok(`Kit Stories a la une installe (dossier : ${d})`); else warn("Kit Stories : installeur termine avec une alerte (voir au-dessus).");
    } catch (e) { warn("Kit Stories a la une non installe : " + e.message); }
  }
  if (choixKits.system) {
    try {
      const d = await telechargerKit("Camel974/kit-system-brennan", path.join(HOME, "kit-system"));
      ok(`Kit SYSTEM telecharge dans ${d}`);
      info("Pour le finir (questionnaire de ta marque) : lance Claude et dis « Installe le kit SYSTEM : suis le fichier INSTALL-CLAUDE.md de ~/kit-system ».");
      majEtat({ kitSystemAFinir: true });
    } catch (e) { warn("Kit SYSTEM non telecharge : " + e.message); }
  }
}

async function testerOmniroute(cle) {
  // Test direct (quelques secondes) : donne la vraie raison d'un echec, sans attendre les 3 minutes de Claude Code.
  try {
    const r = await fetch(`${BASE}/v1/chat/completions`, {
      method: "POST", headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: COMBO, messages: [{ role: "user", content: "Reponds OK" }], max_tokens: 8 }),
      signal: AbortSignal.timeout(90000),
    });
    if (r.ok) return { ok: true };
    const t = await r.text();
    let raison = t;
    try { raison = JSON.parse(t).error?.message || t; } catch { /* texte brut */ }
    return { ok: false, raison: String(raison).replace(/\s+/g, " ").slice(0, 220) };
  } catch (e) { return { ok: false, raison: String(e.message || e).slice(0, 220) }; }
}

async function testerClaude(env, claude) {
  if (!(await sante())) { erreur("OmniRoute ne repond pas : lance « kit-claude demarrer » puis reessaie."); return false; }
  const direct = await testerOmniroute(env.ANTHROPIC_AUTH_TOKEN || etat().cleApi || "");
  if (!direct.ok) {
    erreur(`Aucun modele gratuit n'a repondu : ${direct.raison}`);
    info("Le plus souvent : cle mal copiee ou compte pas encore active. Recolle ta cle : kit-claude ajouter-cle");
    return false;
  }
  info("Test : je demande a Claude Code de repondre « OK » (jusqu'a 3 minutes avec un modele gratuit)...");
  const debut = Date.now();
  const r = lancer(claude, ["-p", "Reponds uniquement par le mot OK, rien d'autre."], { env: { ...env, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1" }, cwd: PROJETS, timeout: 180000 });
  const s = ((Date.now() - debut) / 1000).toFixed(0);
  const sortie = (r.out || "").trim().split("\n").filter((l) => !l.startsWith("[claude-code:")).join(" ").trim();
  if (r.code === 0 && sortie) { ok(`Claude Code repond en ${s} s : « ${sortie.slice(0, 80)} »`); return true; }
  erreur(`Pas de reponse (${s} s). ${(r.err || sortie).trim().split("\n").slice(-2).join(" ").slice(0, 300)}`);
  info("Lance : kit-claude diagnostic  (le rapport dit quoi corriger)");
  return false;
}

// ---------------------------------------------------------------- commandes
async function cmdInstaller() {
  titre("KIT CLAUDE GRATUIT · Brennan SONNET");
  console.log(`  Claude Code + OmniRoute : l'agent de code de Claude, branche sur des modeles gratuits.\n  Duree : 10 a 15 minutes, dont 3 de questions. Rien n'est supprime sans sauvegarde.`);
  const T = 9;

  etape(1, T, "Ton ordinateur");
  verifierOrdi();

  // Toutes les questions d'abord : ensuite tu peux aller boire un cafe.
  titre("Quelques questions (Entree = reponse recommandee)");
  let mode = OPTS.mode === "serveur" || OPTS.serveur ? "serveur" : OPTS.mode === "pc" || OPTS.pc ? "pc" : null;
  if (!mode) {
    const n = await choix("Ou installes-tu ?", ["Sur ce PC / ce Mac (je l'utilise directement)", "Sur un serveur (VPS, NAS) auquel je me connecte"], estServeurProbable() ? 2 : 1);
    mode = n === 2 ? "serveur" : "pc";
  }
  let abonnement = OPTS.abonnement ? String(OPTS.abonnement).startsWith("o") : null;
  // Deja connecte a un compte Claude ? Alors « oui » devient la reponse par defaut (protege le « claude » payant).
  const connecte = fs.existsSync(path.join(CLAUDE_DIR, ".credentials.json")) || Boolean(lireJson(path.join(HOME, ".claude.json")).oauthAccount);
  if (connecte && abonnement === null) info("Tu es deja connecte a un compte Claude sur cet ordi.");
  if (abonnement === null) abonnement = await ouiNon("As-tu un abonnement Claude payant (Pro ou Max) ? Si oui, ton « claude » actuel ne sera pas touche", connecte);
  const modeClaude = abonnement ? "lanceur" : "global";

  const dossier = dossierDonnees();
  const premiereFois = !fs.existsSync(path.join(dossier, "storage.sqlite"));
  let mdp = OPTS["mot-de-passe"] || process.env.KIT_MOT_DE_PASSE || null;
  if (!mdp && premiereFois) {
    mdp = await demander("Choisis un mot de passe pour le tableau de bord OmniRoute (8+ caracteres, Entree = j'en genere un)", "", { cache: true });
    if (!mdp) mdp = crypto.randomBytes(9).toString("base64url");
    while (mdp.length < 8) mdp = await demander("Trop court : 8 caracteres minimum", "", { cache: true }) || crypto.randomBytes(9).toString("base64url");
  }

  const cles = {};
  for (const f of FOURNISSEURS) if (OPTS[`cle-${f.id}`]) cles[f.id] = String(OPTS[`cle-${f.id}`]);
  if (!AUTO && process.stdin.isTTY && !Object.keys(cles).length) {
    console.log(`\n  ${C.gr}Tes cles gratuites${C.z} (2 minutes chacune, guide pas a pas : docs/04-cles-gratuites.md)`);
    console.log(`  Il en faut au moins 1. Le top : ${C.gr}Mistral${C.z} (gros quota) + ${C.gr}NVIDIA${C.z} + ${C.gr}Gemini${C.z} en secours.`);
    console.log(`  Pas encore de cle ? Entree pour passer : tu pourras les ajouter apres (« ajouter-cle »).\n`);
    for (const f of FOURNISSEURS) {
      console.log(`  ${C.b}${f.nom}${C.z} : ${f.url}\n     ${C.d}${f.aide}${C.z}`);
      const k = await demander(`Colle ta cle ${f.nom} (Entree = passer)`, "", { cache: true });
      if (k) cles[f.id] = k.replace(/\s+/g, "");
    }
  }

  const kits = { crea: !OPTS["sans-skills"], stories: Boolean(OPTS.stories), system: Boolean(OPTS.system) };
  if (!AUTO && process.stdin.isTTY) {
    kits.crea = await ouiNon("Installer le pack de skills (sites, apps, jeux video, design, economie de tokens) ?", true);
    kits.system = await ouiNon("Tu es eleve SYSTEM de Brennan (telecharger aussi le kit SYSTEM) ?", false);
    kits.stories = await ouiNon("Installer aussi le kit « Stories a la une » (Instagram) ?", false);
  }
  fermer();

  etape(2, T, "Claude Code");
  const claude = await installerClaudeCode();

  etape(3, T, "OmniRoute (le routeur de modeles gratuits)");
  installerOmniroute({ forcer: Boolean(OPTS["mise-a-jour"]) });

  etape(4, T, "Reglages de securite");
  const envChange = ecrireEnvOmniroute(dossier, { serveur: mode === "serveur" });
  if (mdp && definirMotDePasse(mdp)) console.log(`  ${C.gr}Mot de passe du tableau de bord : ${mdp}${C.z}  (note-le ; oublie ? « kit-claude mot-de-passe »)`);

  etape(5, T, "Demarrage d'OmniRoute");
  if (envChange) await arreterOmniroute();
  activerDemarrageAuto(); // demarre aussi le service sur Mac et Linux
  if (await attendreSante(20)) ok(`OmniRoute tourne : tableau de bord ${BASE}`);
  else if (!(await demarrerOmniroute())) throw new Error("demarrage");

  etape(6, T, "Tes fournisseurs gratuits");
  let nb = 0;
  for (const f of FOURNISSEURS) if (cles[f.id] && ajouterFournisseur(f, cles[f.id])) nb++;
  const deja = new Set(connexionsExistantes().map((c) => c.fournisseur));
  const total = FOURNISSEURS.filter((f) => deja.has(f.id)).length;
  if (!total) warn("Aucun fournisseur connecte : Claude Code est installe mais n'a pas encore de cerveau. Ajoute 1 cle : kit-claude ajouter-cle");
  else ok(`${total} fournisseur(s) gratuit(s) connecte(s)`);

  etape(7, T, "Branchement Claude Code ↔ OmniRoute");
  const cle = await creerCleApi();
  if (!cle) throw new Error("cle-api");
  const modeles = await construireCombo(cle);
  const { env, profil } = configurerClaude(cle, { mode: modeClaude, claude });
  const kitStable = ecrireCommandeKit();

  etape(8, T, "Skills et regles");
  const skills = kits.crea ? installerSkills(profil) : [];
  installerRegles(profil);
  await kitsOptionnels(kits);

  majEtat({ mode, modeClaude, profil, kitDir: kitStable, projets: PROJETS, dataDir: dossier, cleApi: cle, combo: COMBO, modeles, skills, installeLe: new Date().toISOString() });

  etape(9, T, "Test final");
  const marche = modeles.length ? await testerClaude(env, claude) : (warn("Test saute : ajoute d'abord une cle gratuite."), false);

  titre(marche ? "C'EST PRET !" : "INSTALLE (il manque juste une etape)");
  const cmd = modeClaude === "global" ? "claude" : "claude-gratuit";
  console.log(`
${etat().raccourci ? "  Le plus simple : double-clic sur « Claude Gratuit » sur ton Bureau.\n  Sinon :\n" : ""}  1. ${mode === "serveur" ? "Reconnecte-toi en SSH" : `Ouvre un ${WIN ? "nouveau PowerShell" : "nouveau Terminal"}`} puis tape :
       cd "${PROJETS}"
       ${cmd}
  2. Ecris ce que tu veux, par exemple : « fais-moi un jeu de voiture jouable sur telephone ».
  3. Premier lancement : tape  /bienvenue-gratuit  (8 questions a boutons, 5 minutes).

  Tableau de bord OmniRoute : ${BASE}  ${mdp && premiereFois ? `(mot de passe : ${C.gr}${mdp}${C.z} , note-le !)` : ""}
  Ajouter une cle gratuite : kit-claude ajouter-cle
  Si ca bloque             : kit-claude diagnostic   (puis copie le rapport a Claude)
  Guide complet            : ${path.join(kitStable, "00-LIS-MOI-EN-PREMIER.txt")}
`);
  if (modeClaude === "lanceur") console.log(`  Ton abonnement : « claude » comme avant. Limite atteinte ? /exit puis « claude-gratuit -c » (meme conversation).\n  Si Claude parle de « /logout » dans claude-gratuit : ne le fais JAMAIS (ca deconnecterait ton abonnement).\n`);
  if (mode === "serveur") console.log(`  Serveur : reconnecte-toi en SSH, puis :  tmux new -A -s claude   (si la connexion coupe, retape-la : Claude t'attend)\n  puis  cd "${PROJETS}"  et  ${cmd}\n  Sur ce serveur tournent peut-etre d'autres services (n8n...) : reponds 1 (pas 2) quand Claude veut lancer une commande.\n`);
  if (mode === "serveur") console.log(`  Tableau de bord du serveur, depuis ton PC : ssh -L ${PORT}:127.0.0.1:${PORT} root@ton-serveur  puis ouvre ${BASE}\n  Pour utiliser ce serveur depuis Claude Code sur ton PC : « kit-claude cle » ici, puis « kit-claude connecter-serveur » sur le PC.\n`);
}

async function cmdAjouterCle() {
  titre("Ajouter une cle gratuite");
  if (!(await sante())) await demarrerOmniroute();
  let f = FOURNISSEURS.find((x) => x.id === OPTS.fournisseur);
  if (!f) {
    const n = await choix("Quel fournisseur ?", FOURNISSEURS.map((x) => `${x.nom} : ${x.url}`), 1);
    f = FOURNISSEURS[n - 1];
  }
  console.log(`     ${C.d}${f.aide}${C.z}`);
  const cle = OPTS.cle || (await demander(`Colle ta cle ${f.nom}`, "", { cache: true }));
  fermer();
  if (!cle) { warn("Aucune cle : rien n'a change."); return; }
  ajouterFournisseur(f, cle.replace(/\s+/g, ""));
  const e = etat();
  if (e.cleApi) {
    const modeles = await construireCombo(e.cleApi);
    majEtat({ modeles });
  }
}

async function cmdDemarrer() {
  // « omniroute » est bloque dans PowerShell (script .ps1) : cette commande passe par node directement.
  if (await sante()) { ok(`OmniRoute tourne deja : ${BASE}`); return; }
  await demarrerOmniroute();
}

async function cmdMotDePasse() {
  titre("Nouveau mot de passe du tableau de bord OmniRoute");
  let mdp = OPTS["mot-de-passe"] || (await demander("Nouveau mot de passe (8 caracteres ou plus)", "", { cache: true }));
  fermer();
  if (!mdp || mdp.length < 8) { warn("Trop court : rien n'a change."); return; }
  if (definirMotDePasse(mdp)) info(`Connecte-toi sur ${BASE} avec ce mot de passe.`);
}

async function cmdCle() {
  // Affiche la cle d'acces (sur ton serveur) pour la donner a « kit-claude connecter-serveur » sur ton PC.
  const e = etat();
  const cle = e.cleApi || lireJson(path.join(e.profil || CLAUDE_DIR, "settings.json")).env?.ANTHROPIC_AUTH_TOKEN;
  if (!cle) { erreur("Aucune cle : relance l'installeur."); process.exitCode = 1; return; }
  console.log(cle);
}

async function cmdBascule() {
  titre("Reconstruire la bascule « gratuit » (apres un ajout de cle dans le tableau de bord)");
  if (!(await sante())) await demarrerOmniroute();
  const cle = etat().cleApi || lireJson(path.join(CLAUDE_DIR, "settings.json")).env?.ANTHROPIC_AUTH_TOKEN;
  if (!cle) { erreur("Pas de cle d'acces : relance l'installeur."); return; }
  majEtat({ modeles: await construireCombo(cle) });
}

async function cmdDiagnostic() {
  titre("DIAGNOSTIC · Kit Claude Gratuit (copie tout ce bloc a Claude si tu bloques)");
  const e = etat();
  const lignes = [];
  const L = (k, v) => { lignes.push(`${k}: ${v}`); console.log(`  ${k.padEnd(22)} ${v}`); };
  L("Kit", `${KIT_VERSION} (${KIT_DIR})`);
  L("Systeme", `${process.platform} ${os.release()} ${process.arch}, RAM ${(os.totalmem() / 1024 ** 3).toFixed(1)} Go`);
  L("Node.js", `${process.version} ${NODE_OK(versionDe(process.version)) ? "OK" : "TROP VIEUX (22.22.2+ ou 24+)"}`);
  const claude = cheminClaude();
  L("Claude Code", claude ? lancer(claude, ["--version"], { timeout: 30000 }).out.trim() : "ABSENT → relance l'installeur");
  const omni = cheminOmniroute();
  L("OmniRoute installe", omni ? `oui (${(versionDe(omniroute(["--version"]).out) || ["?"]).join(".")})` : "NON → relance l'installeur");
  const enLigne = await sante();
  L("OmniRoute en marche", enLigne ? `oui (${BASE})` : "NON → lance : kit-claude demarrer");
  const dd = dossierDonnees();
  const envTxt = fs.existsSync(path.join(dd, ".env")) ? fs.readFileSync(path.join(dd, ".env"), "utf8") : "";
  L("Donnees OmniRoute", `${dd} ${/OMNIROUTE_SERVER_HOST=127\.0\.0\.1/.test(envTxt) ? "(prive 127.0.0.1)" : "(ATTENTION : expose sur le reseau ?)"}`);
  const profil = e.profil || CLAUDE_DIR;
  const s = lireJson(path.join(profil, "settings.json"), {});
  const cle = s.env?.ANTHROPIC_AUTH_TOKEN || e.cleApi;
  L("Mode Claude", e.modeClaude === "lanceur"
    ? `abonnement : « claude » intact, « claude-gratuit » → profil ${profil}`
    : s.env?.ANTHROPIC_BASE_URL ? `gratuit : claude → ${s.env.ANTHROPIC_BASE_URL}, modele ${s.env.ANTHROPIC_MODEL}` : "NON CONFIGURE → relance l'installeur");
  L("Permissions", s.permissions?.defaultMode === "manual" ? "manual (Claude demande avant d'agir)" : `${s.permissions?.defaultMode || "auto"} (MODE AUTO : refuse par la passerelle → Maj+Tab pour en sortir)`);
  L("Commandes", ["claude-gratuit", "kit-claude"].map((n) => `${n} ${fs.existsSync(path.join(BIN, WIN ? `${n}.cmd` : n)) ? "ok" : "ABSENTE"}`).join(", ") + ` (dans ${BIN})`);
  if (cle && enLigne) {
    const v = await cleValide(cle);
    L("Cle d'acces", v.ok ? `valide (${masquer(cle)}), ${v.ids.length} modeles visibles` : `REFUSEE (${v.statut}) → relance l'installeur`);
  } else L("Cle d'acces", cle ? `${masquer(cle)} (non testee)` : "AUCUNE → relance l'installeur");
  if (enLigne) {
    const conn = connexionsExistantes();
    L("Fournisseurs", conn.length ? conn.map((c) => c.fournisseur).join(", ") : "AUCUN → kit-claude ajouter-cle");
    const combos = jsonDe(omniroute(["combo", "list", "--json"]).out)?.combos || [];
    const g = combos.find((c) => c.name === COMBO);
    L("Bascule « gratuit »", g ? g.models.map((m) => m.model || m).join(" → ") : "ABSENTE → kit-claude ajouter-cle");
  }
  const journal = path.join(dd, "logs", "application", "app.log");
  if (fs.existsSync(journal)) {
    const erreurs = fs.readFileSync(journal, "utf8").split("\n").filter((l) => /"level":"(error|warn)"/.test(l) && !/\[AUTO\]|Cleanup|matched no connected/.test(l)).slice(-5)
      .map((l) => { try { const j = JSON.parse(l); return `${j.timestamp?.slice(11, 19)} ${j.component}: ${String(j.message).slice(0, 160)}`; } catch { return l.slice(0, 160); } });
    if (erreurs.length) { console.log("  Dernieres alertes OmniRoute :"); erreurs.forEach((x) => { lignes.push("  " + x); console.log("    " + x); }); }
  }
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const rapport = path.join(STATE_DIR, "diagnostic.txt");
  fs.writeFileSync(rapport, "Kit Claude Gratuit : rapport de diagnostic\n\n" + lignes.join("\n") + "\n");
  // Ouvre le rapport pour le copier facilement (Ctrl+A puis Ctrl+C).
  try {
    if (WIN) spawn("notepad.exe", [rapport], { detached: true, stdio: "ignore" }).unref();
    else if (MAC) spawn("open", ["-e", rapport], { detached: true, stdio: "ignore" }).unref();
  } catch { /* pas d'interface graphique : le chemin est affiche */ }
  console.log(`\n  Rapport enregistre : ${path.join(STATE_DIR, "diagnostic.txt")}\n  Solutions classees par symptome : docs/07-depannage.md`);
}

async function cmdTest() {
  const claude = cheminClaude();
  const e = etat();
  if (!claude) { erreur("Claude Code absent : relance l'installeur."); return; }
  if (!(await sante())) await demarrerOmniroute();
  const cle = e.cleApi || lireJson(path.join(e.profil || CLAUDE_DIR, "settings.json")).env?.ANTHROPIC_AUTH_TOKEN || "";
  const env = e.modeClaude === "lanceur" ? { ...envClaude(cle), CLAUDE_CONFIG_DIR: e.profil || PROFIL_GRATUIT } : envClaude(cle);
  fs.mkdirSync(PROJETS, { recursive: true });
  await testerClaude(env, claude);
}

async function cmdMiseAJour() {
  titre("Mise a jour");
  const e = etat();
  try {
    const d = await telechargerKit(KIT_REPO, path.join(STATE_DIR, "kit"));
    ok(`Kit telecharge (derniere version) : ${d}`);
    const r = lancer(process.execPath, [path.join(d, "scripts", "kit.mjs"), "_suite-maj"], { hérite: true });
    if (r.code !== 0) warn("Suite de la mise a jour incomplete.");
  } catch (err) { warn("Kit non mis a jour (hors ligne ?) : " + err.message); }
  installerOmniroute({ forcer: true });
  const claude = cheminClaude();
  if (claude) { lancer(claude, ["update"], { hérite: true, timeout: 5 * 60 * 1000 }); }
  if (e.cleApi) await demarrerOmniroute({ redemarrer: true });
}
async function cmdSuiteMaj() {
  const profil = etat().profil || CLAUDE_DIR;
  installerSkills(profil);
  installerRegles(profil);
  const e = etat();
  if (e.cleApi && (await sante())) majEtat({ modeles: await construireCombo(e.cleApi), kitDir: KIT_DIR });
}

async function cmdDesinstaller() {
  titre("Desinstallation (tes projets et tes fichiers perso restent)");
  if (!(await ouiNon("Retirer la configuration du kit (Claude Code repasse en normal) ?", true))) return;
  const e = etat();
  const profils = [...new Set([e.profil || CLAUDE_DIR, CLAUDE_DIR, PROFIL_GRATUIT])].filter((d) => fs.existsSync(d));
  for (const profil of profils) {
    try { if (retirerReglagesKit(path.join(profil, "settings.json"))) ok(`Reglages OmniRoute retires (${profil})`); }
    catch (err) { warn(err.message); }
    const fMd = path.join(profil, "CLAUDE.md");
    if (fs.existsSync(fMd)) {
      const c = fs.readFileSync(fMd, "utf8"); const i = c.indexOf(MARQ_DEBUT), j = c.indexOf(MARQ_FIN);
      if (i >= 0 && j > i) { sauvegarder(fMd); fs.writeFileSync(fMd, (c.slice(0, i) + c.slice(j + MARQ_FIN.length)).trim() + "\n"); ok(`Regles du kit retirees (${fMd})`); }
    }
  }
  for (const n of ["claude-gratuit", "claude-gratuit.cmd", "claude-serveur", "claude-serveur.cmd", "kit-claude", "kit-claude.cmd"]) fs.rmSync(path.join(BIN, n), { force: true });
  for (const r of [path.join(HOME, "Desktop", "Claude Gratuit.command"), WIN && dossierWindows("Desktop") ? path.join(dossierWindows("Desktop"), "Claude Gratuit.lnk") : null]) if (r) fs.rmSync(r, { force: true });
  ok("Commandes et raccourci du kit retires");
  if (await ouiNon("Retirer aussi les skills installes par le kit ?", false)) {
    const profil = e.profil || CLAUDE_DIR;
    for (const n of e.skills || []) { const d = path.join(profil, "skills", n); if (fs.existsSync(d)) { sauvegarder(d); fs.rmSync(d, { recursive: true, force: true }); } }
    ok("Skills du kit retires (sauvegardes dans " + BACKUP + ")");
  }
  if (fs.existsSync(PROFIL_GRATUIT)) info(`Le profil gratuit ${PROFIL_GRATUIT} (historique du mode gratuit) est garde : supprime-le a la main si tu veux.`);
  if (await ouiNon("Arreter et desinstaller OmniRoute (tes cles enregistrees restent dans son dossier de donnees) ?", false)) {
    await arreterOmniroute();
    omniroute(["autostart", "disable"]);
    if (LINUX && ROOT && fs.existsSync("/etc/systemd/system/omniroute.service")) { lancer("systemctl", ["disable", "--now", "omniroute.service"]); fs.rmSync("/etc/systemd/system/omniroute.service", { force: true }); lancer("systemctl", ["daemon-reload"]); }
    npm(["uninstall", "-g", "omniroute"], { hérite: true });
    ok("OmniRoute desinstalle");
  }
  info("~/.claude.json : seuls « ecran d'accueil vu » et la confiance du dossier Projets-Claude avaient ete ajoutes (sans effet ailleurs), laisses tels quels.");
  fermer();
  ok("Termine. Sauvegardes : " + BACKUP);
}

async function cmdConnecterServeur() {
  titre("Utiliser l'OmniRoute de ton serveur depuis ce PC (tunnel SSH)");
  info("Sur le serveur, tape « kit-claude cle » et copie la cle affichee.");
  const hote = OPTS.hote || (await demander("Adresse SSH du serveur (ex : root@203.0.113.10)", ""));
  const cle = OPTS.cle || (await demander("Colle la cle du serveur (sk-...)", "", { cache: true }));
  fermer();
  if (!hote || !cle) { warn("Adresse ou cle manquante."); return; }
  const claude = cheminClaude() || (await installerClaudeCode());
  // Profil separe : pas de conflit avec un eventuel abonnement Claude sur ce PC.
  fs.mkdirSync(PROFIL_GRATUIT, { recursive: true });
  const fs1 = path.join(PROFIL_GRATUIT, "settings.json");
  const reglages = lireJsonSur(fs1);
  if (!reglages.permissions?.defaultMode) reglages.permissions = { ...(reglages.permissions || {}), defaultMode: "manual" };
  ecrireJson(fs1, reglages);
  preparerAccueil(path.join(PROFIL_GRATUIT, ".claude.json"));
  const env = { ...envClaude(cle), CLAUDE_CONFIG_DIR: PROFIL_GRATUIT };
  fs.mkdirSync(BIN, { recursive: true });
  ajouterAuPath(BIN);
  const ssh = `ssh -N -o ExitOnForwardFailure=yes -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -L ${PORT}:127.0.0.1:${PORT}`;
  if (WIN) {
    const f = path.join(BIN, "claude-serveur.cmd");
    const l = ["@echo off", "rem Kit Claude Gratuit : Claude Code ici, OmniRoute sur ton serveur (tunnel SSH)",
      `curl -s -o nul --max-time 2 ${BASE}/api/health`,
      "if errorlevel 1 (",
      `  start "Tunnel OmniRoute (laisse cette fenetre ouverte)" ${ssh} ${hote}`,
      "  timeout /t 8 /nobreak >nul",
      ")",
      `curl -s -o nul --max-time 3 ${BASE}/api/health`,
      `if errorlevel 1 ( echo Tunnel SSH impossible vers ${hote} : verifie l'adresse, ta connexion et ton mot de passe ou ta cle SSH. & exit /b 1 )`,
      ...Object.entries(env).map(([k, v]) => `set "${k}=${v}"`), `"${claude}" --permission-mode manual %*`];
    fs.writeFileSync(f, l.join("\r\n") + "\r\n");
    ok(`Commande « claude-serveur » creee : ${f}`);
  } else {
    const f = path.join(BIN, "claude-serveur");
    const q = (x) => `'${String(x).replace(/'/g, "'\\''")}'`;
    const l = ["#!/bin/sh", "# Kit Claude Gratuit : Claude Code ici, OmniRoute sur ton serveur (tunnel SSH)",
      `if ! curl -s -o /dev/null --max-time 2 ${BASE}/api/health; then`,
      `  ${ssh.replace("ssh -N", "ssh -f -N")} ${q(hote)} || { echo "Tunnel SSH impossible vers ${hote} : verifie l'adresse, ta connexion et ta cle SSH."; exit 1; }`,
      "fi",
      ...Object.entries(env).map(([k, v]) => `export ${k}=${q(v)}`), `exec ${q(claude)} --permission-mode manual "$@"`];
    fs.writeFileSync(f, l.join("\n") + "\n", { mode: 0o700 });
    ok(`Commande « claude-serveur » creee : ${f}`);
  }
  info("Dans un dossier de projet, tape « claude-serveur » : le tunnel s'ouvre et Claude Code utilise ton serveur.");
  info("Astuce : une cle SSH evite de retaper le mot de passe (ssh-keygen puis ssh-copy-id " + hote + ").");
}

// ---------------------------------------------------------------- aiguillage
const COMMANDES = {
  installer: cmdInstaller, "ajouter-cle": cmdAjouterCle, bascule: cmdBascule, diagnostic: cmdDiagnostic, test: cmdTest,
  demarrer: cmdDemarrer, "mot-de-passe": cmdMotDePasse, cle: cmdCle,
  "mise-a-jour": cmdMiseAJour, "_suite-maj": cmdSuiteMaj, desinstaller: cmdDesinstaller, "connecter-serveur": cmdConnecterServeur,
};
const nom = OPTS._[0] || "installer";
const commande = COMMANDES[nom];
if (!commande) {
  console.log(`Commandes : ${Object.keys(COMMANDES).filter((c) => !c.startsWith("_")).join(", ")}`);
  process.exit(2);
}
commande().then(() => { fermer(); process.exit(0); }).catch((e) => {
  fermer();
  erreur(`Arret : ${e.message}`);
  info(`Relance la meme commande (sans risque) ou lance le diagnostic : node "${path.join(KIT_DIR, "scripts", "kit.mjs")}" diagnostic`);
  process.exit(1);
});

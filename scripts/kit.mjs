#!/usr/bin/env node
// Kit Claude Gratuit (Brennan SONNET) : le moteur d'installation.
// Un seul script pour Windows, Mac, Linux et serveur. Lance par DEMARRER-WINDOWS.bat,
// DEMARRER-MAC.command ou installer.sh (qui installent Node.js avant si besoin).
//
//   node scripts/kit.mjs installer          installation complete (questions a boutons dans le terminal)
//   node scripts/kit.mjs ajouter-cle        ajouter une cle gratuite (Mistral, Gemini, NVIDIA, Groq, OpenRouter)
//   node scripts/kit.mjs bascule            reconstruit la bascule « gratuit » (cle ajoutee dans le tableau de bord)
//   node scripts/kit.mjs diagnostic         rapport a copier a Claude si ca bloque
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
const BASE = `http://127.0.0.1:${PORT}`;
const COMBO = "gratuit";
const CONTEXTE_MAX = "120000"; // sous les 128K de la plupart des modeles gratuits
const OMNIROUTE_MIN = [3, 8, 0];
const NODE_OK = (v) => (v[0] === 22 && (v[1] > 22 || (v[1] === 22 && v[2] >= 2))) || (v[0] >= 24 && v[0] < 27);
const STATE_DIR = WIN
  ? path.join(process.env.LOCALAPPDATA || path.join(HOME, "AppData", "Local"), "kit-claude-gratuit")
  : path.join(HOME, ".kit-claude-gratuit");
const ETAT = path.join(STATE_DIR, "etat.json");
const CLAUDE_DIR = path.join(HOME, ".claude");
const DOCS = fs.existsSync(path.join(HOME, "Documents")) ? path.join(HOME, "Documents") : HOME;
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
  try {
    const s = fs.statfsSync(HOME);
    const libre = (s.bavail * s.bsize) / 1024 ** 3;
    if (libre < 2) warn(`Seulement ${libre.toFixed(1)} Go libres sur le disque : il en faut ~2 Go.`); else ok(`Disque : ${libre.toFixed(0)} Go libres`);
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
  if (existant && !forcer) {
    const v = versionDe(omniroute(["--version"], { timeout: 60000 }).out);
    if (v && plusRecent(v, OMNIROUTE_MIN)) { ok(`OmniRoute deja installe (v${v.join(".")})`); return true; }
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
    info("Lance le diagnostic : node scripts/kit.mjs diagnostic  puis copie le rapport a Claude.");
    throw new Error("omniroute");
  }
  ok(`OmniRoute installe (v${(versionDe(omniroute(["--version"]).out) || ["?"]).join(".")})`);
  return true;
}

function ajouterAuPath(dossier) {
  process.env.PATH = `${dossier}${path.delimiter}${process.env.PATH}`;
  if (WIN) return; // le .ps1 gere le PATH Windows
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
  const voulu = {
    OMNIROUTE_SERVER_HOST: "127.0.0.1", // rien n'est visible depuis le reseau (Wi-Fi, internet)
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
  ok(`Securite : OmniRoute ecoute seulement ${serveur ? "le serveur lui-meme" : "ton ordi"} (127.0.0.1) + cle obligatoire`);
  return change;
}

async function arreterOmniroute() {
  if (!(await sante())) return;
  info("Arret de l'OmniRoute en marche pour appliquer les reglages...");
  omniroute(["stop"], { timeout: 60000 });
  if (!WIN && !MAC) lancer("systemctl", ["--user", "stop", "omniroute.service"], { timeout: 30000 });
  for (let i = 0; i < 20 && (await sante(1500)); i++) await pause(1000);
}

async function demarrerOmniroute({ redemarrer = false } = {}) {
  if (redemarrer) await arreterOmniroute();
  if (await sante()) { ok(`OmniRoute tourne : tableau de bord ${BASE}`); return true; }
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const journal = fs.openSync(path.join(STATE_DIR, "omniroute.log"), "a");
  const enfant = spawn(process.execPath, [cheminOmniroute(), "serve", "--no-open"], {
    cwd: HOME, detached: true, stdio: ["ignore", journal, journal], windowsHide: true,
    env: { ...process.env, NO_COLOR: "1" },
  });
  enfant.unref();
  info("Demarrage d'OmniRoute (jusqu'a 2 minutes la premiere fois)...");
  if (await attendreSante(150)) { ok(`OmniRoute tourne : tableau de bord ${BASE}`); return true; }
  erreur(`OmniRoute ne repond pas. Journal : ${path.join(STATE_DIR, "omniroute.log")}`);
  return false;
}

function activerDemarrageAuto() {
  const r = omniroute(["autostart", "enable", "--no-tray"], { timeout: 60000 });
  if (r.code === 0) { ok("OmniRoute demarrera tout seul a chaque allumage"); return true; }
  // Serveur Linux sans session systemd utilisateur : service systeme (si root).
  if (!WIN && !MAC && process.getuid && process.getuid() === 0 && fs.existsSync("/bin/systemctl")) {
    const unite = `[Unit]\nDescription=OmniRoute (kit-claude-gratuit)\nAfter=network-online.target\n\n[Service]\nType=simple\nUser=root\nWorkingDirectory=${HOME}\nExecStart=${process.execPath} ${cheminOmniroute()} serve --no-open\nRestart=on-failure\nEnvironment=HOME=${HOME}\n\n[Install]\nWantedBy=multi-user.target\n`;
    fs.writeFileSync("/etc/systemd/system/omniroute.service", unite);
    lancer("systemctl", ["daemon-reload"]);
    const e = lancer("systemctl", ["enable", "omniroute.service"]);
    if (e.code === 0) { ok("Service systeme omniroute.service active (redemarre avec le serveur)"); return true; }
  }
  warn("Demarrage automatique non active : apres un redemarrage, lance « omniroute serve --no-open » (ou relance le kit).");
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
  info(`Ouvre ${BASE}/dashboard/api-manager → « Creer une cle API » → copie-la.`);
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
  const dossier = path.join(HOME, ".local", "bin");
  fs.mkdirSync(dossier, { recursive: true });
  if (WIN) {
    const f = path.join(dossier, `${nom}.cmd`);
    const lignes = ["@echo off", "rem Kit Claude Gratuit : lance Claude Code via OmniRoute", ...Object.entries(env).map(([k, v]) => `set "${k}=${v}"`), `"${claude}" --permission-mode manual %*`];
    fs.writeFileSync(f, lignes.join("\r\n") + "\r\n");
    return f;
  }
  const f = path.join(dossier, nom);
  const q = (s) => `'${String(s).replace(/'/g, "'\\''")}'`;
  const lignes = ["#!/bin/sh", "# Kit Claude Gratuit : lance Claude Code via OmniRoute", ...Object.entries(env).map(([k, v]) => `export ${k}=${q(v)}`), `exec ${q(claude)} --permission-mode manual "$@"`];
  fs.writeFileSync(f, lignes.join("\n") + "\n", { mode: 0o700 });
  return f;
}

function ecrireCommandeKit() {
  // « kit-claude diagnostic | ajouter-cle | mise-a-jour | test | desinstaller » depuis n'importe ou.
  const dossier = path.join(HOME, ".local", "bin");
  fs.mkdirSync(dossier, { recursive: true });
  const script = path.join(KIT_DIR, "scripts", "kit.mjs");
  if (WIN) fs.writeFileSync(path.join(dossier, "kit-claude.cmd"), `@echo off\r\n"${process.execPath}" "${script}" %*\r\n`);
  else fs.writeFileSync(path.join(dossier, "kit-claude"), `#!/bin/sh\nexec '${process.execPath}' '${script}' "$@"\n`, { mode: 0o755 });
  ok("Commande « kit-claude » creee (kit-claude diagnostic, kit-claude ajouter-cle, kit-claude mise-a-jour)");
}

function configurerClaude(cle, { mode, claude }) {
  const env = envClaude(cle);
  fs.mkdirSync(CLAUDE_DIR, { recursive: true });
  const lanceur = ecrireLanceur("claude-gratuit", env, claude);
  ok(`Commande « claude-gratuit » creee (${lanceur})`);
  const fSettings = path.join(CLAUDE_DIR, "settings.json");
  const s = lireJson(fSettings, {});
  if (mode === "global") {
    sauvegarder(fSettings);
    s.env = { ...(s.env || {}), ...env };
    // Le mode « auto » de Claude Code verifie les actions sur les serveurs d'Anthropic : derriere OmniRoute
    // il affiche « Auto mode can't check actions » (vu en test). Mode « manual » : Claude demande avant d'agir.
    if (!s.permissions?.defaultMode || s.permissions.defaultMode === "auto") s.permissions = { ...(s.permissions || {}), defaultMode: "manual" };
    ecrireJson(fSettings, s);
    ok("Claude Code passe par OmniRoute par defaut (commande « claude »)");
  } else if (s.env?.ANTHROPIC_BASE_URL === BASE) {
    // Passage en mode lanceur : on retire nos reglages globaux pour rendre « claude » a ton abonnement.
    sauvegarder(fSettings);
    for (const k of Object.keys(env)) delete s.env[k];
    ecrireJson(fSettings, s);
    ok("« claude » reste branche sur ton abonnement Claude ; « claude-gratuit » passe par OmniRoute");
  } else ok("« claude » reste branche sur ton abonnement Claude ; « claude-gratuit » passe par OmniRoute");

  // Saute l'accueil et fait confiance au dossier de projets (cree par le kit).
  fs.mkdirSync(PROJETS, { recursive: true });
  const fJson = path.join(HOME, ".claude.json");
  const cj = lireJson(fJson, {});
  if (fs.existsSync(fJson)) sauvegarder(fJson);
  if (cj.hasCompletedOnboarding === undefined) cj.hasCompletedOnboarding = true;
  cj.projects = cj.projects || {};
  for (const p of new Set([PROJETS, PROJETS.replace(/\\/g, "/")])) cj.projects[p] = { ...(cj.projects[p] || {}), hasTrustDialogAccepted: true };
  ecrireJson(fJson, cj);
  ok(`Dossier de travail pret et autorise : ${PROJETS}`);
  return env;
}

function installerSkills() {
  const src = path.join(KIT_DIR, "skills");
  const dest = path.join(CLAUDE_DIR, "skills");
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
  ok(`${installes.length} skills installes${gardes ? `, ${gardes} deja chez toi gardes tels quels` : ""}`);
  return installes;
}

function installerRegles() {
  const f = path.join(CLAUDE_DIR, "CLAUDE.md");
  const bloc = fs.readFileSync(path.join(KIT_DIR, "config", "CLAUDE.md"), "utf8").trim();
  let contenu = fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "";
  // On garde le profil deja rempli par le skill bienvenue-gratuit.
  let profil = null;
  const a = contenu.indexOf(PROFIL_DEBUT), b = contenu.indexOf(PROFIL_FIN);
  if (a >= 0 && b > a) profil = contenu.slice(a, b + PROFIL_FIN.length);
  let nouveau = profil ? bloc.replace(new RegExp(`${PROFIL_DEBUT}[\\s\\S]*?${PROFIL_FIN}`), profil) : bloc;
  const i = contenu.indexOf(MARQ_DEBUT), j = contenu.indexOf(MARQ_FIN);
  if (i >= 0 && j > i) contenu = contenu.slice(0, i) + nouveau + contenu.slice(j + MARQ_FIN.length);
  else contenu = (contenu.trim() ? contenu.trimEnd() + "\n\n" : "") + nouveau + "\n";
  if (fs.existsSync(f)) sauvegarder(f);
  fs.writeFileSync(f, contenu);
  ok("Regles « mode gratuit » ajoutees a ~/.claude/CLAUDE.md (economie de tokens, francais, verifications)");
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

function testerClaude(env, claude) {
  info("Test : je demande a Claude Code de repondre « OK » (jusqu'a 3 minutes avec un modele gratuit)...");
  const debut = Date.now();
  const r = lancer(claude, ["-p", "Reponds uniquement par le mot OK, rien d'autre."], { env: { ...env, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1" }, cwd: PROJETS, timeout: 180000 });
  const s = ((Date.now() - debut) / 1000).toFixed(0);
  const sortie = (r.out || "").trim().split("\n").filter((l) => !l.startsWith("[claude-code:")).join(" ").trim();
  if (r.code === 0 && sortie) { ok(`Claude Code repond en ${s} s : « ${sortie.slice(0, 80)} »`); return true; }
  erreur(`Pas de reponse (${s} s). ${(r.err || sortie).trim().split("\n").slice(-2).join(" ").slice(0, 300)}`);
  info("Lance : node scripts/kit.mjs diagnostic  (le rapport dit quoi corriger)");
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
  if (abonnement === null) abonnement = await ouiNon("As-tu un abonnement Claude payant (Pro ou Max) ?", false);
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
  if (mdp) definirMotDePasse(mdp);

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
  const env = configurerClaude(cle, { mode: modeClaude, claude });
  ecrireCommandeKit();

  etape(8, T, "Skills et regles");
  const skills = kits.crea ? installerSkills() : [];
  installerRegles();
  await kitsOptionnels(kits);

  majEtat({ mode, modeClaude, kitDir: KIT_DIR, projets: PROJETS, dataDir: dossier, cleApi: cle, combo: COMBO, modeles, skills, installeLe: new Date().toISOString() });

  etape(9, T, "Test final");
  const marche = modeles.length ? testerClaude(env, claude) : (warn("Test saute : ajoute d'abord une cle gratuite."), false);

  titre(marche ? "C'EST PRET !" : "INSTALLE (il manque juste une etape)");
  const cmd = modeClaude === "global" ? "claude" : "claude-gratuit";
  console.log(`
  1. Ouvre un ${WIN ? "nouveau PowerShell" : "nouveau Terminal"} puis tape :
       cd "${PROJETS}"
       ${cmd}
  2. Ecris ce que tu veux, par exemple : « cree-moi un site pour mon coaching » ou « fais-moi un jeu de voiture ».
  3. Premier lancement : tape  /bienvenue-gratuit  (5 questions pour regler Claude sur toi).

  Tableau de bord OmniRoute : ${BASE}  ${mdp && premiereFois ? `(mot de passe : ${C.gr}${mdp}${C.z} , note-le !)` : ""}
  Ajouter une cle gratuite : kit-claude ajouter-cle
  Si ca bloque             : kit-claude diagnostic   (puis copie le rapport a Claude)
  Guide complet         : ${path.join(KIT_DIR, "00-LIS-MOI-EN-PREMIER.txt")}
`);
  if (mode === "serveur") console.log(`  Serveur : depuis ton PC, connecte-toi en SSH puis tape « ${cmd} ». Tableau de bord : ssh -L ${PORT}:127.0.0.1:${PORT} user@ton-serveur puis ouvre ${BASE}\n`);
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
  L("OmniRoute en marche", enLigne ? `oui (${BASE})` : "NON → lance : omniroute serve --no-open");
  const dd = dossierDonnees();
  const envTxt = fs.existsSync(path.join(dd, ".env")) ? fs.readFileSync(path.join(dd, ".env"), "utf8") : "";
  L("Donnees OmniRoute", `${dd} ${/OMNIROUTE_SERVER_HOST=127\.0\.0\.1/.test(envTxt) ? "(prive 127.0.0.1)" : "(ATTENTION : expose sur le reseau ?)"}`);
  const s = lireJson(path.join(CLAUDE_DIR, "settings.json"), {});
  const cle = s.env?.ANTHROPIC_AUTH_TOKEN || e.cleApi;
  L("Mode Claude", s.env?.ANTHROPIC_BASE_URL ? `global (claude → ${s.env.ANTHROPIC_BASE_URL}, modele ${s.env.ANTHROPIC_MODEL})` : "lanceur (claude-gratuit)");
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
  fs.writeFileSync(path.join(STATE_DIR, "diagnostic.txt"), lignes.join("\n") + "\n");
  console.log(`\n  Rapport enregistre : ${path.join(STATE_DIR, "diagnostic.txt")}\n  Solutions classees par symptome : docs/07-depannage.md`);
}

async function cmdTest() {
  const claude = cheminClaude();
  const e = etat();
  if (!claude) { erreur("Claude Code absent."); return; }
  const s = lireJson(path.join(CLAUDE_DIR, "settings.json"), {});
  const env = s.env?.ANTHROPIC_BASE_URL ? {} : envClaude(e.cleApi || "");
  fs.mkdirSync(PROJETS, { recursive: true });
  testerClaude(env, claude);
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
  installerSkills();
  installerRegles();
  const e = etat();
  if (e.cleApi && (await sante())) majEtat({ modeles: await construireCombo(e.cleApi), kitDir: KIT_DIR });
}

async function cmdDesinstaller() {
  titre("Desinstallation (tes projets et tes fichiers perso restent)");
  if (!(await ouiNon("Retirer la configuration du kit (Claude Code repasse en normal) ?", true))) return;
  const e = etat();
  const fSettings = path.join(CLAUDE_DIR, "settings.json");
  const s = lireJson(fSettings, null);
  if (s?.env) {
    sauvegarder(fSettings);
    for (const k of Object.keys(envClaude(""))) delete s.env[k];
    if (s.permissions?.defaultMode === "manual") delete s.permissions.defaultMode;
    ecrireJson(fSettings, s);
    ok("Reglages OmniRoute retires de Claude Code");
  }
  for (const n of ["claude-gratuit", "claude-gratuit.cmd", "claude-serveur", "claude-serveur.cmd", "kit-claude", "kit-claude.cmd"]) fs.rmSync(path.join(HOME, ".local", "bin", n), { force: true });
  const fMd = path.join(CLAUDE_DIR, "CLAUDE.md");
  if (fs.existsSync(fMd)) {
    const c = fs.readFileSync(fMd, "utf8"); const i = c.indexOf(MARQ_DEBUT), j = c.indexOf(MARQ_FIN);
    if (i >= 0 && j > i) { sauvegarder(fMd); fs.writeFileSync(fMd, (c.slice(0, i) + c.slice(j + MARQ_FIN.length)).trim() + "\n"); ok("Regles du kit retirees de CLAUDE.md"); }
  }
  if (await ouiNon("Retirer aussi les skills installes par le kit ?", false)) {
    for (const n of e.skills || []) { const d = path.join(CLAUDE_DIR, "skills", n); if (fs.existsSync(d)) { sauvegarder(d); fs.rmSync(d, { recursive: true, force: true }); } }
    ok("Skills du kit retires (sauvegardes dans " + BACKUP + ")");
  }
  if (await ouiNon("Arreter et desinstaller OmniRoute (tes cles enregistrees seront gardees dans le dossier de donnees) ?", false)) {
    omniroute(["autostart", "disable"]); omniroute(["stop"]);
    npm(["uninstall", "-g", "omniroute"], { hérite: true });
    ok("OmniRoute desinstalle");
  }
  fermer();
  ok("Termine. Sauvegardes : " + BACKUP);
}

async function cmdConnecterServeur() {
  titre("Utiliser l'OmniRoute de ton serveur depuis ce PC");
  const hote = OPTS.hote || (await demander("Adresse SSH du serveur (ex : root@203.0.113.10)", ""));
  const cle = OPTS.cle || (await demander("Cle d'acces affichee par le kit sur le serveur (sk-...)", "", { cache: true }));
  fermer();
  if (!hote || !cle) { warn("Adresse ou cle manquante."); return; }
  const claude = cheminClaude() || (await installerClaudeCode());
  const env = envClaude(cle);
  const dossier = path.join(HOME, ".local", "bin");
  fs.mkdirSync(dossier, { recursive: true });
  if (WIN) {
    const f = path.join(dossier, "claude-serveur.cmd");
    const l = ["@echo off", `start "tunnel OmniRoute" /min ssh -N -o ExitOnForwardFailure=yes -L ${PORT}:127.0.0.1:${PORT} ${hote}`, "timeout /t 4 /nobreak >nul",
      ...Object.entries(env).map(([k, v]) => `set "${k}=${v}"`), `"${claude}" --permission-mode manual %*`];
    fs.writeFileSync(f, l.join("\r\n") + "\r\n");
    ok(`Commande « claude-serveur » creee : ${f}`);
  } else {
    const f = path.join(dossier, "claude-serveur");
    const q = (s) => `'${String(s).replace(/'/g, "'\\''")}'`;
    const l = ["#!/bin/sh", `ssh -f -N -o ExitOnForwardFailure=yes -L ${PORT}:127.0.0.1:${PORT} ${q(hote)} 2>/dev/null || true`,
      ...Object.entries(env).map(([k, v]) => `export ${k}=${q(v)}`), `exec ${q(claude)} --permission-mode manual "$@"`];
    fs.writeFileSync(f, l.join("\n") + "\n", { mode: 0o700 });
    ok(`Commande « claude-serveur » creee : ${f}`);
  }
  info("Tape « claude-serveur » dans un dossier de projet : le tunnel SSH s'ouvre et Claude Code utilise ton serveur.");
}

// ---------------------------------------------------------------- aiguillage
const COMMANDES = {
  installer: cmdInstaller, "ajouter-cle": cmdAjouterCle, bascule: cmdBascule, diagnostic: cmdDiagnostic, test: cmdTest,
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

#!/usr/bin/env node
// Assemble GUIDE-POUR-CLAUDE.md : tout le guide en un seul fichier, a joindre a claude.ai (gratuit).
// Usage : node scripts/construire-guide.mjs   (a relancer apres chaque modification de la doc)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lire = (f) => fs.readFileSync(path.join(KIT, f), "utf8").replace(/^﻿/, "");
const sansImages = (t) => t.split("\n").filter((l) => !/^!\[.*\]\(images\//.test(l.trim()) && !/<img /.test(l)).join("\n");
const morceaux = [
  "# GUIDE COMPLET · Kit Claude Gratuit (Brennan SONNET)",
  "> Fichier à joindre à Claude (claude.ai, même gratuit) avec le texte de PROMPT-POUR-CLAUDE-GRATUIT.txt. Il contient tout le guide officiel du kit. Généré automatiquement.",
  "## Le guide de démarrage (00-LIS-MOI-EN-PREMIER.txt)",
  "```text\n" + lire("00-LIS-MOI-EN-PREMIER.txt").trim() + "\n```",
];
for (const f of fs.readdirSync(path.join(KIT, "docs")).filter((x) => /^\d\d-.*\.md$/.test(x)).sort()) {
  // Liens relatifs → texte simple (ce fichier est lu par Claude, pas navigue) ; les liens http restent.
  morceaux.push(sansImages(lire(path.join("docs", f))).replace(/^# /m, "## ").replace(/\[([^\]]+)\]\((?!https?:)[^)]+\)/g, "$1"));
}
morceaux.push("## Liste des skills installés\n" + fs.readdirSync(path.join(KIT, "skills")).sort().map((s) => {
  const t = lire(path.join("skills", s, "SKILL.md")); const d = (t.match(/description:\s*(.*)/) || [])[1] || "";
  return `- \`${s}\` : ${d.slice(0, 160)}${d.length > 160 ? "..." : ""}`;
}).join("\n"));
const sortie = morceaux.join("\n\n") + "\n";
fs.writeFileSync(path.join(KIT, "GUIDE-POUR-CLAUDE.md"), sortie);
console.log(`GUIDE-POUR-CLAUDE.md : ${sortie.length} caracteres (~${Math.round(sortie.length / 3.6)} tokens)`);

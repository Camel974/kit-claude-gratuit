// capture.mjs : photographie une page (ordi + mobile, page entière) et relève ses styles.
// Usage : node capture.mjs <url ou chemin .html> <dossier-sortie> [--nom original]
// Sortie : <nom>-desktop.png, <nom>-mobile.png, <nom>-styles.json, <nom>-texte.txt, <nom>-console.txt
// Lecture seule : ne clique sur rien, ne remplit aucun formulaire.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [, , cible, sortie = '.', ...reste] = process.argv;
if (!cible) { console.error('Usage : node capture.mjs <url|fichier.html> <dossier> [--nom nom]'); process.exit(1); }
const nom = reste.includes('--nom') ? reste[reste.indexOf('--nom') + 1] : 'page';
const url = /^https?:\/\//i.test(cible) ? cible : pathToFileURL(path.resolve(cible)).href;
fs.mkdirSync(sortie, { recursive: true });

async function lancer() {
  for (const channel of ['chrome', 'msedge', 'chrome-beta', undefined]) {
    try { return await chromium.launch({ channel, headless: true }); } catch {}
  }
  throw new Error("Aucun navigateur trouvé : installe Google Chrome (https://www.google.com/chrome/).");
}

// Relevé des styles, exécuté dans la page.
const RELEVE = () => {
  const rgb = (c) => c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent' ? c : null;
  const compte = {};
  const add = (k) => { if (k) compte[k] = (compte[k] || 0) + 1; };
  for (const el of document.querySelectorAll('body *')) {
    const s = getComputedStyle(el);
    if (el.offsetWidth * el.offsetHeight > 2000) add('bg ' + rgb(s.backgroundColor));
    if (el.childNodes.length && el.innerText && el.innerText.trim()) add('txt ' + s.color);
  }
  const palette = Object.entries(compte).filter(([k]) => !k.endsWith('null')).sort((a, b) => b[1] - a[1]).slice(0, 14);
  const pick = (el) => { const s = getComputedStyle(el); return {
    tag: el.tagName.toLowerCase(), texte: (el.innerText || '').trim().slice(0, 90),
    police: s.fontFamily.split(',')[0].replace(/"/g, ''), taille: s.fontSize, graisse: s.fontWeight,
    interligne: s.lineHeight, espacement: s.letterSpacing, couleur: s.color, fond: rgb(s.backgroundColor),
    casse: s.textTransform, arrondi: s.borderRadius, ombre: s.boxShadow === 'none' ? null : s.boxShadow, padding: s.padding }; };
  const visibles = (sel, n) => [...document.querySelectorAll(sel)].filter(e => e.offsetHeight > 0).slice(0, n).map(pick);
  const blocs = [...document.querySelectorAll('header, nav, main > *, section, footer, body > div > *')]
    .filter(e => e.offsetHeight > 120).slice(0, 40).map(e => { const s = getComputedStyle(e); return {
      tag: e.tagName.toLowerCase(), classe: String(e.className).slice(0, 60), y: Math.round(e.getBoundingClientRect().top + scrollY),
      hauteur: e.offsetHeight, fond: rgb(s.backgroundColor), image: s.backgroundImage !== 'none',
      titre: (e.querySelector('h1,h2,h3')?.innerText || '').trim().slice(0, 80),
      boutons: e.querySelectorAll('a[class*=btn],a[class*=button],button').length,
      images: e.querySelectorAll('img,video,svg').length }; });
  const contenu = [...document.querySelectorAll('main, body > div, body')].find(e => e.offsetWidth) ;
  const largeurs = [...document.querySelectorAll('section *, main *')].slice(0, 300).map(e => getComputedStyle(e).maxWidth).filter(v => v.endsWith('px'));
  return {
    titre: document.title, description: document.querySelector('meta[name=description]')?.content || null,
    polices: [...new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => `${f.family.replace(/"/g, '')} ${f.weight}`))],
    googleFonts: [...document.querySelectorAll('link[href*="fonts.googleapis"]')].map(l => l.href),
    palette, titres: visibles('h1,h2,h3', 25), textes: visibles('p', 8), boutons: visibles('a[class*=btn],a[class*=button],button,[role=button]', 12),
    largeursMax: [...new Set(largeurs)].slice(0, 8), blocs, hauteurPage: document.documentElement.scrollHeight,
    librairies: { gsap: !!window.gsap, scrollTrigger: !!window.ScrollTrigger, lenis: !!window.Lenis, swiper: !!window.Swiper,
      aos: !!window.AOS, framer: !!document.querySelector('[data-framer-name]'), webflow: !!window.Webflow, wordpress: !!document.querySelector('link[href*="wp-content"]') },
    animationsCSS: [...new Set([...document.querySelectorAll('body *')].slice(0, 800).map(e => getComputedStyle(e).animationName).filter(a => a && a !== 'none'))].slice(0, 15),
    formulaires: document.querySelectorAll('form').length, videos: document.querySelectorAll('video, iframe[src*=youtube], iframe[src*=vimeo], iframe[src*=wistia]').length,
  };
};

const navigateur = await lancer();
const journal = [];
try {
  for (const [mode, vp, mobile] of [['desktop', { width: 1440, height: 900 }, false], ['mobile', { width: 390, height: 844 }, true]]) {
    const ctx = await navigateur.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, locale: 'fr-FR' });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') journal.push(`[${mode}] ${m.text()}`); });
    page.on('pageerror', e => journal.push(`[${mode}] ${e.message}`));
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    // Fait défiler pour déclencher le lazy-load et les animations au scroll, puis revient en haut.
    await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } scrollTo(0, 0); });
    await page.waitForTimeout(800);
    // Masque bannières cookies et bulles de chat (sans cliquer « accepter »).
    await page.evaluate(() => {
      const re = /cookie|consent|onetrust|didomi|axeptio|tarteaucitron|cookiebot|intercom|crisp|hubspot-messages|drift|tidio|chat/i;
      for (const el of document.querySelectorAll('body *')) {
        const s = getComputedStyle(el);
        if ((s.position === 'fixed' || s.position === 'sticky') && el.getBoundingClientRect().top > 80 &&
            (re.test(el.id + ' ' + el.className) || /cookie|chat|discuter/i.test((el.innerText || '').slice(0, 400)) || el.querySelector('iframe'))) el.style.setProperty('display', 'none', 'important');
        if (re.test(el.id) && /^(div|aside|section|iframe)$/i.test(el.tagName) && s.position === 'fixed') el.style.setProperty('display', 'none', 'important');
      }
    });
    await page.screenshot({ path: path.join(sortie, `${nom}-${mode}.png`), fullPage: true });
    await page.screenshot({ path: path.join(sortie, `${nom}-${mode}-ecran1.png`) });
    if (mode === 'desktop') {
      fs.writeFileSync(path.join(sortie, `${nom}-styles.json`), JSON.stringify(await page.evaluate(RELEVE), null, 1));
      fs.writeFileSync(path.join(sortie, `${nom}-texte.txt`), await page.evaluate(() => document.body.innerText));
    }
    await ctx.close();
  }
} finally { await navigateur.close(); }
fs.writeFileSync(path.join(sortie, `${nom}-console.txt`), journal.join('\n') || 'aucune erreur');
console.log(`OK ${nom} : ${sortie}`);

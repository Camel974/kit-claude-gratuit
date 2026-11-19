---
name: app-web
description: Le Bâtisseur d'applications. Pour une vraie application web (comptes utilisateurs, base de données, espace membre, paiement, tableau de bord) - cadre le projet en questions, réduit au plus petit produit utile (une seule fonction clé), choisit la bonne voie selon ton niveau (outil no-code type Lovable / Base44, ou code Next.js + Supabase), construit étape par étape avec la sécurité de base, teste, et te guide pour la mise en ligne. Use when "application", "app web", "crée-moi une app", "espace membre", "plateforme", "SaaS", "tableau de bord", "avec des comptes", "base de données", "app-web".
---

# App web : la plus petite app qui rapporte

## Portail
Même règle que `site-express` : moins de 3 000 €/mois encaissés → pas d'app (sauf pour un client qui paie). Une app coûte 10 fois plus de temps qu'un site.

## Étape 1 : cadrer (boutons, 8 questions max)
1. Qui l'utilise : tes clients · ton équipe · le grand public.
2. Le problème qu'elle règle, en une phrase (case libre).
3. **La seule fonction qui compte** (si l'app ne faisait que ça, elle servirait quand même).
4. Comptes : email + mot de passe · connexion Google · lien magique par email · pas de compte.
5. Données à stocker (ex. profils, progression, fichiers, commandes).
6. Paiement : non · paiement unique · abonnement (Stripe).
7. Ton niveau : jamais codé (→ voie no-code, recommandé) · à l'aise avec le code (→ voie code).
8. Un exemple d'app qui ressemble à ce que tu veux (lien) : passe-la au skill `clone-site` / `fusion-sites` pour l'interface (pages publiques seulement).
Écris `~/Documents/Sites/<projet>/brief-app.md` : utilisateurs, fonction clé, écrans (5 max pour la V1), données (tables et champs), règles d'accès (qui voit quoi), ce qui est HORS V1.

## Étape 2 : choisir la voie
- **No-code (débutant)** : Lovable ou Base44 (comptes et base de données inclus). Tu écris le cahier des charges (`brief-app.md` + captures d'exemple) en un prompt clair, écran par écran. Si le connecteur de l'outil est branché dans Claude, tu peux piloter ; sinon tu donnes le prompt à coller. Les crédits de ces outils sont payants : c'est l'utilisateur qui crée son compte.
- **Code (à l'aise)** : Next.js + Supabase (auth + Postgres) + Stripe si paiement, déployé sur Vercel. Utilise le skill `supabase` pour la base et l'authentification.

## Étape 3 : construire (voie code)
1. Schéma de base de données d'abord (tables, relations), puis règles d'accès (Row Level Security activée sur TOUTES les tables, chaque utilisateur ne voit que ses lignes).
2. Authentification, puis la fonction clé, puis le reste. Un écran à la fois, testé avant le suivant.
3. Design : mêmes règles que `design-premium`.
4. Clés et mots de passe : uniquement dans `.env.local` (jamais dans le code, jamais dans le chat, `.env*` dans `.gitignore`). La clé « service role » de Supabase ne va jamais côté navigateur.
5. Paiement : mode test Stripe d'abord, cartes de test officielles, webhook vérifié.

## Étape 4 : tester avant de dire « fini »
- Parcours complet en vrai : inscription → connexion → fonction clé → déconnexion, sur ordi et mobile (navigateur intégré ou capture).
- Test de sécurité simple : avec un 2e compte de test, vérifier qu'on ne voit pas les données du 1er.
- Zéro erreur dans la console.
- Puis `audit-site` sur les pages publiques.

## Étape 5 : mise en ligne (l'utilisateur la fait)
Guide pas à pas dans `mettre-en-ligne.md` : compte Vercel (ou publication Lovable/Base44), variables d'environnement, nom de domaine, passage de Stripe en mode réel. Tu ne crées aucun compte et ne publies rien toi-même.

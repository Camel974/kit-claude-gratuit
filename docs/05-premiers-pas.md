# 05 · Premiers pas avec Claude Code

## Lancer
Le plus simple : **double-clic sur « Claude Gratuit »** sur ton Bureau.

À la main (la ligne `cd` exacte est affichée à la fin de l'installation) :
```bash
cd Documents/Projets-Claude      # serveur : cd Projets-Claude (dans tmux)
claude                           # ou claude-gratuit si tu as un abonnement Claude
```
Un projet = un dossier. Pour un nouveau projet, tape ces 3 lignes l'une après l'autre (Windows PowerShell n'accepte pas `&&`) :
```bash
mkdir mon-jeu
cd mon-jeu
claude
```

## Les 2 écrans à connaître
- **« Do you want to proceed? »** (avant une commande ou une modification) : `1` = oui, `2` = oui et ne plus demander pour ce type d'action, `4` = non. En mode gratuit, **jamais `3` (« switch to auto mode »)** : le mode auto vérifie les actions sur les serveurs d'Anthropic, il ne marche pas avec OmniRoute (le kit règle Claude en mode « manual » pour ça). Avec ton abonnement Claude (commande `claude`), le mode auto marche normalement.
- En haut de l'écran, **« gratuit · API Usage Billing »** : c'est le nom de la bascule du kit et un libellé standard de Claude Code. Tu ne paies rien : c'est OmniRoute qui répond.

## Les 10 commandes à connaître (dans Claude Code)
| Tape | Effet |
|---|---|
| `/bienvenue-gratuit` | règle Claude sur toi (une fois) |
| `/compact` | résume la conversation : économise le quota |
| `/clear` | repart de zéro (nouveau sujet) |
| `/context` | ce qui remplit la mémoire de Claude |
| `/model` | voir ou changer le modèle (le kit utilise `gratuit`) |
| `Maj + Tab` | change de mode : manuel (il demande) → modifications acceptées → plan (évite le mode auto) |
| `Échap` | interrompre Claude |
| `Échap` `Échap` | revenir en arrière dans la conversation |
| `@fichier` | montrer un fichier précis à Claude |
| `!commande` | lancer une commande du terminal sans quitter Claude |

## Recettes (copie-colle et adapte)
**Site qui vend** (skill `site-express`)
> Crée-moi un site pour mon activité de [coach sportif à Lyon]. Pose-moi tes questions d'abord.

À savoir : les skills Site et Appli de Brennan commencent par ton chiffre d'affaires. Sa règle : le site ou l'appli, c'est **après 3 000 €/mois** (avant, ce qui fait vendre c'est le contenu, les DM et les appels) ; exception : **un client qui te paie**. Pour t'entraîner sans business : « Sans le skill site-express, fais-moi une page simple pour m'entraîner au web ».

**Application** (skill `app-web`, même règle)
> Crée une application pour suivre mes clients : nom, téléphone, prochain rendez-vous, notes. Commence par la version la plus simple.

**Jeu vidéo** (skill `jeu-express`)
> Fais-moi un jeu original jouable sur téléphone : un runner où on saute entre des toits. Pose tes questions, puis prototype jouable.

**Copier le style d'un site** (skill `clone-site`)
> Refais la structure et le style de cette page à ma marque : [lien]. Pas leurs textes ni leurs images.

**Business et contenu**
> Écris la page de vente de mon offre [X] pour [cible], avec les objections et une FAQ. Montre-moi d'abord le plan.

**Automatiser**
> Écris un script qui renomme toutes les photos de ce dossier avec la date, et teste-le sur 3 fichiers d'abord.

## Les skills du kit
| Skill | Pour |
|---|---|
| `bienvenue-gratuit` | ton profil + plan de fournisseurs + premier projet |
| `site-express`, `clone-site`, `fusion-sites`, `audit-site`, `design-premium`, `simulation-visiteurs` | sites qui convertissent (kit Sites de Brennan) |
| `app-web`, `supabase` | applications avec comptes et base de données |
| `jeu-express`, `webapp-testing` | jeux navigateur testés automatiquement |
| `frontend-design`, `cro`, `copywriting`, `web-quality-audit` | design, conversion, textes, qualité (skills libres reconnus) |
| `econome` | faire durer les quotas gratuits |
| `depannage-gratuit` | réparer quand ça bloque |
| `skill-creator` | créer tes propres skills |
Tu n'as pas besoin de les appeler : Claude les choisit selon ta demande. Tu peux forcer avec `/nom-du-skill`.

## Bien travailler avec un modèle gratuit
- **Découpe** : « fais la page d'accueil » puis « ajoute le formulaire », plutôt que tout le site d'un coup.
- **Fais vérifier** : « lance le site et fais une capture d'écran », « teste sur mobile ».
- **Corrige vite** : si Claude part dans la mauvaise direction, `Échap` puis dis-lui ce qui ne va pas.
- **Sauvegarde** : demande « initialise git et fais un commit » avant une grosse modification.
- Un projet sérieux qui coince (gros code, bug complexe) : c'est le moment où Claude Pro fait la différence.

## Tu as un abonnement Claude (Pro / Max) ?
- `claude` = ton abonnement, **jamais modifié** par le kit. `claude-gratuit` = le mode gratuit, dans un profil séparé (`~/.claude-gratuit` : ses propres réglages, règles et skills).
- Limite atteinte (« usage limit reached ») : tape `/exit`, puis `claude-gratuit -c` : la **même conversation** continue en gratuit (l'historique est partagé).
- Si `claude-gratuit` affiche un message sur l'authentification ou propose `/logout` : **ne fais jamais `/logout`** (ça déconnecterait ton abonnement). Ignore le message.

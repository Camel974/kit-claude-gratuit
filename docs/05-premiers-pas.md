# 05 · Premiers pas avec Claude Code

## Lancer
```bash
cd Documents/Projets-Claude      # serveur : cd Projets-Claude
claude                           # ou claude-gratuit si tu as un abonnement Claude
```
Un projet = un dossier. Pour un nouveau projet : `mkdir mon-site && cd mon-site && claude`.

## Les 2 écrans à connaître
- **« Do you want to proceed? »** (avant une commande ou une modification) : `1` = oui, `2` = oui et ne plus demander pour ce type d'action, `4` = non. **Jamais `3` (« switch to auto mode »)** : le mode auto vérifie les actions sur les serveurs d'Anthropic, il ne marche pas avec OmniRoute (le kit règle Claude en mode « manual » pour ça).
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

**Application** (skill `app-web`)
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

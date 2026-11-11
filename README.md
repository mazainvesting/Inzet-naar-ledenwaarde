# Inzet naar ledenwaarde

Persoonlijke webapp om de bijdrage aan leden van Techniek Nederland concreet, meetbaar en zichtbaar te maken. De toepassing is bedoeld voor één gebruiker en bevat geen open registratie.

## Wat de tool doet

- Dossiers met ledenprobleem, doelgroep, gewenste verandering, mandaat en eigen bijdrage.
- Indicatoren met definities, nulmetingen, streefwaarden, meetreeksen en grafieken.
- Raadplegingen met herkomst, samenstelling, steun en voorwaarden.
- Acties met eigenaren, deadlines en bestede uren.
- Bewijs op de niveaus inzet, resultaat, gebruik en effect.
- Handmatige actualiteitscontroles met bronnen en hercontroledatums.
- Kwartaalreflectie, afdruk/PDF, JSON-back-up en CSV-export van metingen.

De vier thema’s STO, opleidingsinfrastructuur, hybride docenten en technisch personeel zijn voorbereid met voorstellen. Ze bevatten geen gefingeerde metingen of vastgestelde beleidsdoelen. De tool onderzoekt bronnen niet automatisch en presenteert invulvoortgang niet als impactscore.

## Eigen gebruikersnaam en wachtwoord

De applicatie ondersteunt precies één account. Wachtwoorden worden met een unieke salt en PBKDF2-SHA256 (100.000 iteraties) gehasht; ze staan niet in deze repository. Sessies zijn tijdelijk en gebruiken HttpOnly, Secure en SameSite-cookies. Er is een limiet op inlogpogingen. Een wachtwoordwijziging of herstel maakt bestaande sessies ongeldig.

Er is geen standaardwachtwoord. Je kiest zelf een gebruikersnaam en een wachtwoord van minimaal twaalf tekens.

### Bestaande gehoste tool

De bestaande privétool staat op:

https://ledenwaarde-marijn.m-zaal107502.chatgpt.site

Tijdens de overstap blijft de bestaande ChatGPT-toegang actief. Open **Inloggegevens** (`/account`) om je enige account in te stellen. Deze instelling koppelt je eigen account aan de bestaande werkruimte, zodat opgeslagen dossiers behouden blijven. Er worden geen werkruimtegegevens naar GitHub gekopieerd.

Na het instellen kan de beheerder de buitenste ChatGPT-toegang verwijderen en `ALLOW_PLATFORM_SETUP` uitschakelen. Doe dit pas na controle dat het eigen account werkt. Deze broncodekopie wijzigt op zichzelf de hosting of toegangsinstellingen niet.

### Zelfstandig hosten

De app heeft een server en database nodig. **GitHub Pages is hiervoor niet geschikt.** De beschreven zelfstandige route gebruikt Cloudflare Workers en D1; een Cloudflare-account en eigen hostingconfiguratie zijn vereist. De repository staat los van de huidige Sites-bronrepository: een GitHub-push publiceert niet automatisch op de bestaande URL.

Zie [Installatie en hosting](docs/INSTALLATIE.md) voor stappen en herstel.

## Ontwikkeling en verificatie

Gebruik Node.js 24 en npm:

```sh
npm ci
npx tsc --noEmit
node --experimental-strip-types scripts/check-model.mjs
npm run build
node --experimental-strip-types scripts/check-api.mjs
```

De API-test voert de gebouwde Worker uit in een geïsoleerde omgeving met een tijdelijke database. Hij test het instellen van één account, afwijzen van extra accounts, verkeerde wachtwoorden, sessies, wachtwoordwijziging, herstel, behoud van werkruimte, rate limiting, versieconflicten en invoervalidatie. Er worden geen productiegegevens gebruikt.

De GitHub Actions-workflow voert deze controles uit bij pushes en pull requests. Er is geen automatisch productie-deployment ingesteld.

## Opslag en overdracht

- Productiegegevens staan in D1, niet in GitHub.
- De huidige Sites-database wordt niet automatisch naar een eigen Cloudflare-account verplaatst.
- Voor verhuizing van inhoud: download een JSON-back-up uit de oude tool en importeer deze na aanmelding in de nieuwe omgeving. Controleer de inhoud en klik op Opslaan.
- Wachtwoorden, sessies en installatiecodes horen niet in een back-up of commit.
- `dist`, `node_modules`, lokale databases en omgevingsbestanden zijn uitgesloten van Git.

## Technologie

React, TypeScript, Vinext, Cloudflare Workers, D1 en Drizzle. De `.openai/hosting.json` bewaart de identiteit van de bestaande Site. Voor zelfstandige hosting genereert het installatiescript een afzonderlijke Wrangler-configuratie en verandert die identiteit niet.

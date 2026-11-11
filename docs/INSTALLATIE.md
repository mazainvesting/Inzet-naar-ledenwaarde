# Installatie en hosting

## Bestaande tool gebruiken

1. Open de bestaande privétool en meld je eenmalig aan via de huidige ChatGPT-toegang.
2. Open **Inloggegevens** of `/account`.
3. Kies zelf je gebruikersnaam en een lang, uniek wachtwoord. Deel je wachtwoord niet in chat of GitHub.
4. Bewaar de gegevens in je wachtwoordmanager.
5. Controleer toegang tot je werkruimte met het eigen account.
6. Laat de beheerder daarna de buitenste ChatGPT-toegang verwijderen en de tijdelijke instelling `ALLOW_PLATFORM_SETUP` uitschakelen.

De app ondersteunt maar één account. Een tweede account kan niet via de app of door een tweede record in de database worden toegevoegd.

## Zelfstandig op Cloudflare Workers en D1

### Voorbereiden

Installeer Node.js 24, Git en npm. Maak een Cloudflare-account. Kloon deze repository en voer uit:

```sh
npm ci
npx wrangler login
npx wrangler d1 create ledenwaarde
```

De laatste opdracht geeft een database-id terug. Bewaar dat id als `CLOUDFLARE_D1_DATABASE_ID` in je lokale omgeving. Het database-id is geen wachtwoord; API-tokens en installatiecodes zijn dat wel.

Maak vervolgens de productiebuild en de configuratie voor je eigen database:

```sh
npm run build
node scripts/prepare-cloudflare.mjs
```

Het script maakt `dist/server/wrangler.standalone.json` aan. De bestaande Site-identiteit in `.openai/hosting.json` wordt niet gewijzigd.

### Database en installatiecode

Voer de migraties in volgorde uit:

```sh
npx wrangler d1 migrations apply DB --remote --config dist/server/wrangler.standalone.json
```

Stel een willekeurige installatiecode van minimaal 32 tekens in als servergeheim. Voer de waarde uitsluitend in bij de beveiligde prompt van Wrangler:

```sh
npx wrangler secret put SETUP_KEY --config dist/server/wrangler.standalone.json
```

Laat `ALLOW_PLATFORM_SETUP` bij zelfstandige hosting uitgeschakeld of afwezig. Deze tijdelijke route is uitsluitend bedoeld voor de bestaande eigenaar-private Sites-omgeving. Zonder die instelling vertrouwt de applicatie geen meegestuurde ChatGPT-identiteitsheaders.

Publiceer:

```sh
npx wrangler deploy --config dist/server/wrangler.standalone.json
```

Open daarna de URL die Wrangler teruggeeft. Kies gebruikersnaam en wachtwoord en voer bij de eerste inrichting de installatiecode in. Een bestaande account kan niet via deze inrichting worden overschreven.

### Herstel en wijziging

Na aanmelding kun je via **Inloggegevens** gebruikersnaam en wachtwoord wijzigen. Het huidige wachtwoord is nodig om de wijziging te bevestigen.

Bij een vergeten wachtwoord kan de beheerder `SETUP_KEY` met Wrangler instellen of vernieuwen. Gebruik de knop **Wachtwoord vergeten** op de inlogpagina en voer die herstelcode in. Daarmee wordt alleen het bestaande account aangepast; de werkruimte blijft behouden. Na gebruik kun je de code weer verwijderen:

```sh
npx wrangler secret delete SETUP_KEY --config dist/server/wrangler.standalone.json
```

Bij verwijderde code is de herstelknop niet beschikbaar. De beheerder moet dan eerst opnieuw een code instellen. Bewaar nooit een herstelcode in GitHub of de broncode.

## Gegevens verhuizen

De GitHub-repository bevat de applicatie, niet je huidige dossiers. Maak in de oude omgeving een JSON-back-up via **Mijn werkwijze**. Importeer die na aanmelding in je nieuwe omgeving, controleer de inhoud en klik op **Opslaan**. Dit is een bewuste vervanging van de inhoud in de nieuwe werkruimte; de tool vraagt bevestiging.

## Beheer

Een GitHub-push voert controles uit, maar publiceert niet automatisch naar de bestaande Site of Cloudflare. Gebruik de passende deploymentroute voor de gekozen omgeving. Bewaar bestaande SQL-migraties en voeg bij schemawijzigingen nieuwe migraties toe. Maak vóór een verhuizing een gegevensback-up.

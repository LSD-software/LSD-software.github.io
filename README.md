## Frontend restoration pass — 2026-10-23

This pass reconnects local cosmetic artwork to the shop, public profile modal, friends lists, and leaderboard rows; improves small-screen overflow handling; adds artwork to the service-worker precache; and increments the cache version. It preserves the current backend catalog and purchase/equip endpoints. It does not add unsupported catalog categories or change game logic. ZIP integrity and static syntax checks were performed; live-browser and backend integration testing are still required.

# LSD Software — Frontend

Frontend ufficiale di **LSD Software**, pubblicato come sito statico su GitHub Pages. Il progetto raccoglie le pagine pubbliche, LSD Hub, la Progressive Web App (PWA), le interfacce di profilo e social, le classifiche e le pagine web dei giochi.

> **Repository frontend:** `LSD-software.github.io`  
> **Sito pubblico:** <https://lsd-software.github.io/>  
> **Backend API configurato:** <https://lsd-backend-4phu.onrender.com>  
> **Stack principale:** HTML, CSS, JavaScript vanilla, Service Worker, Web App Manifest, GitHub Pages.

Il frontend è un sito statico: non contiene un server Node/Python da avviare localmente. Le funzionalità che richiedono dati persistenti o account comunicano con il backend via HTTP.

---

## Indice

- [Funzionalità](#funzionalità)
- [Struttura del repository](#struttura-del-repository)
- [Tecnologie e architettura](#tecnologie-e-architettura)
- [Avvio in locale](#avvio-in-locale)
- [Configurazione e collegamento al backend](#configurazione-e-collegamento-al-backend)
- [Pubblicazione su GitHub Pages](#pubblicazione-su-github-pages)
- [PWA e aggiornamenti](#pwa-e-aggiornamenti)
- [Navigazione PWA e leaderboard](#navigazione-pwa-e-leaderboard)
- [Responsive design e accessibilità](#responsive-design-e-accessibilità)
- [Sicurezza e privacy](#sicurezza-e-privacy)
- [Prestazioni e affidabilità](#prestazioni-e-affidabilità)
- [Verifiche prima del rilascio](#verifiche-prima-del-rilascio)
- [Risoluzione dei problemi](#risoluzione-dei-problemi)
- [Manutenzione](#manutenzione)

---

## Funzionalità

Le pagine e gli script del repository coprono queste aree:

- **Sito pubblico:** home, progetti, informazioni sul team, contatti, privacy e cookie.
- **LSD Hub:** punto di ingresso per giochi, account e funzionalità della community.
- **Profilo e personalizzazione:** interfaccia per profilo, cosmetici e saldo LSD Dust, con dati persistenti forniti dal backend.
- **Badge:** visualizzazione e gestione dei badge tramite le API configurate.
- **Amicizie e messaggi:** interfacce per amici, richieste e conversazioni private, secondo le funzionalità esposte dal backend.
- **Classifiche:** leaderboard generale e viste specifiche per i giochi.
- **LSD Console:** pagina e risorse dedicate in `lsdConsole/`.
- **LSD Cardgame:** pagine e asset in `cardGameWeb/`.
- **LSD P-E-S-C-A:** pagina e fogli di stile in `pescaWeb/`.
- **PWA:** installazione tramite browser compatibili, cache offline limitata e gestione degli aggiornamenti attraverso il Service Worker.
- **Responsive design:** fogli di stile dedicati anche agli schermi mobili.

La presenza di un'interfaccia frontend non sostituisce la verifica del relativo endpoint backend: le funzionalità social, l'autenticazione, gli acquisti e i dati condivisi richiedono che il backend sia online e correttamente configurato.

## Struttura del repository

```text
LSD-software.github.io/
├── index.html                 # Home pubblica
├── hub.html                   # Hub principale e punto di ingresso PWA
├── project.html               # Progetti e giochi
├── about.html                 # Informazioni sul progetto
├── contact.html               # Contatti/community
├── privacy.html               # Informativa privacy
├── cookies.html               # Informativa cookie
├── leaderboard.html           # Classifica
├── reset-password.html        # Flusso di reset password
├── manifest.json              # Metadati installazione PWA
├── sw.js                      # Service Worker: cache, offline, notifiche
├── css/
│   ├── style.css
│   ├── styleIndex.css
│   ├── hub.css
│   ├── mobile-optimization.css
│   ├── leaderboard.css
│   ├── cosmetics.css
│   ├── badges.css
│   ├── contact.css
│   ├── project.css
│   ├── about.css
│   ├── footer.css
│   └── auth-modal.css
├── js/
│   ├── app-update.js          # Registrazione/controllo aggiornamenti SW
│   ├── fetch-utils.js         # Utility per richieste HTTP
│   ├── auth-modal.js          # UI autenticazione
│   ├── auth-project.js        # Funzioni account usate nelle pagine
│   ├── profile-view.js        # Profilo pubblico
│   ├── shop.js                # Shop cosmetici
│   ├── dust.js                # LSD Dust
│   ├── badges.js              # Badge
│   ├── friends.js             # Amicizie
│   ├── messages.js            # Messaggi
│   ├── leaderboard.js         # Classifica
│   ├── leaderboard-console.js # Classifiche collegate ai giochi
│   ├── push.js                # Notifiche push, se supportate/configurate
│   ├── cookie-banner.js       # Banner cookie
│   ├── footer.js              # Elementi condivisi del footer
│   ├── icons.js               # Gestione icone
│   └── script.js              # Script condivisi del sito
├── img/                       # Loghi, immagini e icone
├── lsdConsole/                # Pagina e asset di LSD Console
├── cardGameWeb/               # Frontend e asset di LSD Cardgame
└── pescaWeb/                  # Frontend e asset di LSD P-E-S-C-A
```

La struttura può includere ulteriori risorse e file specifici dei giochi. Evitare di spostare o rinominare file referenziati da URL assoluti o relativi senza aggiornare tutti i collegamenti.

## Tecnologie e architettura

- **HTML5** per le pagine.
- **CSS3** per layout, tema e adattamento mobile.
- **JavaScript vanilla** per interazioni e chiamate API.
- **GitHub Pages** per servire il frontend statico via HTTPS.
- **Service Worker** (`sw.js`) per aggiornamenti, cache controllata e fallback offline.
- **Web App Manifest** (`manifest.json`) per nome, icone, colore e modalità di visualizzazione della PWA.
- **Backend remoto** per account, profili, classifiche, badge, amicizie, messaggi, cosmetici e dati persistenti.

Gli script delle funzionalità condivise usano l'API configurata nel codice frontend. In questa versione, diversi moduli puntano a `https://lsd-backend-4phu.onrender.com`. Se cambia il dominio del backend, aggiornare in modo coerente tutti i riferimenti e verificare CORS.

## Avvio in locale

È consigliato usare un server HTTP locale, non aprire direttamente i file con `file://`. Un server locale permette di verificare correttamente i percorsi, `fetch`, il manifest e il Service Worker (quest'ultimo richiede un contesto sicuro: `localhost` è consentito).

### Opzione Python

Dalla cartella `LSD-software.github.io/`:

```bash
python -m http.server 8080
```

Aprire <http://localhost:8080/>.

### Opzione Node.js

Se Node.js è installato:

```bash
npx serve .
```

Usare l'indirizzo mostrato dal comando.

**Nota:** il server locale serve solo i file statici. Le API remote continuano a usare il backend configurato e possono richiedere autenticazione, CORS e configurazioni attive.

## Configurazione e collegamento al backend

L'URL API è attualmente scritto direttamente in diversi file JavaScript, fra cui:

- `js/auth-modal.js`
- `js/auth-project.js`
- `js/profile-view.js`
- `js/shop.js`
- `js/dust.js`
- `js/friends.js`
- `js/messages.js`
- `js/badges.js`
- `js/push.js`
- `js/leaderboard-console.js`

Prima di cambiare ambiente:

1. aggiornare tutti i riferimenti API necessari in maniera coerente;
2. configurare il backend per accettare richieste dal dominio GitHub Pages e dall'ambiente locale usato per i test;
3. verificare che CORS consenta solo le origini previste;
4. mantenere segreti, token privati e chiavi server esclusivamente nel backend o nei secret dell'hosting;
5. non inserire credenziali MongoDB, chiavi private o segreti di firma nel repository frontend.

Le API di autenticazione e le funzioni protette devono essere autorizzate dal backend. Nascondere un pulsante nel browser non è un controllo di sicurezza.

## Pubblicazione su GitHub Pages

1. Estrarre il contenuto del pacchetto frontend.
2. Assicurarsi che `index.html`, `hub.html`, `manifest.json`, `sw.js`, `css/`, `js/`, `img/`, `lsdConsole/`, `cardGameWeb/` e `pescaWeb/` siano nella root pubblicata del repository.
3. Non pubblicare cartelle di lavoro, file `.env`, log, dump di database o credenziali.
4. Fare commit e push sul branch configurato per GitHub Pages.
5. Attendere il completamento del deploy.
6. Aprire il sito in una finestra privata e controllare home, Hub, leaderboard e pagine dei giochi.
7. Se il sito mostra asset vecchi, controllare prima Service Worker e cache del browser; non chiedere agli utenti di reinstallare la PWA come prima soluzione.

GitHub Pages serve file statici: il backend deve essere pubblicato separatamente.

## PWA e aggiornamenti

### File principali

- `manifest.json`: nome `LSD Software Hub`, nome breve `LSD Hub`, `start_url` impostato a `/hub.html`, modalità `standalone`, tema scuro e icone.
- `sw.js`: cache del guscio dell'app, cache runtime limitata, fallback offline, gestione delle notifiche push e dei clic sulle notifiche.
- `js/app-update.js`: registra il Service Worker e gestisce la rilevazione/attivazione degli aggiornamenti.

### Comportamento previsto

- Gli aggiornamenti vengono controllati in modo silenzioso durante l'utilizzo ordinario del sito.
- L'interfaccia di aggiornamento è destinata alla PWA installata e all'area Hub, non a interrompere la navigazione del sito.
- Quando è disponibile un nuovo Service Worker, la versione nuova viene installata e può prendere il controllo della pagina.
- La cache fornisce un fallback per risorse già salvate quando la rete non è disponibile.

Il browser e il sistema operativo possono applicare politiche proprie su installazione, cache e aggiornamenti. Verificare il comportamento reale dopo ogni modifica a `sw.js`, `manifest.json` o `js/app-update.js`.

### Regole importanti per il Service Worker

- Incrementare le versioni dei nomi cache in `sw.js` quando una release richiede l'invalidazione esplicita della cache.
- Non memorizzare in cache risposte API private, dati di sessione o risposte contenenti informazioni personali.
- Evitare di precache-are risorse non esistenti: una risorsa opzionale mancante non deve impedire l'installazione del Service Worker.
- Testare sia l'aggiornamento online sia il fallback offline.
- Verificare che la pagina non entri in un ciclo continuo di ricaricamenti durante l'attivazione.
- La PWA non può aggiornare i file quando il dispositivo è offline; l'aggiornamento avviene quando torna disponibile la rete.

## Navigazione PWA e leaderboard

La PWA parte da `/hub.html`. La leaderboard è una pagina interna del sito (`/leaderboard.html`) e deve restare raggiungibile dalla navigazione dell'Hub anche in modalità standalone.

Il Service Worker gestisce le navigazioni interne e usa contenuto in cache come fallback quando la rete non è disponibile. Quando si aggiungono regole di navigazione o limitazioni per altre pagine:

- non bloccare `/leaderboard.html`;
- non reindirizzare la leaderboard fuori dalla PWA senza una scelta esplicita di prodotto;
- verificare link interni e accesso diretto all'URL;
- testare il caso in cui la leaderboard non sia ancora presente nella cache e il dispositivo sia offline;
- controllare sia browser sia PWA installata su Android e iOS.

La disponibilità della pagina non implica che i dati della classifica siano consultabili offline: i dati aggiornati richiedono connettività e backend disponibile.

## Responsive design e accessibilità

Il progetto include `css/mobile-optimization.css` oltre ai fogli specifici delle pagine.

Durante le modifiche:

- usare layout fluidi e griglie che possano ridursi senza sovrapposizioni;
- permettere ai testi lunghi e agli username di andare a capo;
- mantenere aree cliccabili adeguate per touch;
- verificare navbar e menu aperto su viewport stretti;
- rispettare le safe area dei dispositivi con notch;
- evitare larghezze fisse che provochino scroll orizzontale;
- verificare contrasto, focus visibile e uso da tastiera;
- testare almeno 320, 360, 390, 430, 768, 1024 e 1440 px, includendo orientamento orizzontale.

I fogli di stile dei giochi sono parte dell'esperienza specifica di ciascun gioco: le modifiche generali responsive non devono alterare gameplay, canvas, controlli o proporzioni senza un test dedicato.

## Sicurezza e privacy

- Il frontend è pubblico: qualsiasi valore inserito nel JavaScript o negli asset può essere letto dagli utenti.
- Non includere chiavi segrete, credenziali, token privati o stringhe di connessione al database.
- Le autorizzazioni per profili, messaggi, amicizie, acquisti e saldo devono essere controllate lato backend a ogni richiesta.
- Non fidarsi dei prezzi, degli importi, degli ID utente o dei cosmetici inviati dal client: il backend deve validare e calcolare i valori autorevoli.
- Le risposte pubbliche dei profili devono contenere solo i campi necessari; non esporre email o dati privati.
- Usare HTTPS per il sito e le API.
- Evitare di salvare risposte private nel Service Worker o in cache condivise.
- Configurare il banner cookie e gli eventuali strumenti di analisi in conformità alle scelte di consenso effettivamente implementate.

Queste indicazioni descrivono le regole di manutenzione del frontend; non costituiscono una certificazione di sicurezza del backend.

## Prestazioni e affidabilità

Per mantenere le pagine veloci e limitare il carico sul backend:

- evitare polling frequenti quando un evento o un aggiornamento su richiesta è sufficiente;
- non ripetere richieste identiche per ogni componente della stessa pagina;
- richiedere solo i campi necessari e paginare liste lunghe;
- usare immagini dimensionate correttamente e formati compressi quando compatibili;
- caricare gli script non critici con `defer` o in modo differito quando sicuro;
- mantenere un limite alle voci di cache runtime;
- non memorizzare dati sensibili nel Service Worker;
- gestire timeout, errori HTTP e assenza di rete senza bloccare tutta la UI;
- evitare retry aggressivi: usare tentativi limitati e ritardi progressivi quando appropriato.

Il frontend da solo non può garantire una soglia di utenti simultanei. La capacità dipende anche dal backend, dal database, dal piano di hosting, dagli indici, dalla latenza di rete e dai pattern reali di utilizzo. Per dichiarare una capacità target servono test di carico misurati.

## Verifiche prima del rilascio

Checklist consigliata:

- [ ] `index.html` e `hub.html` si aprono correttamente.
- [ ] Tutti i collegamenti interni usano percorsi validi sul dominio GitHub Pages.
- [ ] Nessun asset richiesto restituisce 404.
- [ ] Login, logout e reset password funzionano con il backend dell'ambiente.
- [ ] La classifica si apre dalla PWA installata e dal browser.
- [ ] Profilo pubblico, cosmetici equipaggiati, amici e badge mostrano dati coerenti con il backend.
- [ ] Gli acquisti e il saldo sono validati lato server.
- [ ] La UI non presenta sovrapposizioni alle larghezze mobile previste.
- [ ] Il Service Worker si installa, si aggiorna e non causa loop di ricaricamento.
- [ ] La PWA si avvia offline con il guscio disponibile e recupera i dati quando la rete torna.
- [ ] Nessuna risposta API privata viene servita dalla cache.
- [ ] I giochi si avviano e i controlli non sono stati alterati.
- [ ] Il backend è monitorato separatamente e sono stati eseguiti test di carico adeguati.

## Risoluzione dei problemi

### La pagina mostra una versione precedente

1. Verificare che il deploy GitHub Pages sia terminato.
2. Aprire la console e controllare eventuali errori 404.
3. Controllare lo stato del Service Worker negli strumenti sviluppatore.
4. Verificare che `sw.js` e `js/app-update.js` siano quelli della release.
5. Provare una finestra privata per distinguere un problema di deploy da una cache locale.

### Login o dati social non funzionano

1. Controllare la disponibilità del backend.
2. Verificare la scheda Network per errori CORS, HTTP 401/403/429/5xx o timeout.
3. Controllare che l'origine GitHub Pages sia ammessa dal backend.
4. Non aggiungere segreti nel frontend per aggirare un errore di autenticazione.

### La leaderboard non si apre nella PWA

1. Verificare che il link punti a `/leaderboard.html`.
2. Controllare che le regole di navigazione non la blocchino.
3. Controllare che il Service Worker restituisca la pagina richiesta e non reindirizzi sempre a `/hub.html`.
4. Con rete disponibile, verificare la risposta del documento e delle API della classifica.
5. Provare la PWA installata su Android e iOS separatamente.

### La PWA non mostra l'ultimo aggiornamento

Verificare connessione, deploy, registrazione del Service Worker e versione delle cache. Su alcuni browser il controllo può essere differito dalle politiche del browser; non è possibile scaricare aggiornamenti mentre il dispositivo è offline.

## Manutenzione

Per ogni release:

1. lavorare su una copia/branch di sviluppo;
2. mantenere una lista dei file modificati;
3. controllare sintassi JavaScript e riferimenti ad asset;
4. provare pagine principali e percorsi PWA;
5. testare almeno una viewport mobile e una desktop;
6. verificare che i file dei giochi non siano stati modificati accidentalmente;
7. aggiornare questo README quando cambiano percorsi, script, backend o flussi;
8. pubblicare prima in staging quando le modifiche toccano autenticazione, acquisti, dati social o aggiornamenti PWA.

---

## Licenza e proprietà

Consultare le informazioni di licenza e proprietà intellettuale fornite dal progetto prima di riutilizzare codice, grafica, marchi o contenuti. Non presumere che tutti gli asset siano riutilizzabili al di fuori del progetto solo perché sono distribuiti dal sito pubblico.

© LSD Software.


## Audit UX/UI e test

Le interfacce rivolte ai giocatori usano messaggi semplici, comandi chiari e la palette nero/oro/rosso scuro/bianco. Il report corrente è `../LSD-Software-Audit-Generale-UX-UI.md`; per i controlli ripetibili vedere `../lsd-backend/scripts/audit-static.js` e `../lsd-backend/TESTING-AND-RELEASE-CHECKLIST.md`. Le anteprime statiche in `../audit-evidence/static-previews/` non sostituiscono i test interattivi in staging.

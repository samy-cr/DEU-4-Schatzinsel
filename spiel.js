// =====================================================================
//  Die Schatzinsel der Wörter – Spiellogik
// =====================================================================

// ----- 1. Die Inseln auf der Karte -----
// x und y: wo die Insel liegt (in Prozent der Kartenbreite/-höhe).
// bootX und bootY: wo das Boot anlegt, wenn es bei dieser Insel ist.
const STATIONEN = [
  { nr: 1, name: "Palmenstrand",   symbol: "🏖️", thema: "Doppelkonsonanten",         x: 11, y: 75, bootX: 18, bootY: 92 },
  { nr: 2, name: "Dschungelinsel", symbol: "🐒", thema: "Rechtschreibstrategien",    x: 25, y: 32, bootX: 32, bootY: 49 },
  { nr: 3, name: "Krabbenbucht",   symbol: "🦀", thema: "Trennregeln",               x: 39, y: 72, bootX: 46, bootY: 89 },
  { nr: 4, name: "Vulkaninsel",    symbol: "🌋", thema: "Wortarten",                 x: 53, y: 30, bootX: 60, bootY: 47 },
  { nr: 5, name: "Höhleninsel",    symbol: "🕳️", thema: "Satzglieder",               x: 67, y: 72, bootX: 74, bootY: 89 },
  { nr: 6, name: "Gipfelinsel",    symbol: "⛰️", thema: "Steigerung von Adjektiven", x: 80, y: 28, bootX: 87, bootY: 45 },
  { nr: 7, name: "Schatzinsel",    symbol: "💰", thema: "Abschlussprüfung",          x: 90, y: 73, bootX: 82, bootY: 93 },
];

// ----- 2. Der Spielstand -----
// Hier merkt sich das Spiel alles, was das Kind schon geschafft hat.
let spielstand = {
  name: "",
  geschafft: [],   // Nummern der geschafften Inseln, z. B. [1, 2]
  stufen: {},      // zuletzt gespielte Schwierigkeit pro Insel, z. B. { 1: 2 }
  sterne: {},      // beste Sterne pro Insel, z. B. { 1: 3 }
};

// Name, unter dem der Spielstand gespeichert wird. Wenn sich die Inseln ändern,
// einfach die Nummer erhöhen – dann starten alle mit einem frischen Spielstand.
const SPEICHER_NAME = "schatzinsel-v2";

// Spielstand im Browser speichern, damit er beim nächsten Öffnen noch da ist.
// try/catch: Falls der Browser das Speichern verbietet, läuft das Spiel trotzdem.
function speichern() {
  try { localStorage.setItem(SPEICHER_NAME, JSON.stringify(spielstand)); } catch (e) {}
}
function laden() {
  try {
    const gespeichert = localStorage.getItem(SPEICHER_NAME);
    if (gespeichert) spielstand = JSON.parse(gespeichert);
  } catch (e) {}
  // Ältere Spielstände kennen stufen/sterne noch nicht
  spielstand.stufen = spielstand.stufen || {};
  spielstand.sterne = spielstand.sterne || {};
}

// ----- 3. Hilfsfunktionen -----
// Kurzschreibweise, um ein Element über seine id zu finden
const $ = (id) => document.getElementById(id);

// Zeigt einen Bildschirm an und versteckt alle anderen
function zeigeBildschirm(id) {
  document.querySelectorAll(".bildschirm").forEach((b) => b.classList.remove("aktiv"));
  $(id).classList.add("aktiv");
}

// Ist eine Insel schon freigeschaltet? Insel 1 immer,
// jede weitere erst, wenn die vorherige geschafft ist.
function istFrei(nr) {
  return nr === 1 || spielstand.geschafft.includes(nr - 1);
}

// Die erste Insel, die noch nicht geschafft ist
function aktuelleStation() {
  const offen = STATIONEN.find((s) => !spielstand.geschafft.includes(s.nr));
  return offen ? offen.nr : STATIONEN.length;
}

// ----- Hochformat (Handy) -----
// Im Hochformat wird die Karte an der Diagonale gespiegelt: Aus x wird y
// und aus y wird x. So laufen die Inseln von oben nach unten statt von links
// nach rechts – und alle Positionen aus der Liste oben passen weiterhin.
const hochformatAbfrage = window.matchMedia("(orientation: portrait)");
let hochformat = hochformatAbfrage.matches;

// Wandelt x/y (Prozent) in die Position auf dem Bildschirm um
function position(element, x, y) {
  element.style.left = (hochformat ? y : x) + "%";
  element.style.top = (hochformat ? x : y) + "%";
}

function kartenformatAnpassen() {
  hochformat = hochformatAbfrage.matches;
  $("stationen").parentElement.classList.toggle("hochformat", hochformat);
  $("meer").setAttribute("viewBox", hochformat ? "0 0 600 1000" : "0 0 1000 600");
  // matrix(0 1 1 0 0 0) vertauscht x und y in der Grafik
  $("karten-inhalt").setAttribute("transform", hochformat ? "matrix(0 1 1 0 0 0)" : "");
  document.querySelectorAll(".deko").forEach((d) => position(d, d.dataset.x, d.dataset.y));
  zeichneKarte();
  if (bootBeiInsel !== null) bootFahren(bootBeiInsel, true);
}
// Handy gedreht? Dann Karte neu anordnen.
if (hochformatAbfrage.addEventListener) hochformatAbfrage.addEventListener("change", kartenformatAnpassen);
else hochformatAbfrage.addListener(kartenformatAnpassen); // ältere Browser

// ----- 4. Das Boot -----
let bootBeiInsel = null; // bei welcher Insel das Boot gerade liegt

// Fährt das Boot zur Insel mit der Nummer nr.
// sofort = true: ohne Fahrt direkt hinsetzen (z. B. beim Spielstart)
function bootFahren(nr, sofort) {
  const boot = $("boot");
  const ziel = STATIONEN[nr - 1];

  if (sofort) boot.classList.add("sofort");

  // Fährt das Boot nach links? Dann spiegeln, damit es nach vorne schaut.
  if (bootBeiInsel !== null && bootBeiInsel !== nr) {
    const start = STATIONEN[bootBeiInsel - 1];
    // "links" bezieht sich auf den Bildschirm: im Hochformat ist das die y-Richtung der Liste
    const nachLinks = hochformat ? ziel.bootY < start.bootY : ziel.bootX < start.bootX;
    boot.classList.toggle("links", nachLinks);
  }

  position(boot, ziel.bootX, ziel.bootY);
  bootBeiInsel = nr;

  if (sofort) {
    void boot.offsetWidth; // Trick: Browser setzt die Position jetzt sofort
    boot.classList.remove("sofort");
  } else {
    $("hinweis").textContent = `⛵ Volle Fahrt voraus zur ${ziel.name}!`;
    Ton.segeln();
  }
}

// ----- 5. Die Karte zeichnen -----
function zeichneKarte() {
  const behaelter = $("stationen");
  behaelter.innerHTML = "";

  STATIONEN.forEach((station) => {
    const knopf = document.createElement("button");
    knopf.className = "station";
    position(knopf, station.x, station.y);
    const sterne = "⭐".repeat(spielstand.sterne[station.nr] || 0);
    knopf.innerHTML = `${station.symbol}<span class="name">${station.name}<span class="sterne">${sterne}</span></span>`;
    knopf.setAttribute("aria-label", `Insel ${station.nr}: ${station.name}`);

    if (spielstand.geschafft.includes(station.nr)) knopf.classList.add("geschafft");
    else if (!istFrei(station.nr)) knopf.classList.add("gesperrt");
    if (station.nr === aktuelleStation()) knopf.classList.add("aktuell");

    knopf.addEventListener("click", () => stationAngeklickt(station, knopf));
    behaelter.appendChild(knopf);
  });

  // Kartenstücke oben anzeigen: 🗺️ = gesammelt, ▫️ = fehlt noch
  const anzahl = STATIONEN.length - 1; // die Schatzinsel gibt kein Kartenstück
  let anzeige = "";
  for (let i = 1; i <= anzahl; i++) {
    anzeige += spielstand.geschafft.includes(i) ? "🗺️" : "▫️";
  }
  $("stueck-anzeige").textContent = anzeige;
  $("begruessung").textContent = `Ahoi, ${spielstand.name}!`;
}

// ----- 6. Was passiert beim Klick auf eine Insel? -----
let offeneStation = null; // welche Insel gerade im Fenster geöffnet ist

function stationAngeklickt(station, knopf) {
  if (!istFrei(station.nr)) {
    // Gesperrt: kurz wackeln lassen und Hinweis zeigen
    knopf.classList.remove("wackeln");
    void knopf.offsetWidth; // Trick, damit die Animation neu startet
    knopf.classList.add("wackeln");
    $("hinweis").textContent = `🔒 Die ${station.name} ist noch gesperrt. Schaffe zuerst die Insel davor!`;
    Ton.gesperrt();
    return;
  }
  Ton.klick();

  // Hat die Insel schon Aufgaben? Dann geht das Rätsel los!
  if (AUFGABEN[station.nr]) {
    starteQuiz(station);
    return;
  }

  // Sonst: Platzhalter-Fenster (für Inseln, deren Aufgaben noch fehlen)
  offeneStation = station;
  $("dialog-symbol").textContent = station.symbol;
  $("dialog-titel").textContent = station.name;
  $("dialog-text").textContent = `Thema: ${station.thema}. Die Rätsel werden gerade noch versteckt … bald geht es los!`;
  $("dialog").classList.remove("versteckt");
}

// Insel geschafft: speichern, Karte neu zeichnen, Boot zur nächsten Insel fahren
function stationGeschafft(nr) {
  const zumErstenMal = !spielstand.geschafft.includes(nr);
  if (zumErstenMal) spielstand.geschafft.push(nr);
  speichern();
  zeichneKarte();
  if (!zumErstenMal) return; // Insel wurde nur wiederholt: Boot bleibt, wo es ist
  if (nr < STATIONEN.length) {
    bootFahren(nr + 1, false);
  } else {
    $("hinweis").textContent = "🎉 Du hast den Schatz gefunden!";
  }
}

// =====================================================================
//  RÄTSEL (Quiz) mit anpassbarer Schwierigkeit
// =====================================================================

const AUFGABEN_PRO_INSEL = 5;
const MUENZEN_ZUM_BESTEHEN = 3;
const SEEGANG = { 1: "🌊 Ruhige See", 2: "🌊🌊 Frischer Wind", 3: "🌊🌊🌊 Sturm" };
const LOB = ["Super gemacht!", "Klasse, Pirat!", "Richtig! Arrr!", "Volltreffer!", "Spitze!", "Genau so!"];
const MUT = ["Fast!", "Knapp daneben!", "Hoppla!", "Nicht ganz!"];

let quiz = null; // hier steht alles über das laufende Rätsel

// Zufälliges Element aus einer Liste
const zufall = (liste) => liste[Math.floor(Math.random() * liste.length)];

// Liste durchmischen (damit die richtige Antwort nicht immer oben steht)
function mischen(liste) {
  const kopie = [...liste];
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}

// Der Papagei sagt etwas. art = "normal" oder "tipp" (gelbe Blase)
function papageiSagt(text, art) {
  const blase = $("sprechblase");
  blase.textContent = text;
  blase.className = "sprechblase" + (art === "tipp" ? " tipp" : "");
  void blase.offsetWidth;
  blase.style.animation = "none";
  void blase.offsetWidth;
  blase.style.animation = "";
}
function papageiFreutSich() {
  const p = $("papagei");
  p.classList.remove("freut-sich");
  void p.offsetWidth;
  p.classList.add("freut-sich");
}

// Glitzer-Teilchen an der Stelle eines Elements
function glitzern(element) {
  const r = element.getBoundingClientRect();
  for (let i = 0; i < 14; i++) {
    const g = document.createElement("span");
    g.className = "glitzer";
    g.textContent = zufall(["✨", "⭐", "🪙", "💛"]);
    g.style.left = r.left + r.width / 2 + "px";
    g.style.top = r.top + r.height / 2 + "px";
    const winkel = Math.random() * Math.PI * 2;
    const weite = 80 + Math.random() * 100;
    g.style.setProperty("--dx", Math.cos(winkel) * weite + "px");
    g.style.setProperty("--dy", Math.sin(winkel) * weite + "px");
    document.body.appendChild(g);
    setTimeout(() => g.remove(), 1000);
  }
}

// ----- Rätsel starten -----
function starteQuiz(station) {
  quiz = {
    station: station,
    stufe: spielstand.stufen[station.nr] || 2, // Start auf mittlerer Stufe
    nummer: 0,            // wie viele Aufgaben schon dran waren
    muenzen: 0,           // Goldmünzen = beim 1. Versuch richtig
    richtigInFolge: 0,
    fehlerInFolge: 0,
    benutzt: [],          // schon gestellte Aufgaben (keine Wiederholung)
    ergebnisse: [],       // "gold", "silber" oder "verpasst" pro Aufgabe
    // Eine Insel kann eigene Werte haben (z. B. die längere Abschlussprüfung)
    anzahl: AUFGABEN[station.nr].anzahl || AUFGABEN_PRO_INSEL,
    bestehen: AUFGABEN[station.nr].bestehen || MUENZEN_ZUM_BESTEHEN,
  };
  $("quiz-titel").textContent = `${station.symbol} ${station.name}`;
  $("quizbildschirm").dataset.insel = station.nr; // für den passenden Hintergrund
  $("ergebnis").classList.add("versteckt");
  $("aufgaben-karte").classList.remove("versteckt");
  zeigeBildschirm("quizbildschirm");
  papageiSagt(AUFGABEN[station.nr].begruessung ||
    `Ahoi ${spielstand.name}! Hier geht es um ${station.thema}. Für jede richtige Antwort gibt es eine Goldmünze!`);
  zeigeSeegang(false);
  naechsteAufgabe();
}

function zeigeSeegang(gewechselt) {
  const s = $("seegang");
  s.textContent = SEEGANG[quiz.stufe];
  s.classList.remove("wechsel");
  if (gewechselt) { void s.offsetWidth; s.classList.add("wechsel"); }
}

function zeichneFortschritt() {
  const f = $("fortschritt");
  f.innerHTML = "";
  for (let i = 0; i < quiz.anzahl; i++) {
    const platz = document.createElement("div");
    platz.className = "muenzplatz";
    if (quiz.ergebnisse[i]) platz.classList.add(quiz.ergebnisse[i]);
    else if (i === quiz.nummer) platz.classList.add("jetzt");
    f.appendChild(platz);
  }
}

// Sucht eine passende Aufgabe für die aktuelle Stufe
function waehleAufgabe() {
  const alle = AUFGABEN[quiz.station.nr].aufgaben;
  const frei = alle.filter((a) => !quiz.benutzt.includes(a));
  // Erst die eigene Stufe, sonst die nächstliegende
  for (const abstand of [0, 1, 2]) {
    const passend = frei.filter((a) => Math.abs(a.stufe - quiz.stufe) === abstand);
    if (passend.length) return zufall(passend);
  }
  return zufall(alle);
}

// ----- Eine Aufgabe anzeigen -----
function naechsteAufgabe() {
  const aufgabe = waehleAufgabe();
  quiz.benutzt.push(aufgabe);
  quiz.aufgabe = aufgabe;
  quiz.versuch = 1;

  zeichneFortschritt();
  $("aufgabe-nummer").textContent = `Rätsel ${quiz.nummer + 1} von ${quiz.anzahl}`;
  $("aufgabe-frage").textContent = aufgabe.frage;
  $("weiter-knopf").classList.add("versteckt");

  // Karte kurz neu "aufploppen" lassen
  const karte = $("aufgaben-karte");
  karte.style.animation = "none";
  void karte.offsetWidth;
  karte.style.animation = "";

  const inhalt = $("aufgabe-inhalt");
  const antworten = $("antworten");
  inhalt.innerHTML = "";
  antworten.innerHTML = "";

  if (aufgabe.typ === "auswahl") {
    if (aufgabe.satz) {
      // Satz anzeigen, das gesuchte Wort markieren
      const satz = document.createElement("div");
      satz.className = "satz";
      aufgabe.satz.split(" ").forEach((teil) => {
        if (teil.includes("___")) {
          // Lückensatz: leuchtende Lücke statt ___
          const luecke = document.createElement("span");
          luecke.className = "luecke";
          luecke.textContent = "?";
          satz.append(luecke, teil.replace("___", ""), " ");
        } else if (ohneSatzzeichen(teil) === aufgabe.wort) {
          const m = document.createElement("mark");
          m.textContent = teil;
          satz.append(m, " ");
        } else {
          satz.append(teil + " ");
        }
      });
      inhalt.appendChild(satz);
    } else if (aufgabe.wort) {
      // Einzelnes Wort auf dem Holzschild
      const schild = document.createElement("div");
      schild.className = "wortschild";
      schild.textContent = aufgabe.wort;
      inhalt.appendChild(schild);
    }
    mischen(aufgabe.antworten).forEach((text) => {
      const knopf = document.createElement("button");
      knopf.className = "antwort";
      knopf.textContent = text;
      knopf.addEventListener("click", () => pruefe(text, knopf));
      antworten.appendChild(knopf);
    });
  }

  if (aufgabe.typ === "tippen") {
    // Jedes Wort (oder jeder Satzglied-Baustein, getrennt mit |) wird ein Knopf
    const satz = document.createElement("div");
    satz.className = "satz";
    const teile = aufgabe.satz.includes("|")
      ? aufgabe.satz.split("|").map((t) => t.trim())
      : aufgabe.satz.split(" ");
    teile.forEach((teil) => {
      const chip = document.createElement("button");
      chip.className = "wort-chip";
      chip.textContent = teil;
      chip.addEventListener("click", () => pruefe(ohneSatzzeichen(teil), chip));
      satz.appendChild(chip);
    });
    inhalt.appendChild(satz);
  }
}

function ohneSatzzeichen(wort) {
  return wort.replace(/[.,!?;:]/g, "");
}

// Schreibt bei Lückensätzen die richtige Antwort in die Lücke
function lueckeFuellen() {
  const luecke = document.querySelector("#aufgabe-inhalt .luecke");
  if (!luecke) return;
  luecke.textContent = quiz.aufgabe.richtig;
  luecke.classList.add("gefuellt");
}

// Alle Knöpfe der Aufgabe (Antworten oder Wort-Chips)
function alleKnoepfe() {
  return document.querySelectorAll("#antworten .antwort, #aufgabe-inhalt .wort-chip");
}

// ----- Antwort prüfen -----
function pruefe(antwort, knopf) {
  const aufgabe = quiz.aufgabe;

  if (antwort === aufgabe.richtig) {
    // ✅ RICHTIG
    knopf.classList.add("richtig");
    alleKnoepfe().forEach((k) => (k.disabled = true));
    glitzern(knopf);
    papageiFreutSich();
    lueckeFuellen();
    Ton.richtig();

    if (quiz.versuch === 1) {
      quiz.muenzen++;
      quiz.ergebnisse[quiz.nummer] = "gold";
      quiz.richtigInFolge++;
      quiz.fehlerInFolge = 0;
      papageiSagt(`${zufall(LOB)} ${aufgabe.erklaerung || ""}`);
    } else {
      quiz.ergebnisse[quiz.nummer] = "silber";
      quiz.richtigInFolge = 0;
      papageiSagt(`Jetzt hast du's! ${aufgabe.erklaerung || ""}`);
    }

    // 3 richtige hintereinander → etwas schwerer
    if (quiz.richtigInFolge >= 3 && quiz.stufe < 3) {
      quiz.stufe++;
      quiz.richtigInFolge = 0;
      zeigeSeegang(true);
      setTimeout(Ton.stufeHoch, 700);
      papageiSagt("Wow, du bist richtig gut! Der Wind frischt auf – jetzt wird's spannender! 🌬️");
    }
    aufgabeFertig();
    return;
  }

  // ❌ FALSCH
  knopf.classList.add("falsch");
  knopf.disabled = true;
  Ton.falsch();
  quiz.fehlerInFolge++;
  quiz.richtigInFolge = 0;
  let text;

  if (quiz.versuch === 1) {
    // Erster Fehler: Tipp geben, nochmal probieren lassen
    quiz.versuch = 2;
    text = `${zufall(MUT)} Mein Tipp: ${aufgabe.tipp}`;
  } else {
    // Zweiter Fehler: Lösung zeigen und erklären
    alleKnoepfe().forEach((k) => {
      k.disabled = true;
      const wert = k.classList.contains("wort-chip") ? ohneSatzzeichen(k.textContent) : k.textContent;
      if (wert === aufgabe.richtig) k.classList.add("richtig");
    });
    quiz.ergebnisse[quiz.nummer] = "verpasst";
    lueckeFuellen();
    text = `Kein Problem, das war knifflig! ${aufgabe.erklaerung || "Richtig ist: " + aufgabe.richtig}`;
    aufgabeFertig();
  }

  // 2 Fehler hintereinander → etwas leichter, plus Merkhilfe
  if (quiz.fehlerInFolge >= 2 && quiz.stufe > 1) {
    quiz.stufe--;
    quiz.fehlerInFolge = 0;
    zeigeSeegang(true);
    setTimeout(Ton.stufeRunter, 800);
    const merkhilfe = aufgabe.merkhilfe || AUFGABEN[quiz.station.nr].merkhilfe;
    text += ` 🌊 Ich mache das Meer jetzt etwas ruhiger. ${merkhilfe}`;
  }
  papageiSagt(text, "tipp");
}

function aufgabeFertig() {
  zeichneFortschritt();
  $("weiter-knopf").classList.remove("versteckt");
  $("weiter-knopf").focus();
}

// ----- Weiter zur nächsten Aufgabe oder zum Ergebnis -----
$("weiter-knopf").addEventListener("click", () => {
  Ton.klick();
  quiz.nummer++;
  if (quiz.nummer < quiz.anzahl) {
    papageiSagt(zufall(["Weiter geht's!", "Auf zum nächsten Rätsel!", "Du schaffst das!", "Volle Kraft voraus!"]));
    naechsteAufgabe();
  } else {
    zeigeErgebnis();
  }
});

// ----- Ergebnis am Ende der Insel -----
function zeigeErgebnis() {
  const nr = quiz.station.nr;
  const bestanden = quiz.muenzen >= quiz.bestehen;
  // Sterne nach Anteil der Goldmünzen: 5 von 5 → 3 Sterne, 4 von 5 → 2 Sterne
  const anteil = quiz.muenzen / quiz.anzahl;
  const sterne = anteil >= 0.85 ? 3 : anteil >= 0.75 ? 2 : bestanden ? 1 : 0;

  // Schwierigkeit für das nächste Mal merken (nach Misserfolg eine Stufe leichter)
  spielstand.stufen[nr] = bestanden ? quiz.stufe : Math.max(1, quiz.stufe - 1);
  if (sterne > (spielstand.sterne[nr] || 0)) spielstand.sterne[nr] = sterne;
  speichern();

  quiz.bestanden = bestanden;
  zeichneFortschritt();
  $("aufgaben-karte").classList.add("versteckt");
  $("ergebnis").classList.remove("versteckt");

  if (bestanden) {
    $("ergebnis-symbol").textContent = nr < STATIONEN.length ? "🗺️" : "💰";
    $("ergebnis-titel").textContent = nr < STATIONEN.length ? "Kartenstück gefunden!" : "Der Schatz ist dein!";
    $("ergebnis-sterne").innerHTML = "<span>⭐</span>".repeat(sterne) + "<span>☆</span>".repeat(3 - sterne);
    $("ergebnis-text").textContent = `Du hast ${quiz.muenzen} von ${quiz.anzahl} Goldmünzen gesammelt.`;
    $("ergebnis-knopf").textContent = "Zurück zum Boot ⛵";
    papageiSagt(`Hurra, ${spielstand.name}! Ich wusste, dass du das kannst!`);
    papageiFreutSich();
    Ton.sieg();
    setTimeout(() => glitzern($("ergebnis-symbol")), 300);
  } else {
    $("ergebnis-symbol").textContent = "🧭";
    $("ergebnis-titel").textContent = "Fast geschafft!";
    $("ergebnis-sterne").innerHTML = "";
    const ziel = nr < STATIONEN.length ? "findest du das Kartenstück" : "öffnet sich die Schatzkiste";
    $("ergebnis-text").textContent = `Du hast ${quiz.muenzen} Goldmünzen. Mit ${quiz.bestehen} ${ziel}. Probier es gleich nochmal!`;
    $("ergebnis-knopf").textContent = "Nochmal versuchen 💪";
    Ton.nichtGeschafft();
    papageiSagt("Jeder große Pirat hat mal klein angefangen. Beim nächsten Mal wird das Meer ruhiger!", "tipp");
  }
}

$("ergebnis-knopf").addEventListener("click", () => {
  if (quiz.bestanden) {
    zeigeBildschirm("kartenbildschirm");
    // Kurz warten, damit man das Boot losfahren sieht
    setTimeout(() => stationGeschafft(quiz.station.nr), 300);
    // Letzte Insel geschafft? Dann gibt es die Urkunde!
    if (quiz.station.nr === STATIONEN.length) setTimeout(zeigeUrkunde, 900);
  } else {
    starteQuiz(quiz.station);
  }
});

// ----- Die Piraten-Urkunde am Ende des Spiels -----
function zeigeUrkunde() {
  const sterne = Object.values(spielstand.sterne).reduce((summe, s) => summe + s, 0);
  const maximal = STATIONEN.length * 3;
  $("dialog").querySelector(".dialog").classList.add("urkunde");
  $("dialog-symbol").textContent = "🏆";
  $("dialog-titel").textContent = "Piraten-Urkunde";
  $("dialog-text").innerHTML = "";
  $("dialog-text").append(
    "Hiermit wird bestätigt:",
    document.createElement("br"),
  );
  const name = document.createElement("strong");
  name.className = "urkunde-name";
  name.textContent = spielstand.name;
  $("dialog-text").append(
    name,
    document.createElement("br"),
    "hat alle Rätsel gelöst und den Schatz der Wörter gefunden!",
    document.createElement("br"),
    `⭐ ${sterne} von ${maximal} Sternen ⭐`,
  );
  $("dialog").classList.remove("versteckt");
  Ton.sieg();
  // Großes Glitzer-Feuerwerk
  for (let i = 0; i < 4; i++) setTimeout(() => glitzern($("dialog-symbol")), i * 350);
}

function zurueckZurKarte() {
  zeichneKarte();
  zeigeBildschirm("kartenbildschirm");
}
$("ergebnis-karte").addEventListener("click", zurueckZurKarte);
$("quiz-abbrechen").addEventListener("click", zurueckZurKarte);

// ----- 7. Knöpfe verbinden -----
$("start-knopf").addEventListener("click", () => {
  const name = $("name-eingabe").value.trim();
  spielstand.name = name || "Pirat";
  speichern();
  zeichneKarte();
  zeigeBildschirm("kartenbildschirm");
  bootFahren(aktuelleStation(), true);
});

// Enter-Taste im Namensfeld startet ebenfalls
$("name-eingabe").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("start-knopf").click();
});

$("dialog-schliessen").addEventListener("click", () => {
  $("dialog").classList.add("versteckt");
});


// Neu starten: Zur Sicherheit muss man zweimal tippen
let neustartTimer = null;
$("neustart-knopf").addEventListener("click", () => {
  const knopf = $("neustart-knopf");
  if (!neustartTimer) {
    knopf.textContent = "Wirklich? Nochmal tippen!";
    neustartTimer = setTimeout(() => {
      knopf.textContent = "Neu starten";
      neustartTimer = null;
    }, 3000);
    return;
  }
  clearTimeout(neustartTimer);
  neustartTimer = null;
  knopf.textContent = "Neu starten";
  spielstand = { name: "", geschafft: [], stufen: {}, sterne: {} };
  speichern();
  bootBeiInsel = null;
  $("name-eingabe").value = "";
  zeigeBildschirm("startbildschirm");
});

// ----- Ton-Schalter -----
// Browser spielen Ton erst nach dem ersten Antippen ab – daher hier aufwecken
document.addEventListener("pointerdown", Ton.init);

function zeigeTonSchalter() {
  $("knopf-effekte").textContent = Ton.einstellungen.effekte ? "🔊" : "🔇";
  $("knopf-effekte").classList.toggle("aus", !Ton.einstellungen.effekte);
  $("knopf-musik").classList.toggle("aus", !Ton.einstellungen.musik);
}
$("knopf-effekte").addEventListener("click", () => { Ton.umschaltenEffekte(); zeigeTonSchalter(); });
$("knopf-musik").addEventListener("click", () => { Ton.umschaltenMusik(); zeigeTonSchalter(); });
zeigeTonSchalter();

// ----- 8. Spielstart -----
laden();
kartenformatAnpassen(); // Querformat (Laptop) oder Hochformat (Handy)?
if (spielstand.name) {
  // Kind war schon mal da: direkt zur Karte
  zeichneKarte();
  zeigeBildschirm("kartenbildschirm");
  bootFahren(aktuelleStation(), true);
}

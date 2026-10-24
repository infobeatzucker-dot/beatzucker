import { MANUAL_MASTERING_ARTICLE } from "./manualMasteringArticle";
import { LUFS_ARTICLE, SAMPLE_RATE_ARTICLE } from "./audioBasicsArticles";
import { PLATFORM_COMPARISON_ARTICLE } from "./platformComparisonArticle";
import {ADAPTIVE_MASTERING_ARTICLE, REFERENCE_CHARACTER_ARTICLE, STREAMING_LOUDNESS_ARTICLE} from './currentMasteringArticles';
// ─── Types ───────────────────────────────────────────────────────────────────

export type ArticleCategory = "Grundlagen" | "Technik" | "Tipps" | "Plattformen";

export interface LocalizedString { de: string; en: string; }

export interface LocalizedSection {
  h2: LocalizedString;
  body: LocalizedString;
  h3Items?: { h3: LocalizedString; body: LocalizedString }[];
  list?: LocalizedString[];
  table?: { headers: LocalizedString[]; rows: LocalizedString[][] };
}

export interface RessourceArticle {
  slug: string;
  category: ArticleCategory;
  categoryColor: string;
  publishedAt: string;
  updatedAt?: string;
  heroIcon: string;
  readingTimeMinutes: number;
  sources?: {label:LocalizedString;href:string}[];
  title: LocalizedString;
  metaTitle: LocalizedString;
  metaDescription: LocalizedString;
  keywords: { de: string[]; en: string[] };
  teaser: LocalizedString;
  relatedSlugs: string[];
  content: {
    intro: LocalizedString;
    sections: LocalizedSection[];
    conclusion?: LocalizedString;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const getArticleBySlug = (slug: string) =>
  ARTICLES.find((a) => a.slug === slug);

export const getRelatedArticles = (slugs: string[]) =>
  slugs
    .map((s) => ARTICLES.find((a) => a.slug === s))
    .filter(Boolean) as RessourceArticle[];

// ─── Articles ────────────────────────────────────────────────────────────────

export const ARTICLES: RessourceArticle[] = [

  // ── 1 ──────────────────────────────────────────────────────────────────────
  {
    slug: "was-ist-audio-mastering",
    category: "Grundlagen",
    categoryColor: "var(--accent-purple)",
    publishedAt: "2025-01-10",
    updatedAt: "2026-10-24",
    heroIcon: "SlidersHorizontal",
    readingTimeMinutes: 6,
    title: {
      de: "Audio Mastering: Die Basics für deinen Sound",
      en: "Audio Mastering 101: The Basics Explained",
    },
    metaTitle: {
      de: "Audio Mastering Grundlagen: So funktioniert's | Beatzucker",
      en: "Audio Mastering Basics Explained Simply | Beatzucker",
    },
    metaDescription: {
      de: "Was passiert beim Audio Mastering wirklich? Wir erklären kompakt, welche Schritte dazugehören, warum sie den Unterschied machen und wann du sie brauchst.",
      en: "What actually happens during audio mastering? A clear breakdown of the steps involved, why they matter, and when your track needs them.",
    },
    keywords: {
      de: ["audio mastering definition", "was ist mastering musik", "mastering grundlagen einfach erklärt", "wozu braucht man mastering", "was ist audio mastering"],
      en: ["audio mastering definition", "what is music mastering", "mastering basics explained", "why do you need mastering", "what is audio mastering"],
    },
    teaser: {
      de: "Bevor ein Track online geht, durchläuft er einen entscheidenden letzten Schritt: das Mastering. Wir zeigen dir, was dabei technisch passiert und weshalb er über Amateur- oder Profi-Sound entscheidet.",
      en: "Before any track goes live, it passes through one final, decisive stage: mastering. Here's a practical look at what actually happens technically — and why it separates amateur uploads from professional releases.",
    },
    relatedSlugs: ["mastering-vs-mixing", "ki-mastering-wie-funktioniert-es", "mix-fuer-mastering-vorbereiten"],
    content: {
      intro: {
        de: "Dein Beat ist fertig produziert, der Mix sitzt — trotzdem wirkt der Track neben Songs aus deiner Playlist dünn, leise oder blass. Genau hier kommt Mastering ins Spiel, der letzte Feinschliff vor der Veröffentlichung. Kaum ein Produktionsschritt wird von Einsteigern so oft übersprungen oder unterschätzt wie dieser.",
        en: "Your beat is produced, the mix feels solid — yet next to the songs already in your playlists, the track sounds thin, quiet, or washed out. That gap gets closed by mastering, the last polish before release. Few production steps get skipped or underrated by beginners as often as this one.",
      },
      sections: [
        {
          h2: { de: "So lässt sich Mastering definieren", en: "Defining Mastering" },
          body: {
            de: "Unter Audio Mastering versteht man die finale Bearbeitung eines fertigen Stereo-Mixdowns, bevor dieser für die Veröffentlichung vorbereitet wird. Dabei sorgt ein Mastering-Engineer — heute übernimmt das zunehmend auch eine KI — dafür, dass dein Mix auf jedem Abspielgerät funktioniert: vom Kopfhörer über den Handy-Lautsprecher bis zur Clubanlage oder dem Autoradio.\n\nKonkret heißt das: Die Lautheit wird auf ein optimales Niveau gebracht, Frequenzen werden nachjustiert, die Stereobreite abgestimmt und der Track vor hartem Clipping bewahrt. Am Ende steht eine Version deines Songs, die überall überzeugt — nicht nur auf deinen eigenen Studiomonitoren.",
            en: "Audio mastering is the final processing stage applied to a completed stereo mixdown before it's readied for release. A mastering engineer — increasingly an AI these days — makes sure your mix translates across every playback system: headphones, phone speakers, club rigs, car stereos, you name it.\n\nIn practice, that means bringing loudness to an optimal level, fine-tuning frequency balance, dialing in stereo width, and keeping the track safe from harsh clipping. What comes out the other end is a version of your song that holds up anywhere — not just on your studio monitors.",
          },
        },
        {
          h2: { de: "Welche Schritte laufen beim Mastering ab?", en: "What Actually Happens During Mastering" },
          body: {
            de: "Mastering ist kein einzelner Handgriff, sondern eine ganze Kette von Bearbeitungsstufen. Egal ob klassische Mastering-Software oder ein KI-Tool wie Beatzucker — die grundlegenden Stationen sind ähnlich:",
            en: "Mastering isn't one single move — it's a chain of processing stages. Whether you're using classic mastering software or an AI tool like Beatzucker, the core stops along the way look roughly the same:",
          },
          list: [
            { de: "EQ: Frequenzbereiche werden gezielt korrigiert — überschüssiger Bass raus, fehlende Höhen rein.", en: "EQ: Targeted correction of frequency ranges — trimming excess low end, restoring missing top end." },
            { de: "Kompression: Pegelspitzen werden eingefangen, damit der Track gleichmäßig durchläuft.", en: "Compression: Taming level peaks so the track plays back evenly." },
            { de: "Stereobearbeitung: Breite wird optimiert, Mono-Kompatibilität bleibt erhalten.", en: "Stereo processing: Widening the image while keeping mono compatibility intact." },
            { de: "Normalisierung der Lautheit: Anpassung an den LUFS-Zielwert der jeweiligen Plattform.", en: "Loudness normalization: Matching the track to the target LUFS value of the platform in question." },
            { de: "Limiting: Ein True-Peak-Limiter blockt digitales Clipping zuverlässig ab.", en: "Limiting: A True Peak limiter keeps digital clipping off the table." },
            { de: "Dithering: Beim Export in niedrigere Bittiefen reduziert Dithering das Quantisierungsrauschen.", en: "Dithering: Applied on export to lower bit depths to minimize quantization noise." },
          ],
        },
        {
          h2: { de: "Weshalb klingt ein gemasterter Song hochwertiger?", en: "Why a Mastered Track Simply Sounds Better" },
          body: {
            de: "Im eigenen Homestudio klingt ein Mix oft schon richtig gut — das Problem: Kaum ein Homestudio ist akustisch neutral. Raumreflexionen und ungeeignete Monitore verleiten dazu, Mixentscheidungen zu treffen, die woanders plötzlich falsch klingen.\n\nGenau das gleicht Mastering aus. Ein Engineer beurteilt den Mix auf geeigneter Abhöre. Beatzucker arbeitet stattdessen mit Messungen und adaptiven Regeln; die Software hört nicht auf Studiomonitoren. Größere Mixprobleme sollten in den Einzelspuren korrigiert werden. Gleichzeitig bringt das Mastering den Track auf die Lautheit und den Klangcharakter, den Streaming-Dienste und Labels voraussetzen.",
            en: "A mix can sound great in your own home studio — the catch is, almost no home studio is acoustically neutral. Room reflections and imperfect monitors nudge you toward mix decisions that fall apart on other systems.\n\nMastering corrects for exactly that. An engineer judges the mix on suitable monitoring. Beatzucker instead uses measurements and adaptive rules; the software does not listen through studio monitors. Fix major mix problems in the individual tracks. At the same time, mastering brings the track to the loudness and tonal character that streaming services and labels expect by default.",
          },
        },
        {
          h2: { de: "Ab wann ist Mastering Pflicht?", en: "When Do You Actually Need It?" },
          body: {
            de: "Kurz gesagt: immer, sobald du veröffentlichen willst. Ob SoundCloud, Spotify, Bandcamp oder eine Demo fürs Label — ohne Mastering wirkt ein Track im direkten Vergleich schnell unfertig.\n\nUnd das gilt auch mit kleinem Budget: Beatzucker bietet einen kostenlosen automatischen Ausgangspunkt mit optionaler manueller Feinabstimmung. Dauer und Ergebnis hängen von Quelle und Einstellungen ab. Vergleiche die fertige Datei und behalte nur Änderungen, die deiner Musik helfen.",
            en: "Short version: any time you're about to release something. SoundCloud upload, Spotify single, Bandcamp release, label demo — skip mastering and the track reads as unfinished next to anything properly produced.\n\nEven on a shoestring budget this isn't a problem anymore: Beatzucker offers a free automatic starting point with optional manual fine-tuning. Duration and results depend on the source and settings. Compare the finished file and keep only changes that serve your music.",
          },
        },
      ],
      conclusion: {
        de: "Mastering ist kein nettes Extra, sondern der Qualitätsstandard, den Hörer, Plattformen und Labels stillschweigend erwarten. Mit Beatzucker geht das unkomplizierter denn je: Track hochladen, Plattform auswählen, fertigen Master downloaden.",
        en: "Mastering isn't a nice-to-have — it's the baseline quality listeners, platforms, and labels quietly expect. Beatzucker makes hitting that bar simpler than ever: upload your track, pick a platform, download your master.",
      },
    },
  },

  // ── 2 ──────────────────────────────────────────────────────────────────────
  LUFS_ARTICLE,

  // ── 3 ──────────────────────────────────────────────────────────────────────
  {
    slug: "mastering-vs-mixing",
    category: "Grundlagen",
    categoryColor: "var(--accent-purple)",
    publishedAt: "2025-01-20",
    heroIcon: "Scale",
    readingTimeMinutes: 5,
    title: { de: "Mixing oder Mastering? Der Unterschied auf den Punkt gebracht", en: "Mixing or Mastering? The Difference, Simply Put" },
    metaTitle: { de: "Mastering vs. Mixing: Der Unterschied kurz erklärt | Beatzucker", en: "Mastering vs. Mixing: What Sets Them Apart | Beatzucker" },
    metaDescription: {
      de: "Mixing und Mastering klingen ähnlich, sind aber zwei komplett getrennte Arbeitsschritte. Wir zeigen den Unterschied, was jeweils passiert und in welcher Reihenfolge.",
      en: "Mixing and mastering sound similar but are two entirely separate stages of production. Here's the real difference, what each involves, and the order they happen in.",
    },
    keywords: {
      de: ["unterschied mixing mastering", "was ist mixing", "was ist mastering", "mixing und mastering erklärt", "mastering vs mixing"],
      en: ["mixing vs mastering difference", "what is mixing", "what is mastering", "mixing and mastering explained", "mastering vs mixing"],
    },
    teaser: {
      de: "\"Fertig gemischt, kann das direkt raus?\" Fast. Mixing und Mastering sind zwei grundverschiedene Schritte — wir erklären, was beide leisten und warum keiner den anderen ersetzt.",
      en: "\"It's mixed, can I just upload it?\" Almost. Mixing and mastering are two fundamentally different steps — here's what each one actually does, and why neither replaces the other.",
    },
    relatedSlugs: ["was-ist-audio-mastering", "mix-fuer-mastering-vorbereiten", "home-recording-fehler"],
    content: {
      intro: {
        de: "Diese Frage stellt sich fast jeder Produzent irgendwann: Der Mix steht, klingt gut in den Kopfhörern — reicht das schon zum Hochladen? Kurze Antwort: fast, aber noch nicht ganz. Der fehlende Baustein heißt Mastering. Doch worin unterscheidet er sich eigentlich vom Mixing, das du gerade abgeschlossen hast?",
        en: "Almost every producer asks themselves this at some point: the mix is done, it sounds good on headphones — is that enough to release? Short answer: almost, but not quite yet. The missing piece is mastering. So what actually separates it from the mixing you just finished?",
      },
      sections: [
        {
          h2: { de: "Mixing: Die kreative Zusammenführung", en: "Mixing: Bringing the Pieces Together" },
          body: {
            de: "Beim Mixing führst du alle Einzelspuren (Stems) eines Songs kreativ und technisch zu einem stimmigen Stereo-Mix zusammen. Gearbeitet wird mit dem Rohmaterial — Vocals, Gitarre, Bass, Drums, Synths — jede Spur einzeln für sich.\n\nDabei geht es unter anderem um:\n\nLautstärkeverhältnisse: Wie laut steht jedes Element im Verhältnis zu den anderen? Vocals meist vorne, Bass trägt das Fundament, Drums geben den Rhythmus vor.\n\nPanning: Elemente werden im Stereobild platziert — etwa Gitarren links/rechts, Drums in der Mitte.\n\nEQ und Kompression je Spur: Jede einzelne Spur bekommt ihre eigene Frequenz- und Dynamikbearbeitung.\n\nEffekte: Reverb, Delay und Chorus schaffen gezielt Raum und Tiefe.\n\nAm Ende steht der Stereo-Mixdown — eine einzelne fertige Stereodatei.",
            en: "Mixing is where you creatively and technically combine every individual track (stem) of a song into one coherent stereo mix. You're working with raw material here — vocals, guitar, bass, drums, synths — each track handled on its own.\n\nThat process covers things like:\n\nLevel balance: how loud is each element relative to the others? Vocals usually sit up front, bass carries the low end, drums set the rhythmic foundation.\n\nPanning: placing elements across the stereo field — guitars hard left/right, drums centered, and so on.\n\nPer-track EQ and compression: each individual track gets its own frequency shaping and dynamics treatment.\n\nEffects: reverb, delay, and chorus are used deliberately to build depth and space.\n\nWhat comes out the other end is the stereo mixdown — a single finished stereo file.",
          },
        },
        {
          h2: { de: "Mastering: Die Feinarbeit am Gesamtbild", en: "Mastering: Polishing the Whole Picture" },
          body: {
            de: "Mastering setzt genau dort an, wo Mixing aufhört: Bearbeitet wird jetzt der fertige Stereo-Mixdown als Ganzes — Einzelspuren gibt es an dieser Stelle nicht mehr. Ziel ist, den Track fit für die Veröffentlichung zu machen.\n\nDazu gehören:\n\nGesamtklang-EQ: Feinkorrektur der Frequenzbalance über den kompletten Mix hinweg.\n\nGlue-Kompression: Leichte Kompression des gesamten Mixes, damit alles zusammenhält und Punch bekommt.\n\nStereo-Enhancement: Feinschliff an Stereobreite und Mono-Kompatibilität.\n\nLautheits-Normalisierung: Anpassung an den LUFS-Zielwert der Zielplattform.\n\nLimiting: Maximale Lautheit, ohne dass Clipping entsteht.",
            en: "Mastering picks up exactly where mixing leaves off: now it's the finished stereo mixdown getting worked on as a single unit — there are no individual tracks left at this stage. The goal is getting the track release-ready.\n\nThat includes:\n\nOverall EQ: fine-tuning frequency balance across the entire mix.\n\nGlue compression: light compression applied to the whole mix so it holds together and gets some punch.\n\nStereo enhancement: refining stereo width and mono compatibility.\n\nLoudness normalization: matching the LUFS target of the destination platform.\n\nLimiting: pushing loudness to its maximum without introducing clipping.",
          },
        },
        {
          h2: { de: "Die Unterschiede im direkten Vergleich", en: "The Differences, Side by Side" },
          body: { de: "So stehen sich die beiden Schritte konkret gegenüber:", en: "Here's how the two stages line up against each other:" },
          table: {
            headers: [
              { de: "Kriterium", en: "Criterion" },
              { de: "Mixing", en: "Mixing" },
              { de: "Mastering", en: "Mastering" },
            ],
            rows: [
              [{ de: "Ausgangsmaterial", en: "Input material" }, { de: "Einzelspuren (Stems)", en: "Individual tracks (stems)" }, { de: "Fertiger Stereo-Mixdown", en: "Finished stereo mixdown" }],
              [{ de: "Zielsetzung", en: "Goal" }, { de: "Kreativer Gesamtklang des Songs", en: "Creative overall sound of the song" }, { de: "Optimierung für die Veröffentlichung", en: "Optimization for release" }],
              [{ de: "Werkzeuge", en: "Tools" }, { de: "DAW mit sämtlichen Spuren", en: "DAW with all tracks loaded" }, { de: "Mastering-Suite oder KI", en: "Mastering suite or AI" }],
              [{ de: "Ergebnis", en: "Output" }, { de: "Stereo-Mix", en: "Stereo mix" }, { de: "Fertiger Master", en: "Finished master" }],
              [{ de: "Zeitpunkt", en: "Timing" }, { de: "Erster Schritt", en: "Happens first" }, { de: "Zweiter Schritt, danach", en: "Happens second, afterward" }],
            ],
          },
        },
        {
          h2: { de: "Geht Mixing und Mastering auch in Eigenregie?", en: "Can You Handle Both Yourself?" },
          body: {
            de: "Mixing verlangt Erfahrung, verlässliche Monitore und eine halbwegs behandelte Raumakustik. Viele Produzenten mixen deshalb selbst, geben den fertigen Track dann aber an einen Mastering-Engineer oder eine KI weiter.\n\nMastering war lange ein kostspieliger Schritt, reserviert fürs Profistudio. Mit KI-Tools wie Beatzucker dauert professionelles Mastering heute nur noch Sekunden — kostenlos und ohne Spezialwissen. Die KI analysiert deinen Mix und schickt ihn durch 13 DSP-Stufen, um das bestmögliche Ergebnis herauszuholen.",
            en: "Mixing takes experience, reliable monitors, and at least somewhat treated room acoustics. That's why many producers mix their own tracks but then hand the result off to a mastering engineer or an AI.\n\nMastering used to be an expensive step reserved for professional studios. With AI tools like Beatzucker, getting a professional master now takes seconds — free, no specialized knowledge needed. The AI analyzes your mix and runs it through 13 DSP stages to get the best possible outcome.",
          },
        },
      ],
    },
  },

  // ── 4 ──────────────────────────────────────────────────────────────────────
  ADAPTIVE_MASTERING_ARTICLE,

  // ── 5 ──────────────────────────────────────────────────────────────────────
  STREAMING_LOUDNESS_ARTICLE,

  // ── 6 ──────────────────────────────────────────────────────────────────────
  {
    slug: "mastering-plattformen-lufs",
    category: "Plattformen",
    categoryColor: "var(--accent-cyan)",
    publishedAt: "2025-02-05",
    heroIcon: "Globe",
    readingTimeMinutes: 5,
    title: { de: "Wie laut soll dein Master sein? LUFS-Werte für jede Plattform", en: "How Loud Should Your Master Be? LUFS Values for Every Platform" },
    metaTitle: { de: "LUFS-Werte 2025: Spotify, Apple Music, YouTube & mehr | Beatzucker", en: "2025 LUFS Values: Spotify, Apple Music, YouTube & More | Beatzucker" },
    metaDescription: {
      de: "Spotify, Apple Music, YouTube, TikTok, Amazon, Deezer, SoundCloud, Club — jede Plattform normalisiert anders. Die komplette LUFS-Tabelle für dein Mastering.",
      en: "Spotify, Apple Music, YouTube, TikTok, Amazon, Deezer, SoundCloud, club systems — every platform normalizes differently. Your complete LUFS reference for mastering.",
    },
    keywords: {
      de: ["lufs tabelle 2025", "lautheit streaming plattformen", "spotify apple music lufs wert", "richtiger lufs wert mastering"],
      en: ["lufs table 2025", "streaming platform loudness", "spotify apple music lufs value", "correct lufs value for mastering"],
    },
    teaser: {
      de: "−14, −16, −11 oder doch −6 LUFS? Die Zahl, auf die du masterst, hängt komplett davon ab, wo der Track am Ende läuft. Hier die komplette Übersicht aller relevanten Plattformen.",
      en: "−14, −16, −11, or maybe −6 LUFS? The number you master to depends entirely on where the track ends up playing. Here's the full rundown of every platform that matters.",
    },
    relatedSlugs: ["lufs-erklaert", "song-klingt-leise-spotify", "true-peak-rms-lufs"],
    content: {
      intro: {
        de: "Kaum eine Frage taucht beim Mastern so oft auf wie diese: Wie laut soll der Track eigentlich werden? Eine pauschale Antwort gibt es nicht, denn die Lautheit-Norm ändert sich von Plattform zu Plattform. Wer seinen Track auf einen Wert bringt, der für die geplante Zielplattform nicht passt, riskiert zwei Dinge: entweder wird der Track von der automatischen Normalisierung nach unten gezogen und verliert dabei Wumms, oder er bleibt im Vergleich zu anderen Songs schlicht zu leise stehen.",
        en: "Few questions come up more often during mastering than this one: how loud should the track actually be? There's no one-size-fits-all answer, because the loudness standard shifts from platform to platform. Aim for a number that doesn't match your target platform, and you risk one of two outcomes: automatic normalization pulls the track down and strips away its punch, or it just sits there quieter than everything around it.",
      },
      sections: [
        {
          h2: { de: "Alle LUFS-Zielwerte auf einen Blick", en: "Every LUFS Target at a Glance" },
          body: { de: "Aktuelle Werte, Stand 2025 — jeweils integrierte LUFS sowie der maximal erlaubte True Peak in dBTP:", en: "Current figures as of 2025 — integrated LUFS alongside the maximum allowed True Peak in dBTP:" },
          table: {
            headers: [
              { de: "Plattform", en: "Platform" },
              { de: "Ziel-LUFS", en: "Target LUFS" },
              { de: "True Peak Max.", en: "True Peak Max." },
              { de: "Normalisierung", en: "Normalization" },
            ],
            rows: [
              [{ de: "Spotify", en: "Spotify" }, { de: "−14 LUFS", en: "−14 LUFS" }, { de: "−1 dBTP", en: "−1 dBTP" }, { de: "Normalisiert abwärts", en: "Normalizes downward" }],
              [{ de: "Apple Music", en: "Apple Music" }, { de: "−16 LUFS", en: "−16 LUFS" }, { de: "−1 dBTP", en: "−1 dBTP" }, { de: "Normalisiert auf- & abwärts", en: "Normalizes up & down" }],
              [{ de: "YouTube", en: "YouTube" }, { de: "−14 LUFS", en: "−14 LUFS" }, { de: "−1 dBTP", en: "−1 dBTP" }, { de: "Normalisiert abwärts", en: "Normalizes downward" }],
              [{ de: "TikTok", en: "TikTok" }, { de: "−14 LUFS", en: "−14 LUFS" }, { de: "−1 dBTP", en: "−1 dBTP" }, { de: "Aktiv", en: "Active" }],
              [{ de: "Amazon Music", en: "Amazon Music" }, { de: "−14 LUFS", en: "−14 LUFS" }, { de: "−2 dBTP", en: "−2 dBTP" }, { de: "Aktiv", en: "Active" }],
              [{ de: "Deezer", en: "Deezer" }, { de: "−15 LUFS", en: "−15 LUFS" }, { de: "−1 dBTP", en: "−1 dBTP" }, { de: "Aktiv", en: "Active" }],
              [{ de: "SoundCloud", en: "SoundCloud" }, { de: "−11 LUFS", en: "−11 LUFS" }, { de: "−0.1 dBTP", en: "−0.1 dBTP" }, { de: "Keine", en: "None" }],
              [{ de: "Tidal", en: "Tidal" }, { de: "−14 LUFS", en: "−14 LUFS" }, { de: "−1 dBTP", en: "−1 dBTP" }, { de: "Aktiv", en: "Active" }],
              [{ de: "Club / DJ-System", en: "Club / DJ system" }, { de: "−6 LUFS", en: "−6 LUFS" }, { de: "−0.1 dBTP", en: "−0.1 dBTP" }, { de: "Keine", en: "None" }],
              [{ de: "Broadcast (EBU R128)", en: "Broadcast (EBU R128)" }, { de: "−23 LUFS", en: "−23 LUFS" }, { de: "−1 dBTP", en: "−1 dBTP" }, { de: "Aktiv", en: "Active" }],
            ],
          },
        },
        {
          h2: { de: "Auf welchen Wert masterst du am besten?", en: "So Which Number Should You Actually Master To?" },
          body: {
            de: "Erscheint dein Track gleichzeitig auf mehreren Plattformen, ist −14 LUFS (der Spotify-Wert) die sicherste Wahl als Ausgangspunkt — er ist inzwischen so etwas wie der inoffizielle Branchenstandard und funktioniert auch auf den meisten anderen Diensten ordentlich.\n\nBei Clubmusik sieht die Sache anders aus: Hier zielst du auf −6 LUFS, weil PA-Systeme nicht normalisieren und pure Lautheit im Set einen echten Unterschied macht.\n\nApple Music tickt nochmal anders. Der Zielwert liegt bei −16 LUFS, und Apple hebt zu leise Tracks sogar aktiv an — nur nach oben ist ebenfalls eine Grenze gesetzt, zu laute Master werden trotzdem eingebremst.\n\nMusst du das nicht selbst durchrechnen: Beatzucker erkennt die gewählte Zielplattform und stellt den passenden LUFS-Wert automatisch ein.",
            en: "If your track goes out on several platforms at once, −14 LUFS — the Spotify figure — is the safest starting point. It's become something like the unofficial industry default and translates reasonably well to most other services too.\n\nClub music plays by different rules. There you're aiming for −6 LUFS, since PA systems don't normalize anything and raw loudness genuinely matters in a DJ set.\n\nApple Music is its own case entirely. The target sits at −16 LUFS, and Apple will actually boost a track that comes in too quiet — though the ceiling still applies, so an overly loud master gets pulled back down just the same.\n\nYou don't need to work any of this out by hand — Beatzucker detects the platform you've selected and sets the matching LUFS target for you automatically.",
          },
        },
      ],
    },
  },

  // ── 7 ──────────────────────────────────────────────────────────────────────
  {
    slug: "mix-fuer-mastering-vorbereiten",
    category: "Tipps",
    categoryColor: "var(--accent-gold)",
    publishedAt: "2025-02-10",
    heroIcon: "CheckCircle2",
    readingTimeMinutes: 6,
    title: { de: "Die Pre-Mastering-Checkliste: So machst du deinen Mix startklar", en: "The Pre-Mastering Checklist: Getting Your Mix Ready" },
    metaTitle: { de: "Pre-Mastering-Checkliste: Mix richtig vorbereiten | Beatzucker", en: "Pre-Mastering Checklist: Prepping Your Mix the Right Way | Beatzucker" },
    metaDescription: {
      de: "Headroom, Master-Bus, Clipping, Exportformat: Diese Checkliste führt dich durch alles, was ein Mixdown vor dem Mastering erfüllen sollte.",
      en: "Headroom, master bus, clipping, export format: this checklist walks you through everything your mixdown should have in order before it heads to mastering.",
    },
    keywords: {
      de: ["mixdown vor mastering vorbereiten", "checkliste vor dem mastern", "headroom für mastering lassen", "master bus richtig einstellen", "mixdown export für mastering"],
      en: ["prep mixdown before mastering", "checklist before mastering", "leaving headroom for mastering", "setting up your master bus", "exporting a mixdown for mastering"],
    },
    teaser: {
      de: "Wie gut dein fertiger Master klingt, entscheidet sich schon vor dem Mastering — nämlich bei der Vorbereitung deines Mixdowns. Diese Checkliste führt dich durch alle Punkte, die du checken solltest.",
      en: "How good your finished master sounds is decided before mastering even starts — in how you prep your mixdown. This checklist runs you through every box worth ticking.",
    },
    relatedSlugs: ["mastering-vs-mixing", "home-recording-fehler", "audioformate-vergleich"],
    content: {
      intro: {
        de: "Programmierer kennen den Spruch \"garbage in, garbage out\" — und im Mastering trifft er genauso zu. Weder die ausgefeilteste Mastering-KI noch der routinierteste Engineer zaubert aus einem schlampig gemischten Track einen Profi-Sound. Wer seinen Mixdown dagegen sauber vorbereitet, gibt dem Mastering die Grundlage, um wirklich das Maximum herauszuholen.",
        en: "There's an old saying from software development, \"garbage in, garbage out\" — and it applies just as directly to mastering. Not even the sharpest mastering AI or the most seasoned engineer can turn a sloppily mixed track into a polished, professional sound. Prep your mixdown properly, though, and you give the mastering stage a real foundation to work with.",
      },
      sections: [
        {
          h2: { de: "Checkliste vor dem Export", en: "Checklist Before You Export" },
          body: { de: "Bevor der Mixdown das Studio verlässt, lohnt sich ein Blick auf folgende Punkte:", en: "Before your mixdown leaves the building, it's worth running through these points:" },
          list: [
            { de: "✓ Headroom lassen: Die Spitzen deines Tracks sollten −3 bis −6 dBFS nicht überschreiten. Auf dem Master-Bus darf nichts clippen!", en: "✓ Leave headroom: your track's peaks shouldn't cross −3 to −6 dBFS. Nothing on the master bus should be clipping!" },
            { de: "✓ Master-Bus freihalten: Verzichte auf Limiter oder Maximizer dort — den Limiter setzt der Mastering-Engineer oder die KI selbst.", en: "✓ Keep the master bus clean: skip limiters or maximizers there — the limiter itself is the mastering engineer's (or AI's) job." },
            { de: "✓ Auf Clipping hören: Kontrolliere den Mix in deiner DAW mit aktivem Clipping-Anzeiger. Auch kurze Peaks fallen ins Gewicht!", en: "✓ Listen for clipping: check the mix in your DAW with the clip indicator switched on. Even brief peaks count!" },
            { de: "✓ Frequenzen gegenchecken: Zu bassig? Mitten überbetont? Kein Lochband-EQ am Master? Ein Referenztrack hilft bei der Einschätzung.", en: "✓ Sanity-check the frequencies: too much low end? Mids pushed too hard? No comb-filter EQ on the master? A reference track helps you judge this." },
            { de: "✓ Stereobild prüfen: Keine groben Mono-Kompatibilitätsprobleme. Ein Phasenmeter zeigt dir, ob der Zeiger im grünen Bereich bleibt.", en: "✓ Check the stereo image: no serious mono-compatibility issues. A phase meter tells you if the needle stays in the green." },
            { de: "✓ DC-Offset entfernen: Manche älteren Interfaces erzeugen ihn automatisch. Ein High-Pass bei 5–10 Hz beseitigt das Problem.", en: "✓ Remove DC offset: some older interfaces generate it by default. A high-pass filter at 5–10 Hz clears it right up." },
            { de: "✓ Richtiges Format exportieren: WAV mit 24-Bit oder 32-Bit Float, 44.1 kHz oder 48 kHz. MP3 hat beim Mastering-Export nichts verloren!", en: "✓ Export the right format: WAV at 24-bit or 32-bit float, 44.1 kHz or 48 kHz. MP3 has no business in a mastering export!" },
            { de: "✓ Pegel kontrollieren: Der integrierte LUFS-Wert sollte etwa zwischen −18 und −12 LUFS liegen — den finalen Zielwert stellt das Mastering ein.", en: "✓ Check your level: aim for an integrated LUFS reading somewhere around −18 to −12 LUFS — mastering dials in the final target from there." },
          ],
        },
        {
          h2: { de: "Der Master-Bus-Limiter: ein verlockender Fehler", en: "The Master Bus Limiter Trap" },
          body: {
            de: "Ein Klassiker unter den Anfängerfehlern: Man legt einen Limiter auf den Master-Bus, nur um schon mal zu hören, wie laut der Track später klingen \"könnte\". Problem dabei: Landet dieser Mix samt Limiter im Export, ist die Begrenzung fest eingebrannt — und weder Engineer noch KI können den Track danach noch richtig bearbeiten.\n\nEin vorab gelimiteter Mix hat kaum noch Dynamikreserven übrig. Mastering kann ihn zwar noch lauter machen, verlorene Dynamik lässt sich aber nicht zurückholen. Zieh den Limiter also vor dem finalen Export wieder raus und überlass diesen Schritt dem Mastering.",
            en: "Here's a classic beginner move: dropping a limiter on the master bus just to preview how loud the track \"might\" end up sounding. The catch is that if this version gets exported with the limiter still on, that limiting is now baked in permanently — and neither an engineer nor an AI can undo it during mastering.\n\nA mix that's already been limited has almost no dynamic range left to work with. Mastering can push it louder still, but it can't restore dynamics that are already gone. Pull the limiter before your final export and let mastering handle that part of the job.",
          },
        },
        {
          h2: { de: "Welches Format solltest du exportieren?", en: "Which Export Format Actually Makes Sense?" },
          body: {
            de: "Für den Mixdown gilt: WAV mit 24-Bit (oder als 32-Bit Float), bei 44.1 kHz oder 48 kHz. Diese verlustfreien Formate bewahren jede Frequenzinformation, die im Mix steckt.\n\nMP3 ist für den Mastering-Export tabu. Das Format komprimiert verlustbehaftet, und bei jeder erneuten Kodierung entstehen zusätzliche Artefakte. Schickst du deinen Mix als MP3 ins Mastering, werden genau diese Artefakte im fertigen Master hörbar mit verstärkt.",
            en: "For your mixdown: stick to WAV, 24-bit or 32-bit float, at 44.1 kHz or 48 kHz. These lossless formats hold on to every bit of frequency information your mix contains.\n\nMP3 is off the table for a mastering export. It's a lossy format, and each re-encode introduces fresh artifacts. Send an MP3 into mastering and those artifacts get amplified right along with everything else in the finished master.",
          },
        },
      ],
    },
  },

  // ── 8 ──────────────────────────────────────────────────────────────────────
  {
    slug: "audioformate-vergleich",
    category: "Technik",
    categoryColor: "var(--accent-purple)",
    publishedAt: "2025-02-15",
    heroIcon: "Save",
    readingTimeMinutes: 6,
    title: { de: "WAV, FLAC, MP3 oder AAC: Welches Format wofür?", en: "WAV, FLAC, MP3, or AAC: Which Format for Which Job?" },
    metaTitle: { de: "Audioformate im Vergleich: WAV, FLAC, MP3, AAC | Beatzucker", en: "Audio Formats Compared: WAV, FLAC, MP3, AAC | Beatzucker" },
    metaDescription: {
      de: "Mastering-Export, Archivierung oder Streaming-Release: Wir vergleichen WAV, FLAC, MP3 und AAC und zeigen, welches Format wann die richtige Wahl ist.",
      en: "Mastering export, archiving, or a streaming release: we compare WAV, FLAC, MP3, and AAC and show you which format fits which situation.",
    },
    keywords: {
      de: ["welches format fürs mastering", "wav oder flac unterschied", "verlustfreie audioformate", "mp3 vs wav qualität", "audioformate im vergleich"],
      en: ["which format for mastering", "wav or flac difference", "lossless audio formats", "mp3 vs wav quality", "comparing audio formats"],
    },
    teaser: {
      de: "Vier Formate, vier Einsatzzwecke: Wir erklären, wann WAV, wann FLAC und wann MP3 oder AAC die richtige Wahl sind — vom Mastering-Export bis zum TikTok-Post.",
      en: "Four formats, four different jobs: we break down when WAV makes sense, when FLAC does, and when MP3 or AAC is the right call — from mastering export to a TikTok upload.",
    },
    relatedSlugs: ["mix-fuer-mastering-vorbereiten", "sample-rate-bit-depth", "true-peak-rms-lufs"],
    content: {
      intro: {
        de: "In welchem Format sollte man seine Musik eigentlich ablegen? Diese Frage stellt sich früher oder später jeder, der produziert — und eine pauschale Antwort gibt es nicht. Es kommt darauf an, wofür die Datei gedacht ist: als Export fürs Mastering, als Archivkopie, für den Streaming-Vertrieb oder für Social Media. Jedes der gängigen Formate hat seinen sinnvollen Einsatzort im Workflow.",
        en: "What format should you actually store your music in? Sooner or later, every producer runs into this question — and there's no single right answer. It comes down to what the file is for: a mastering export, an archive copy, a streaming release, or a social clip. Each common format earns its place somewhere specific in the workflow.",
      },
      sections: [
        {
          h2: { de: "Die gängigen Formate im Vergleich", en: "The Common Formats, Side by Side" },
          body: { de: "Eine schnelle Referenz zu den wichtigsten Formaten:", en: "A quick reference for the formats that matter most:" },
          table: {
            headers: [
              { de: "Format", en: "Format" },
              { de: "Art", en: "Kind" },
              { de: "Klangqualität", en: "Sound quality" },
              { de: "Dateigröße", en: "File size" },
              { de: "Wofür geeignet", en: "Best suited for" },
            ],
            rows: [
              [{ de: "WAV 32-bit", en: "WAV 32-bit" }, { de: "Verlustfrei", en: "Lossless" }, { de: "Maximal", en: "Maximum" }, { de: "Groß", en: "Large" }, { de: "Mastering-Archiv", en: "Mastering archive" }],
              [{ de: "WAV 24-bit", en: "WAV 24-bit" }, { de: "Verlustfrei", en: "Lossless" }, { de: "Sehr hoch", en: "Very high" }, { de: "Mittel-groß", en: "Medium-large" }, { de: "Mastering-Export, Vertrieb", en: "Mastering export, distribution" }],
              [{ de: "WAV 16-bit", en: "WAV 16-bit" }, { de: "Verlustfrei", en: "Lossless" }, { de: "CD-Qualität", en: "CD quality" }, { de: "Mittel", en: "Medium" }, { de: "CD, ältere Systeme", en: "CD, legacy systems" }],
              [{ de: "FLAC 24-bit", en: "FLAC 24-bit" }, { de: "Verlustfrei (komprimiert)", en: "Lossless (compressed)" }, { de: "Sehr hoch", en: "Very high" }, { de: "Mittel", en: "Medium" }, { de: "Archiv, Tidal HiFi", en: "Archive, Tidal HiFi" }],
              [{ de: "MP3 320 kbps", en: "MP3 320 kbps" }, { de: "Verlustbehaftet", en: "Lossy" }, { de: "Hoch (praktisch nicht hörbar)", en: "High (practically inaudible)" }, { de: "Klein", en: "Small" }, { de: "Streaming, Social Media", en: "Streaming, social media" }],
              [{ de: "MP3 128 kbps", en: "MP3 128 kbps" }, { de: "Verlustbehaftet", en: "Lossy" }, { de: "Mittel", en: "Medium" }, { de: "Sehr klein", en: "Very small" }, { de: "Vorabhören, Demos", en: "Rough previews, demos" }],
              [{ de: "AAC 256 kbps", en: "AAC 256 kbps" }, { de: "Verlustbehaftet", en: "Lossy" }, { de: "Hoch", en: "High" }, { de: "Klein", en: "Small" }, { de: "Apple Music, iTunes", en: "Apple Music, iTunes" }],
            ],
          },
        },
        {
          h2: { de: "WAV: dein Arbeitspferd fürs Mastering", en: "WAV: Your Mastering Workhorse" },
          body: {
            de: "WAV steht für Waveform Audio File Format und ist das universelle, unkomprimierte Format, das sich in der Musikproduktion praktisch überall durchgesetzt hat. Es gibt keine Kompression und damit auch keine Kompressionsartefakte — jede Audioinformation bleibt vollständig erhalten.\n\nFür den Export vor dem Mastering ist WAV 24-Bit bei 44.1 kHz oder 48 kHz die richtige Wahl. Diese Bittiefe schafft genug Spielraum, damit die Bearbeitung im Mastering sauber greifen kann. Am Ende liefert dir Beatzucker den fertigen Master gleich in drei Varianten: als WAV 32-Bit, 24-Bit und 16-Bit.",
            en: "WAV — short for Waveform Audio File Format — is the universal, uncompressed format that's become close to standard practice across music production. There's no compression involved, and therefore no compression artifacts either — every bit of audio information survives intact.\n\nFor your pre-mastering export, WAV at 24-bit, 44.1 kHz or 48 kHz, is the right call. That bit depth leaves enough room for the mastering stage to work cleanly. At the end of the process, Beatzucker hands your finished master back in three variants at once: WAV 32-bit, 24-bit, and 16-bit.",
          },
        },
        {
          h2: { de: "Wann MP3 völlig in Ordnung ist", en: "When MP3 Is Perfectly Fine" },
          body: {
            de: "Bei 320 kbps kann so gut wie niemand MP3 noch von einem verlustfreien Format unterscheiden. Dafür eignet es sich hervorragend:\n\n• Für Streaming-Uploads (die meisten Distributoren nehmen MP3 320 problemlos an)\n• Für Posts auf TikTok oder Instagram\n• Für Preview-Dateien, die du zum Feedback verschickst\n\nWas du aber vermeiden solltest: MP3 als Eingangsformat fürs Mastering. Die verlustbehaftete Kompression erzeugt beim Neu-Kodieren Qualitätseinbußen, die sich im fertigen Master deutlich bemerkbar machen.",
            en: "At 320 kbps, virtually nobody can tell MP3 apart from a lossless file by ear. That makes it a great fit for:\n\n• Streaming uploads (most distributors accept MP3 320 without issue)\n• TikTok or Instagram posts\n• Preview files you're sending out for feedback\n\nWhat you want to avoid, though, is feeding MP3 into mastering as your input. The lossy compression introduces quality loss when it gets re-encoded, and that loss shows up clearly in the finished master.",
          },
        },
      ],
    },
  },

  // ── 9 ──────────────────────────────────────────────────────────────────────
  {
    slug: "home-recording-fehler",
    category: "Tipps",
    categoryColor: "var(--accent-gold)",
    publishedAt: "2025-02-20",
    updatedAt: "2026-10-24",
    heroIcon: "Mic",
    readingTimeMinutes: 7,
    title: { de: "Warum dein Homestudio-Mix woanders anders klingt: 5 Fehlerquellen", en: "Why Your Home Studio Mix Sounds Different Elsewhere: 5 Culprits" },
    metaTitle: { de: "5 häufige Fehler beim Home Recording – und die Lösung | Beatzucker", en: "5 Common Home Recording Mistakes – and the Fix | Beatzucker" },
    metaDescription: {
      de: "Warum klingt dein Mix woanders anders? Raumakustik, fehlender Headroom, zu viel Reverb, falscher Export, keine Referenz — die 5 Klassiker mit Lösung.",
      en: "Why does your mix sound different somewhere else? Room acoustics, missing headroom, too much reverb, wrong export, no reference track — the 5 classics, solved.",
    },
    keywords: {
      de: ["mix klingt woanders anders", "häufige fehler beim mixen", "probleme im homestudio", "raumakustik homestudio", "besser mixen zuhause"],
      en: ["mix sounds different on other speakers", "common mixing mistakes", "home studio issues", "room acoustics home studio", "mixing better at home"],
    },
    teaser: {
      de: "Klingt super auf deinen Studiomonitoren, aber komisch auf dem Handy oder im Auto? Das liegt fast nie an fehlendem Talent. Fünf Klassiker aus dem Homestudio-Alltag — und wie du sie loswirst.",
      en: "Sounds great on your studio monitors but weird on your phone or in the car? That's almost never a talent issue. Five classic home-studio pitfalls — and how to get rid of them.",
    },
    relatedSlugs: ["mix-fuer-mastering-vorbereiten", "mastering-vs-mixing", "was-ist-audio-mastering"],
    content: {
      intro: {
        de: "Im eigenen Studio klingt der Track stark. Auf dem Autoradio, über Kopfhörer oder auf der Bluetooth-Box im Wohnzimmer plötzlich seltsam dünn, matschig oder anders. Kein Grund zur Panik und schon gar kein Talent-Problem — dahinter stecken fast immer dieselben handfesten, technischen Ursachen. Wir gehen die fünf häufigsten davon durch, inklusive Lösung.",
        en: "In your own studio, the track sounds strong. On the car stereo, over headphones, or on a Bluetooth speaker in the living room, it suddenly sounds thin, muddy, or just off. No need to panic, and it's definitely not a talent problem — nearly every case comes down to the same handful of technical causes. Here are the five most common ones, along with the fix for each.",
      },
      sections: [
        {
          h2: { de: "Grund 1: Der Raum lügt dich an", en: "Culprit 1: Your Room Is Lying to You" },
          body: {
            de: "Kaum ein Homestudio-Raum ist ursprünglich fürs Musikhören gebaut worden. Parallele Wände bauen stehende Wellen auf, glatte Oberflächen werfen Schall unkontrolliert zurück, und Bässe stapeln sich bevorzugt in den Ecken.\n\nDie Folge hörst du beim A/B-Vergleich: Im Studio wirkt der Mix satt und bassbetont, auf anderen Anlagen plötzlich dünn. Oder du hebst instinktiv die Höhen an, weil dein Raum sie schluckt — und der Track wird dann auf normalen Boxen unangenehm spitz.\n\nAbhilfe schafft akustische Behandlung: Absorber und Diffusoren an den wichtigsten Reflexionspunkten bringen schon spürbar was. Selbst günstige DIY-Panels aus Basotect-Schaumstoff sind einem unbehandelten Raum klar überlegen.",
            en: "Almost no home-studio room was originally designed for critical listening. Parallel walls set up standing waves, hard surfaces bounce sound back uncontrolled, and bass tends to pile up in corners.\n\nYou hear the result the moment you A/B on different systems: in the studio the mix feels full and bass-heavy, then thins out somewhere else. Or you instinctively push the highs up because your room is swallowing them — and the track ends up harsh and piercing on normal speakers.\n\nThe fix is acoustic treatment: absorbers and diffusers at the key reflection points make a noticeable difference. Even cheap DIY panels made from Basotect foam beat an untreated room by a wide margin.",
          },
        },
        {
          h2: { de: "Grund 2: Zu wenig Luft nach oben im Mix", en: "Culprit 2: No Air Left in the Mix" },
          body: {
            de: "Ein klassisches Muster: Jede Spur wird für sich genommen schön laut aufgedreht, und am Ende wundert man sich, warum der Gesamtmix übersteuert. Der Denkfehler dabei: Summiert man alle Spuren, liegt der Gesamtpegel deutlich über dem jeder einzelnen Spur.\n\nDie Faustregel lautet daher: Starte grundsätzlich leiser, als du denkst nötig zu sein. Die Spitzenpegel deines fertigen Mixdowns sollten die Marke von −6 dBFS nicht reißen — nur so bleibt genug Platz fürs Mastering. Fehlt dieser Headroom, lässt sich professionell kaum noch mastern, ohne dass Dynamik verloren geht.",
            en: "A classic pattern: every track gets cranked up nice and loud on its own, and then the overall mix mysteriously overloads. The mistake is thinking in isolation — sum all the tracks together and the combined level sits well above any single track's level.\n\nSo the rule of thumb is: start noticeably quieter than you'd instinctively expect to need. The peaks in your finished mixdown shouldn't cross −6 dBFS — that's what keeps enough room open for mastering. Without that headroom, mastering can barely do its job without sacrificing dynamics along the way.",
          },
        },
        {
          h2: { de: "Grund 3: Reverb wird zur Nebelmaschine", en: "Culprit 3: Reverb Turns Into a Fog Machine" },
          body: {
            de: "Im Studio klingt ein satter Hall meistens toll — auf dem Mix als Ganzes wirkt zu viel davon aber schnell wie Nebel, der alle Konturen verwischt. Besonders riskant ist das bei Bass, Kick und Snare: Reverb dort pumpt niederfrequente Energie in den Mix und frisst die Klarheit auf.\n\nDie Lösung heißt Sparsamkeit: ein knapper Room-Hall auf dem Gesang, ein Space-Hall für Flächenklänge — aber keine langen, tiefen Verzögerungen auf perkussiven Elementen. Weniger ist hier tatsächlich mehr.",
            en: "A lush reverb usually sounds fantastic in isolation — but pile too much of it into the mix and it quickly turns into fog that blurs every edge. Bass, kick, and snare are the riskiest spots: reverb there dumps low-frequency energy into the mix and eats away at clarity.\n\nThe fix is restraint: a tight room reverb on the vocal, a spacious hall on pads — but no long, deep tails on percussive elements. Less genuinely is more here.",
          },
        },
        {
          h2: { de: "Grund 4: Ohne Referenztrack im Blindflug", en: "Culprit 4: Mixing Blind Without a Reference" },
          body: {
            de: "Wer stundenlang am selben Mix sitzt, verliert langsam die Objektivität — das Gehör gewöhnt sich an das, was gerade läuft, egal ob es tatsächlich passt. Probleme fallen einem irgendwann einfach nicht mehr auf, sie sind aber trotzdem noch da.\n\nDagegen hilft nur der ständige Abgleich: Zieh in regelmäßigen Abständen zwei, drei kommerzielle Tracks aus deinem Genre in die DAW und wechsle im direkten A/B zwischen deinem Mix und der Referenz. Beatzucker macht das sogar im Mastering nutzbar — du kannst bis zu drei passende Referenzen gewichten und ihren gemeinsamen Klangeinfluss einstellen. Die Plattform bestimmt weiterhin das Lautheitsziel.",
            en: "Sit at the same mix for hours and objectivity slowly slips away — your ears adjust to whatever's playing, whether or not it actually works. Problems stop registering, but that doesn't mean they've gone anywhere.\n\nThe antidote is constant comparison: pull two or three commercial tracks from your genre into the DAW every so often and A/B directly against your own mix. Beatzucker even builds this into mastering itself — weight up to three suitable references and adjust their shared tonal influence, while the platform still determines loudness.",
          },
        },
        {
          h2: { de: "Grund 5: Der Export sabotiert die Arbeit", en: "Culprit 5: The Export Undoes All Your Work" },
          body: {
            de: "MP3 statt WAV, 16-Bit statt 24-Bit, die falsche Sample Rate — solche Exportfehler passieren häufig und sind komplett vermeidbar. Schickst du deinen Mix als MP3 weiter und der wird dann gemastert, verstärkt sich genau die Kompressionsartefaktik, die MP3 mit sich bringt, im fertigen Master.\n\nExportiere deshalb konsequent als WAV mit 24-Bit (oder 32-Bit Float) bei 44.1 kHz oder 48 kHz. Das ist der Branchenstandard fürs professionelle Mastering — und genau das Format, das auch Beatzucker als Eingabe erwartet.",
            en: "MP3 instead of WAV, 16-bit instead of 24-bit, the wrong sample rate — these export slip-ups are common and entirely avoidable. Send an MP3 mix into mastering, and exactly the compression artifacts that come baked into MP3 get amplified right along with everything else in the finished master.\n\nSo export consistently as WAV, 24-bit (or 32-bit float), at 44.1 kHz or 48 kHz. That's the industry standard for professional mastering — and it's also precisely the input format Beatzucker expects.",
          },
        },
      ],
    },
  },

  // ── 10 ─────────────────────────────────────────────────────────────────────
  {
    slug: "hitverdaechtiger-song",
    category: "Grundlagen",
    categoryColor: "var(--accent-purple)",
    publishedAt: "2025-02-25",
    heroIcon: "Trophy",
    readingTimeMinutes: 5,
    title: { de: "Der Song ist stark — jetzt fehlt nur noch das richtige Mastering", en: "The Song Is Strong — All That's Left Is the Right Mastering" },
    metaTitle: { de: "Starker Song, fehlendes Mastering? So holst du das Maximum raus | Beatzucker", en: "Great Song, No Mastering Yet? Here's How to Get the Most Out of It | Beatzucker" },
    metaDescription: {
      de: "Ein starker Song wird erst durch das richtige Mastering zum echten Hit. So funktioniert KI-Mastering bei Beatzucker — kostenlos und ohne Wartezeit.",
      en: "A strong song only becomes a real hit through the right mastering. Here's how AI mastering works at Beatzucker — free and without the wait.",
    },
    keywords: {
      de: ["track professionell mastern lassen", "online mastering kostenlos", "song fürs release mastern", "ki mastering ausprobieren", "hitpotenzial song mastering"],
      en: ["get track professionally mastered", "free online mastering", "master a song for release", "try ai mastering", "hit-potential song mastering"],
    },
    teaser: {
      de: "Monatelang gefeilt, der Mix steht — und trotzdem fehlt noch etwas zum fertigen Sound. Genau da setzt Mastering an: der letzte Schritt, der aus einem guten Track einen Profi-Track macht.",
      en: "Months of tweaking, the mix is locked in — and yet something's still missing from the finished sound. That's exactly where mastering comes in: the final step that turns a good track into a pro one.",
    },
    relatedSlugs: ["was-ist-audio-mastering", "ki-mastering-wie-funktioniert-es", "mastering-plattformen-lufs"],
    content: {
      intro: {
        de: "Wochenlang an Melodie, Beat und Gesang gefeilt — und irgendwie spürst du, dass der Song etwas hat. Stellst du ihn aber direkt neben deine liebsten Spotify-Tracks, fällt der Unterschied sofort auf: Es fehlt an Klarheit, an Lautheit, an diesem letzten professionellen Schliff. Genau dieser fehlende Baustein hat einen Namen — Mastering.",
        en: "Weeks spent fine-tuning melody, beat, and vocals — and somewhere along the way you can tell the song has something. But line it up next to your favorite tracks on Spotify and the gap jumps out immediately: it's missing clarity, loudness, that final professional polish. That missing piece has a name — mastering.",
      },
      sections: [
        {
          h2: { de: "Was passiert eigentlich beim Mastering?", en: "What Actually Happens During Mastering?" },
          body: {
            de: "Ein guter Vergleich: dein Mix ist wie ein Rohdiamant. Der Wert steckt schon drin, aber die Facetten sind noch nicht geschliffen, der Glanz liegt verborgen unter der rauen Oberfläche. Genau das übernimmt Mastering — es holt heraus, was im Track ohnehin schon angelegt ist.\n\nPraktisch heißt das: Der Track bekommt den Frequenzcharakter, den erfolgreiche Produktionen in seinem Genre haben. Der Bass sitzt auf dem richtigen Pegel, die Höhen öffnen sich, der Mix wird breiter, ohne dabei phasig zu klingen — und die Lautheit landet exakt dort, wo Spotify, Apple Music oder die Club-PA sie erwarten.\n\nDas Ergebnis ist mehr als \"besser klingen\". Es ist der Sprung zu einem Sound, der professionell wirkt.",
            en: "Here's a fitting comparison: your mix is like a rough diamond. The value is already there, but the facets haven't been cut yet, and the shine is still hidden beneath a rough surface. That's exactly what mastering does — it draws out what's already built into the track.\n\nIn practical terms: the track gets the frequency character of the successful productions in its genre. The bass sits at the right level, the highs open up, the mix widens without turning phasy — and the loudness lands exactly where Spotify, Apple Music, or a club PA expects it.\n\nThe result is more than just \"sounding better.\" It's the leap to a sound that reads as professional.",
          },
        },
        {
          h2: { de: "Wo liegt der Unterschied zwischen \"gut\" und \"radiotauglich\"?", en: "Where's the Line Between \"Good\" and \"Radio-Ready\"?" },
          body: {
            de: "Zwischen einem soliden Amateur-Track und einem echten Chart-Kandidaten liegt oft weniger, als man vermutet — und genau diese Lücke schließt Mastering.\n\nEin ungemasterter Track zeigt typische Schwachstellen: zu leise im direkten Streaming-Vergleich, Frequenzen aus der Balance, ein enges Stereobild, dazu True-Peak-Ausreißer, die auf manchen Wiedergabegeräten verzerren.\n\nNach professionellem Mastering sieht das anders aus: LUFS-Werte, die zur jeweiligen Plattform passen, eine Frequenzbalance auf Genre-Niveau, ein sauber ausgebautes Stereofeld und ein True Peak, der zuverlässig unter −1 dBTP bleibt.\n\nIm Mix selbst sind das oft nur kleine Stellschrauben. Im Endergebnis machen sie den entscheidenden Unterschied.",
            en: "The gap between a solid amateur track and a genuine chart contender is often smaller than people assume — and that's precisely the gap mastering closes.\n\nAn unmastered track shows the usual weak points: too quiet next to other streaming tracks, frequencies out of balance, a narrow stereo image, plus True Peak spikes that distort on some playback systems.\n\nAfter professional mastering, the picture changes: LUFS values matched to the target platform, genre-appropriate frequency balance, a properly widened stereo field, and a True Peak that reliably stays under −1 dBTP.\n\nThose are often small adjustments within the mix itself. In the final result, they're the difference that counts.",
          },
        },
        {
          h2: { de: "Profi-Mastering, ohne das Profi-Preisschild", en: "Pro-Level Mastering Without the Pro-Level Price Tag" },
          body: {
            de: "Früher kostete ein professionelles Mastering zwischen 100 und 300 Euro pro Track, und man wartete ein bis zwei Tage auf das Ergebnis. Für Artists ohne großes Label im Rücken war das oft eine harte Entscheidung.\n\nBeatzucker bietet eine zugängliche Alternative: Die Plattform analysiert deinen Track automatisch und schickt ihn durch eine dokumentierte 12-stufige DSP-Pipeline. Die kostenlose Nutzung unterliegt einem fairen Tageslimit pro Konto.\n\nFür besonders kritische oder hochbudgetierte Produktionen bleibt ein erfahrener Mastering-Engineer die beste individuelle Lösung.",
            en: "Professional mastering used to run €100–300 per track, with a one- to two-day turnaround. For independent artists without label backing, that often forced a difficult choice.\n\nBeatzucker provides an accessible alternative: it analyzes the track automatically and runs it through a documented 12-stage DSP pipeline. Free usage is subject to a fair daily limit per account.\n\nFor critical or high-budget productions, an experienced mastering engineer remains the best tailored option.",
          },
        },
      ],
      conclusion: {
        de: "Vielleicht ist genau dieser Track dein Durchbruch. Lass ihn nicht an einem fehlenden Mastering scheitern — lade ihn jetzt bei Beatzucker hoch, kostenlos und mit Account in wenigen Sekunden angelegt.",
        en: "This track might just be your breakthrough. Don't let a missing mastering step get in the way — upload it to Beatzucker now, free of charge, with an account set up in seconds.",
      },
    },
  },

  // ── 11 ─────────────────────────────────────────────────────────────────────
  {
    slug: "stereo-breite-mastering",
    category: "Technik",
    categoryColor: "var(--accent-cyan)",
    publishedAt: "2025-03-01",
    heroIcon: "ArrowLeftRight",
    readingTimeMinutes: 6,
    title: { de: "Warum Stereobreite über Kopfhörer und Lautsprecher entscheidet", en: "Stereo Width Explained: Getting Your Mix to Translate Everywhere" },
    metaTitle: { de: "Stereobreite richtig einstellen – Mid/Side & Mono-Check | Beatzucker", en: "Getting Stereo Width Right – Mid/Side & Mono Checks | Beatzucker" },
    metaDescription: {
      de: "So funktioniert Stereobreite beim Mastering: Mid/Side-Technik, Mono-Check, Phasenauslöschung vermeiden und das Stereobild deines Tracks gezielt formen.",
      en: "How stereo width works in mastering: Mid/Side technique, checking mono compatibility, avoiding phase cancellation, and shaping your track's stereo image on purpose.",
    },
    keywords: {
      de: ["mid side technik mastering", "stereofeld einstellen", "phasenauslöschung vermeiden", "mono check audio", "stereobreite mastering"],
      en: ["mid side technique mastering", "adjusting the stereo field", "avoiding phase cancellation", "mono compatibility check", "stereo width mastering"],
    },
    teaser: {
      de: "Klingt dein Track auf dem Handylautsprecher plötzlich dünn oder verschwindet er fast? Das Stereofeld ist oft der Grund — und im Mastering lässt es sich gezielt korrigieren.",
      en: "Does your track suddenly sound thin — or nearly disappear — on a phone speaker? The stereo field is usually the culprit, and mastering is where you fix it.",
    },
    relatedSlugs: ["true-peak-rms-lufs", "was-ist-audio-mastering", "mix-fuer-mastering-vorbereiten"],
    content: {
      intro: {
        de: "Zwei Tracks können identische LUFS-Werte und einen sauberen Mix haben und trotzdem völlig unterschiedlich wirken, sobald man sie über Kopfhörer statt über einen einzelnen Lautsprecher hört. Der Grund liegt fast immer im Stereofeld: Ist es zu eng, fehlt die Räumlichkeit; ist es zu weit oder phasig aufgebaut, bricht der Klang auf Mono-Wiedergabegeräten zusammen.",
        en: "Two tracks can share identical LUFS numbers and both be mixed cleanly, yet sound completely different the moment you switch from a single speaker to headphones. The reason is almost always the stereo field: too narrow and the track loses its sense of space, too wide or phase-inconsistent and it can fall apart on mono playback.",
      },
      sections: [
        {
          h2: { de: "Das Stereofeld: räumliche Verteilung zwischen L und R", en: "The Stereo Field: How Left and Right Create Space" },
          body: {
            de: "Jedes Audiosignal, das du hörst, wird über zwei Kanäle wiedergegeben — links und rechts. Wie stark sich diese beiden Kanäle voneinander unterscheiden, bestimmt die wahrgenommene Breite: Sind sie nahezu identisch, hört sich das Ergebnis wie Mono an, alles bündelt sich in der Mitte. Je größer die Unterschiede zwischen L und R, desto offener und weiträumiger wirkt der Track.\n\nGesteuert wird das im Mastering über Mid/Side-Verarbeitung: Der Mid-Kanal enthält alles, was in beiden Kanälen gleich ist (der Mono-Kern des Signals), der Side-Kanal enthält ausschließlich die Differenz zwischen links und rechts (den eigentlichen Stereo-Anteil).",
            en: "Every track you hear plays back over two channels, left and right. How different those two channels are from each other is what determines how wide the track feels: nearly identical signals collapse toward the center and read as mono, while bigger differences between L and R create a sense of openness and space.\n\nMastering controls this through Mid/Side processing. The Mid channel carries whatever is shared between both channels — the mono core of the signal — and the Side channel isolates only the difference between left and right, which is the actual stereo information.",
          },
        },
        {
          h2: { de: "Warum Mono-Kompatibilität keine Nebensache ist", en: "Mono Compatibility Isn't an Afterthought" },
          body: {
            de: "Ein erheblicher Teil aller Hörer bekommt deine Musik gar nicht in Stereo zu Gehör: Handylautsprecher, kleine Bluetooth-Boxen, smarte Lautsprecher wie Alexa-Geräte geben in der Regel mono wieder. Hat dein Track Phasenprobleme, können auf diesen Geräten ganze Frequenzbereiche verschwinden oder der Gesamtklang verändert sich hörbar.\n\nWoher kommt so ein Problem? Meistens, weil der Side-Anteil in der Mid/Side-Verarbeitung übertrieben stark ist, oder weil zwischen linkem und rechtem Kanal Phasenverschiebungen bestehen. Werden diese Kanäle zu Mono zusammengerechnet, löschen sich betroffene Frequenzen teilweise oder komplett aus.\n\nSo prüfst du es: Ziehe deinen Mix in Beatzucker oder in ein DAW-Plugin mit Korrelationsmesser. Pendelt die Anzeige dauerhaft in den negativen (roten) Bereich, liegt ein Phasenproblem vor.",
            en: "A significant share of listeners never actually hear your music in stereo — phone speakers, small Bluetooth speakers, and smart speakers like Alexa devices typically output mono. If your track has phase issues, entire frequency ranges can vanish on these devices, or the overall tone shifts noticeably.\n\nWhere does this come from? Usually the Side signal in Mid/Side processing is pushed too hard, or there's a phase offset between the left and right channels to begin with. When those channels get summed down to mono, the affected frequencies partially or fully cancel each other out.\n\nHere's how to check: drop your mix into Beatzucker or a DAW plugin with a correlation meter. If the needle sits consistently in the negative, red-shaded zone, you've got a phase problem on your hands.",
          },
        },
        {
          h2: { de: "So geht Beatzucker mit dem Stereofeld um", en: "How Beatzucker Handles the Stereo Field" },
          body: {
            de: "Beatzucker analysiert das Stereofeld jedes hochgeladenen Tracks automatisch und errechnet daraus den passenden Side-Gain für dein Genre. Für Electronic- und Club-Produktionen lohnt sich meist ein breiteres Feld, während Akustikgitarre oder Jazz mit einem engeren Stereobild natürlicher klingt.\n\nDie Analyse liefert dir konkrete Werte:\n\n• Stereo Width (0–100 %): Wie breit ist dein aktueller Mix?\n• Mono Compatibility Score: Wie verträgt sich der Track mit Mono-Wiedergabe?\n• Phase Correlation: Gibt es Konflikte zwischen L und R?\n\nDu siehst diese Werte im Analyse-Panel jeweils vor und nach dem Mastering — der Unterschied ist damit sofort sichtbar, nicht nur hörbar.",
            en: "Beatzucker automatically analyzes the stereo field of every uploaded track and works out the appropriate Side gain for your genre. Electronic and club productions typically benefit from extra width, while acoustic guitar or jazz tends to sound more natural with a narrower image.\n\nThe analysis surfaces concrete numbers:\n\n• Stereo Width (0–100%): how wide is your current mix?\n• Mono Compatibility Score: how well does the track hold up in mono?\n• Phase Correlation: are there conflicts between L and R?\n\nYou'll see these figures in the analysis panel both before and after mastering, so the difference is visible, not just audible.",
          },
        },
      ],
    },
  },

  // ── 12 ─────────────────────────────────────────────────────────────────────
  {
    slug: "true-peak-rms-lufs",
    category: "Technik",
    categoryColor: "var(--accent-cyan)",
    publishedAt: "2025-03-05",
    heroIcon: "TrendingUp",
    readingTimeMinutes: 6,
    title: { de: "True Peak, RMS und LUFS: Die drei Lautstärke-Metriken im Überblick", en: "True Peak, RMS, and LUFS: Three Loudness Metrics You Should Actually Understand" },
    metaTitle: { de: "True Peak vs. RMS vs. LUFS – Metering-Grundlagen für Produzenten | Beatzucker", en: "True Peak vs. RMS vs. LUFS – Metering Basics for Producers | Beatzucker" },
    metaDescription: {
      de: "True Peak, RMS und LUFS im Vergleich: Was jede Metrik misst, wo die Unterschiede liegen und welche du beim Mastering wirklich brauchst — kompakt erklärt.",
      en: "True Peak, RMS, and LUFS compared: what each metric actually measures, how they differ, and which ones matter for your mastering workflow — explained simply.",
    },
    keywords: {
      de: ["lufs true peak unterschied", "rms messung erklärt", "metering guide mastering", "true peak dbtp", "lautstärkemessung audio"],
      en: ["lufs vs true peak", "understanding rms metering", "mastering metering guide", "true peak dbtp explained", "audio loudness measurement"],
    },
    teaser: {
      de: "Beim Mastering reicht ein einzelner Lautstärkewert nicht aus. True Peak, RMS und LUFS messen unterschiedliche Dinge — dieser Guide zeigt dir, wofür du welchen brauchst.",
      en: "One loudness number isn't enough for mastering. True Peak, RMS, and LUFS each measure something different — here's a quick guide to knowing which one to trust when.",
    },
    relatedSlugs: ["lufs-erklaert", "mastering-plattformen-lufs", "stereo-breite-mastering"],
    content: {
      intro: {
        de: "Wer beim Mastering nur auf einen Zahlenwert schaut, übersieht meistens etwas Wichtiges. LUFS sagt dir, ob dein Track streaming-konform ist. True Peak verhindert Verzerrung bei der Wandlung. RMS ist ein älteres Werkzeug, das heute kaum noch gebraucht wird, aber gelegentlich noch auftaucht. Sobald du weißt, was jede Metrik wirklich misst, verlierst du beim Mastering nicht mehr den Überblick.",
        en: "If you only look at one number during mastering, you're probably missing something. LUFS tells you whether your track is streaming-ready. True Peak protects you from distortion during conversion. RMS is an older tool that rarely matters today but still shows up here and there. Once you know what each metric is actually measuring, mastering stops feeling like guesswork.",
      },
      sections: [
        {
          h2: { de: "True Peak: der Pegel, den du nicht direkt siehst", en: "True Peak: The Level Hiding Between Your Samples" },
          body: {
            de: "True Peak (TP) erfasst nicht nur die digitalen Sample-Werte, sondern auch den rekonstruierten Pegel zwischen den Samples (Inter-Sample-Peaks). Der Grund: Bei der Digital-Analog-Wandlung wird die Wellenform zwischen den einzelnen Samples interpoliert, und dabei können Spitzen entstehen, die über dem höchsten digitalen Sample-Wert liegen.\n\nKonkret heißt das: Ein Track mit digitalen Peaks bei −0.3 dBFS kann nach der D/A-Wandlung reale Pegelspitzen über 0 dBFS erzeugen — auf manchen Abspielgeräten führt das zu hörbarer Verzerrung.\n\nRichtwerte: Für Streaming-Plattformen wie Spotify, Apple Music oder YouTube gilt max. −1 dBTP, für Club-Systeme eher max. −0.1 dBTP.\n\nIn Beatzucker siehst du den True-Peak-Wert deines Tracks direkt vor und nach dem Mastering.",
            en: "True Peak (TP) doesn't just measure the digital sample values — it captures the reconstructed level between samples too, known as inter-sample peaks. That matters because during digital-to-analog conversion, the waveform gets interpolated between samples, and that interpolation can produce peaks higher than the loudest digital sample you actually recorded.\n\nIn practice: a track peaking at −0.3 dBFS digitally can still hit real peak levels above 0 dBFS after D/A conversion — and on some playback systems, that causes audible distortion.\n\nRule of thumb: streaming platforms like Spotify, Apple Music, and YouTube expect a max of −1 dBTP; club systems are usually fine up to −0.1 dBTP.\n\nBeatzucker displays your track's True Peak value both before and after mastering, so you always know where you stand.",
          },
        },
        {
          h2: { de: "RMS: der Standard von gestern", en: "RMS: Yesterday's Loudness Standard" },
          body: {
            de: "RMS (Root Mean Square) berechnet den quadratischen Mittelwert des Signals und war der übliche Maßstab, bevor LUFS sich durchgesetzt hat. Das Problem: RMS misst reine Signalenergie, nicht wie laut ein Mensch das Signal tatsächlich empfindet — psychoakustische Wahrnehmung spielt bei RMS keine Rolle.\n\nIm modernen Mastering spielt RMS deshalb kaum noch eine Rolle als primäre Referenz. Man begegnet dem Begriff heute vor allem noch in älteren DAW-Handbüchern oder Legacy-Workflows. Für Streaming-Mastering kannst du RMS getrost ignorieren und dich vollständig auf LUFS verlassen.",
            en: "RMS (Root Mean Square) calculates the quadratic mean of a signal and was the go-to loudness reference before LUFS took over. The catch: RMS measures raw signal energy, not how loud a human actually perceives that signal — psychoacoustic weighting plays no role in the calculation.\n\nBecause of that, RMS barely functions as a primary metric in modern mastering anymore. You'll mostly still encounter it in older DAW manuals or legacy workflows. If you're mastering for streaming, you can safely ignore RMS and lean entirely on LUFS instead.",
          },
        },
        {
          h2: { de: "LUFS: der heutige Maßstab", en: "LUFS: Today's Loudness Benchmark" },
          body: {
            de: "LUFS (Loudness Units relative to Full Scale) misst Lautstärke psychoakustisch, nach den Standards ITU-R BS.1770 und EBU R128. Die Messung gewichtet Frequenzen entsprechend dem menschlichen Gehör (K-Weighting) und bildet die durchschnittliche Lautheit über die gesamte Tracklänge ab.\n\nDabei gibt es drei Varianten:\n\nIntegrated LUFS: der Durchschnittswert über den kompletten Track — genau der Wert, den Streaming-Dienste für ihre Lautstärke-Normalisierung heranziehen.\n\nShort-Term LUFS: der Durchschnitt der letzten 3 Sekunden, hilfreich, um Dynamikschwankungen innerhalb eines Tracks zu erkennen.\n\nMomentary LUFS: der Durchschnitt der letzten 0,4 Sekunden, zeigt dir kurzfristige Lautstärkespitzen praktisch in Echtzeit.",
            en: "LUFS (Loudness Units relative to Full Scale) measures loudness the way humans actually perceive it, following the ITU-R BS.1770 and EBU R128 standards. It applies frequency weighting based on human hearing (K-weighting) and represents the average loudness across an entire track.\n\nThere are three variants worth knowing:\n\nIntegrated LUFS: the average across the whole track — this is the number streaming services use for loudness normalization.\n\nShort-Term LUFS: a rolling average over the last 3 seconds, useful for spotting dynamic swings within a track.\n\nMomentary LUFS: a rolling average over the last 0.4 seconds, giving you near real-time visibility into short-term loudness spikes.",
          },
        },
        {
          h2: { de: "Auf den Punkt: Welche Metrik wann?", en: "The Short Version: Which Metric, When?" },
          body: { de: "Ein kompakter Spickzettel für die Praxis:", en: "A quick cheat sheet for everyday use:" },
          list: [
            { de: "True Peak: vor dem Export checken — max. −1 dBTP für Streaming-Releases.", en: "True Peak: check it right before export — max. −1 dBTP for streaming releases." },
            { de: "Integrated LUFS: nach dem Mastering prüfen — Zielwert hängt von der Plattform ab (−14 für Spotify, −16 für Apple).", en: "Integrated LUFS: verify after mastering — the target depends on the platform (−14 for Spotify, −16 for Apple)." },
            { de: "Short-Term LUFS: während des Mixens zur Dynamikkontrolle nutzen.", en: "Short-Term LUFS: keep an eye on it while mixing to track dynamics." },
            { de: "RMS: nur relevant bei Legacy-Systemen oder älteren Broadcast-Vorgaben.", en: "RMS: only relevant for legacy systems or older broadcast specs." },
          ],
        },
      ],
    },
  },

  // ── 13 ─────────────────────────────────────────────────────────────────────
  SAMPLE_RATE_ARTICLE,

  // ── 14 ─────────────────────────────────────────────────────────────────────
  PLATFORM_COMPARISON_ARTICLE,

  // Keep the existing DE/EN article addresses; content now covers Beatzucker.
  MANUAL_MASTERING_ARTICLE,
  REFERENCE_CHARACTER_ARTICLE,
];

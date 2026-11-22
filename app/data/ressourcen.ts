import { MASTERING_LAB_ARTICLE } from "./masteringLabArticle";
import { RELEASE_TOOLS_ARTICLE } from "./releaseToolsArticle";
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
  links?: { label: LocalizedString; href: LocalizedString }[];
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
  RELEASE_TOOLS_ARTICLE,
  MASTERING_LAB_ARTICLE,

  // ── 1 ──────────────────────────────────────────────────────────────────────
  {
    slug: "was-ist-audio-mastering",
    category: "Grundlagen",
    categoryColor: "var(--accent-purple)",
    publishedAt: "2025-01-10",
    updatedAt: "2026-11-22",
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
        {
          h2: { de: "Welcher Einstieg passt zu deinem Track?", en: "Which starting point suits your track?" },
          body: {
            de: "Für deinen ersten Mix führt dich der Express-Assistent von der Analyse und Zielwahl bis zum Hörvergleich und Download. Studio Mode bündelt den automatischen Lauf und die anschließende Feinabstimmung in einer Konsole. Im Mastering Lab kannst du direkt mit einer neutralen Kette beginnen oder vorgeschlagene Auto-Werte vor dem Übernehmen prüfen. Vorhören ist frei zugänglich. Der Lab-Export braucht eine Freischaltung.",
            en: "For a first mix, the Express Assistant walks you through analysis and target selection, then guides you to the listening comparison and download. Studio Mode brings automatic mastering and follow-up adjustments into one console. In Mastering Lab, start from a neutral chain or review suggested auto settings before applying them. Previewing is freely available. Lab export needs account activation.",
          },
          links: [
            { label: { de: "Zum Express-Assistenten", en: "Go to the Express Assistant" }, href: { de: "/#home-express-slot", en: "/en#home-express-slot" } },
            { label: { de: "Studio Mode öffnen", en: "Open Studio Mode" }, href: { de: "/studio-beta", en: "/en/studio-beta" } },
            { label: { de: "Mastering Lab öffnen", en: "Open Mastering Lab" }, href: { de: "/mastering-lab", en: "/en/mastering-lab" } },
          ],
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
    updatedAt: "2026-11-22",
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
            de: "Beim Mixing kannst du einzelne Spuren korrigieren. Beim Mastering arbeitet Beatzucker mit der fertigen Summe. Die automatische Bearbeitung verwendet Messwerte und zeigt zwölf Schritte an. Welche Stufen eingreifen, hängt vom Signal und deinen Einstellungen ab.",
            en: "Mixing lets you fix individual tracks. Mastering in Beatzucker works with the finished mix. Automatic processing uses measurements and displays twelve stages. Which stages apply depends on the signal and your settings.",
          },
        },
        {
          h2: { de: "Beispiel mit einer Kick, die im Refrain untergeht", en: "Example: a kick that disappears in the chorus" },
          body: {
            de: "Prüfe Kick und Bass zuerst als getrennte Spuren. Mit dem Konfliktfinder findest du Stellen zum Gegenhören. Im Sidechain-Tool kannst du die Kick als Trigger verwenden und nur den Bass absenken. Arbeitest du bereits mit der fertigen Stereosumme im Lab, betrifft Bass-Ducking den gemeinsamen Tiefbass. Wenn dadurch die Kick weiter an Gewicht verliert, korrigiere die Einzelspuren im Mix.",
            en: "Check the kick and bass as separate tracks first. Use the conflict finder to identify passages worth auditioning. In the sidechain tool, use the kick as a trigger to duck the bass alone. On a finished stereo mix in the Lab, bass ducking affects their shared low end. If the kick loses more weight, adjust the individual tracks in the mix.",
          },
          links: [
            { label: { de: "Kick/Bass-Konflikte prüfen", en: "Check for Kick/Bass conflicts" }, href: { de: "/tools/kick-bass-conflict", en: "/en/tools/kick-bass-conflict" } },
            { label: { de: "Kick & Bass Sidechain öffnen", en: "Open Kick & Bass Sidechain" }, href: { de: "/tools/kick-bass-sidechain", en: "/en/tools/kick-bass-sidechain" } },
          ],
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
    updatedAt: "2026-11-22",
    heroIcon: "Globe",
    readingTimeMinutes: 5,
    title: { de: "Wie laut soll dein Master sein? LUFS-Ziele für Streaming und Club", en: "How loud should your master be? LUFS targets for streaming and club" },
    metaTitle: { de: "LUFS-Ziele für Spotify, Apple Music, YouTube und Club | Beatzucker", en: "LUFS Targets for Spotify, Apple Music, YouTube and Club | Beatzucker" },
    metaDescription: {
      de: "LUFS-Presets für Streaming und Club einordnen. Höre die geschätzte Wiedergabe in der Streaming-Vorschau und miss die fertige Datei im Release-Check.",
      en: "Understand LUFS presets for streaming and club. Hear estimated playback in Streaming Preview and measure the finished file in Release Check.",
    },
    keywords: {
      de: ["lufs tabelle", "lautheit streaming plattformen", "spotify apple music lufs wert", "richtiger lufs wert mastering"],
      en: ["lufs table", "streaming platform loudness", "spotify apple music lufs value", "correct lufs value for mastering"],
    },
    teaser: {
      de: "Welche Rolle spielen Plattform-Presets, Abhörpegel und True Peak? Vergleiche die Ziele und prüfe deinen fertigen Master.",
      en: "How do platform presets, playback level and true peak fit together? Compare targets and check the finished master.",
    },
    sources: [{ label: { de: "Spotify for Artists zur Lautheitsnormalisierung", en: "Spotify for Artists on loudness normalization" }, href: "https://support.spotify.com/artists/article/loudness-normalization/" }],
    relatedSlugs: ["lufs-erklaert", "song-klingt-leise-spotify", "true-peak-rms-lufs"],
    content: {
      intro: {
        de: "Beim Mastern legst du fest, wie laut und wie dynamisch die exportierte Datei klingt. Die Wiedergabelautheit kann davon abweichen. Spotify beschreibt beispielsweise −14 LUFS für die normale Wiedergabeeinstellung. Bei aktivierter Normalisierung ändert eine reine Pegelabsenkung die Lautstärke, während die Dynamik der Datei gleich bleibt.",
        en: "Mastering determines the loudness and dynamics of your export. Playback loudness can differ. Spotify, for example, documents −14 LUFS for its Normal playback setting. With normalization enabled, a simple gain reduction lowers playback volume while the file’s dynamics stay the same.",
      },
      sections: [
        {
          h2: { de: "Lautheitsziele der Beatzucker-Presets", en: "Beatzucker preset loudness targets" },
          body: { de: "Diese Werte sind Startpunkte der Beatzucker-Presets. Prüfe verbindliche Lieferanforderungen bei deinem Vertrieb oder Auftraggeber. Die tatsächliche Lautheit kann bei knapper Spitzenpegelreserve unter dem gesetzten Ziel bleiben.", en: "These values are starting points for Beatzucker presets. Check mandatory delivery requirements with your distributor or client. Limited peak headroom can keep the result below the selected target." },
          table: {
            headers: [
              { de: "Beatzucker-Preset", en: "Beatzucker preset" },
              { de: "Ziel-LUFS", en: "Target LUFS" },
            ],
            rows: [
              [{ de: "Spotify, YouTube, Tidal, Amazon Music", en: "Spotify, YouTube, Tidal, Amazon Music" }, { de: "−14 LUFS", en: "−14 LUFS" }],
              [{ de: "Apple Music", en: "Apple Music" }, { de: "−16 LUFS", en: "−16 LUFS" }],
              [{ de: "TikTok", en: "TikTok" }, { de: "−13 LUFS", en: "−13 LUFS" }],
              [{ de: "Deezer", en: "Deezer" }, { de: "−15 LUFS", en: "−15 LUFS" }],
              [{ de: "SoundCloud", en: "SoundCloud" }, { de: "−8 LUFS", en: "−8 LUFS" }],
              [{ de: "Club / DJ", en: "Club / DJ" }, { de: "−9 LUFS", en: "−9 LUFS" }],
              [{ de: "TV / Broadcast", en: "TV / Broadcast" }, { de: "−23 LUFS", en: "−23 LUFS" }],
            ],
          },
        },
        {
          h2: { de: "Auf welchen Wert masterst du am besten?", en: "So Which Number Should You Actually Master To?" },
          body: {
            de: "Wähle für Streaming einen Ausgangspunkt und höre die geschätzte Wiedergabe in der Streaming-Vorschau. Prüfe auch Spitzen in einer tatsächlich kodierten AAC- oder MP3-Version. Für einen Club-Track kannst du ein dichteres Ziel ausprobieren. Vergleiche bei gleichem Abhörpegel, ob Kick und Bass noch die gewünschte Wirkung haben. Miss zum Schluss die exportierte Datei im Release-Check.",
            en: "Choose a starting point for streaming and audition estimated playback in Streaming Preview. Also check peaks in an actual AAC or MP3 encode. For a club track, try a louder target and compare at matched levels to see whether the kick and bass still have the intended impact. Finally, measure the export in Release Check.",
          },
          links: [
            { label: { de: "Streaming-Vorschau öffnen", en: "Open Streaming Preview" }, href: { de: "/tools/streaming-preview", en: "/en/tools/streaming-preview" } },
            { label: { de: "Release-Check öffnen", en: "Open Release Check" }, href: { de: "/tools/release-check", en: "/en/tools/release-check" } },
          ],
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
    updatedAt: "2026-11-22",
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
            { de: "✓ Verlustfrei exportieren, möglichst in der Samplerate deiner Session. 24-Bit-WAV oder 32-Bit-Float sind gute Ausgangsformate.", en: "✓ Export losslessly at your session’s sample rate where possible. 24-bit WAV and 32-bit float are useful source formats." },
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
            de: "Für den Mixdown eignet sich WAV mit 24 Bit oder als 32-Bit-Float. Wenn deine Session mit 48 oder 96 kHz läuft, kannst du diese Samplerate für die Arbeitsdatei beibehalten. Konvertiere erst dann, wenn ein konkreter Ausgabezweck eine andere Rate verlangt. Wenn du nur eine MP3 hast, behalte diese als Quelle. Das Umwandeln in WAV stellt die beim Kodieren entfernten Informationen nicht wieder her.",
            en: "A 24-bit or 32-bit float WAV works well for a mixdown. If your session runs at 48 or 96 kHz, keep that rate for the working file. Convert when a specific delivery format requires another rate. If you only have an MP3, keep it as your source. Converting it to WAV cannot restore information lost during encoding.",
          },
        },
        {
          h2: { de: "Vom Mix-Check zur ersten Fassung", en: "From Mix Check to a first master" },
          body: {
            de: "Lade deinen unveränderten Mix zuerst in den Mix-Check und höre markierte Spitzen und schwierige Abschnitte ab. Korrigiere hörbares Clipping oder Mono-Auslöschungen an der Quelle. Danach kannst du im Express-Assistenten ein Ziel wählen oder im Lab vorgeschlagene Einstellungen prüfen. Halte eine unveränderte, verlustfreie Kopie für den späteren Hörvergleich bereit.",
            en: "Load your unchanged mix into Mix Check first and listen to flagged peaks and difficult sections. Correct audible clipping or mono cancellation at the source. Then pick a target in the Express Assistant or review suggested settings in the Lab. Keep an unchanged, lossless copy for the listening comparison.",
          },
          links: [
            { label: { de: "Mix-Check öffnen", en: "Open Mix Check" }, href: { de: "/mix-check", en: "/en/mix-check" } },
            { label: { de: "Zum Express-Assistenten", en: "Go to the Express Assistant" }, href: { de: "/#home-express-slot", en: "/en#home-express-slot" } },
            { label: { de: "Mastering Lab öffnen", en: "Open Mastering Lab" }, href: { de: "/mastering-lab", en: "/en/mastering-lab" } },
          ],
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
    updatedAt: "2026-11-22",
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
            de: "PCM-WAV speichert Audio unkomprimiert. Bewahre für den Mixdown möglichst die Samplerate deiner Session und wähle zum Weiterbearbeiten 24-Bit-WAV oder 32-Bit-Float. Als Beatzucker-Master steht zusätzlich 16-Bit-WAV zur Auswahl.",
            en: "PCM WAV stores uncompressed audio. Keep your session’s sample rate where possible and choose 24-bit WAV or 32-bit float for further work. For Beatzucker masters you can also choose 16-bit WAV.",
          },
        },
        {
          h2: { de: "Wann MP3 völlig in Ordnung ist", en: "When MP3 Is Perfectly Fine" },
          body: {
            de: "Bei 320 kbps kann so gut wie niemand MP3 noch von einem verlustfreien Format unterscheiden. Dafür eignet es sich hervorragend:\n\n• Für Streaming-Uploads (die meisten Distributoren nehmen MP3 320 problemlos an)\n• Für Posts auf TikTok oder Instagram\n• Für Preview-Dateien, die du zum Feedback verschickst\n\nWas du aber vermeiden solltest: MP3 als Eingangsformat fürs Mastering. Die verlustbehaftete Kompression erzeugt beim Neu-Kodieren Qualitätseinbußen, die sich im fertigen Master deutlich bemerkbar machen.",
            en: "At 320 kbps, virtually nobody can tell MP3 apart from a lossless file by ear. That makes it a great fit for:\n\n• Streaming uploads (most distributors accept MP3 320 without issue)\n• TikTok or Instagram posts\n• Preview files you're sending out for feedback\n\nWhat you want to avoid, though, is feeding MP3 into mastering as your input. The lossy compression introduces quality loss when it gets re-encoded, and that loss shows up clearly in the finished master.",
          },
        },
        {
          h2: { de: "Dateiformat wählen und die fertige Ausgabe hören", en: "Choose a format and hear the finished file" },
          body: {
            de: "Für Archiv und Weiterbearbeitung ist WAV oder FLAC sinnvoll. Die Konsole und Studio Mode bieten zur schnellen Abhöre eine MP3-Vorschau, wenn sie vorliegt. Schalte auf die Exportdatei um, um etwa den tatsächlich gerenderten FLAC-Master zu beurteilen. Mit „Master prüfen“ kannst du einen gerade dort erstellten Export im Release-Check messen. Für eine eigene WAV-, FLAC-, MP3- oder M4A-Datei öffnest du den Release-Check direkt.",
            en: "Use WAV or FLAC for archiving and further work. The mastering console and Studio Mode offer a quick MP3 preview when available. Switch to the export file to judge the actual render, such as your FLAC master. Use “Check master” from the result to measure a file you just created there. For your own WAV, FLAC, MP3 or M4A file, open Release Check directly.",
          },
          links: [
            { label: { de: "Release-Check öffnen", en: "Open Release Check" }, href: { de: "/tools/release-check", en: "/en/tools/release-check" } },
            { label: { de: "Samplerate und Bittiefe nachlesen", en: "Read about sample rate and bit depth" }, href: { de: "/ressourcen/sample-rate-bit-depth", en: "/en/knowledge/sample-rate-bit-depth" } },
          ],
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
    updatedAt: "2026-11-22",
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
            de: "Exportiere den Mix für die Weiterbearbeitung möglichst verlustfrei und in der Samplerate deiner Session. WAV mit 24 Bit oder 32-Bit-Float ist ein guter Ausgangspunkt. Wenn nur eine MP3 vorliegt, bleiben beim Umwandeln in WAV die vorhandenen Kodierartefakte erhalten.",
            en: "Export a finished mix for further work in a lossless format at your session’s sample rate where possible. A 24-bit or 32-bit float WAV is a good starting point. If the only copy is an MP3, converting it to WAV keeps the existing encoding artifacts.",
          },
        },
        {
          h2: { de: "Den Fehler vor der Summe eingrenzen", en: "Diagnose the problem before the master bus" },
          body: {
            de: "Höre eine dünn klingende Mischung zuerst im Stereo-Labor in Mono. Bei einer scharfen Gesangsspur kannst du im Vocal-Chain-Tool De-Esser und Kompressor einzeln beurteilen, bevor du die Spur im Mix ersetzt. Hast du nur einen fertigen Song, zeigt dir die kostenlose Vocal-Remover-Demo, wie getrennte Stimmen und Instrumente im Mixer klingen können.",
            en: "If a mix sounds thin, check it in mono in Stereo & Phase Lab first. For harsh vocals, use Vocal Chain to judge the de-esser and compressor separately before replacing the track in your mix. If all you have is a finished song, the public Vocal Remover demo lets you hear separated vocals and instruments in the mixer.",
          },
          links: [
            { label: { de: "Stereo- und Phasenlabor öffnen", en: "Open Stereo & Phase Lab" }, href: { de: "/tools/stereo-phase", en: "/en/tools/stereo-phase" } },
            { label: { de: "Vocal Chain öffnen", en: "Open Vocal Chain" }, href: { de: "/tools/vocal-chain", en: "/en/tools/vocal-chain" } },
            { label: { de: "Vocal-Remover-Demo öffnen", en: "Open Vocal Remover demo" }, href: { de: "/tools/vocal-remover#demo", en: "/en/tools/vocal-remover#demo" } },
          ],
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
    updatedAt: "2026-11-22",
    heroIcon: "Trophy",
    readingTimeMinutes: 5,
    title: { de: "Der Song ist stark — jetzt fehlt nur noch das richtige Mastering", en: "The Song Is Strong — All That's Left Is the Right Mastering" },
    metaTitle: { de: "Starker Song, fehlendes Mastering? So holst du das Maximum raus | Beatzucker", en: "Great Song, No Mastering Yet? Here's How to Get the Most Out of It | Beatzucker" },
    metaDescription: {
      de: "Prüfe deinen Mix im Hörvergleich, vergleiche zwei Master bei gleicher Lautheit und bereite die ausgewählte Datei für deinen Release vor.",
      en: "Check your mix by ear, compare two masters at matched loudness, and prepare the chosen file for release.",
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
            de: "Beim Mastering bearbeitest du den fertigen Mix als Ganzes. Leichte EQ-Korrekturen können die Klangbalance verändern. Kompression und Limiting beeinflussen Dynamik, Spitzenpegel und erreichbare Lautheit. Prüfe jede Änderung bei vergleichbarem Abhörpegel. Ein ausgewogener Mix braucht oft nur kleine Eingriffe.",
            en: "Mastering works on the finished mix as a whole. Small EQ changes can shape tonal balance. Compression and limiting affect dynamics, peaks and achievable loudness. Check each change at comparable listening levels. A balanced mix often needs only small adjustments.",
          },
        },
        {
          h2: { de: "Woran erkennst du einen fertigen Master?", en: "How do you know the master is ready?" },
          body: {
            de: "Höre deinen Track auf Kopfhörern, Lautsprechern und in Mono. Bleiben Stimme und Kick verständlich? Sind leise Passagen noch so leise wie beabsichtigt? Prüfe anschließend Lautheit und True Peak gegen die Anforderungen deines Vertriebs.",
            en: "Listen on headphones, speakers and in mono. Are the vocals and kick still clear? Are quiet sections still as quiet as intended? Then check loudness and true peak against your distributor’s requirements.",
          },
        },
        {
          h2: { de: "Den eigenen Mix online mastern", en: "Master your own mix online" },
          body: {
            de: "Mit Beatzucker kannst du einen automatischen Master innerhalb deines täglichen Kontingents erstellen und vollständig herunterladen. Höre im Vergleich, ob er deinem Mix hilft. In der Feinabstimmung kannst du gezielt nachregeln. Wenn eine einzelne Spur Probleme verursacht, kannst du sie im Mix korrigieren.",
            en: "Beatzucker lets you create and download a full automatic master within your daily allowance. Compare it with the mix to hear whether it helps. Use fine-tuning to make targeted changes. If an individual track is causing trouble, you can fix it in the mix.",
          },
        },
        {
          h2: { de: "Entscheide am Song, welche Version bleibt", en: "Let the song decide which version to keep" },
          body: {
            de: "Höre zuerst einen Refrain im A/B-Vergleich mit Lautheitsabgleich. Wenn du zwei fertige Master hast, verwende denselben Ausschnitt im Blindtest und entscheide erst danach, welche Datei du veröffentlichst. Prüfe den gewählten Export im Release-Check. Ein kurzes Hochkantvideo mit Wellenform und A/B-Wechsel kannst du anschließend im Audio-Visualizer erstellen.",
            en: "Start by comparing a chorus with loudness matching enabled. If you have two finished masters, use the same section in the blind test before deciding which file to release. Measure the chosen export in Release Check. Then use the Audio Visualizer to make a short vertical clip with a waveform and an A/B switch.",
          },
          links: [
            { label: { de: "Mastering-Blindtest öffnen", en: "Open Mastering Blind Test" }, href: { de: "/tools/mastering-blindtest", en: "/en/tools/mastering-blindtest" } },
            { label: { de: "Praxisguide zur Release-Prüfung", en: "Practical release guide" }, href: { de: "/ressourcen/master-vergleichen-und-veroeffentlichen", en: "/en/knowledge/master-vergleichen-und-veroeffentlichen" } },
            { label: { de: "Audio-Visualizer öffnen", en: "Open Audio Visualizer" }, href: { de: "/tools/audio-visualizer", en: "/en/tools/audio-visualizer" } },
          ],
        },
      ],
      conclusion: {
        de: "Wähle die Fassung, in der die musikalische Idee am besten zur Geltung kommt. Sichere anschließend die geprüfte Datei für deinen Release.",
        en: "Choose the version that best serves the music, then keep the verified file for your release.",
      },
    },
  },

  // ── 11 ─────────────────────────────────────────────────────────────────────
  {
    slug: "stereo-breite-mastering",
    category: "Technik",
    categoryColor: "var(--accent-cyan)",
    publishedAt: "2025-03-01",
    updatedAt: "2026-11-22",
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
            de: "In der Analyse kannst du Stereobreite und Mono-Kompatibilität prüfen. Bei der automatischen Bearbeitung hängt der Stereo-Eingriff von Quelle und Einstellungen ab. Ein breiterer Refrain kann passen, wenn Stimme, Kick und Bass in der Mitte stabil bleiben. Prüfe das in Mono und bei vergleichbarem Pegel.",
            en: "Use the analysis to inspect stereo width and mono compatibility. Automatic stereo processing depends on the source and settings. A wider chorus can work if vocals, kick and bass remain stable in the center. Check in mono and at comparable levels.",
          },
        },
        {
          h2: { de: "Breite im Lab beurteilen", en: "Evaluate stereo width in Mastering Lab" },
          body: {
            de: "Wähle einen dichten Loop und speichere eine dezente Änderung in B. Höre sie gegen A bei angeglichener Lautheit und kontrolliere anschließend im Stereo-Labor die Mono-Summe. Wenn Kick oder Stimme in Mono deutlich schwächer werden, reduziere die Bearbeitung oder korrigiere den Mix. Einen Mono-Track gibt das Lab standardmäßig wieder als Mono aus. Wähle Stereo bewusst, wenn du die Stereobearbeitung auch ausliefern willst.",
            en: "Choose a dense section and save a small adjustment to B. Compare it with A at matched loudness, then check the mono sum in Stereo & Phase Lab. If kick or vocals become noticeably weaker in mono, reduce the effect or adjust the mix. Mastering Lab exports a mono track as mono by default. Choose stereo when you want to deliver the stereo processing.",
          },
          links: [
            { label: { de: "Mastering Lab öffnen", en: "Open Mastering Lab" }, href: { de: "/mastering-lab", en: "/en/mastering-lab" } },
            { label: { de: "Stereo- und Phasenlabor öffnen", en: "Open Stereo & Phase Lab" }, href: { de: "/tools/stereo-phase", en: "/en/tools/stereo-phase" } },
          ],
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
    updatedAt: "2026-11-22",
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
        {
          h2: { de: "Pegel der Exportdatei prüfen", en: "Measure the exported file" },
          body: {
            de: "Miss die fertige Datei im Release-Check. Wenn dein WAV unter der Spitzengrenze bleibt, eine AAC-Version sie aber überschreitet, senke den maximalen Ausgangspegel und beurteile die neu kodierte Ausgabe erneut. Die Vorschau im Lab zeigt dir, wo noch Pegelreserve liegt. Nach dem Export erklärt das Lab, ob etwa das Lautheitsziel, die Spitzengrenze oder der Codec die Pegelkorrektur bestimmt hat.",
            en: "Measure the finished file in Release Check. If WAV stays within your peak ceiling but AAC exceeds it, lower the output ceiling and measure the newly encoded version. The Lab preview helps you see available headroom. After export, the Lab shows whether the loudness target, the peak ceiling or the codec determined the gain correction.",
          },
          links: [
            { label: { de: "Release-Check öffnen", en: "Open Release Check" }, href: { de: "/tools/release-check", en: "/en/tools/release-check" } },
            { label: { de: "Mastering Lab öffnen", en: "Open Mastering Lab" }, href: { de: "/mastering-lab", en: "/en/mastering-lab" } },
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

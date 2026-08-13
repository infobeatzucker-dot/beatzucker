"use client";

import { useState } from "react";
import type { RessourceArticle, LocalizedSection } from "@/app/data/ressourcen";

type Lang = "de" | "en";

interface Props {
  article: RessourceArticle;
}

function renderBody(text: string) {
  return text.split("\n\n").map((para, i) => (
    <p key={i} style={{ color: "var(--text-secondary)", lineHeight: 1.75, margin: "0 0 1.2rem", fontSize: "0.95rem" }}>
      {para}
    </p>
  ));
}

function Section({ sec, lang }: { sec: LocalizedSection; lang: Lang }) {
  return (
    <div style={{ marginBottom: "2rem" }}>
      <h2
        style={{
          color: "var(--text-primary)",
          fontSize: "1.2rem",
          fontWeight: 700,
          margin: "0 0 1rem",
          paddingBottom: "0.5rem",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {sec.h2[lang]}
      </h2>

      {renderBody(sec.body[lang])}

      {sec.list && (
        <ul style={{ padding: "0 0 0 1.25rem", margin: "0 0 1.2rem" }}>
          {sec.list.map((item, i) => (
            <li key={i} style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.9rem", marginBottom: "0.5rem" }}>
              {item[lang]}
            </li>
          ))}
        </ul>
      )}

      {sec.table && (
        <div style={{ overflowX: "auto", margin: "0 0 1.2rem" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.85rem",
            }}
          >
            <thead>
              <tr>
                {sec.table.headers.map((h, i) => (
                  <th
                    key={i}
                    style={{
                      textAlign: "left",
                      padding: "0.6rem 0.8rem",
                      color: "var(--text-muted)",
                      fontSize: "0.7rem",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h[lang]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sec.table.rows.map((row, ri) => (
                <tr key={ri} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      style={{
                        padding: "0.6rem 0.8rem",
                        color: ci === 0 ? "var(--text-primary)" : "var(--text-secondary)",
                        fontWeight: ci === 0 ? 600 : 400,
                      }}
                    >
                      {cell[lang]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sec.h3Items?.map((item, i) => (
        <div key={i} style={{ marginTop: "1.5rem" }}>
          <h3 style={{ color: "var(--text-primary)", fontSize: "1rem", fontWeight: 600, margin: "0 0 0.75rem" }}>
            {item.h3[lang]}
          </h3>
          {renderBody(item.body[lang])}
        </div>
      ))}
    </div>
  );
}

export default function ArticleBody({ article }: Props) {
  const [lang, setLang] = useState<Lang>("de");

  return (
    <div>
      {/* Language Toggle */}
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "2rem" }}>
        {(["de", "en"] as Lang[]).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            style={{
              padding: "0.3rem 0.9rem",
              borderRadius: "6px",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              border: "1px solid",
              transition: "all 0.15s",
              background: lang === l ? "rgba(124,111,255,0.15)" : "transparent",
              borderColor: lang === l ? "rgba(124,111,255,0.4)" : "rgba(255,255,255,0.1)",
              color: lang === l ? "var(--accent-purple)" : "var(--text-muted)",
            }}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Intro */}
      <div style={{ marginBottom: "2rem" }}>
        {renderBody(article.content.intro[lang])}
      </div>

      {/* Sections */}
      {article.content.sections.map((sec, i) => (
        <Section key={i} sec={sec} lang={lang} />
      ))}

      {/* Conclusion */}
      {article.content.conclusion && (
        <div
          className="glass-panel"
          style={{
            padding: "1.25rem 1.5rem",
            borderRadius: "12px",
            borderLeft: "3px solid var(--accent-purple)",
            margin: "2rem 0",
          }}
        >
          <p style={{ color: "var(--text-secondary)", margin: 0, lineHeight: 1.7, fontSize: "0.92rem", fontStyle: "italic" }}>
            {article.content.conclusion[lang]}
          </p>
        </div>
      )}
    </div>
  );
}

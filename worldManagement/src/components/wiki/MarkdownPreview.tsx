import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { colors, fonts, radii } from "../theme/theme";
import { useLocalization } from "../../context/LocalizationContext";

interface MarkdownPreviewProps {
  content: string;
  onNavigateToTitle?: (title: string) => void;
}

const wikiLinkToMarkdown = (content: string) =>
  content
    ? content.replace(/\[\[(.*?)\]\]/g, (_, title) => {
        const clean = title.trim();
        return `[${clean}](#wikilink-${encodeURIComponent(clean)})`;
      })
    : "";

// Render Markdown in sola lettura: converte i wikilink [[Titolo]] in link
// interni navigabili e gestisce le immagini mancanti. Nessuna logica di
// stato/IPC: riceve il contenuto gia risolto dal chiamante.
export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content, onNavigateToTitle }) => {
  const { t } = useLocalization();

  return (
    <div
      className="lore-content"
      style={{
        backgroundColor: colors.bgManuscript,
        padding: "1.75rem 2rem",
        borderRadius: radii.lg,
        border: `1px solid ${colors.borderSubtle}`,
        borderLeft: `3px solid ${colors.borderSubtle}`,
        lineHeight: "1.75",
        fontSize: "1.02rem",
        color: colors.textPrimary,
      }}
    >
      <style>{`
        .lore-content h1, .lore-content h2, .lore-content h3 { font-family: ${fonts.display}; color: ${colors.textPrimary}; font-weight: 600; letter-spacing: 0.01em; }
        .lore-content h1 { font-size: 1.75rem; margin: 0 0 0.75rem; border-bottom: 1px solid ${colors.borderSubtle}; padding-bottom: 0.45rem; }
        .lore-content h2 { font-size: 1.35rem; margin: 1.6rem 0 0.6rem; color: ${colors.gold}; }
        .lore-content h3 { font-size: 1.1rem; margin: 1.3rem 0 0.5rem; }
        .lore-content p { margin: 0 0 1rem; }
        .lore-content a { color: ${colors.gold}; text-decoration: underline; text-decoration-color: ${colors.gold}66; text-underline-offset: 2px; }
        .lore-content blockquote { margin: 1.1rem 0; padding: 0.2rem 0 0.2rem 1.1rem; border-left: 3px solid ${colors.gold}; color: ${colors.textSecondary}; font-style: italic; }
        .lore-content code { font-family: ${fonts.mono}; background: ${colors.bgPanelRaised}; padding: 0.1em 0.4em; border-radius: 4px; font-size: 0.9em; }
        .lore-content pre { background: ${colors.bgPanelRaised}; padding: 1rem; border-radius: ${radii.md}; overflow-x: auto; border: 1px solid ${colors.borderSubtle}; }
        .lore-content pre code { background: none; padding: 0; }
        .lore-content hr { border: none; border-top: 1px dashed ${colors.border}; margin: 2rem 0; }
        .lore-content table { border-collapse: collapse; width: 100%; margin: 1.1rem 0; }
        .lore-content th, .lore-content td { border: 1px solid ${colors.borderSubtle}; padding: 0.5rem 0.75rem; text-align: left; }
        .lore-content th { background: ${colors.bgPanelRaised}; font-family: ${fonts.display}; }
        .lore-content ul, .lore-content ol { padding-left: 1.4rem; margin: 0 0 1rem; }
        .lore-content li { margin-bottom: 0.3rem; }
      `}</style>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={(url) =>
          url.startsWith("asset:") || url.startsWith("https://asset.localhost")
            ? url
            : /^javascript:/i.test(url)
              ? ""
              : url
        }
        components={{
          img: ({ src, alt, ...props }) =>
            !src ? (
              <span style={{ color: colors.crimsonBright, fontStyle: "italic" }}>
                [{t("common.missingImage")}: {alt || "sconosciuta"}]
              </span>
            ) : (
              <img
                {...props}
                src={src}
                alt={alt || "Immagine lore"}
                style={{
                  maxWidth: "100%",
                  maxHeight: "500px",
                  borderRadius: radii.lg,
                  margin: "1rem 0",
                  border: `1px solid ${colors.borderSubtle}`,
                  display: "block",
                }}
              />
            ),
          a: ({ href, children }) => {
            if (href?.startsWith("#wikilink-")) {
              const targetTitle = decodeURIComponent(href.replace("#wikilink-", ""));
              const go = () => onNavigateToTitle?.(targetTitle);
              return (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    go();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      go();
                    }
                  }}
                  style={{
                    color: colors.gold,
                    textDecoration: "underline",
                    textDecorationColor: `${colors.gold}aa`,
                    textUnderlineOffset: "3px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {children}
                </span>
              );
            }
            return (
              <a href={href} target="_blank" rel="noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {wikiLinkToMarkdown(content)}
      </ReactMarkdown>
    </div>
  );
};

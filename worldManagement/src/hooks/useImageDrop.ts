import { useEffect, useRef, useState } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { convertFileSrc } from "@tauri-apps/api/core";
import { invokeSafe } from "../lib/ipc";

interface UseImageDropParams {
  enabled: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  content: string;
  onInsert: (newContent: string) => void;
}

// Calcola l'indice di carattere nel testo corrispondente a un punto dello
// schermo, per inserire l'immagine trascinata esattamente dove e stata
// rilasciata invece che sempre in fondo al testo.
function getCaretIndexFromPoint(textarea: HTMLTextAreaElement, clientX: number, clientY: number): number {
  const rect = textarea.getBoundingClientRect();
  const style = window.getComputedStyle(textarea);

  const paddingTop = parseFloat(style.paddingTop) || 0;
  const paddingLeft = parseFloat(style.paddingLeft) || 0;
  const lineHeight = parseFloat(style.lineHeight) || 20;

  const relX = clientX - rect.left - paddingLeft;
  const relY = clientY - rect.top - paddingTop + textarea.scrollTop;

  const lines = textarea.value.split("\n");
  const targetLineIndex = Math.max(0, Math.min(lines.length - 1, Math.floor(relY / lineHeight)));

  const font = `${style.fontSize} ${style.fontFamily}`;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  let charWidth = 8.5; // fallback
  if (context) {
    context.font = font;
    charWidth = context.measureText("M").width || charWidth;
  }

  const targetCol = Math.max(0, Math.round(relX / charWidth));

  let index = 0;
  for (let i = 0; i < targetLineIndex; i++) {
    index += lines[i].length + 1; // +1 per il carattere '\n'
  }
  index += Math.min(lines[targetLineIndex].length, targetCol);

  return Math.max(0, Math.min(textarea.value.length, index));
}

// Gestisce il drag & drop di immagini su una textarea Markdown: rileva se
// il rilascio avviene dentro l'area di testo, salva il file via IPC
// (save_image) e inserisce il markdown dell'immagine nel punto esatto del
// drop. Isola la logica IPC/DOM dal componente presentational (MarkdownEditor).
export function useImageDrop({ enabled, textareaRef, content, onInsert }: UseImageDropParams) {
  const [isDragging, setIsDragging] = useState(false);

  // Ref per leggere sempre i valori piu recenti dentro il listener Tauri
  // (registrato una sola volta al mount) senza doverlo ri-sottoscrivere
  // ad ogni cambio di contenuto/stato editing.
  const contentRef = useRef(content);
  const enabledRef = useRef(enabled);
  useEffect(() => {
    contentRef.current = content;
    enabledRef.current = enabled;
  }, [content, enabled]);

  const isPointInsideTextarea = (x: number, y: number) => {
    const el = textareaRef.current;
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    return x / scale >= rect.left && x / scale <= rect.right && y / scale >= rect.top && y / scale <= rect.bottom;
  };

  const importImageFile = async (filePath: string, dropX?: number, dropY?: number) => {
    const savedPath = await invokeSafe<string>("save_image", { filePath });
    if (!savedPath) {
      console.error("Errore salvataggio immagine:", filePath);
      return;
    }

    const assetUrl = convertFileSrc(savedPath);
    if (!assetUrl) {
      console.error("convertFileSrc ha restituito una stringa vuota per:", savedPath);
      return;
    }

    const fileName = filePath.split(/[\\/]/).pop() || "immagine";
    const imageMarkdown = `\n![${fileName}](${assetUrl})\n`;
    const currentContent = contentRef.current || "";

    const el = textareaRef.current;
    let insertAt = currentContent.length; // fallback: in fondo

    if (el && dropX !== undefined && dropY !== undefined) {
      const scale = window.devicePixelRatio || 1;
      insertAt = getCaretIndexFromPoint(el, dropX / scale, dropY / scale);
    }

    const newContent = currentContent.slice(0, insertAt) + imageMarkdown + currentContent.slice(insertAt);
    onInsert(newContent);
  };

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    getCurrentWebview()
      .onDragDropEvent((event) => {
        const { payload } = event;

        if (payload.type === "over") {
          setIsDragging(enabledRef.current && isPointInsideTextarea(payload.position.x, payload.position.y));
          return;
        }

        if (payload.type === "drop") {
          setIsDragging(false);
          if (enabledRef.current && isPointInsideTextarea(payload.position.x, payload.position.y)) {
            const [firstPath] = payload.paths ?? [];
            if (firstPath) importImageFile(firstPath, payload.position.x, payload.position.y);
          }
          return;
        }

        setIsDragging(false);
      })
      .then((stop) => (cancelled ? stop() : (unlisten = stop)));

    return () => {
      cancelled = true;
      unlisten?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isDragging };
}
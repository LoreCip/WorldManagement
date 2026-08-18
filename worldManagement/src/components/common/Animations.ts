let injected = false;

// Inietta una volta sola le keyframe condivise per le animazioni base
// (fade/scale/slide), evitando di duplicarle in ogni componente overlay.
export function ensureCommonAnimations(): void {
  if (injected || typeof document === "undefined") return;
  injected = true;

  const style = document.createElement("style");
  style.textContent = `
    @keyframes common-fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes common-scale-in { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
    @keyframes common-slide-in-right { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes common-slide-in-left { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
  `;
  document.head.appendChild(style);
}

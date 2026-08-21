import { colors, fonts } from "../components/theme/theme";

// Cambiare mondo attivo sostituisce la connessione DB e le cartelle sul
// backend: ricaricare la pagina e' il modo piu semplice e robusto per
// rimettere in sincrono tutti gli hook di dominio (useWiki, useMaps,
// useCharacters, ...), dato che non esiste uno store globale da invalidare.
// Per evitare il lampo bianco/lo scatto brusco di un reload "nudo", copriamo
// prima lo schermo con un overlay a tema (fuori da React, cosi' resta visibile
// per tutta la durata del reload) e solo dopo un breve fade lanciamo il reload.
export function beginWorldTransition(message: string) {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 999999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.1rem;
    background: ${colors.bgVoid};
    opacity: 0;
    transition: opacity 0.25s ease;
  `;

  const spinner = document.createElement("div");
  spinner.style.cssText = `
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 3px solid ${colors.goldWash};
    border-top-color: ${colors.gold};
    animation: world-transition-spin 0.85s linear infinite;
  `;

  const label = document.createElement("div");
  label.textContent = message;
  label.style.cssText = `
    font-family: ${fonts.display};
    font-style: italic;
    font-size: 1.05rem;
    color: ${colors.textFaint};
    letter-spacing: 0.02em;
  `;

  const keyframes = document.createElement("style");
  keyframes.textContent = `@keyframes world-transition-spin { to { transform: rotate(360deg); } }`;

  overlay.append(keyframes, spinner, label);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.style.opacity = "1";
  });

  window.setTimeout(() => window.location.reload(), 260);
}

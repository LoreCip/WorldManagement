// Dimensioni condivise fra TimelineCanvas (che calcola la posizione clampata
// del balloon rispetto ai bordi della finestra) e TimelineEventBalloon (che
// le usa per il proprio box). Erano due costanti duplicate con un commento
// "deve combaciare" — un cambiamento in un file senza l'altro rompeva
// silenziosamente il posizionamento vicino ai bordi della finestra.
export const BALLOON_WIDTH = 340;
export const BALLOON_MAX_HEIGHT = 480;
export const BALLOON_GAP = 14; // distanza fra il marker e il balloon
export const SCREEN_MARGIN = 16; // margine minimo dai bordi della finestra

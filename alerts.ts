export type AlertPrefs = {
  goal: boolean;
  penalty: boolean;
  card: boolean;
  corner: boolean;
  foul: boolean;
  offside: boolean;
  kickoff: boolean;
  end: boolean;
  lineup: boolean;
  sound: boolean;
};

export const DEFAULT_ALERT_PREFS: AlertPrefs = {
  goal: true,
  penalty: true,
  card: false,
  corner: false,
  foul: false,
  offside: false,
  kickoff: true,
  end: true,
  lineup: true,
  sound: true,
};

export const ALERT_OPTIONS: { key: keyof AlertPrefs; label: string; icon: string; hint: string }[] = [
  { key: "goal", label: "Gols", icon: "⚽", hint: "Sempre que seu time marcar ou sofrer gol" },
  { key: "penalty", label: "Pênaltis", icon: "🥅", hint: "Pênalti marcado, convertido ou perdido" },
  { key: "card", label: "Cartões", icon: "🟨", hint: "Amarelos e vermelhos" },
  { key: "corner", label: "Escanteios", icon: "🚩", hint: "Cada escanteio a favor do time" },
  { key: "foul", label: "Faltas", icon: "✋", hint: "Cada falta cometida (gera muitos alertas)" },
  { key: "offside", label: "Impedimentos", icon: "🚫", hint: "Cada impedimento marcado" },
  { key: "kickoff", label: "Início do jogo", icon: "▶️", hint: "Quando a bola rolar" },
  { key: "end", label: "Fim de jogo", icon: "⏱️", hint: "Resultado final" },
  { key: "lineup", label: "Escalação", icon: "📋", hint: "Escalação oficial divulgada" },
];

/** Mapeia o tipo do evento para a preferência correspondente. */
export function prefKeyFor(type: string): keyof AlertPrefs | null {
  switch (type) {
    case "goal":
      return "goal";
    case "penalty":
      return "penalty";
    case "yellow":
    case "red":
    case "card":
      return "card";
    case "corner":
      return "corner";
    case "foul":
      return "foul";
    case "offside":
      return "offside";
    case "kickoff":
      return "kickoff";
    case "end":
      return "end";
    case "lineup":
      return "lineup";
    default:
      return null; // subscription, favorite, etc. sempre passam
  }
}

export function normalizePrefs(raw: unknown): AlertPrefs {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out = { ...DEFAULT_ALERT_PREFS };
  for (const key of Object.keys(out) as (keyof AlertPrefs)[]) {
    if (typeof input[key] === "boolean") out[key] = input[key] as boolean;
  }
  return out;
}

const ACCOUNT_TYPES = new Set(["subscription", "favorite", "system"]);

export function wantsAlert(prefs: unknown, type: string) {
  const key = prefKeyFor(type);
  if (!key) return ACCOUNT_TYPES.has(type); // substituições, VAR etc. nunca notificam
  return normalizePrefs(prefs)[key];
}

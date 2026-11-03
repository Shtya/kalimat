// Data contracts between the server (which builds boards) and the game players.
// Adding a game mode = add a variant here, a builder in ./boards.ts, a scoring
// profile in lib/scoring.ts and a player component in components/game/modes.

export const GAME_TYPES = ["WORD_BUILD", "WORD_SEARCH", "MATCH", "MISSING_LETTER"] as const;
export type GameType = (typeof GAME_TYPES)[number];
export type DifficultyLevel = "EASY" | "MEDIUM" | "HARD";

export type GameWord = {
  id: string;
  text: string;
  letters: string[];
  hint: string;
  fact: string;
  kind: "MEANING" | "STORY" | "VALUE" | "THEME" | "FACT";
  /** Where the answer comes from, shown with the fact ("سورة الفيل · آية 3"). */
  source: string | null;
  quranText: string | null;
};

export type GameMeta = {
  id: string;
  title: string;
  type: GameType;
  difficulty: DifficultyLevel;
  /** Short line above the question, e.g. "المرحلة 1 · سورة الفاتحة". */
  context: string;
  /** Where the back button and the result screen lead (the stage map). */
  backHref: string;
  /** The last level of its station (for this student's track): finishing it completes the station. */
  endsStation?: boolean;
};

export type Cell = [row: number, col: number];
export type Placement = { wordIndex: number; cells: Cell[] };
export type Blank = { index: number; options: string[] };

export type GameBoard =
  | { type: "WORD_BUILD"; wheels: string[][] }
  | { type: "WORD_SEARCH"; grid: string[][]; placements: Placement[] }
  | { type: "MATCH"; wordOrder: number[]; hintOrder: number[] }
  | { type: "MISSING_LETTER"; blanks: Blank[][] };

export type GameData = { meta: GameMeta; words: GameWord[]; board: GameBoard };

/** Narrows the board to the variant a mode expects. */
export function boardOf<T extends GameType>(data: GameData, type: T): Extract<GameBoard, { type: T }> {
  if (data.board.type !== type) throw new Error(`Expected a ${type} board, got ${data.board.type}`);
  return data.board as Extract<GameBoard, { type: T }>;
}

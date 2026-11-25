import { useState } from "react";
import { useStore } from "../store.ts";
import { DEFAULT_SOURCE, NEUTRAL, type VoiceSource } from "../../wasm/engine.ts";
import type { HumanArtic } from "../../wasm/types.ts";
import { Menu } from "./Controls.tsx";

/** The source and throat settings a tone sets; everything else (pitch, tongue, lips, jaw) stays. */
type ToneSource = Pick<VoiceSource, "pressure" | "breathiness" | "tension" | "fry" | "roughness" | "brightness" | "vibratoDepth" | "vibratoRate" | "glide">;
type ToneArtic = Pick<HumanArtic, "velum" | "larynx" | "epilarynx" | "ventricular">;

export interface Tone {
  name: string;
  source: ToneSource;
  artic: ToneArtic;
}

const base = (): { source: ToneSource; artic: ToneArtic } => ({
  source: {
    pressure: DEFAULT_SOURCE.pressure,
    breathiness: DEFAULT_SOURCE.breathiness,
    tension: DEFAULT_SOURCE.tension,
    fry: DEFAULT_SOURCE.fry,
    roughness: DEFAULT_SOURCE.roughness,
    brightness: DEFAULT_SOURCE.brightness,
    vibratoDepth: DEFAULT_SOURCE.vibratoDepth,
    vibratoRate: DEFAULT_SOURCE.vibratoRate,
    glide: DEFAULT_SOURCE.glide,
  },
  artic: { velum: NEUTRAL.velum, larynx: NEUTRAL.larynx, epilarynx: NEUTRAL.epilarynx, ventricular: NEUTRAL.ventricular },
});

const tone = (name: string, source: Partial<ToneSource>, artic: Partial<ToneArtic>): Tone => {
  const b = base();
  return { name, source: { ...b.source, ...source }, artic: { ...b.artic, ...artic } };
};

/**
 * Starting points for pop and R&B tones, by ear, not measured against singers: each one a mix of
 * how hard the folds press, how much air leaks, the larynx's height, the twang tube, the soft palate.
 */
export const TONES: Tone[] = [
  tone("Neutral", {}, {}),
  // airy and close: loose folds leaking air, a little twang to keep the words clear
  tone("Breathy R&B", { pressure: 6, breathiness: 0.45, tension: 0.3, brightness: 0.3, vibratoDepth: 15, vibratoRate: 5.5, glide: 0.12 }, { larynx: 0.2, epilarynx: 0.2 }),
  // bright and forward: firmer folds, a raised larynx, a strong twang
  tone("Bright pop", { pressure: 9, breathiness: 0.12, tension: 0.55, brightness: 0.6, vibratoDepth: 10, vibratoRate: 6, glide: 0.05 }, { larynx: 0.5, epilarynx: 0.6 }),
  // the same with the soft palate a little open: the nasal colour some pop singers use
  tone("Nasal pop", { pressure: 9, breathiness: 0.12, tension: 0.55, brightness: 0.55, vibratoDepth: 10, vibratoRate: 6, glide: 0.05 }, { velum: 0.15, larynx: 0.5, epilarynx: 0.5 }),
  // loud and pressed with grit: high pressure, a touch of the false folds
  tone("Soul belt", { pressure: 14, breathiness: 0.05, tension: 0.75, roughness: 0.25, brightness: 0.55, vibratoDepth: 35, vibratoRate: 5.8, glide: 0.08 }, { larynx: 0.6, epilarynx: 0.7, ventricular: 0.1 }),
  // soft and low with fry at the edges
  tone("Intimate fry", { pressure: 4.5, breathiness: 0.3, tension: 0.35, fry: 0.3, brightness: 0.25, glide: 0.1 }, { epilarynx: 0.1 }),
  // the classical contrast: a low larynx and a lifted soft palate, dark
  tone("Classical dark", { pressure: 10, breathiness: 0.08, tension: 0.5, brightness: 0.3, vibratoDepth: 60, vibratoRate: 5.6 }, { velum: -1.0, larynx: -0.8, epilarynx: 0.5 }),
];

/** Pick a tone: sets the source and throat; edit any encoder after and the menu shows "Your tone". */
export function ToneMenu() {
  const setSource = useStore((s) => s.setSource);
  const setArtic = useStore((s) => s.setArtic);
  const source = useStore((s) => s.source);
  const artic = useStore((s) => s.artic);
  const [picked, setPicked] = useState<string>("");
  const t = TONES.find((x) => x.name === picked);
  const same = (a: object, b: object) => Object.entries(a).every(([k, v]) => Math.abs((b as Record<string, number>)[k] - (v as number)) < 1e-6);
  const current = t && same(t.source, source) && same(t.artic, artic) ? t.name : "";
  return (
    <Menu
      label="Tone"
      value={current}
      options={[{ value: "", label: "Your tone", disabled: true }, ...TONES.map((x) => ({ value: x.name, label: x.name }))]}
      onChange={(name) => {
        const x = TONES.find((y) => y.name === name);
        if (!x) return;
        setPicked(name);
        setSource(x.source);
        setArtic(x.artic);
      }}
    />
  );
}

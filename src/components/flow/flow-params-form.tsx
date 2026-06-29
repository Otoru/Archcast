"use client";

import type { ChangeEvent } from "react";
import { useFlowEditor } from "@/components/flow/flow-editor-state";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import type { ChallengeParams } from "@/engine";

/**
 * Campo de razão (0–1) como slider com label de valor ao vivo em porcentagem
 * (ex.: 0.7 → "70%"). `step` e `decimals` acomodam a granularidade de cada
 * ratio (read/write 0.05, availability SLO 0.0001).
 */
function RatioField({
  id,
  label,
  value,
  step,
  decimals,
  min = 0,
  max = 1,
  disabled = false,
  onChange,
}: Readonly<{
  id: string;
  label: string;
  value: number;
  step: number;
  decimals: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (next: number) => void;
}>) {
  return (
    <Field>
      <Field.Label htmlFor={id}>{label}</Field.Label>
      <div className="flex items-center gap-3">
        <Slider.Root
          className="flex-1"
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          aria-labelledby={id}
          onValueChange={onChange}
        />
        <span className="wf-text-small tabular-nums text-wf-ink-soft w-14 text-right">
          {(value * 100).toFixed(decimals)}%
        </span>
      </div>
    </Field>
  );
}

const TRAFFIC_PATTERN_ITEMS: ComboboxOption[] = [
  { value: "steady", label: "Steady" },
  { value: "spiky", label: "Spiky" },
  { value: "diurnal", label: "Diurnal" },
];

/**
 * Editor for the challenge's `ChallengeParams`: rps, traffic pattern,
 * read/write ratio and latency/availability SLOs. Takes `params`/`onChange`
 * via props so it can be used in stories without the provider.
 */
export function FlowParamsForm({
  params,
  onChange,
  disabled = false,
}: Readonly<{
  params: ChallengeParams;
  onChange: (next: ChallengeParams) => void;
  /**
   * Desabilita todos os campos — usado pelo `FlowParamsFormConnected` para
   * travar os Challenge params durante o modo run (só attrs de nodes são
   * editáveis). Base UI (Slider/Combobox) não honra `disabled` herdado de
   * fieldset, por isso repassamos explicitamente a cada control.
   */
  disabled?: boolean;
}>) {
  const requiredNumber =
    (key: keyof ChallengeParams) => (event: ChangeEvent<HTMLInputElement>) => {
      if (disabled) {
        return;
      }
      const raw = event.target.value;
      const value = raw === "" ? 0 : Number(raw);
      if (Number.isFinite(value)) {
        onChange({ ...params, [key]: value });
      }
    };

  const patternOption = TRAFFIC_PATTERN_ITEMS.find(
    (item) => item.value === params.trafficPattern,
  );

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex flex-col gap-3">
        <Field>
          <Field.Label htmlFor="param-rps">RPS (requests/s)</Field.Label>
          <Input
            id="param-rps"
            type="number"
            min={0}
            disabled={disabled}
            value={String(params.rps)}
            onChange={requiredNumber("rps")}
          />
        </Field>

        <Field>
          <Field.Label htmlFor="param-traffic">Traffic pattern</Field.Label>
          <Combobox
            className="w-full"
            items={TRAFFIC_PATTERN_ITEMS}
            value={patternOption}
            disabled={disabled}
            onValueChange={(option) => {
              if (option) {
                onChange({
                  ...params,
                  trafficPattern:
                    option.value as ChallengeParams["trafficPattern"],
                });
              }
            }}
          >
            <Combobox.Trigger id="param-traffic">
              <Combobox.Value placeholder="Select..." />
              <Combobox.Actions />
            </Combobox.Trigger>
            <Combobox.Content>
              <Combobox.List />
            </Combobox.Content>
          </Combobox>
        </Field>

        <RatioField
          id="param-rw"
          label="Read/write ratio"
          value={params.readWriteRatio}
          step={0.05}
          decimals={0}
          disabled={disabled}
          onChange={(next) => onChange({ ...params, readWriteRatio: next })}
        />

        <Field>
          <Field.Label htmlFor="param-lat-slo">Latency SLO (ms)</Field.Label>
          <Input
            id="param-lat-slo"
            type="number"
            min={0}
            disabled={disabled}
            value={String(params.latencySlo)}
            onChange={requiredNumber("latencySlo")}
          />
        </Field>

        <RatioField
          id="param-av-slo"
          label="Availability SLO"
          value={params.availabilitySlo}
          min={0.99}
          max={1}
          step={0.0001}
          decimals={2}
          disabled={disabled}
          onChange={(next) => onChange({ ...params, availabilitySlo: next })}
        />
      </div>
    </div>
  );
}

/** Conectado ao `FlowEditorProvider`: lê/escreve `params`. Fica desabilitado durante o modo run. */
export function FlowParamsFormConnected() {
  const { params, setParams, running } = useFlowEditor();
  return (
    <FlowParamsForm params={params} onChange={setParams} disabled={running} />
  );
}

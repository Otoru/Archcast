"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import { type ChangeEvent, useMemo } from "react";
import type { BlockNode as BlockNodeType } from "@/components/flow/block-node";
import {
  applyAttrChange,
  attrsFormSpec,
} from "@/components/flow/flow-editor-helpers";
import { useFlowEditor } from "@/components/flow/flow-editor-state";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Muted, Small } from "@/components/ui/typography";
import { DEFAULT_INSTANCES, getPreset } from "@/engine";

const INSTANCES_KEY = "instances";

/**
 * Attrs that are ratios (0–1) and therefore render as a slider, not as an
 * `<Input type="number">`. `step` accommodates each one's granularity;
 * `decimals` is the precision of the value displayed as a percentage
 * (e.g. 0.85 → "85%"). Optional `min`/`max` constrain the range —
 * `availability` lives in the 99%–100% range (99.00%–100.00%, 2 decimals),
 * matching the Availability SLO of the params.
 */
const RATIO_ATTRS: Record<
  string,
  {
    step: number;
    decimals: number;
    min?: number;
    max?: number;
  }
> = {
  hitRatio: { step: 0.01, decimals: 0 },
  availability: { step: 0.0001, decimals: 2, min: 0.99, max: 1 },
};

/**
 * Inspector for the selected node: one control per editable attr of the preset
 * (the keys of `preset.defaults`). The displayed value is the override in
 * `data.attrs` (if any); the preset default shows as the placeholder.
 * Clearing a field removes the override and reverts to the default —
 * `resolveNode` does `{ ...preset.defaults, ...node.attrs }`, so live
 * validation and Run reflect the edit immediately.
 *
 * Special-cased attrs:
 * - ratio attrs (`hitRatio`, `availability`) render as a slider (0–1) with a
 *   live value label, instead of a numeric input.
 * - `instances` renders as a −/+ stepper (below the other fields) on every
 *   non-client node — even presets without `instances` in `defaults` — so the
 *   user can bump a single-instance block (e.g. WAF) to ≥2 to clear a SPOF.
 *   Client-layer nodes (web client, mobile, iot, cron) have no instances
 *   concept, so the stepper is hidden there.
 *
 * With no node selected: empty state. Takes `node`/`onChange` via props so it
 * can be used in stories without the `FlowEditorProvider`.
 */
export function NodeAttrsForm({
  node,
  onChange,
}: Readonly<{
  node: BlockNodeType | null;
  onChange: (next: BlockNodeType) => void;
}>) {
  const preset = node ? getPreset(node.data.kind) : undefined;

  const fields = useMemo(() => (preset ? attrsFormSpec(preset) : []), [preset]);

  if (!node) {
    return (
      <Muted className="p-4">
        Select a node on the canvas to edit its parameters.
      </Muted>
    );
  }

  if (!preset) {
    return (
      <Small className="p-4 text-wf-destructive">
        Unknown preset: {node.data.kind}
      </Small>
    );
  }

  const attrs = node.data.attrs ?? {};
  const setAttr = (key: string, value: number | undefined) =>
    onChange(applyAttrChange(node, key, value));

  const handleField =
    (key: string) => (event: ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value;
      if (raw === "") {
        setAttr(key, undefined);
        return;
      }
      const value = Number(raw);
      if (Number.isFinite(value)) {
        setAttr(key, value);
      }
    };

  const otherFields = fields.filter((field) => field.key !== INSTANCES_KEY);
  const showInstances = preset.layer !== "client";

  if (otherFields.length === 0 && !showInstances) {
    return (
      <Muted className="p-4">No parameters to define for this block.</Muted>
    );
  }

  const instancesValue =
    attrs.instances ?? preset.defaults.instances ?? DEFAULT_INSTANCES;

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex flex-col gap-3">
        {otherFields.map(({ key, label }) => {
          const ratio = RATIO_ATTRS[key];
          if (ratio) {
            const value =
              attrs[key] ??
              preset.defaults[key as keyof typeof preset.defaults] ??
              0;
            return (
              <Field key={key}>
                <Field.Label htmlFor={`attr-${key}`}>{label}</Field.Label>
                <div className="flex items-center gap-3">
                  <Slider.Root
                    className="flex-1"
                    value={value}
                    min={ratio.min ?? 0}
                    max={ratio.max ?? 1}
                    step={ratio.step}
                    aria-labelledby={`attr-${key}`}
                    onValueChange={(next) => setAttr(key, next)}
                  />
                  <span className="wf-text-small tabular-nums text-wf-ink-soft w-14 text-right">
                    {(value * 100).toFixed(ratio.decimals)}%
                  </span>
                </div>
              </Field>
            );
          }

          const override = attrs[key];
          const defaultValue =
            preset.defaults[key as keyof typeof preset.defaults];
          return (
            <Field key={key}>
              <Field.Label htmlFor={`attr-${key}`}>{label}</Field.Label>
              <Input
                id={`attr-${key}`}
                type="number"
                value={override == null ? "" : String(override)}
                placeholder={defaultValue == null ? "" : String(defaultValue)}
                onChange={handleField(key)}
              />
            </Field>
          );
        })}

        {showInstances ? (
          <Field>
            <Field.Label htmlFor="attr-instances">Instances</Field.Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Decrease instances"
                disabled={instancesValue <= 1}
                onClick={() =>
                  setAttr(INSTANCES_KEY, Math.max(1, instancesValue - 1))
                }
              >
                <MinusIcon />
              </Button>
              <Input
                id="attr-instances"
                type="number"
                min={1}
                className="text-center tabular-nums"
                value={String(instancesValue)}
                onChange={(event) => {
                  const raw = event.target.value;
                  if (raw === "") {
                    setAttr(INSTANCES_KEY, undefined);
                    return;
                  }
                  const value = Math.max(1, Math.floor(Number(raw)));
                  if (Number.isFinite(value)) {
                    setAttr(INSTANCES_KEY, value);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Increase instances"
                onClick={() => setAttr(INSTANCES_KEY, instancesValue + 1)}
              >
                <PlusIcon />
              </Button>
            </div>
          </Field>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Dynamic title for the "Node" section of the inspector's accordion: shows
 * the preset label of the selected node (e.g. "App Server") and, with no
 * selection, falls back to "Node". Reads `selectedNodeId`/`nodes` from the
 * `FlowEditorProvider`.
 */
export function NodeAccordionLabel() {
  const { nodes, selectedNodeId } = useFlowEditor();
  const node = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );
  const preset = node ? getPreset(node.data.kind) : undefined;
  return <>{preset?.label ?? "Node"}</>;
}

/**
 * Inspector connected to the editor state: reads `selectedNodeId`/`nodes`
 * from the `FlowEditorProvider` and writes attr overrides back to the
 * selected node via `setNodes`.
 */
export function NodeAttrsFormConnected() {
  const { nodes, setNodes, selectedNodeId } = useFlowEditor();
  const node = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );
  return (
    <NodeAttrsForm
      node={node}
      onChange={(next) =>
        setNodes((ns) => ns.map((n) => (n.id === next.id ? next : n)))
      }
    />
  );
}

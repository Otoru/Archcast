"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { H4, Muted } from "@/components/ui/typography";

const FIELDS: {
  title: string;
  desc?: string;
  bullets?: { label: string; text: string }[];
}[] = [
  {
    title: "RPS (requests/s)",
    desc: "How many requests per second the clients send. Split between read and write paths using the read/write ratio.",
  },
  {
    title: "Traffic pattern",
    bullets: [
      { label: "Steady", text: "Fixed RPS for the whole run." },
      { label: "Spiky", text: "Normal load, then a 10× spike for 30s." },
      { label: "Diurnal", text: "RPS cycles between 50% and 150% over 24h." },
    ],
  },
  {
    title: "Read/write ratio",
    desc: "Share of traffic that is reads, from 0 to 1. The rest is writes.",
  },
  {
    title: "Latency SLO (ms)",
    desc: "Max acceptable end-to-end latency. The run fails if p99 goes over this.",
  },
  {
    title: "Availability SLO",
    desc: "Target uptime, from 0 to 1 (0.999 = 99.9%). The run fails if availability falls below this.",
  },
  {
    title: "Bytes per write",
    desc: "Data written per write request. Combined with each database's retention window and max storage, the run estimates stored volume and fails on data loss when a database fills up. Adding instances does not add storage — replicas only help load and availability, so the full dataset must fit on one instance. Set to 0 to turn the check off.",
  },
];

/**
 * Modal de ajuda: explica os parâmetros do painel e o significado de ρ (load).
 * Controlado (open/onOpenChange) pela shell.
 */
export function HelpDialog({
  open,
  onOpenChange,
}: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void }>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Help</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {FIELDS.map((field) => (
            <div key={field.title}>
              <H4>{field.title}</H4>
              {field.bullets ? (
                <ul className="mt-1 list-disc space-y-1 pl-4 wf-text-small text-wf-ink-soft">
                  {field.bullets.map((item) => (
                    <li key={item.label}>
                      <span className="font-semibold text-wf-ink">
                        {item.label}
                      </span>
                      {" — "}
                      {item.text}
                    </li>
                  ))}
                </ul>
              ) : (
                <Muted className="mt-1">{field.desc}</Muted>
              )}
            </div>
          ))}

          <div>
            <H4>Load (ρ / rho)</H4>
            <Muted className="mt-1">
              How utilized a node is: incoming traffic divided by its capacity
              (per-instance capacity × instances). In the verdict each node
              shows this as{" "}
              <strong className="font-semibold text-wf-ink">Load</strong> — a
              percentage when under 100%, or ≥100% when saturated.
            </Muted>
            <ul className="mt-2 list-disc space-y-1 pl-4 wf-text-small text-wf-ink-soft">
              <li>
                <span className="font-semibold text-wf-ink">ρ = 0.50</span>
                {" — "}
                half utilized
              </li>
              <li>
                <span className="font-semibold text-wf-ink">ρ = 1.00</span>
                {" — "}
                at capacity
              </li>
              <li>
                <span className="font-semibold text-wf-ink">ρ = 5.00</span>
                {" — "}
                5× over capacity; node is saturated and drops excess traffic
              </li>
            </ul>
            <Muted className="mt-2">
              Saturation violations quote the raw value — for example,{" "}
              <strong className="font-semibold text-wf-ink">
                Saturated (rho=5.00)
              </strong>
            </Muted>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  type ChallengeParams,
  CycleError,
  type Graph,
  runSimulation,
  type Verdict,
} from "@/engine";

type SimReply =
  | { kind: "result"; id: number; verdict: Verdict }
  | { kind: "error"; id: number; message: string; isCycle: boolean };

export type SimulateWorkerOptions = {
  onResult: (verdict: Verdict) => void;
  onError: (message: string, isCycle: boolean) => void;
  onSettled: () => void;
};

export type SimulateWorker = {
  /** Envia o grafo + params pro worker; cancela qualquer execução anterior. */
  run: (graph: Graph, params: ChallengeParams) => void;
  /** Descarta o resultado pendente (incrementa o reqId sem terminar o worker). */
  cancel: () => void;
};

/**
 * Singleton preguiçoso do worker de simulação. O worker é criado só na
 * primeira chamada de `run` e reutilizado entre execuções; terminado no
 * unmount. Correlaciona requisições por `reqId` monótono: resultados de uma
 * execução superseded (usuário editou o grafo) são descartados.
 *
 * Fallback síncrono: se a construção do worker falhar (SSR/build/jsdom em
 * testes sem suporte a `Worker`), `runSimulation` roda inline com os mesmos
 * callbacks — via `queueMicrotask` para o `setComputing(true)` pintar antes.
 * `CycleError` é serializado como `isCycle` pelo worker (a classe não atravessa
 * a fronteira de clone estrutural); no fallback síncrono usamos `instanceof`.
 */
export function useSimulateWorker(opts: SimulateWorkerOptions): SimulateWorker {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const workerRef = useRef<Worker | null>(null);
  const reqIdRef = useRef(0);
  const pendingRef = useRef<number | null>(null);

  const ensureWorker = useCallback((): Worker | null => {
    if (workerRef.current) {
      return workerRef.current;
    }
    if (typeof window === "undefined") {
      return null;
    }
    try {
      const worker = new Worker(
        new URL("../../workers/simulate.worker.ts", import.meta.url),
        { type: "module" },
      );
      worker.onmessage = (event: MessageEvent<SimReply>) => {
        const reply = event.data;
        if (!reply || reply.id !== pendingRef.current) {
          return; // resultado stale de uma execução superseded
        }
        pendingRef.current = null;
        if (reply.kind === "result") {
          optsRef.current.onResult(reply.verdict);
        } else {
          optsRef.current.onError(reply.message, reply.isCycle);
        }
        optsRef.current.onSettled();
      };
      workerRef.current = worker;
      return worker;
    } catch {
      return null; // sem suporte a worker — usa fallback síncrono
    }
  }, []);

  const run = useCallback(
    (graph: Graph, params: ChallengeParams) => {
      const id = ++reqIdRef.current;
      pendingRef.current = id;
      const worker = ensureWorker();
      if (!worker) {
        // Fallback síncrono: roda na main thread, mas adia para o microtask
        // seguinte para o `setComputing(true)` pintar antes do bloqueio.
        queueMicrotask(() => {
          if (pendingRef.current !== id) {
            return;
          }
          try {
            const verdict = runSimulation(graph, params);
            optsRef.current.onResult(verdict);
          } catch (err) {
            optsRef.current.onError(
              err instanceof Error
                ? err.message
                : "Failed to run the simulation.",
              err instanceof CycleError,
            );
          }
          optsRef.current.onSettled();
        });
        return;
      }
      worker.postMessage({ kind: "run", id, graph, params });
    },
    [ensureWorker],
  );

  const cancel = useCallback(() => {
    pendingRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  return { run, cancel };
}

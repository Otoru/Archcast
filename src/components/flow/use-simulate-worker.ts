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
  /** Sends the graph + params to the worker; cancels any previous execution. */
  run: (graph: Graph, params: ChallengeParams) => void;
  /** Discards the pending result (increments reqId without terminating the worker). */
  cancel: () => void;
};

/**
 * Lazy singleton for the simulation worker. The worker is created only on
 * the first `run` call and reused across executions; terminated on unmount.
 * Correlates requests by a monotonic `reqId`: results from a superseded
 * execution (user edited the graph) are discarded.
 *
 * Synchronous fallback: if worker construction fails (SSR/build/jsdom in
 * tests without `Worker` support), `runSimulation` runs inline with the same
 * callbacks — via `queueMicrotask` so `setComputing(true)` paints first.
 * `CycleError` is serialized as `isCycle` by the worker (the class does not
 * cross the structured-clone boundary); in the synchronous fallback we use
 * `instanceof`.
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
    if (typeof globalThis.window === "undefined") {
      return null;
    }
    // jsdom (Vitest) reports `window` and — on Node 24 — a global `Worker`, but
    // a real worker thread has no `window` and throws asynchronously, surfacing
    // as an unhandled error. Force the synchronous fallback under jsdom.
    if (navigator.userAgent.includes("jsdom")) {
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
          return; // stale result from a superseded execution
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
      return null; // no worker support — use synchronous fallback
    }
  }, []);

  const run = useCallback(
    (graph: Graph, params: ChallengeParams) => {
      const id = ++reqIdRef.current;
      pendingRef.current = id;
      const worker = ensureWorker();
      if (!worker) {
        // Synchronous fallback: runs on the main thread, but defers to the
        // next microtask so `setComputing(true)` paints before the blocking.
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

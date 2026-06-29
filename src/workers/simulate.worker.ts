/// <reference lib="webworker" />
import {
  type ChallengeParams,
  CycleError,
  type Graph,
  runSimulation,
  type Verdict,
} from "@/engine";

type SimRequest = {
  kind: "run";
  id: number;
  graph: Graph;
  params: ChallengeParams;
};

type SimReply =
  | { kind: "result"; id: number; verdict: Verdict }
  | { kind: "error"; id: number; message: string; isCycle: boolean };

// `self` num module worker é o `DedicatedWorkerGlobalScope`; o cast evita o
// choque de tipos com o `self` do DOM (lib do tsconfig). `postMessage` clona
// estruturalmente o payload — `CycleError` (subclasse de Error) NÃO clona seu
// tipo, por isso serializamos `isCycle` aqui (onde a classe está em escopo) e
// a thread principal só lê a flag.
const workerSelf = self as unknown as {
  onmessage: ((ev: MessageEvent<SimRequest>) => void) | null;
  postMessage(message: SimReply): void;
};

workerSelf.onmessage = (event: MessageEvent<SimRequest>) => {
  const req = event.data;
  if (!req || req.kind !== "run") {
    return;
  }
  try {
    const verdict = runSimulation(req.graph, req.params);
    workerSelf.postMessage({ kind: "result", id: req.id, verdict });
  } catch (err) {
    workerSelf.postMessage({
      kind: "error",
      id: req.id,
      message:
        err instanceof Error ? err.message : "Failed to run the simulation.",
      isCycle: err instanceof CycleError,
    });
  }
};

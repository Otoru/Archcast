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

// `globalThis` in a module worker is the `DedicatedWorkerGlobalScope`; the
// cast avoids a type clash with the DOM lib from tsconfig. `postMessage`
// structurally clones the payload — `CycleError` (an Error subclass) does NOT
// clone its type, so we serialize `isCycle` here (where the class is in scope)
// and the main thread only reads the flag.
const workerSelf = globalThis as unknown as {
  onmessage: ((ev: MessageEvent<SimRequest>) => void) | null;
  postMessage(message: SimReply): void;
};

workerSelf.onmessage = (event: MessageEvent<SimRequest>) => {
  const req = event.data;
  if (req?.kind !== "run") {
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

import { parentPort, workerData } from 'node:worker_threads';
import { readInput } from './read.mjs';

for (const [side, file] of [['before', workerData.before], ['after', workerData.after]]) {
  parentPort.postMessage({ side, input: await readInput(file, workerData.maxBytes) });
}

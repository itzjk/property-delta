import { Worker } from 'node:worker_threads';
import { compare, emptyInput } from './compare.mjs';

export const limits = { maxBytes: 1024 * 1024, timeoutMs: 5000 };

export function run(before, after, options = {}) {
  const settings = { ...limits, ...options };
  return new Promise(resolve => {
    const inputs = {};
    let settled = false;
    const worker = new Worker(new URL('./worker.mjs', import.meta.url), {
      workerData: { before, after, maxBytes: settings.maxBytes },
      resourceLimits: { maxOldGenerationSizeMb: 128, stackSizeMb: 4 }
    });
    const finish = failure => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      for (const [side, file] of [['before', before], ['after', after]]) {
        if (inputs[side]) continue;
        const input = emptyInput(file);
        input.parseStatus = 'incomplete';
        input.exclusions.push({ code: failure || 'worker-failed', message: failure === 'timeout' ? `Comparison exceeded ${settings.timeoutMs} ms.` : 'Analysis stopped before this input could be verified.', name: null, location: { file, line: 1, column: 1 } });
        inputs[side] = input;
      }
      resolve(compare(inputs.before, inputs.after, settings));
      void worker.terminate();
    };
    const timer = setTimeout(() => finish('timeout'), settings.timeoutMs);
    worker.on('message', ({ side, input }) => {
      inputs[side] = input;
      if (inputs.before && inputs.after) finish();
    });
    worker.on('error', () => finish('worker-failed'));
    worker.on('exit', () => finish('worker-failed'));
  });
}

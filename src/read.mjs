import { constants } from 'node:fs';
import { lstat, open } from 'node:fs/promises';
import { extract, emptyInput } from './compare.mjs';

export async function readInput(file, maxBytes) {
  let handle;
  try {
    const info = await lstat(file);
    if (!info.isFile()) throw new Error('Input must be a regular file, not a directory, symlink or device.');
    if (info.size > maxBytes) throw new Error(`Input exceeds the ${maxBytes} byte limit.`);
    handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > maxBytes) throw new Error('Input changed or exceeds the size limit.');
    const buffer = Buffer.alloc(maxBytes + 1);
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await handle.read(buffer, length, buffer.length - length, null);
      if (!bytesRead) break;
      length += bytesRead;
    }
    if (length > maxBytes) throw new Error(`Input exceeds the ${maxBytes} byte limit.`);
    const after = await handle.stat();
    if (stat.ino !== after.ino || stat.size !== after.size || stat.mtimeMs !== after.mtimeMs || stat.ctimeMs !== after.ctimeMs || length !== after.size) {
      throw new Error('Input changed while it was being read.');
    }
    const bytes = buffer.subarray(0, length);
    let css;
    try {
      css = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      throw new Error('Input is not valid UTF-8.');
    }
    return extract(css, file, bytes);
  } catch (error) {
    const result = emptyInput(file);
    result.exclusions.push({ code: 'invalid-input', message: error.code ? `Cannot read input (${error.code}).` : error.message, name: null, location: { file, line: 1, column: 1 } });
    return result;
  } finally {
    await handle?.close();
  }
}

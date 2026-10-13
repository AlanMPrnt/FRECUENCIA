/* Local ZIP reader: stored/deflate entries, bounded expansion, CRC verification.
   No files are extracted to disk and only streaming-history JSON is decoded. */
(function (scope) {
  "use strict";
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
    for (let bit = 0; bit < 8; bit++) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    return value >>> 0;
  });
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }
  async function* read(file, budget = 256 * 1024 * 1024) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const view = new DataView(bytes.buffer);
    function u16(at) { if (at < 0 || at + 2 > bytes.length) throw new Error("ZIP incompleto."); return view.getUint16(at, true); }
    function u32(at) { if (at < 0 || at + 4 > bytes.length) throw new Error("ZIP incompleto."); return view.getUint32(at, true); }
    let end = -1;
    for (let at = bytes.length - 22; at >= Math.max(0, bytes.length - 65557); at--) {
      if (u32(at) === 0x06054b50 && at + 22 + u16(at + 20) === bytes.length) { end = at; break; }
    }
    if (end < 0) throw new Error("ZIP inválido o incompleto. Volvé a descargarlo de Spotify.");
    const count = u16(end + 10);
    if (u16(end + 4) || u16(end + 6) || count !== u16(end + 8) || count === 65535) {
      throw new Error("ZIP dividido o ZIP64 no compatible. Descomprimilo e importá los JSON.");
    }
    let at = u32(end + 16), total = 0, found = 0;
    const directoryEnd = at + u32(end + 12);
    if (directoryEnd > end) throw new Error("Directorio ZIP inválido.");
    for (let index = 0; index < count; index++) {
      if (at + 46 > directoryEnd || u32(at) !== 0x02014b50) throw new Error("Directorio ZIP incompleto.");
      const flags = u16(at + 8), method = u16(at + 10), crc = u32(at + 16);
      const compressed = u32(at + 20), size = u32(at + 24), offset = u32(at + 42);
      const nameLength = u16(at + 28);
      const next = at + 46 + nameLength + u16(at + 30) + u16(at + 32);
      if (next > directoryEnd) throw new Error("Entrada ZIP incompleta.");
      const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));
      at = next;
      if (!/(?:^|\/)(?:Streaming_History_Audio.*|StreamingHistory(?:_music)?\d*)\.json$/i.test(name)) continue;
      found++;
      if (flags & 1) throw new Error("El ZIP tiene contraseña. Importá los JSON descomprimidos.");
      total += size;
      if (total > budget || size > 128 * 1024 * 1024) throw new Error("El historial es demasiado grande para esta importación. Elegí sus JSON por separado.");
      if (u32(offset) !== 0x04034b50 || u16(offset + 8) !== method) throw new Error("Entrada ZIP dañada.");
      const start = offset + 30 + u16(offset + 26) + u16(offset + 28);
      if (start + compressed > u32(end + 16)) throw new Error("Datos ZIP incompletos.");
      let output;
      if (method === 0) output = bytes.subarray(start, start + compressed);
      else if (method === 8) {
        let inflater;
        try { inflater = new DecompressionStream("deflate-raw"); }
        catch { throw new Error("Tu navegador no admite ZIP. Actualizalo o importá los JSON descomprimidos."); }
        const reader = new Blob([bytes.subarray(start, start + compressed)]).stream().pipeThrough(inflater).getReader();
        output = new Uint8Array(size);
        let written = 0;
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (written + value.length > size) throw new Error("Tamaño ZIP inválido.");
            output.set(value, written); written += value.length;
          }
          if (written !== size) throw new Error("ZIP truncado.");
        } finally { await reader.cancel().catch(() => {}); }
      } else throw new Error("Compresión ZIP no compatible. Importá los JSON descomprimidos.");
      if (output.length !== size || crc32(output) !== crc) throw new Error("El ZIP está dañado: falló la verificación del archivo.");
      yield { name, size, text: decoder.decode(output) };
    }
    if (!found) throw new Error("No hay archivos de historial musical en este ZIP. Elegí el historial ampliado de Spotify.");
  }
  scope.FrecuenciaArchive = { read, crc32 };
  if (typeof module !== "undefined") module.exports = scope.FrecuenciaArchive;
})(globalThis);

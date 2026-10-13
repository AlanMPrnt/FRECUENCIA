"use strict";
importScripts("archive.js", "history.js");
let entries = [];

// A single local slot, saved only after an explicit opt-in. IPs, usernames and
// user agents never enter the normalized dataset.
function storage(mode, value) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("frecuencia-history", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("history");
    request.onerror = () => reject(new Error("No se pudo abrir el almacenamiento local."));
    request.onblocked = () => reject(new Error("Cerrá otras pestañas de Frecuencia para acceder al historial guardado."));
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction("history", mode === "read" ? "readonly" : "readwrite");
      const store = transaction.objectStore("history");
      const operation = mode === "read" ? store.get("entries") : mode === "clear" ? store.clear() : store.put(value, "entries");
      transaction.oncomplete = () => { db.close(); resolve(operation.result); };
      transaction.onabort = transaction.onerror = () => { db.close(); reject(new Error("No se pudo guardar o borrar el historial local. Revisá el espacio disponible.")); };
    };
  });
}

// Serialize writes so a slow save cannot resurrect a cleared import.
let queue = Promise.resolve();
self.onmessage = ({ data }) => {
  queue = queue.then(async () => {
    try {
      let meta = {};
      if (data.action === "import") {
        const result = await FrecuenciaHistory.parseHistoryFiles(data.files, (message) => postMessage({ id: data.id, progress: message }));
        entries = result.entries;
        meta = { count: entries.length, duplicates: result.duplicates, rejected: result.rejected };
      } else if (data.action === "restore") {
        entries = (await storage("read")) || [];
        meta.count = entries.length;
      } else if (data.action === "save") {
        await storage("write", entries);
      } else if (data.action === "forget") {
        await storage("clear");
      } else if (data.action === "clear") {
        entries = [];
        try { await storage("clear"); }
        catch { meta.warning = "El historial se quitó de esta visita. El navegador bloqueó el almacenamiento: no pudimos comprobar el borrado de una copia anterior."; }
      }
      const analysis = ["import", "restore", "analyze"].includes(data.action) && entries.length
        ? FrecuenciaHistory.aggregateHistory(entries, data.range || "all", { timeZone: "local", ...(data.options || {}) }) : null;
      postMessage({ id: data.id, analysis, ...meta });
    } catch (error) { postMessage({ id: data.id, error: error.message || "No se pudo procesar el historial." }); }
  });
};

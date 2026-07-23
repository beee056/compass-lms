// 小さな区切り文字パーサ（RFC4180風。引用符内のカンマ/タブ/改行・""エスケープに対応）。
// Googleスプレッドシートからの貼り付け(TSV)も、CSVファイルの中身も同じ関数で扱える。

function parseDelimited(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === delim) { row.push(field); field = ""; i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { row.push(field); rows.push(row); field = ""; row = []; i++; continue; }
    field += c; i++;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

// ヘッダ行→オブジェクト配列。区切りはヘッダ行にタブがあればTSV、無ければCSVと自動判定。
export function parseTable(text: string): Record<string, string>[] {
  if (!text) return [];
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // BOM除去
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delim = firstLine.includes("\t") ? "\t" : ",";
  const rows = parseDelimited(text, delim).filter((r) => r.some((c) => c.trim() !== ""));
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = (r[idx] ?? "").trim(); });
    return obj;
  });
}

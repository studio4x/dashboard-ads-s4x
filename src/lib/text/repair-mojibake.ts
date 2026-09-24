const KNOWN_MOJIBAKE_REPLACEMENTS: Array<[string, string]> = [
  ["Execu��o", "Execução"],
  ["execu��o", "execução"],
  ["ap�s", "após"],
  ["corre��o", "correção"],
  ["valida��o", "validação"],
  ["conclus�o", "conclusão"],
  ["aten��o", "atenção"],
  ["n�o", "não"],
];

/** Repairs known Portuguese encoding artifacts from legacy persisted messages. */
export function repairMojibake(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  let text = String(value);
  for (const [from, to] of KNOWN_MOJIBAKE_REPLACEMENTS) text = text.replaceAll(from, to);
  return text;
}

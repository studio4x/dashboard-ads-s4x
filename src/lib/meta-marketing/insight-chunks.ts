export type MetaInsightDateChunk = {
  dateStart: string;
  dateEnd: string;
};

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function buildMetaInsightDateChunks(dateStart: string, dateEnd: string, chunkDays = 30): MetaInsightDateChunk[] {
  if (!Number.isInteger(chunkDays) || chunkDays < 1) {
    throw new Error("chunkDays deve ser um número inteiro positivo.");
  }

  const cursor = new Date(`${dateStart}T12:00:00Z`);
  const end = new Date(`${dateEnd}T12:00:00Z`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime()) || cursor > end) return [];

  const chunks: MetaInsightDateChunk[] = [];
  while (cursor <= end) {
    const chunkStart = new Date(cursor);
    const chunkEnd = new Date(cursor);
    chunkEnd.setUTCDate(chunkEnd.getUTCDate() + chunkDays - 1);
    if (chunkEnd > end) chunkEnd.setTime(end.getTime());
    chunks.push({ dateStart: isoDate(chunkStart), dateEnd: isoDate(chunkEnd) });
    cursor.setTime(chunkEnd.getTime());
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return chunks;
}

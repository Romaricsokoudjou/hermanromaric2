type Item = { tuitionFee: number; enrollmentFee: number };

/** Calcul du total selon la règle de cumul configurée par l'administration. */
export function computeTotal(items: Item[], rule: string): number {
  if (!items.length) return 0;
  if (rule === "enrollment_once") return items.reduce((s, i) => s + i.tuitionFee, 0) + Math.max(...items.map((i) => i.enrollmentFee));
  return items.reduce((s, i) => s + i.tuitionFee + i.enrollmentFee, 0);
}

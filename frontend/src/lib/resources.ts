export type ResourceItem = { id: string; kind: "image" | "pdf"; title: string; size: number; in_email: boolean; created_at: string };

export function kb(n: number) {
  return n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

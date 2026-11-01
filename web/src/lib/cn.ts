/** 轻量类名合并：只处理字符串拼接，避免为骨架引入额外依赖。 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

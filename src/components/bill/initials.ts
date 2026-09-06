/** First letter of each of the first two words, uppercased. "Ana Ruiz" -> "AR". */
export function initialsFor(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
}

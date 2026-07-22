import type { CommanderAward } from "@/lib/commander-awards-types";

export function AwardBadge({ award, className }: { award: CommanderAward; className?: string }) {
  return <span className={className} title={`${award.name}: ${award.description}`} aria-label={`${award.name}. ${award.description}`}><b aria-hidden="true">{award.icon}</b><em>{award.name}</em></span>;
}

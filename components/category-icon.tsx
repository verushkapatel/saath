import { Banknote, Briefcase, Bus, Film, Gift, GraduationCap, HeartPulse, Home, Lightbulb, PiggyBank, ShoppingBag, Smartphone, Sparkles, Users, Utensils, Wallet, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  food: Utensils,
  travel: Bus,
  rent: Home,
  bills: Lightbulb,
  phone: Smartphone,
  health: HeartPulse,
  shopping: ShoppingBag,
  fun: Film,
  fees: GraduationCap,
  family: Users,
  otherOut: Wallet,
  salary: Banknote,
  work: Briefcase,
  pocket: Wallet,
  scholarship: GraduationCap,
  gift: Gift,
  otherIn: Sparkles,
  jar: PiggyBank,
};

/** The small picture for a Money Lab category. */
export function CategoryIcon({ id, size = 20 }: { id: string; size?: number }) {
  const Icon = ICONS[id] ?? Wallet;
  return <Icon aria-hidden size={size} />;
}

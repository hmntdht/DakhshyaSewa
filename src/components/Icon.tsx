import { Sparkles, ChefHat, PartyPopper, GraduationCap, Baby, Wrench, Shirt, Hammer, Paintbrush, Flower2, Car, Dog, Scissors, Utensils, House, Zap, Droplets, Truck, ShoppingBasket, Laptop, BookOpen, Bath, Wind, Bike, HeartHandshake, Camera, Music, Cake, Gift, type LucideProps } from 'lucide-react';

/** Curated registry so the admin can pick an icon by name without bundling the whole icon set. */
export const ICONS = { Sparkles, ChefHat, PartyPopper, GraduationCap, Baby, Wrench, Shirt, Hammer, Paintbrush, Flower2, Car, Dog, Scissors, Utensils, House, Zap, Droplets, Truck, ShoppingBasket, Laptop, BookOpen, Bath, Wind, Bike, HeartHandshake, Camera, Music, Cake, Gift } as const;
export const ICON_NAMES = Object.keys(ICONS);

export function Icon({ name, ...props }: { name?: string | null } & LucideProps) {
  const C = ICONS[(name ?? 'Sparkles') as keyof typeof ICONS] ?? Sparkles;
  return <C aria-hidden {...props} />;
}

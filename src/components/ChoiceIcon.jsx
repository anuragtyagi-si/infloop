import { Users, Heart, Shirt, Dumbbell, Cpu, Utensils, Compass, Megaphone, MessagesSquare, Target, Instagram, Music2, Youtube, Linkedin, Building2, Rocket, FileCheck, Flag, TrendingUp, Sparkles } from 'lucide-react';

const icons = {
  'All creators': Users,
  Lifestyle: Heart,
  Fashion: Shirt,
  Fitness: Dumbbell,
  Tech: Cpu,
  Food: Utensils,
  Travel: Compass,
  Awareness: Megaphone,
  Engagement: MessagesSquare,
  Conversions: Target,
  Instagram,
  TikTok: Music2,
  YouTube: Youtube,
  LinkedIn: Linkedin,
  'Your brand': Building2,
  'The campaign': Rocket,
  'Your brief': FileCheck,
  Pilot: Flag,
  Growth: TrendingUp,
  Flagship: Sparkles,
};

export default function ChoiceIcon({ label, size = 16 }) {
  const Icon = icons[label] || Target;
  return <Icon size={size} aria-hidden="true"/>;
}

import * as Icons from 'lucide-react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

// Utility function to normalize icon names
const normalizeIconName = (iconName: string): string => {
  // Remove any prefix like "exampleonly->"
  const cleanName = iconName.split('->').pop() || iconName;
  
  // Convert to PascalCase
  return cleanName
    .split(/[-\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
};

interface PurposeCardProps {
  label: string;
  iconName: string;
  className?: string;
  onClick?: (details: { label: string; iconName: string }) => void;
}

const PurposeCard = ({ label, iconName, className, onClick }: PurposeCardProps) => {
  // Normalize the icon name and dynamically get icon from lucide-react
  const normalizedIconName = normalizeIconName(iconName);
  const Icon: LucideIcon = (Icons[normalizedIconName as keyof typeof Icons] as LucideIcon) || Icons.HelpCircle;

  const handleClick = () => {
    if (onClick) {
      console.log('Purpose card clicked:', { label, iconName: normalizedIconName });
      onClick({ label, iconName: normalizedIconName });
    }
  };

  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center p-6 rounded-lg border cursor-pointer",
        "hover:border-blue-500 hover:shadow-md transition-all duration-200",
        "bg-white dark:bg-gray-800",
        className
      )}
      onClick={handleClick}
    >
      <div className="text-sm font-medium mb-4">{label}</div>
      <Icon className="w-12 h-12 text-blue-500" />
    </div>
  );
};

export default PurposeCard;
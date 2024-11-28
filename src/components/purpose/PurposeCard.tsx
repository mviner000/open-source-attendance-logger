import React from 'react';
import * as Icons from 'lucide-react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface PurposeCardProps {
  label: string;
  iconName: string;
  className?: string;
  onClick?: (details: { label: string; iconName: string }) => void;
}

const PurposeCard = ({ label, iconName, className, onClick }: PurposeCardProps) => {
  // Dynamically get icon from lucide-react with proper typing
  const Icon: LucideIcon = (Icons[iconName as keyof typeof Icons] as LucideIcon) || Icons.HelpCircle;

  const handleClick = () => {
    if (onClick) {
      console.log('Purpose card clicked:', { label, iconName });
      onClick({ label, iconName });
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
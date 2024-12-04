import * as Icons from 'lucide-react';
import { LucideIcon } from 'lucide-react';

type Step2ChoosePurposeProps = {
  handleScan: (purpose: string) => void;
  isSubmitting: boolean;
  availablePurposes: {
    [key: string]: {
      label: string;
      icon_name: string;
    }
  };
};

const normalizeIconName = (iconName: string): string => {
  const cleanName = iconName.split('->').pop() || iconName;
  return cleanName
    .split(/[-\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
};

const Step2ChoosePurpose: React.FC<Step2ChoosePurposeProps> = ({
  handleScan,
  availablePurposes
}) => {
  return (
    <div className="mt-3 grid grid-cols-3 items-center justify-between gap-1 md:ml-28 lg:ml-64">
      {Object.entries(availablePurposes).map(([key, purpose]) => {
        const normalizedIconName = normalizeIconName(purpose.icon_name);
        const Icon: LucideIcon = (Icons[normalizedIconName as keyof typeof Icons] as LucideIcon) || Icons.HelpCircle;
        
        return (
          <div
            key={key}
            onClick={() => handleScan(key)}
            className="flex h-full cursor-pointer flex-col items-center gap-2 rounded-xl p-4 hover:bg-customGold/90"
          >
            <div className=" flex h-32 w-32 items-center justify-center rounded-lg border border-customGreen2 bg-white/90 p-2">
              <div className='relative'>
              <span className='absolute -right-[2px] top-0'><Icon className="w-12 h-12 text-pink-500/70" /></span>
              <span className='absolute -left-[1px] bottom-1'><Icon className="w-12 h-12 text-gray-700" /></span>
              <span className='absolute -left-[2px] bottom-1'><Icon className="w-12 h-12 text-orange-500/30" /></span>
              <Icon className="w-12 h-12 text-green-500" />
              </div>
            </div>
            <p className="mt-1 min-w-[150px] rounded-lg border border-customGold/90 shadow-lg bg-customGreen2 p-1 text-center text-xl font-extrabold text-white">
              {purpose.label}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default Step2ChoosePurpose;
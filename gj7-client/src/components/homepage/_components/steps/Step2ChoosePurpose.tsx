// _components/steps/Step2ChoosePurpose.tsx

import { Button } from "@/components/ui/button";
import { Book } from "lucide-react"; // Fallback icon

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

// Import the AVAILABLE_ICONS from IconSelector to map icon names
import { AVAILABLE_ICONS } from "../icon-selector";

const Step2ChoosePurpose: React.FC<Step2ChoosePurposeProps> = ({
  handleScan,
  isSubmitting,
  availablePurposes
}) => {
  // Helper function to find the correct icon
  const getIconComponent = (iconName: string) => {
    const foundIcon = AVAILABLE_ICONS.find(icon => icon.name === iconName);
    return foundIcon ? foundIcon.icon : Book; // Fallback to Book icon if not found
  };

  return (
    <div className="grid grid-cols-3 items-center justify-between gap-4 md:ml-28 lg:ml-64">
      {Object.entries(availablePurposes).map(([key, purpose]) => {
        const IconComponent = getIconComponent(purpose.icon_name);
        
        return (
          <Button
            key={key}
            disabled={isSubmitting}
            onClick={() => handleScan(key)}
            variant="ghost"
            className="flex h-full cursor-pointer flex-col items-center gap-2 rounded-xl p-4 hover:bg-customGold"
          >
            <div className="flex size-[100px] items-center justify-center rounded-lg border border-customGreen2 bg-white">
              <IconComponent 
                className="size-12 text-customGreen" 
                strokeWidth={1.5}
              />
            </div>
            <p className="min-w-[150px] rounded-lg border border-customGreen2 bg-white p-1 text-center text-xl font-semibold text-customGreen">
              {purpose.label}
            </p>
          </Button>
        );
      })}
    </div>
  );
};

export default Step2ChoosePurpose;
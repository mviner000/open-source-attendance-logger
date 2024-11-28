import React, { useState } from 'react'
import { 
  BookOpen, 
  Briefcase, 
  Dumbbell, 
  Gamepad, 
  Headphones, 
  Heart, 
  Home, 
  Laptop, 
  Music, 
  PlaneTakeoff, 
  School, 
  ShoppingCart, 
  Star, 
  Users 
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// Define an array of available icons
const AVAILABLE_ICONS = [
  { name: 'book', icon: BookOpen },
  { name: 'briefcase', icon: Briefcase },
  { name: 'dumbbell', icon: Dumbbell },
  { name: 'gamepad', icon: Gamepad },
  { name: 'headphones', icon: Headphones },
  { name: 'heart', icon: Heart },
  { name: 'home', icon: Home },
  { name: 'laptop', icon: Laptop },
  { name: 'music', icon: Music },
  { name: 'plane', icon: PlaneTakeoff },
  { name: 'school', icon: School },
  { name: 'shopping', icon: ShoppingCart },
  { name: 'star', icon: Star },
  { name: 'users', icon: Users }
]

interface IconSelectorProps {
  selectedIcon?: string | null;
  onIconSelect: (iconName: string) => void;
  className?: string;
}

export function IconSelector({ 
  selectedIcon, 
  onIconSelect, 
  className 
}: IconSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Find the currently selected icon component
  const SelectedIconComponent = AVAILABLE_ICONS.find(
    (iconInfo) => iconInfo.name === selectedIcon
  )?.icon

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className={`w-12 h-10 p-0 ${className}`}
        >
          {SelectedIconComponent ? (
            <SelectedIconComponent className="w-5 h-5" />
          ) : (
            <Star className="w-5 h-5 text-muted-foreground" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid grid-cols-5 gap-2">
          {AVAILABLE_ICONS.map(({ name, icon: Icon }) => (
            <Button
              key={name}
              variant={selectedIcon === name ? "secondary" : "ghost"}
              size="icon"
              onClick={() => {
                onIconSelect(name)
                setIsOpen(false)
              }}
              className="w-10 h-10"
            >
              <Icon className="w-5 h-5" />
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
// components/settings_styles/SettingsStylesCard.tsx

import React from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Palette } from 'lucide-react'
import { SettingsStyleWithDates, UpdateSettingsStyleRequest } from '@/lib/settings_styles'
import { useNavbarColor } from '@/hooks/useNavbarColor'

interface SettingsStylesCardProps {
  style: SettingsStyleWithDates
  onUpdate: (styleId: number, updatedStyle: UpdateSettingsStyleRequest) => Promise<void>
}

const SettingsStylesCard: React.FC<SettingsStylesCardProps> = ({ style, onUpdate }) => {
  const { navbarColor, updateNavbarColor } = useNavbarColor()

  const handleColorChange = (newColor: string) => {
    updateNavbarColor(newColor)
    onUpdate(style.id!, { tailwind_classes: `bg-[${newColor}]` })
  }

  return (
    <div className='w-[768px] h-[630px] bg-orange-200'>
      <nav 
        style={{
          backgroundColor: navbarColor
        }} 
        className="shadow-sm z-50 bg-white flex justify-between items-center p-4"
      >
        <div>logo</div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon">
              <Palette className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Input
                  type="color"
                  value={navbarColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="h-10 w-20 p-1 rounded-md cursor-pointer"
                />
                <Input
                  type="text"
                  value={navbarColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="flex-grow"
                  placeholder="#660099"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </nav>
    </div>
  )
}

export default SettingsStylesCard


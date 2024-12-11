// components/settings_styles/SettingsStylesCard.tsx

import React, { useState } from 'react'
import { HexColorPicker } from "react-colorful"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Palette, Save, X } from 'lucide-react'
import { useNavbarSettings } from '@/hooks/useNavbarSettings'

const SettingsStylesCard: React.FC = () => {
  const {
    navbarColor,
    tempNavbarColor,
    updateTempNavbarColor,
    saveNavbarColor,
    cancelColorChange,
    brandLabel,
    updateBrandLabel
  } = useNavbarSettings()

  const [editingState, setEditingState] = useState<{ field: 'brandLabel' | null }>({ field: null })
  const [localBrandLabel, setLocalBrandLabel] = useState(brandLabel)

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleBrandLabelUpdate()
    }
  }

  const handleBrandLabelUpdate = async () => {
    try {
      await updateBrandLabel(localBrandLabel)
      setEditingState({ field: null })
    } catch (error) {
      console.error('Failed to update brand label:', error)
    }
  }

  const handleColorChange = (newColor: string) => {
    updateTempNavbarColor(newColor)
  }

  const renderEditableBrandLabel = () => {
    if (editingState.field === 'brandLabel') {
      return (
        <div className="flex items-center space-x-2 w-full">
          <Input
            value={localBrandLabel}
            onChange={(e) => {
              try {
                setLocalBrandLabel(e.target.value)
              } catch (error) {
                console.error('Error updating brand label input:', error)
              }
            }}
            onKeyPress={handleKeyPress}
            autoFocus
            className="flex-grow"
          />
          <Button 
            onClick={handleBrandLabelUpdate} 
            variant="outline" 
            size="icon"
            className="hover:bg-green-100"
          >
            <Save className="h-4 w-4 text-green-600" />
          </Button>
          <Button 
            onClick={() => {
              setLocalBrandLabel(brandLabel)
              setEditingState({ field: null })
            }} 
            variant="outline" 
            size="icon"
            className="hover:bg-red-100"
          >
            <X className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      )
    }

    return (
      <div 
        className='bg-green-600 text-white p-1 rounded cursor-text hover:bg-green-700'
        onClick={() => {
          try {
            setLocalBrandLabel(brandLabel)
            setEditingState({ field: 'brandLabel' })
          } catch (error) {
            console.error('Error entering edit mode:', error)
          }
        }}
      >
        {brandLabel}
      </div>
    )
  }

  return (
    <div className='w-[768px] h-[630px] bg-orange-200'>
      <div
        style={{
          backgroundColor: navbarColor
        }}
        className="shadow-sm z-50 bg-white flex justify-between items-center p-4"
      >
        {renderEditableBrandLabel()}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon">
              <Palette className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-2">
              <HexColorPicker
                color={tempNavbarColor}
                onChange={handleColorChange}
                className="mb-4 w-full h-[150px]"
              />
              <div className="flex items-center space-x-2">
                <Input
                  type="text"
                  value={tempNavbarColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="flex-grow"
                  placeholder="#660099"
                />
                <Button onClick={() => saveNavbarColor()}>Save</Button>
                <Button variant="outline" onClick={cancelColorChange}>Cancel</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}

export default SettingsStylesCard
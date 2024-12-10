// components/settings_styles/CreateSettingsStylesForm.tsx
import React, { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CreateSettingsStyleRequest } from '@/lib/settings_styles'

interface CreateSettingsStylesFormProps {
  onCreateSettingsStyle: (style: CreateSettingsStyleRequest) => Promise<void>
}

const CreateSettingsStylesForm: React.FC<CreateSettingsStylesFormProps> = ({ onCreateSettingsStyle }) => {
  const [componentName, setComponentName] = useState('')
  const [color, setColor] = useState('#000000')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedComponentName = componentName.trim()
    
    if (!trimmedComponentName) {
      console.error('Component Name is required')
      return
    }
    
    const newStyle: CreateSettingsStyleRequest = {
      component_name: trimmedComponentName,
      tailwind_classes: `bg-[${color}]` // Using the color as a Tailwind arbitrary value
    }
    
    await onCreateSettingsStyle(newStyle)
    
    // Reset form
    setComponentName('')
    setColor('#660099')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Create Settings Style</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="componentName">Component Name</Label>
            <Input
              id="componentName"
              type="text"
              placeholder="Component Name"
              value={componentName}
              onChange={(e) => setComponentName(e.target.value)}
              onKeyPress={handleKeyPress}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="colorPicker">Color</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="colorPicker"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-20 p-1 rounded-md cursor-pointer"
              />
              <Input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-grow"
                placeholder="#660099"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit">Create Style</Button>
        </CardFooter>
      </form>
    </Card>
  )
}

export default CreateSettingsStylesForm


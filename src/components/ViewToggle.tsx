import React, { useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ViewToggleProps {
  view: 'card' | 'table'
  onViewChange: (view: 'card' | 'table') => void
}

const ViewToggle: React.FC<ViewToggleProps> = ({ view, onViewChange }) => {
  // Load view from localStorage on component mount
  useEffect(() => {
    const savedView = localStorage.getItem('attendanceViewPreference')
    if (savedView && ['card', 'table'].includes(savedView)) {
      onViewChange(savedView as 'card' | 'table')
    }
  }, [])

  const handleViewChange = (value: 'card' | 'table') => {
    // Save view preference to localStorage
    localStorage.setItem('attendanceViewPreference', value)
    onViewChange(value)
  }

  return (
    <Tabs 
      value={view} 
      onValueChange={(value) => handleViewChange(value as 'card' | 'table')}
      className="ml-auto"
    >
      <TabsList>
        <TabsTrigger value="card">Card</TabsTrigger>
        <TabsTrigger value="table">Table</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

export default ViewToggle
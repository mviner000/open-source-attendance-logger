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
      className="ml-auto bg-green-500 text-green-900 border-b-[6px] border-green-600 hover:text-green-800 hover:bg-green-600 hover:border-green-700 active:border-b-0 active:border-t-4 active:translate-y-[4px] duration-150 shadow-sm
      inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0
      "
    >
      <TabsList>
        <TabsTrigger value="card">Card</TabsTrigger>
        <TabsTrigger value="table">Table</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

export default ViewToggle
import React, { useState, useRef } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { SchoolAccount, Gender, Semester, UpdateSchoolAccountRequest } from '@/lib/school_accounts'

interface SchoolAccountCardProps {
  account: SchoolAccount
  onUpdate: (id: string, updatedAccount: UpdateSchoolAccountRequest) => Promise<void>
  onDelete: (id: string) => void
}

const SchoolAccountCard: React.FC<SchoolAccountCardProps> = ({ account, onUpdate, onDelete }) => {
  const [editingState, setEditingState] = useState<{ field: keyof SchoolAccount | null }>({ field: null })
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editedValue, setEditedValue] = useState<string>('')
  const editingRef = useRef<HTMLInputElement | HTMLSelectElement>(null)

  const handleUpdate = () => {
    if (editingState.field) {
      onUpdate(account.id, { [editingState.field]: editedValue })
      setEditingState({ field: null })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleUpdate()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedValue(e.target.value)
  }

  const handleSelectChange = (field: keyof UpdateSchoolAccountRequest, value: string) => {
    if (field === 'gender') {
      onUpdate(account.id, { gender: value as Gender })
    } else if (field === 'is_active') {
      onUpdate(account.id, { is_active: value === 'true' })
    } else if (field === 'last_updated') {
      onUpdate(account.id, { last_updated: value as Semester })
    }
    setEditingState({ field: null })
  }

  const renderEditableField = (name: keyof SchoolAccount, value: string | undefined, label: string) => (
    <div className="flex items-center py-1">
      <span className="w-1/3 text-sm font-medium text-muted-foreground">{label}:</span>
      {editingState.field === name ? (
        <Input
          ref={editingRef as React.RefObject<HTMLInputElement>}
          name={name}
          value={editedValue}
          onChange={handleInputChange}
          onBlur={handleUpdate}
          onKeyPress={handleKeyPress}
          className="w-2/3"
          autoFocus
        />
      ) : (
        <span
          className="w-2/3 text-sm cursor-text hover:bg-accent hover:text-accent-foreground p-1 rounded"
          onClick={() => {
            setEditingState({ field: name })
            setEditedValue(value || '')
          }}
        >
          {value || 'N/A'}
        </span>
      )}
    </div>
  )

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{account.school_id}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {renderEditableField('first_name', account.first_name, 'First Name')}
        {renderEditableField('middle_name', account.middle_name, 'Middle Name')}
        {renderEditableField('last_name', account.last_name, 'Last Name')}
        <div className="flex items-center py-1">
          <span className="w-1/3 text-sm font-medium text-muted-foreground">Gender:</span>
          {editingState.field === 'gender' ? (
            <Select
              onValueChange={(value) => handleSelectChange('gender', value)}
              value={account.gender?.toString() || ''}
            >
              <SelectTrigger className="w-2/3">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={Gender.Male.toString()}>Male</SelectItem>
                <SelectItem value={Gender.Female.toString()}>Female</SelectItem>
                <SelectItem value={Gender.Other.toString()}>Other</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <span
              className="w-2/3 text-sm cursor-text hover:bg-accent hover:text-accent-foreground p-1 rounded"
              onClick={() => setEditingState({ field: 'gender' })}
            >
              {account.gender !== undefined ? Gender[account.gender] : 'N/A'}
            </span>
          )}
        </div>
        {renderEditableField('course', account.course, 'Course')}
        {renderEditableField('department', account.department, 'Department')}
        {renderEditableField('position', account.position, 'Position')}
        {renderEditableField('major', account.major, 'Major')}
        {renderEditableField('year_level', account.year_level, 'Year Level')}
        
        {/* New fields: is_active and last_updated */}
        <div className="flex items-center py-1">
          <span className="w-1/3 text-sm font-medium text-muted-foreground">Account Status:</span>
          {editingState.field === 'is_active' ? (
            <Select
              onValueChange={(value) => handleSelectChange('is_active', value)}
              value={account.is_active?.toString() || 'true'}
            >
              <SelectTrigger className="w-2/3">
                <SelectValue placeholder="Account Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <span
              className="w-2/3 text-sm cursor-text hover:bg-accent hover:text-accent-foreground p-1 rounded"
              onClick={() => setEditingState({ field: 'is_active' })}
            >
              {account.is_active ? 'Active' : 'Inactive'}
            </span>
          )}
        </div>

        <div className="flex items-center py-1">
          <span className="w-1/3 text-sm font-medium text-muted-foreground">Last Updated:</span>
          {editingState.field === 'last_updated' ? (
            <Select
              onValueChange={(value) => handleSelectChange('last_updated', value)}
              value={account.last_updated?.toString() || ''}
            >
              <SelectTrigger className="w-2/3">
                <SelectValue placeholder="Select Semester" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(Semester).map((semester) => (
                  <SelectItem key={semester} value={semester}>
                    {semester}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span
              className="w-2/3 text-sm cursor-text hover:bg-accent hover:text-accent-foreground p-1 rounded"
              onClick={() => setEditingState({ field: 'last_updated' })}
            >
              {account.last_updated || 'N/A'}
            </span>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className='border-red-400 shadow-md'
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              Delete
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Are you sure you want to delete this account?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete the school account.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => onDelete(account.id)}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  )
}

export default SchoolAccountCard
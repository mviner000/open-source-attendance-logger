// CreateSchoolAccountForm.tsx

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreateSchoolAccountRequest, Gender, Semester } from '@/lib/school_accounts'

interface CreateSchoolAccountFormProps {
  onCreateAccount: (account: CreateSchoolAccountRequest) => Promise<void>
}

const CreateSchoolAccountForm: React.FC<CreateSchoolAccountFormProps> = ({ onCreateAccount }) => {
  const [newAccount, setNewAccount] = useState<CreateSchoolAccountRequest>({
    school_id: '',
    is_active: true, // Default to true
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onCreateAccount(newAccount)
    setNewAccount({ 
      school_id: '',
      is_active: true 
    })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Special handling for is_active to ensure it's a boolean
    if (name === 'is_active') {
      setNewAccount({ 
        ...newAccount, 
        [name]: value === 'true' 
      });
    } else {
      setNewAccount({ ...newAccount, [name]: value });
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    if (name === 'gender') {
      setNewAccount({ 
        ...newAccount, 
        [name]: value as Gender 
      });
    } else if (name === 'last_updated') {
      setNewAccount({ 
        ...newAccount, 
        [name]: value as Semester 
      });
    } else {
      setNewAccount({ ...newAccount, [name]: value });
    }
   };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold mb-4">Create School Account</h2>
      <Input
        name="school_id"
        value={newAccount.school_id}
        onChange={handleInputChange}
        placeholder="School ID"
        required
      />
      <Input
        name="first_name"
        value={newAccount.first_name || ''}
        onChange={handleInputChange}
        placeholder="First Name"
      />
      <Input
        name="middle_name"
        value={newAccount.middle_name || ''}
        onChange={handleInputChange}
        placeholder="Middle Name"
      />
      <Input
        name="last_name"
        value={newAccount.last_name || ''}
        onChange={handleInputChange}
        placeholder="Last Name"
      />
      <Select
        onValueChange={(value) => handleSelectChange('gender', value)}
        value={newAccount.gender?.toString() || ''}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select gender" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={Gender.Male.toString()}>Male</SelectItem>
          <SelectItem value={Gender.Female.toString()}>Female</SelectItem>
          <SelectItem value={Gender.Other.toString()}>Other</SelectItem>
        </SelectContent>
      </Select>
      <Input
        name="course"
        value={newAccount.course || ''}
        onChange={handleInputChange}
        placeholder="Course"
      />
      <Input
        name="department"
        value={newAccount.department || ''}
        onChange={handleInputChange}
        placeholder="Department"
      />
      <Input
        name="position"
        value={newAccount.position || ''}
        onChange={handleInputChange}
        placeholder="Position"
      />
      <Input
        name="major"
        value={newAccount.major || ''}
        onChange={handleInputChange}
        placeholder="Major"
      />
      <Input
        name="year_level"
        value={newAccount.year_level || ''}
        onChange={handleInputChange}
        placeholder="Year Level"
      />
      <Select
        onValueChange={(value) => handleSelectChange('last_updated', value)}
        value={newAccount.last_updated?.toString() || ''}
      >
        <SelectTrigger>
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
      <Select
        onValueChange={(value) => handleInputChange({ 
          target: { name: 'is_active', value } 
        } as React.ChangeEvent<HTMLInputElement>)}
        value={newAccount.is_active?.toString() || 'true'}
      >
        <SelectTrigger>
          <SelectValue placeholder="Account Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Active</SelectItem>
          <SelectItem value="false">Inactive</SelectItem>
        </SelectContent>
      </Select>
      <Button type="submit">Create Account</Button>
    </form>
  )
}

export default CreateSchoolAccountForm
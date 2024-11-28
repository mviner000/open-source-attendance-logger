// components/notes/CreateNoteForm.tsx

import React, { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CreateNoteRequest } from '@/lib/notes'

interface CreateNoteFormProps {
  onCreateNote: (note: CreateNoteRequest) => Promise<void>
}

const CreateNoteForm: React.FC<CreateNoteFormProps> = ({ onCreateNote }) => {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()

    if (!trimmedTitle || !trimmedContent) {
      // You might want to handle this error in the parent component
      console.error('Title and content are required')
      return
    }

    await onCreateNote({ title: trimmedTitle, content: trimmedContent })
    setTitle('')
    setContent('')
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
        <CardTitle>Create Note</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <Input
            type="text"
            placeholder="Note title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyPress={handleKeyPress}
            required
          />
          <Textarea
            placeholder="Note content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyPress={handleKeyPress}
            className="min-h-[100px]"
            required
          />
        </CardContent>
        <CardFooter>
          <Button type="submit">Create Note</Button>
        </CardFooter>
      </form>
    </Card>
  )
}

export default CreateNoteForm

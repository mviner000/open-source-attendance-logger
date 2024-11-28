// components/notes/NoteCard.tsx

import React, { useState, useRef } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { CalendarDays, PencilLine } from 'lucide-react'
import { NoteWithDates, UpdateNoteRequest } from '@/lib/notes'

interface NoteCardProps {
  note: NoteWithDates
  onUpdate: (noteId: number, updatedNote: UpdateNoteRequest) => Promise<void>
  onDelete: (noteId: number) => void
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onUpdate, onDelete }) => {
  const [editingState, setEditingState] = useState<{ field: 'title' | 'content' | null }>({ field: null })
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const editingRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (editingState.field === 'title') {
        onUpdate(note.id!, { title: note.title })
      } else if (editingState.field === 'content') {
        onUpdate(note.id!, { content: note.content })
      }
      setEditingState({ field: null })
    }
  }

  return (
    <Card>
      <CardHeader>
        {editingState.field === 'title' ? (
          <Input
            ref={editingRef as React.RefObject<HTMLInputElement>}
            value={note.title}
            onChange={(e) => onUpdate(note.id!, { title: e.target.value })}
            onBlur={() => setEditingState({ field: null })}
            onKeyPress={handleKeyPress}
            autoFocus
          />
        ) : (
          <CardTitle
            onClick={() => setEditingState({ field: 'title' })}
            className="cursor-text hover:bg-accent hover:text-accent-foreground p-1 rounded"
          >
            {note.title}
          </CardTitle>
        )}
      </CardHeader>
      <CardContent>
        {editingState.field === 'content' ? (
          <Textarea
            ref={editingRef as React.RefObject<HTMLTextAreaElement>}
            value={note.content}
            onChange={(e) => onUpdate(note.id!, { content: e.target.value })}
            onBlur={() => setEditingState({ field: null })}
            onKeyPress={handleKeyPress}
            className="min-h-[100px]"
            autoFocus
          />
        ) : (
          <p
            className="text-sm mb-4 cursor-text hover:bg-accent hover:text-accent-foreground p-2 rounded border border-border"
            onClick={() => setEditingState({ field: 'content' })}
          >
            {note.content}
          </p>
        )}
        <div className="flex items-center text-xs text-muted-foreground mt-2 space-x-1">
          <CalendarDays className="w-4 h-4 flex-shrink-0" />
          <span className="flex-grow mt-1">{note.created_at.toLocaleDateString()}</span>
          {note.updated_at.getTime() !== note.created_at.getTime() && (
            <>
              <PencilLine className="w-4 h-4 flex-shrink-0" />
              <span>{note.updated_at.toLocaleDateString()}</span>
            </>
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
              <DialogTitle>Are you sure you want to delete this note?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete your note.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => onDelete(note.id!)}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  )
}

export default NoteCard


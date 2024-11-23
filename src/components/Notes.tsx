"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { NotesApi, NoteWithDates, CreateNoteRequest, UpdateNoteRequest } from '../lib/notes'
import { logger, LogLevel } from '../lib/logger'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ToastProvider, ToastViewport } from "@/components/ui/toast"
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CalendarDays, PencilLine, X } from 'lucide-react'
import AuthModal from './AuthModal'

const Notes: React.FC = () => {
  // States
  const [notes, setNotes] = useState<NoteWithDates[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchStatus, setSearchStatus] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [noteToDelete, setNoteToDelete] = useState<number | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingState, setEditingState] = useState<{ id: number | null, field: 'title' | 'content' | null }>({ id: null, field: null })
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authAction, setAuthAction] = useState<'create' | 'delete'>('create')
  const [credentials, setCredentials] = useState<{ username: string; password: string }>({ username: '', password: '' })

  const { toast } = useToast()
  const editingRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  // Fetch credentials
  const fetchCredentials = async () => {
    try {
      const creds = await NotesApi.getCredentials()
      setCredentials(creds)
    } catch (err) {
      console.error('Failed to fetch credentials:', err)
    }
  }

  // Callbacks
  const addToast = useCallback((message: string, level: LogLevel) => {
    toast({
      title: level.charAt(0).toUpperCase() + level.slice(1),
      description: message,
      variant: level === 'error' ? 'destructive' : 'default',
    })
  }, [toast])

  // Fetch all notes
  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true)
      const fetchedNotes = await NotesApi.getAllNotes()
      setNotes(fetchedNotes)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notes')
    } finally {
      setLoading(false)
    }
  }, [])

  // Search notes
  const handleSearch = useCallback(async () => {
    try {
      setLoading(true)
      if (searchQuery.trim()) {
        const searchResults = await NotesApi.searchNotes(searchQuery)
        setNotes(searchResults)
        setSearchStatus(`Found ${searchResults.length} note${searchResults.length !== 1 ? 's' : ''}`)
      } else {
        await fetchNotes()
        setSearchStatus(null)
      }
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search notes')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, fetchNotes])

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('')
    setSearchStatus(null)
    fetchNotes()
  }

  // Create new note
  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthAction('create')
    setIsAuthModalOpen(true)
  }

  // Handle auth submission
  const handleAuthSubmit = async (inputCredentials: { username: string; password: string }) => {
    try {
      if (inputCredentials.username === credentials.username && 
          inputCredentials.password === credentials.password) {
        setIsAuthModalOpen(false)
        if (authAction === 'create') {
          await createNote(inputCredentials)
        } else if (authAction === 'delete' && noteToDelete) {
          await deleteNote(noteToDelete, inputCredentials)
        }
      } else {
        addToast('Invalid credentials', 'error')
      }
    } catch (err) {
      addToast('Authentication failed', 'error')
    }
  }

  // Create note after authentication
  const createNote = async (auth: { username: string; password: string }) => {
    try {
      const trimmedTitle = title.trim()
      const trimmedContent = content.trim()

      if (!trimmedTitle || !trimmedContent) {
        addToast('Title and content are required', 'error')
        return
      }

      const newNote: CreateNoteRequest = {
        title: trimmedTitle,
        content: trimmedContent,
      }
      await NotesApi.createNote(newNote, auth.username, auth.password)
      setTitle('')
      setContent('')
      await fetchNotes()
      setError(null)
      addToast('Note created successfully', 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create note')
      addToast('Failed to create note', 'error')
    }
  }

  // Update note
  const handleUpdateNote = async (noteId: number, updatedNote: UpdateNoteRequest) => {
    try {
      await NotesApi.updateNote(noteId, updatedNote, credentials.username, credentials.password)
      await fetchNotes()
      setEditingState({ id: null, field: null })
      setError(null)
      addToast('Note updated successfully', 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update note')
      addToast('Failed to update note', 'error')
    }
  }

  // Delete note
  const handleDeleteNote = () => {
    setAuthAction('delete')
    setIsAuthModalOpen(true)
  }

  // Delete note after authentication
  const deleteNote = async (noteId: number, auth: { username: string; password: string }) => {
    try {
      await NotesApi.deleteNote(noteId, auth.username, auth.password)
      await fetchNotes()
      setError(null)
      addToast('Note deleted successfully', 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note')
      addToast('Failed to delete note', 'error')
    } finally {
      setNoteToDelete(null)
      setIsDeleteDialogOpen(false)
    }
  }

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editingRef.current && !editingRef.current.contains(event.target as Node)) {
        setEditingState({ id: null, field: null })
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent, noteId?: number) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (noteId) {
        const note = notes.find(n => n.id === noteId)
        if (note) {
          if (editingState.field === 'title') {
            handleUpdateNote(noteId, { title: note.title })
          } else if (editingState.field === 'content') {
            handleUpdateNote(noteId, { content: note.content })
          }
        }
      } else {
        handleCreateNote(e)
      }
    }
  }

  // Handle ESC key
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEditingState({ id: null, field: null })
      }
    }

    document.addEventListener('keydown', handleEscKey)
    return () => {
      document.removeEventListener('keydown', handleEscKey)
    }
  }, [])

  // Effects
  useEffect(() => {
    const handleLog = (log: { message: string; level: LogLevel }) => {
      addToast(log.message, log.level)
    }

    logger.addListener(handleLog)
    return () => logger.removeListener(handleLog)
  }, [addToast])

  useEffect(() => {
    fetchNotes()
    fetchCredentials()
  }, [fetchNotes])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch()
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [searchQuery, handleSearch])

  if (loading && !notes.length) {
    return <div className="p-4">Loading...</div>
  }

  return (
    <ToastProvider>
      <div className="p-4 max-w-4xl mx-auto">
        {error && (
          <div className="bg-destructive text-destructive-foreground px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create Note</CardTitle>
          </CardHeader>
          <form onSubmit={handleCreateNote}>
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

        <div className="mb-4 relative">
          <Input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
              onClick={handleClearSearch}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {searchStatus && (
          <div className="mb-4 text-sm text-muted-foreground">
            {searchStatus}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardHeader>
                {editingState.id === note.id && editingState.field === 'title' ? (
                  <Input
                    ref={editingRef as React.RefObject<HTMLInputElement>}
                    value={note.title}
                    onChange={(e) => {
                      const updatedNotes = notes.map(n =>
                        n.id === note.id ? { ...n, title: e.target.value } : n
                      )
                      setNotes(updatedNotes)
                    }}
                    onBlur={() => handleUpdateNote(note.id!, { title: note.title })}
                    onKeyPress={(e) => handleKeyPress(e, note.id)}
                    autoFocus
                  />
                ) : (
                  <CardTitle
                    onClick={() => setEditingState({ id: note.id!, field: 'title' })}
                    className="cursor-text hover:bg-accent hover:text-accent-foreground p-1 rounded"
                  >
                    {note.title}
                  </CardTitle>
                )}
              </CardHeader>
              <CardContent>
                {editingState.id === note.id && editingState.field === 'content' ? (
                  <Textarea
                    ref={editingRef as React.RefObject<HTMLTextAreaElement>}
                    value={note.content}
                    onChange={(e) => {
                      const updatedNotes = notes.map(n =>
                        n.id === note.id ? { ...n, content: e.target.value } : n
                      )
                      setNotes(updatedNotes)
                    }}
                    onBlur={() => handleUpdateNote(note.id!, { content: note.content })}
                    onKeyPress={(e) => handleKeyPress(e, note.id)}
                    className="min-h-[100px]"
                    autoFocus
                  />
                ) : (
                  <p
                    className="text-sm mb-4 cursor-text hover:bg-accent hover:text-accent-foreground p-2 rounded border border-border"
                    onClick={() => setEditingState({ id: note.id!, field: 'content' })}
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
                      onClick={() => {
                        setNoteToDelete(note.id || null)
                        setIsDeleteDialogOpen(true)
                      }}
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
                      <Button variant="destructive" onClick={handleDeleteNote}>
                        Delete
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
      <ToastViewport />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSubmit={handleAuthSubmit}
        action={authAction === 'create' ? 'create a new note' : 'delete the note'}
      />
    </ToastProvider>
  )
}

export default Notes


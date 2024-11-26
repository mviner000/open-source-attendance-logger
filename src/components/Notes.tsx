// "Notes.tsx"


import React, { useState, useEffect, useCallback } from 'react'
import { NotesApi, NoteWithDates, CreateNoteRequest, UpdateNoteRequest } from '../lib/notes'
import { logger, LogLevel } from '../lib/logger'
import { ToastProvider, ToastViewport } from "@/components/ui/toast"
import { useToast } from '@/hooks/use-toast'
import AuthModal from './AuthModal'
import NoteCard from './notes/NoteCard'
import SearchBar from './SearchBar'
import CreateNoteForm from './notes/CreateNoteForm'

const Notes: React.FC = () => {
  // States
  const [notes, setNotes] = useState<NoteWithDates[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchStatus, setSearchStatus] = useState<string | null>(null)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authAction, setAuthAction] = useState<'create' | 'delete'>('create')
  const [credentials, setCredentials] = useState<{ username: string; password: string }>({ username: '', password: '' })
  const [noteToDelete, setNoteToDelete] = useState<number | null>(null)

  const { toast } = useToast()

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

  // Handle auth submission
  const handleAuthSubmit = async (inputCredentials: { username: string; password: string }) => {
    try {
      if (inputCredentials.username === credentials.username && 
          inputCredentials.password === credentials.password) {
        setIsAuthModalOpen(false)
        if (authAction === 'create') {
          // Handle create action
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
  const createNote = async (newNote: CreateNoteRequest) => {
    try {
      await NotesApi.createNote(newNote, credentials.username, credentials.password)
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
      setError(null)
      addToast('Note updated successfully', 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update note')
      addToast('Failed to update note', 'error')
    }
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
    }
  }

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

        <CreateNoteForm onCreateNote={createNote} />

        <SearchBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          handleClearSearch={handleClearSearch}
        />

        {searchStatus && (
          <div className="mb-4 text-sm text-muted-foreground">
            {searchStatus}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onUpdate={handleUpdateNote}
              onDelete={(noteId) => {
                setNoteToDelete(noteId)
                setAuthAction('delete')
                setIsAuthModalOpen(true)
              }}
            />
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


// old SettingsStyles.tsx

import React, { useState, useEffect, useCallback } from 'react'
import { SettingsStylesApi, SettingsStyleWithDates, CreateSettingsStyleRequest } from '../lib/settings_styles'
import { logger, LogLevel } from '../lib/logger'
import { ToastProvider, ToastViewport } from "@/components/ui/toast"
import { useToast } from '@/hooks/use-toast'
import AuthModal from './AuthModal'
import SettingsStylesCard from './settings_styles/SettingsStylesCard'
import SearchBar from './SearchBar'
import CreateSettingsStylesForm from './settings_styles/CreateSettingsStylesForm'

const SettingsStyles: React.FC = () => {
  // States
  const [styles, setStyles] = useState<SettingsStyleWithDates[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchStatus, setSearchStatus] = useState<string | null>(null)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authAction] = useState<'create' | 'delete'>('create');
  const [credentials, setCredentials] = useState<{ username: string; password: string }>({ username: '', password: '' })
  const [styleToDelete, setStyleToDelete] = useState<number | null>(null)

  const { toast } = useToast()

  // Fetch credentials
  const fetchCredentials = async () => {
    try {
      const creds = await SettingsStylesApi.getCredentials()
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

  // Fetch all styles
  const fetchStyles = useCallback(async () => {
    try {
      setLoading(true)
      const fetchedStyles = await SettingsStylesApi.getAllSettingsStyles()
      setStyles(fetchedStyles)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch styles')
    } finally {
      setLoading(false)
    }
  }, [])

  // Search styles
  const handleSearch = useCallback(async () => {
    try {
      setLoading(true)
      if (searchQuery.trim()) {
        const searchResults = await SettingsStylesApi.searchSettingsStyles(searchQuery)
        setStyles(searchResults)
        setSearchStatus(`Found ${searchResults.length} style${searchResults.length !== 1 ? 's' : ''}`)
      } else {
        await fetchStyles()
        setSearchStatus(null)
      }
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search styles')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, fetchStyles])

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('')
    setSearchStatus(null)
    fetchStyles()
  }

  // Handle auth submission
  const handleAuthSubmit = async (inputCredentials: { username: string; password: string }) => {
    try {
      if (inputCredentials.username === credentials.username && 
          inputCredentials.password === credentials.password) {
        setIsAuthModalOpen(false)
        if (authAction === 'create') {
          // Handle create action
        } else if (authAction === 'delete' && styleToDelete) {
          await deleteStyle(styleToDelete, inputCredentials)
        }
      } else {
        addToast('Invalid credentials', 'error')
      }
    } catch (err) {
      addToast('Authentication failed', 'error')
    }
  }

  // Create style after authentication
  const createStyle = async (newStyle: CreateSettingsStyleRequest) => {
    try {
      await SettingsStylesApi.createSettingsStyle(newStyle, credentials.username, credentials.password)
      await fetchStyles()
      setError(null)
      addToast('Style created successfully', 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create style')
      addToast('Failed to create style', 'error')
    }
  }

  // Delete style after authentication
  const deleteStyle = async (styleId: number, auth: { username: string; password: string }) => {
    try {
      await SettingsStylesApi.deleteSettingsStyle(styleId, auth.username, auth.password)
      await fetchStyles()
      setError(null)
      addToast('Style deleted successfully', 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete style')
      addToast('Failed to delete style', 'error')
    } finally {
      setStyleToDelete(null)
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
    fetchStyles()
    fetchCredentials()
  }, [fetchStyles])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch()
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [searchQuery, handleSearch])

  if (loading && !styles.length) {
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
        <div className='hidden'>
          <CreateSettingsStylesForm onCreateSettingsStyle={createStyle} />
        </div>
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


        <div>
          <h1 className='text-3xl font-bold text-white'>Settings</h1>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            {styles.length > 0 && (
              <SettingsStylesCard />
            )}
          </div>
        </div>
      </div>
      <ToastViewport />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSubmit={handleAuthSubmit}
        action={authAction === 'create' ? 'create a new style' : 'delete the style'}
      />
    </ToastProvider>
  )
}

export default SettingsStyles
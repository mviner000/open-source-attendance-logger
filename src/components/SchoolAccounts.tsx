// SchoolAccounts.tsx
import React, { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { SchoolAccountsApi, SchoolAccount, CreateSchoolAccountRequest, UpdateSchoolAccountRequest } from '../lib/school_accounts'
import SchoolAccountCard from './accounts/SchoolAccountCard'
import CreateSchoolAccountForm from './accounts/CreateSchoolAccountForm'
import CsvUploadComponent from './accounts/CsvUploadComponent'
import { ToastProvider, ToastViewport } from "@/components/ui/toast"
import SearchBar from './SearchBar'
import { Button } from "@/components/ui/button"
import { RefreshCw } from 'lucide-react'
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer"
import { useMediaQuery } from '@/hooks/use-media-query'

const SchoolAccounts: React.FC = () => {
  const [accounts, setAccounts] = useState<SchoolAccount[]>([])
  const [filteredAccounts, setFilteredAccounts] = useState<SchoolAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [open, setOpen] = useState(false)
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const { toast } = useToast()

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true)
      const fetchedAccounts = await SchoolAccountsApi.getAllSchoolAccounts()
      setAccounts(fetchedAccounts)
      setFilteredAccounts(fetchedAccounts)
      setError(null)
      toast({
        title: "Accounts Refreshed",
        description: "Accounts list has been updated",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch accounts')
      toast({
        title: "Error",
        description: "Failed to fetch accounts",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const handleSearch = useCallback(async (query: string) => {
    if (query.trim() === '') {
      setFilteredAccounts(accounts)
    } else {
      try {
        const searchResults = await SchoolAccountsApi.searchSchoolAccounts(query)
        setFilteredAccounts(searchResults)
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to search accounts",
          variant: "destructive",
        })
      }
    }
  }, [accounts, toast])

  useEffect(() => {
    fetchAccounts()
  }, [])

  useEffect(() => {
    if (searchQuery === '') {
      setFilteredAccounts(accounts)
    } else {
      handleSearch(searchQuery)
    }
  }, [accounts, searchQuery, handleSearch])

  const handleCreateAccount = async (newAccount: CreateSchoolAccountRequest) => {
    try {
      await SchoolAccountsApi.createSchoolAccount(newAccount)
      toast({
        title: "Success",
        description: "Account created successfully",
      })
      fetchAccounts()
      setOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create account",
        variant: "destructive",
      })
    }
  }

  const handleUpdateAccount = async (id: string, updatedFields: Partial<UpdateSchoolAccountRequest>) => {
    try {
      await SchoolAccountsApi.updateSchoolAccount(id, updatedFields)
      toast({
        title: "Success",
        description: "Account updated successfully",
      })
      fetchAccounts()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update account",
        variant: "destructive",
      })
    }
  }

  const handleDeleteAccount = async (id: string) => {
    try {
      await SchoolAccountsApi.deleteSchoolAccount(id)
      toast({
        title: "Success",
        description: "Account deleted successfully",
      })
      fetchAccounts()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive",
      })
    }
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setFilteredAccounts(accounts)
  }

  const handleCsvUploadSuccess = () => {
    fetchAccounts()
  }

  const CreateAccountTrigger = (
    <Button onClick={() => setOpen(true)}>Create School Account</Button>
  )

  return (
    <ToastProvider>
      <div className="p-4 max-w-4xl mx-auto">
        {error && (
          <div className="bg-destructive text-destructive-foreground px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="mb-4 flex justify-between items-center">
          <div className="flex space-x-2">
            {isDesktop ? (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  {CreateAccountTrigger}
                </DialogTrigger>
                <DialogContent>
                  <CreateSchoolAccountForm onCreateAccount={handleCreateAccount} />
                </DialogContent>
              </Dialog>
            ) : (
              <Drawer open={open} onOpenChange={setOpen}>
                <DrawerTrigger asChild>
                  {CreateAccountTrigger}
                </DrawerTrigger>
                <DrawerContent>
                  <div className="p-4">
                    <CreateSchoolAccountForm onCreateAccount={handleCreateAccount} />
                  </div>
                </DrawerContent>
              </Drawer>
            )}
            
            <Button 
              variant="outline" 
              onClick={fetchAccounts} 
              disabled={loading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>

            <CsvUploadComponent 
              onUploadSuccess={handleCsvUploadSuccess}
              buttonLabel="Import CSV"
            />
          </div>
          
          <SearchBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            handleClearSearch={handleClearSearch}
          />
        </div>

        {loading ? (
          <div className="text-center py-4">Loading accounts...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAccounts.map((account) => (
              <SchoolAccountCard
                key={account.id}
                account={account}
                onUpdate={handleUpdateAccount}
                onDelete={handleDeleteAccount}
              />
            ))}
          </div>
        )}
      </div>
      <ToastViewport />
    </ToastProvider>
  )
}

export default SchoolAccounts

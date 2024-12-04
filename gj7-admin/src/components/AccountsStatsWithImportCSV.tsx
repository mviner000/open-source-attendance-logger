// src/AccountsStatsWithImportCSV.tsx semester-modal.tsx is used in here

import React, { useState, useEffect, useCallback } from 'react';
import { SchoolAccountsApi, SchoolAccount } from '@/lib/school_accounts';
import { SemesterApi, Semester } from '@/lib/semester';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SemesterModal } from '@/components/semester-modal';
import CsvImportComponent from './CsvImportComponent';
import { Button } from '@/components/ui/button';
import { Loader2, Search, SquarePen } from 'lucide-react';
import { SearchModal } from './search-modal';
import { useToast } from "@/hooks/use-toast"

const AccountsStatsWithImportCSV: React.FC = () => {
  const [schoolAccounts, setSchoolAccounts] = useState<SchoolAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCount, setActiveCount] = useState<number>(0);
  const [inactiveCount, setInactiveCount] = useState<number>(0);
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isSemesterModalOpen, setIsSemesterModalOpen] = useState(false);
  
  const { toast } = useToast();

  const fetchActiveSemester = async () => {
    try {
      const semesters = await SemesterApi.getAllSemesters();
      const active = semesters.find(semester => semester.is_active);
      setActiveSemester(active || null);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error Fetching Active Semester",
        description: String(err)
      });
    }
  };

  const fetchSchoolAccountsAndSemesters = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch active semester first
      await fetchActiveSemester();
      
      // Fetch school accounts
      const allAccounts = await SchoolAccountsApi.getAllSchoolAccounts();
      
      // Fetch semester details for each account
      const accountsWithSemester = await Promise.all(
        allAccounts.map(async (account) => {
          if (account.last_updated_semester_id) {
            try {
              return await SchoolAccountsApi.getSchoolAccountWithSemester(account.id);
            } catch (err) {
              console.error(`Failed to fetch semester for account ${account.id}:`, err);
              return account;
            }
          }
          return account;
        })
      );

      // Calculate active and inactive counts
      const activeAccounts = accountsWithSemester.filter(account => account.is_active);
      const inactiveAccounts = accountsWithSemester.filter(account => !account.is_active);

      setActiveCount(activeAccounts.length);
      setInactiveCount(inactiveAccounts.length);

      setSchoolAccounts(accountsWithSemester);

      setLoading(false);
    } catch (err) {
      setError('Failed to fetch school accounts and semesters');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchoolAccountsAndSemesters();
  }, [fetchSchoolAccountsAndSemesters]);

  const handleImportSuccess = () => {
    fetchSchoolAccountsAndSemesters();
  };

  const handleSemesterModalUpdate = () => {
    fetchActiveSemester();
    fetchSchoolAccountsAndSemesters();
  };

  return (
    <div className="flex-1 p-4 overflow-auto">
      <div className="w-full max-w-6xl mx-auto space-y-6">
        {loading ? (
          <div className="flex justify-center items-center">
            <Button disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading accounts...
            </Button>
          </div>
        ) : error ? (
          <div className="p-4 text-red-500">
            <p>{error}</p>
            <Button onClick={fetchSchoolAccountsAndSemesters} className="mt-4">
              Retry Fetching
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Import Accounts</CardTitle>
                </CardHeader>
                <CardContent>
                  <CsvImportComponent onImportSuccess={handleImportSuccess} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center w-full">
                    <CardTitle>
                      <div className='flex items-center'>
                        <span className='font-light mr-1'>Current Sem:</span>
                        <span>
                          {activeSemester 
                            ? activeSemester.label 
                            : 'No Active Semester'}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setIsSemesterModalOpen(true)}
                          className="-ml-2 -mt-1 hover:bg-transparent"
                        >
                          <SquarePen className='w-6 h-6'/>
                        </Button>
                      </div>
                    </CardTitle>
                    <div className="text-right flex items-center">
                      <p className="text-sm font-medium">Total: <span className='font-bold'>{activeCount + inactiveCount}</span></p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium">Active Accounts</p>
                      <p className="text-2xl font-bold">{activeCount}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Inactive Accounts</p>
                      <p className="text-2xl font-bold">{inactiveCount}</p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => setIsSearchModalOpen(true)}
                    className='w-full rounded-full border border-green-600'
                    size="lg"
                    variant="outline"
                  >
                    <div className='flex items-center justify-center'>
                    <Search className="mr-1.5 h-4" />
                    <span className='mt-1'>Search</span>
                    </div>
                  </Button>
                </CardContent>
              </Card>
            </div>
            
            <SearchModal
              isOpen={isSearchModalOpen}
              onClose={() => setIsSearchModalOpen(false)}
              schoolAccounts={schoolAccounts}
            />

            <SemesterModal
              isOpen={isSemesterModalOpen}
              onOpenChange={(open) => setIsSemesterModalOpen(open)}
              onUpdate={handleSemesterModalUpdate}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default AccountsStatsWithImportCSV;
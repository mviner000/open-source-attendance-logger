// src/SchoolAccounts.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { SchoolAccountsApi, SchoolAccount } from '@/lib/school_accounts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CsvImportComponent from './CsvImportComponent';
import { Button } from '@/components/ui/button';
import { Loader2, Search, SquarePen } from 'lucide-react';
import { SearchModal } from './search-modal';

const AccountsStatsWithImportCSV: React.FC = () => {
  const [schoolAccounts, setSchoolAccounts] = useState<SchoolAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCount, setActiveCount] = useState<number>(0);
  const [inactiveCount, setInactiveCount] = useState<number>(0);

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  

  const fetchSchoolAccountsAndSemesters = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch semesters first
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

  return (
    <div className="flex-1 p-4 overflow-auto"> {/* Changed this line */}
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
                    <span>School Year 2024-2025</span>
                    <SquarePen className='ml-1 -mt-1 w-5.5 h-5.5'/>
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
          </>
        )}
      </div>
    </div>
  );
};

export default AccountsStatsWithImportCSV;


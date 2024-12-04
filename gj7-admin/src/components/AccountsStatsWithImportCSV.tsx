// src/AccountsStatsWithImportCSV.tsx
import React, { useState, useEffect } from 'react';
import { SchoolAccountsApi, SchoolAccount, Semester } from '@/lib/school_accounts';
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
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
  const [accountCounts, setAccountCounts] = useState({ active_count: 0, inactive_count: 0 });
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isSemesterModalOpen, setIsSemesterModalOpen] = useState(false);
  
  const { toast } = useToast();

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const stats = await SchoolAccountsApi.getDashboardStats();
      setActiveSemester(stats.active_semester);
      setAccountCounts(stats.account_counts);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch dashboard stats');
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Error Fetching Dashboard Stats",
        description: String(err)
      });
    }
  };

  const fetchSchoolAccounts = async () => {
    try {
      const accounts = await SchoolAccountsApi.getAllSchoolAccounts();
      setSchoolAccounts(accounts);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error Fetching School Accounts",
        description: String(err)
      });
    }
  };

  useEffect(() => {
    const initialize = async () => {
      await fetchDashboardStats();
      await fetchSchoolAccounts();
    };
    initialize();
  }, []);

  const handleImportSuccess = () => {
    fetchDashboardStats();
    fetchSchoolAccounts();
  };

  const handleSemesterModalUpdate = () => {
    fetchDashboardStats();
  };

  return (
    <div className="flex-1 mt-5 max-w-screen-xl mx-auto">
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
            <Button onClick={fetchDashboardStats} className="mt-4">
              Retry Fetching
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 xl:grid-cols-2 xl:-mx-16 gap-4">
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
                      <p className="text-sm font-medium">
                        Total: <span className='font-bold'>
                          {accountCounts.active_count + accountCounts.inactive_count}
                        </span>
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium">Active Accounts</p>
                      <p className="text-2xl font-bold">{accountCounts.active_count}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Inactive Accounts</p>
                      <p className="text-2xl font-bold">{accountCounts.inactive_count}</p>
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
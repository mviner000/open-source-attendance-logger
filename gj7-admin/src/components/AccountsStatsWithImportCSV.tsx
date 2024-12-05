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
import SemesterCard from './SemesterCard';

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

              <SemesterCard
                  activeSemester={activeSemester}
                  setIsSemesterModalOpen={setIsSemesterModalOpen}
                  accountCounts={accountCounts}
                  setIsSearchModalOpen={setIsSearchModalOpen}
                />

              
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
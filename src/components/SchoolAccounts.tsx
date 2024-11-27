import React, { useState, useEffect, useCallback } from 'react';
import { SchoolAccountsApi, SchoolAccount } from '@/lib/school_accounts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CsvImportComponent from './CsvImportComponent';
import { SemesterModal } from './semester-modal';

const SchoolAccountsPage: React.FC = () => {
  const [schoolAccounts, setSchoolAccounts] = useState<SchoolAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchoolAccounts = useCallback(async () => {
    try {
      setLoading(true);
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

      setSchoolAccounts(accountsWithSemester);
      
      // Log uuid and school_id for each account
      accountsWithSemester.forEach(account => {
        console.log({
          uuid: account.id,  // Using id as UUID
          school_id: account.school_id,
          semester: account.last_updated_semester?.label || 'No semester'
        });
      });
      
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch school accounts');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchoolAccounts();
  }, [fetchSchoolAccounts]);

  const handleImportSuccess = () => {
    fetchSchoolAccounts();
  };

  if (loading) {
    return <div className="p-4">Loading school accounts...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <>
      <CsvImportComponent onImportSuccess={handleImportSuccess} />
      <SemesterModal />
      <Card className="mt-8 w-full max-w-6xl mx-auto">
        <CardHeader>
          <CardTitle>School Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {schoolAccounts.length === 0 ? (
            <p className="text-center text-gray-500">No school accounts found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 border text-left">School ID</th>
                    <th className="p-2 border text-left">Name</th>
                    <th className="p-2 border text-left">Course</th>
                    <th className="p-2 border text-left">Year Level</th>
                    <th className="p-2 border text-left">Department</th>
                    <th className="p-2 border text-left">Last Updated Semester</th>
                  </tr>
                </thead>
                <tbody>
                  {schoolAccounts.map((account) => (
                    <tr key={account.id} className="hover:bg-gray-50">
                      <td className="p-2 border">{account.school_id}</td>
                      <td className="p-2 border">
                        {`${account.first_name || ''} ${account.middle_name || ''} ${account.last_name || ''}`}
                      </td>
                      <td className="p-2 border">{account.course}</td>
                      <td className="p-2 border">{account.year_level}</td>
                      <td className="p-2 border">{account.department}</td>
                      <td className="p-2 border">
                        {account.last_updated_semester?.label || 'No semester'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default SchoolAccountsPage;
import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SchoolAccount } from '@/lib/school_accounts';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolAccounts: SchoolAccount[];
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, schoolAccounts }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SchoolAccount[]>([]);

  const handleSearch = useCallback(() => {
    const lowercasedTerm = searchTerm.toLowerCase();
    const results = schoolAccounts.filter((account) => {
      return (
        account.school_id.toLowerCase().includes(lowercasedTerm) ||
        (account.first_name && account.first_name.toLowerCase().includes(lowercasedTerm)) ||
        (account.middle_name && account.middle_name.toLowerCase().includes(lowercasedTerm)) ||
        (account.last_name && account.last_name.toLowerCase().includes(lowercasedTerm)) ||
        (account.gender && account.gender.toLowerCase().includes(lowercasedTerm)) ||
        (account.course && account.course.toLowerCase().includes(lowercasedTerm)) ||
        (account.department && account.department.toLowerCase().includes(lowercasedTerm)) ||
        (account.position && account.position.toLowerCase().includes(lowercasedTerm)) ||
        (account.major && account.major.toLowerCase().includes(lowercasedTerm)) ||
        (account.year_level && account.year_level.toLowerCase().includes(lowercasedTerm))
      );
    });
    setSearchResults(results);
  }, [searchTerm, schoolAccounts]);

  useEffect(() => {
    if (searchTerm) {
      handleSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, handleSearch]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>Search School Accounts</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-4">
            <Input
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
            />
            <Button onClick={handleSearch}>Search</Button>
          </div>
          <div>
            <p className="text-sm text-gray-500">
              Results: {searchResults.length}
            </p>
            <div className="mt-2 max-h-[300px] overflow-y-auto">
              {searchResults.map((account) => (
                <div key={account.id} className="border-b py-2 flex items-center">
                  <div className="flex-grow">
                    <div className="flex items-center gap-2">
                      <span 
                        className={`h-2 w-2 rounded-full ${
                          account.is_active ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      />
                      <p className="font-medium">{account.school_id}</p>
                    </div>
                    <p>{`${account.first_name || ''} ${account.middle_name || ''} ${account.last_name || ''}`}</p>
                    <p className="text-sm text-gray-500">{account.course || account.position}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {account.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
// for reference of UI/UX

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ToastProvider } from '@/components/ui/toast';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardFooter
} from "@/components/ui/card";
import { SemesterApi, Semester } from '../lib/semester';
import { Plus, Calendar, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from '@/hooks/use-toast';

interface SemesterSelectionProps {
  onSemesterSelect: (semester: Semester) => void;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

const SemesterSelection: React.FC<SemesterSelectionProps> = ({ onSemesterSelect }) => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [showNewSemesterDialog, setShowNewSemesterDialog] = useState(false);
  const [newSemesterName, setNewSemesterName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        const fetchedSemesters = await SemesterApi.getAllSemesters();
        // Sort semesters by created_at in descending order (latest first)
        const sortedSemesters = fetchedSemesters.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setSemesters(sortedSemesters);
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch semesters",
        });
        console.error(err);
      }
    };

    fetchSemesters();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !showNewSemesterDialog) {
        event.preventDefault();
        setShowNewSemesterDialog(true);
      } else if (event.key === 'Escape' && showNewSemesterDialog) {
        setShowNewSemesterDialog(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showNewSemesterDialog]);

  useEffect(() => {
    if (showNewSemesterDialog && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showNewSemesterDialog]);

  const handleCreateNewSemester = async () => {
    if (!newSemesterName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Semester name cannot be empty",
      });
      return;
    }
  
    try {
      const newSemester = await SemesterApi.createSemester(
        { label: newSemesterName }, 
        "admin", 
        "your_password"
      );
      
      // Update the semesters list
      setSemesters([newSemester, ...semesters]);
      
      // If the new semester is active, update the selected semester
      if (newSemester.is_active) {
        setSelectedSemesterId(newSemester.id);
        onSemesterSelect(newSemester);
      }
      
      setShowNewSemesterDialog(false);
      
      toast({
        title: "Success",
        description: `Semester "${newSemesterName}" ${newSemester.is_active ? 'created and set as active' : 'created successfully'}`,
      });
  
      setNewSemesterName('');
      setError(null);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create semester",
      });
      console.error(err);
    }
  };

  const handleSemesterSelect = (semester: Semester) => {
    setSelectedSemesterId(semester.id);
    onSemesterSelect(semester);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleCreateNewSemester();
    }
  };

  return (
    <ToastProvider>
      <div className="relative">
        <div 
          className="grid grid-cols-3 gap-4 overflow-y-auto pr-2 max-h-[380px]" 
          style={{ 
            overscrollBehavior: 'contain' 
          }}
        >
          <div 
            className="border-2 border-dashed border-green-300 rounded-lg p-4 flex items-center justify-center hover:bg-green-50 transition-colors cursor-pointer group"
            onClick={() => setShowNewSemesterDialog(true)}
          >
            <div className="text-center">
              <Plus className="w-10 h-10 mx-auto mb-2 text-green-600 group-hover:text-green-700" />
              <h3 className="text-sm font-semibold text-green-800 group-hover:text-green-900">
                Create New Semester
              </h3>
            </div>
          </div>

          {semesters.map((semester) => (
            <Card
              key={semester.id}
              className={`transition-colors group flex flex-col h-full ${
                selectedSemesterId === semester.id
                  ? 'bg-green-600 text-white'
                  : 'hover:bg-green-50 border-green-300'
              }`}
            >
              <CardHeader className="pt-2.5 px-3 pb-0">
                <div className="flex items-center justify-between">
                <Button
                    size="icon"
                    variant={selectedSemesterId === semester.id ? 'default' : 'outline'}
                    className={`
                      flex items-center justify-center 
                      w-6 h-6 rounded-sm
                      ${selectedSemesterId === semester.id
                        ? 'bg-white text-green-600 border border-green-300'
                        : 'text-green-600 border-green-300 hover:bg-green-50'
                      }`}
                    onClick={() => handleSemesterSelect(semester)}
                  >
                    {selectedSemesterId === semester.id && (
                      <Check className="w-4 h-4" />
                    )}
                  </Button>
                  <Calendar className={`w-5 h-5 ${
                    selectedSemesterId === semester.id
                      ? 'text-white opacity-80'
                      : 'text-green-500 opacity-70'
                  }`} />
                </div>
                <CardTitle className={`
                  text-lg font-bold pr-4 pt-2
                  overflow-hidden
                  ${selectedSemesterId === semester.id
                    ? 'text-white'
                    : 'text-green-800 group-hover:text-green-900'
                  }`}>
                  {semester.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow pt-0">
                {/* Add any additional content if needed */}
              </CardContent>
              <CardFooter className={`text-xs mt-auto pb-2.5 px-3 ${
                selectedSemesterId === semester.id
                  ? 'text-white opacity-70'
                  : 'text-green-600 opacity-70'
              }`}>
                {semester.updated_at !== semester.created_at
                  ? `Edited: ${formatDate(semester.updated_at)}`
                  : `Created: ${formatDate(semester.created_at)}`}
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Optional: Blur effect at the bottom if overflow occurs */}
        {semesters.length > 5 && (
        <div className="absolute bottom-0 left-0 right-0 h-[10%] bg-gradient-to-t from-white to-transparent pointer-events-none"/>
        )}

        <Dialog open={showNewSemesterDialog} onOpenChange={setShowNewSemesterDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Semester</DialogTitle>
              <DialogDescription>
                Enter a name for the new semester. Press Enter to create or Esc to cancel.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <input 
                ref={inputRef}
                type="text" 
                value={newSemesterName}
                onChange={(e) => setNewSemesterName(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="e.g., SY50-51"
                className="w-full p-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                aria-label="New semester name"
              />
              {error && (
                <p className="text-red-500 text-sm" role="alert">{error}</p>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline"
                onClick={() => setShowNewSemesterDialog(false)}
                className="border-green-500 hover:bg-green-50"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateNewSemester}
                className="bg-green-500 hover:bg-green-600"
              >
                Create Semester
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ToastProvider>
  );
};

export default SemesterSelection;
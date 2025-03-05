import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ClassificationApi, Classification, ClassificationInput } from '@/lib/classifications';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, RefreshCw } from 'lucide-react';

const ClassificationsManager: React.FC = () => {
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [newClassification, setNewClassification] = useState<ClassificationInput>({
    long_name: '',
    short_name: '',
    placing: 0
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchClassifications = async () => {
    try {
      setIsLoading(true);
      // TODO: Add method to get all classifications in ClassificationApi
      // const data = await ClassificationApi.getAllClassifications();
      // setClassifications(data);
    } catch (error) {
      toast({
        title: 'Failed to fetch classifications',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanCourses = async () => {
    try {
      setIsScanning(true);
      const result = await ClassificationApi.scanAndSaveCourses();
      toast({
        title: 'Courses Scanned',
        description: `New: ${result.new_courses}, Updated: ${result.updated_courses}`,
        variant: 'default'
      });
      await fetchClassifications();
    } catch (error) {
      toast({
        title: 'Failed to scan courses',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveClassification = async () => {
    try {
      await ClassificationApi.saveClassification(newClassification);
      toast({
        title: 'Classification Saved',
        variant: 'default'
      });
      setIsDialogOpen(false);
      await fetchClassifications();
      // Reset form
      setNewClassification({
        long_name: '',
        short_name: '',
        placing: 0
      });
    } catch (error) {
      toast({
        title: 'Failed to save classification',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    fetchClassifications();
  }, []);

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Classifications</h2>
        <div className="flex space-x-2">
          <Button 
            onClick={handleScanCourses} 
            disabled={isScanning}
            variant="secondary"
          >
            {isScanning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Scan Courses
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Classification
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Classification</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="long_name" className="text-right">
                    Long Name
                  </Label>
                  <Input
                    id="long_name"
                    value={newClassification.long_name}
                    onChange={(e) => setNewClassification(prev => ({
                      ...prev, 
                      long_name: e.target.value
                    }))}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="short_name" className="text-right">
                    Short Name
                  </Label>
                  <Input
                    id="short_name"
                    value={newClassification.short_name}
                    onChange={(e) => setNewClassification(prev => ({
                      ...prev, 
                      short_name: e.target.value
                    }))}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="placing" className="text-right">
                    Placing
                  </Label>
                  <Input
                    id="placing"
                    type="number"
                    value={newClassification.placing}
                    onChange={(e) => setNewClassification(prev => ({
                      ...prev, 
                      placing: parseInt(e.target.value) || 0
                    }))}
                    className="col-span-3"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="secondary" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveClassification}>
                  Save Classification
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-white/10 rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Long Name</TableHead>
              <TableHead>Short Name</TableHead>
              <TableHead>Placing</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-white" />
                </TableCell>
              </TableRow>
            ) : classifications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-gray-400">
                  No classifications found
                </TableCell>
              </TableRow>
            ) : (
              classifications.map((classification) => (
                <TableRow key={classification.id}>
                  <TableCell>{classification.long_name}</TableCell>
                  <TableCell>{classification.short_name}</TableCell>
                  <TableCell>{classification.placing}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ClassificationsManager;
// components/accounts/CsvUploadComponent.tsx

import React, { useState, useRef } from 'react'
import Papa from 'papaparse'
import { Button } from "@/components/ui/button"
import { useToast } from '@/hooks/use-toast'
import { FileUp, FileCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { logger } from '@/lib/logger'

interface CsvUploadProps {
  onUploadSuccess?: (data: any[]) => void
  buttonLabel?: string
}

const CsvUploadComponent: React.FC<CsvUploadProps> = ({
  onUploadSuccess,
  buttonLabel = "Import from CSV"
}) => {
  const [isUploading, setIsUploading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      const file = files[0]
      
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.csv')) {
        toast({
          title: "Invalid File Type",
          description: "Please select a CSV file",
          variant: "destructive"
        })
        return
      }

      setSelectedFile(file)
      logger.log(`CSV file selected: ${file.name}`, 'info')
    }
  }

  const handleFileImport = async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a CSV file first",
        variant: "destructive"
      })
      return
    }
  
    try {
      setIsUploading(true)
      
      // Read file content directly
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
        const content = e.target?.result as string;
        console.log('File Content:', content);
  
        Papa.parse(content, {
          complete: (results) => {
            console.log('Papa Parse Full Results:', results);
            
            // Log any parsing errors
            if (results.errors.length > 0) {
              console.error('CSV Parsing Errors:', results.errors);
              toast({
                title: "CSV Parse Error",
                description: results.errors.map(err => err.message).join(', '),
                variant: "destructive"
              })
              return
            }
  
            // Enhance data filtering and logging
            const data = results.data.filter(row => {
                // Type guard to check if row is an object
                const isObject = (value: any): value is Record<string, any> => 
                typeof value === 'object' && value !== null && !Array.isArray(value);
            
                // Safely get row values
                const rowValues = Array.isArray(row) 
                ? row 
                : isObject(row) 
                    ? Object.values(row)
                    : [];
                
                // Log each row for debugging
                console.log('Individual Row:', row);
                console.log('Row Values:', rowValues);
            
                // Check if row has any non-empty values
                return rowValues.length > 0 && 
                    rowValues.some(cell => 
                        cell !== null && 
                        cell !== undefined && 
                        String(cell).trim() !== ''
                    );
            });
  
            // Log filtered data
            console.log('Filtered Data:', data);
  
            if (data.length === 0) {
              toast({
                title: "Empty CSV",
                description: "The selected CSV file appears to be empty or contains only empty rows",
                variant: "destructive"
              })
              return
            }
  
            // Call upload success handler
            if (onUploadSuccess) {
              try {
                onUploadSuccess(data)
              } catch (uploadError) {
                console.error('Upload Success Handler Error:', uploadError);
                toast({
                  title: "Upload Failed",
                  description: "Error processing uploaded data",
                  variant: "destructive"
                })
                return
              }
            }
  
            // Show success toast
            toast({
              title: "CSV Import Successful",
              description: `Imported ${data.length} records successfully`,
            })
  
            // Reset state
            setDialogOpen(false)
            setSelectedFile(null)
          },
          header: true,
          skipEmptyLines: true
        });
      };
  
      // Handle file reading errors
      fileReader.onerror = (error) => {
        console.error('File Reading Error:', error);
        toast({
          title: "File Read Error",
          description: "Unable to read the selected file",
          variant: "destructive"
        })
      };
  
      // Read the file as text
      fileReader.readAsText(selectedFile);
    } catch (error) {
      console.error('Overall Import Error:', error);
      logger.log(`Failed to import CSV: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import CSV",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button>
          <FileUp className="mr-2 h-4 w-4" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import School Accounts from CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <input 
            ref={fileInputRef}
            type="file" 
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden" 
            id="csv-file-input"
          />
          
          {selectedFile ? (
            <div className="flex items-center space-x-2 bg-green-50 p-3 rounded">
              <FileCheck className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium">File Selected:</p>
                <p className="text-sm text-gray-600">{selectedFile.name}</p>
              </div>
            </div>
          ) : (
            <p>Click the button below to select a CSV file for importing school accounts.</p>
          )}
          
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={triggerFileInput}
              className="w-full cursor-pointer"
            >
              {selectedFile ? "Change File" : "Select CSV File"}
            </Button>
            <Button
              onClick={handleFileImport}
              disabled={!selectedFile || isUploading}
              className="w-full"
            >
              {isUploading ? "Importing..." : "Confirm Import"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CsvUploadComponent
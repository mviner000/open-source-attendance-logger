import * as React from "react"
import { Plus, Trash2, Loader2, Check, Calendar} from 'lucide-react'
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"

import { Semester, SemesterApi } from "@/lib/semester"

const formSchema = z.object({
  label: z.string().min(1, "Label is required"),
})

type FormData = z.infer<typeof formSchema>

interface SemesterModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function SemesterModal({ 
  isOpen, 
  onOpenChange, 
  onUpdate 
}: SemesterModalProps) {
  const [semesters, setSemesters] = React.useState<Semester[]>([])
  const [loading, setLoading] = React.useState(false)
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null)
  const { toast } = useToast()
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [showNewSemesterDialog, setShowNewSemesterDialog] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: "",
    },
  })

  const loadSemesters = React.useCallback(async () => {
    try {
      const data = await SemesterApi.getAllSemesters()
      setSemesters(data.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ))
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error loading semesters",
        description: String(error),
      })
    }
  }, [toast])

  React.useEffect(() => {
    if (isOpen) {
      loadSemesters()
    }
  }, [isOpen, loadSemesters])

  const createSemester = async (data: FormData) => {
    setLoading(true)
    try {
      const semester = await SemesterApi.createSemester(
        { label: data.label },
        "admin", // Replace with actual credentials
        "your_password"
      )
      toast({
        title: "Semester Created",
        description: `Successfully created semester "${semester.label}"`,
      })
      await loadSemesters()
      form.reset()
      onUpdate()
      setShowNewSemesterDialog(false)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error Creating Semester",
        description: String(error),
      })
    } finally {
      setLoading(false)
    }
  }

  const updateSemester = async (id: string, label: string) => {
    setLoading(true)
    try {
      await SemesterApi.updateSemester(
        id,
        { label },
        "admin", // Replace with actual credentials
        "your_password"
      )
      toast({
        title: "Semester Updated",
        description: `Successfully updated semester label`,
      })
      await loadSemesters()
      onUpdate()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error Updating Semester",
        description: String(error),
      })
    } finally {
      setLoading(false)
      setEditingId(null)
    }
  }

  const setActiveSemester = async (id: string) => {
    setLoading(true)
    try {
      await SemesterApi.setActiveSemester(
        id,
        "admin", // Replace with actual credentials
        "your_password"
      )
      toast({
        title: "Active Semester Changed",
        description: `Successfully set semester as active`,
      })
      await loadSemesters()
      onUpdate()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error Setting Active Semester",
        description: String(error),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    setLoading(true)
    try {
      await SemesterApi.deleteSemester(
        id,
        "admin", // Replace with actual credentials
        "your_password"
      )
      await loadSemesters()
      toast({
        title: "Semester Deleted",
        description: "Successfully deleted the semester",
      })
      onUpdate()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error Deleting Semester",
        description: String(error),
      })
    } finally {
      setLoading(false)
      setDeleteConfirm(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Manage Semesters</DialogTitle>
            <DialogDescription>
              Add, edit, or remove semesters. Click on a semester label to edit. 
              Click on the check icon to set a semester as active.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-4 mt-4 max-h-[400px] overflow-y-auto pr-2">
            <Card
              className="border-2 border-dashed border-green-300 hover:bg-green-50 transition-colors cursor-pointer group"
              onClick={() => setShowNewSemesterDialog(true)}
            >
              <CardContent className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Plus className="w-10 h-10 mx-auto mb-2 text-green-600 group-hover:text-green-700" />
                  <h3 className="text-sm font-semibold text-green-800 group-hover:text-green-900">
                    Create New Semester
                  </h3>
                </div>
              </CardContent>
            </Card>

            {semesters.map((semester) => (
              <Card
                key={semester.id}
                className={`transition-colors group ${
                  semester.is_active
                    ? 'bg-green-600 text-white'
                    : 'hover:bg-green-50 border-green-300'
                }`}
              >
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Button
                      size="icon"
                      variant={semester.is_active ? 'default' : 'outline'}
                      className={`
                        w-6 h-6 rounded-sm
                        ${semester.is_active
                          ? 'bg-white text-green-600 border border-green-300'
                          : 'text-green-600 border-green-300 hover:bg-green-50'
                        }`}
                      onClick={() => setActiveSemester(semester.id)}
                    >
                      {semester.is_active && (
                        <Check className="w-4 h-4" />
                      )}
                    </Button>
                    <Calendar className={`w-5 h-5 ${
                      semester.is_active
                        ? 'text-white opacity-80'
                        : 'text-green-500 opacity-70'
                    }`} />
                  </div>
                  <CardTitle className={`
                    text-lg font-bold
                    ${semester.is_active
                      ? 'text-white'
                      : 'text-green-800 group-hover:text-green-900'
                    }`}>
                    {editingId === semester.id ? (
                      <Input
                        defaultValue={semester.label}
                        onBlur={(e) => updateSemester(semester.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            updateSemester(semester.id, e.currentTarget.value)
                          } else if (e.key === "Escape") {
                            setEditingId(null)
                          }
                        }}
                        className="max-w-[200px]"
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover:underline"
                        onClick={() => setEditingId(semester.id)}
                      >
                        {semester.label}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardFooter className={`text-xs mt-auto p-4 ${
                  semester.is_active
                    ? 'text-white opacity-70'
                    : 'text-green-600 opacity-70'
                }`}>
                  {semester.updated_at !== semester.created_at
                    ? `Edited: ${formatDate(semester.updated_at)}`
                    : `Created: ${formatDate(semester.created_at)}`}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteConfirm(semester.id)}
                    disabled={loading}
                    className="ml-auto"
                  >
                    <Trash2 className={`h-4 w-4 ${semester.is_active ? 'text-white' : 'text-red-500'}`} />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewSemesterDialog} onOpenChange={setShowNewSemesterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Semester</DialogTitle>
            <DialogDescription>
              Enter a name for the new semester. Press Enter to create or Esc to cancel.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(createSemester)} className="space-y-4">
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Semester</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. Fall 2024" 
                        {...field} 
                        disabled={loading}
                        ref={inputRef}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
          <DialogFooter>
            <Button 
              variant="outline"
              onClick={() => setShowNewSemesterDialog(false)}
              className="border-green-500 hover:bg-green-50"
            >
              Cancel
            </Button>
            <Button 
              onClick={form.handleSubmit(createSemester)}
              className="bg-green-500 hover:bg-green-600"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Create Semester'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the semester
              and all related data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}


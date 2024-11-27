"use client"

import * as React from "react"
import { Plus, Trash2, Loader2 } from 'lucide-react'
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
  DialogTrigger,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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

export function SemesterModal() {
  const [semesters, setSemesters] = React.useState<Semester[]>([])
  const [loading, setLoading] = React.useState(false)
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null)
  const [open, setOpen] = React.useState(false)
  const { toast } = useToast()
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const editFormRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: "",
    },
  })

  const loadSemesters = React.useCallback(async () => {
    try {
      const data = await SemesterApi.getAllSemesters()
      setSemesters(data)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error loading semesters",
        description: String(error),
      })
    }
  }, [toast])

  React.useEffect(() => {
    loadSemesters()
  }, [loadSemesters])

  const createSemester = async (data: FormData) => {
    setLoading(true)
    try {
      await SemesterApi.createSemester(
        data,
        "admin", // Replace with actual credentials
        "your_password"
      )
      toast({
        title: "Semester created",
        description: `Successfully created semester "${data.label}"`,
      })
      await loadSemesters()
      form.reset()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error creating semester",
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
        title: "Semester updated",
        description: `Successfully updated semester`,
      })
      await loadSemesters()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error updating semester",
        description: String(error),
      })
    } finally {
      setLoading(false)
      setEditingId(null)
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
        title: "Semester deleted",
        description: "Successfully deleted the semester",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error deleting semester",
        description: String(error),
      })
    } finally {
      setLoading(false)
      setDeleteConfirm(null)
    }
  }

  React.useEffect(() => {
    if (editingId && editFormRef.current) {
      editFormRef.current.focus()
    }
  }, [editingId])

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">Manage Semesters</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Manage Semesters</DialogTitle>
            <DialogDescription>
              Add or remove semesters. Click on a semester label to edit it.
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
                      <div className="flex gap-2">
                        <Input 
                          placeholder="e.g. Fall 2024" 
                          {...field} 
                          disabled={loading}
                          ref={inputRef}
                        />
                        <Button type="submit" disabled={loading}>
                          {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>

          <div className="mt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {semesters.map((semester) => (
                  <TableRow key={semester.id}>
                    <TableCell>
                      {editingId === semester.id ? (
                        <Input
                          defaultValue={semester.label}
                          ref={editFormRef}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              updateSemester(semester.id, e.currentTarget.value)
                            } else if (e.key === "Escape") {
                              setEditingId(null)
                            }
                          }}
                          onBlur={() => setEditingId(null)}
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
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteConfirm(semester.id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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


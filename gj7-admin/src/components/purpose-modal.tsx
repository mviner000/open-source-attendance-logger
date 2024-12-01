// components/purpose-modal.tsx

import * as React from "react"
import { Plus, Trash2, Loader2, RotateCw } from 'lucide-react'
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
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"

import { Purpose, PurposeApi } from "@/lib/purpose"
import { IconSelector } from "@/components/icon-selector"

const formSchema = z.object({
  label: z.string().min(1, "Label is required"),
  icon_name: z.string().min(1, "Icon is required"),
})

type FormData = z.infer<typeof formSchema>

interface PurposeModalProps {
  onUpdate: () => void;
}

export function PurposeModal({ onUpdate }: PurposeModalProps) {
  const [purposes, setPurposes] = React.useState<Purpose[]>([])
  const [loading, setLoading] = React.useState(false)
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null)
  const [open, setOpen] = React.useState(false)
  const [showDeleted, setShowDeleted] = React.useState(false)
  const { toast } = useToast()
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const editFormRef = React.useRef<HTMLInputElement>(null);
  const [selectedIcon, setSelectedIcon] = React.useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: "",
      icon_name: "",
    },
  })

  const loadPurposes = React.useCallback(async () => {
    try {
      const data = await PurposeApi.getAllPurposes(showDeleted)
      setPurposes(data)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error loading purposes",
        description: String(error),
      })
    }
  }, [toast, showDeleted])

  React.useEffect(() => {
    loadPurposes()
  }, [loadPurposes])

  const createPurpose = async (data: FormData) => {
    setLoading(true)
    try {
      await PurposeApi.createPurpose(
        {
          label: data.label,
          icon_name: selectedIcon || data.icon_name
        },
        "admin", // Replace with actual credentials
        "your_password"
      )
      toast({
        title: "Purpose created",
        description: `Successfully created purpose "${data.label}"`,
      })
      await loadPurposes()
      form.reset()
      setSelectedIcon(null)
      onUpdate()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error creating purpose",
        description: String(error),
      })
    } finally {
      setLoading(false)
    }
  }

  const updatePurpose = async (id: string, label: string, iconName: string) => {
    setLoading(true)
    try {
      await PurposeApi.updatePurpose(
        id,
        { 
          label, 
          icon_name: iconName 
        },
        "admin", // Replace with actual credentials
        "your_password"
      )
      toast({
        title: "Purpose updated",
        description: `Successfully updated purpose`,
      })
      await loadPurposes()
      onUpdate()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error updating purpose",
        description: String(error),
      })
    } finally {
      setLoading(false)
      setEditingId(null)
    }
  }

  const handleSoftDelete = async (id: string) => {
    setLoading(true)
    try {
      await PurposeApi.softDeletePurpose(
        id,
        "admin", // Replace with actual credentials
        "your_password"
      )
      await loadPurposes()
      toast({
        title: "Purpose soft deleted",
        description: "Successfully soft deleted the purpose",
      })
      onUpdate()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error soft deleting purpose",
        description: String(error),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (id: string) => {
    setLoading(true)
    try {
      await PurposeApi.restorePurpose(
        id,
        "admin", // Replace with actual credentials
        "your_password"
      )
      await loadPurposes()
      toast({
        title: "Purpose restored",
        description: "Successfully restored the purpose",
      })
      onUpdate()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error restoring purpose",
        description: String(error),
      })
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (editingId && editFormRef.current) {
      editFormRef.current.focus()
    }
  }, [editingId])

  const handleCloseModal = () => {
    setOpen(false)
    onUpdate()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">Manage Purposes</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Manage Purposes</DialogTitle>
            <DialogDescription>
              Add or manage purposes. Click on a purpose label to edit it.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(createPurpose)} className="space-y-4">
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Purpose</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="e.g. Study" 
                          {...field} 
                          disabled={loading}
                          ref={inputRef}
                        />
                        <IconSelector 
                          selectedIcon={selectedIcon} 
                          onIconSelect={(icon) => {
                            setSelectedIcon(icon)
                            form.setValue('icon_name', icon)
                          }} 
                        />
                        <Button type="submit" disabled={loading || !selectedIcon}>
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

          <div className="flex items-center space-x-2 mt-4">
            <Checkbox 
              id="show-deleted"
              checked={showDeleted}
              onCheckedChange={(checked) => setShowDeleted(!!checked)}
            />
            <label
              htmlFor="show-deleted"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Show Deleted Purposes
            </label>
          </div>

          <div className="mt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Icon</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purposes.map((purpose) => (
                  <TableRow key={purpose.id} 
                    className={purpose.is_deleted ? "opacity-50 bg-muted" : ""}
                  >
                    <TableCell>
                      {editingId === purpose.id ? (
                        <Input
                          defaultValue={purpose.label}
                          ref={editFormRef}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              updatePurpose(
                                purpose.id, 
                                e.currentTarget.value, 
                                purpose.icon_name
                              )
                            } else if (e.key === "Escape") {
                              setEditingId(null)
                            }
                          }}
                          onBlur={() => setEditingId(null)}
                          className="max-w-[200px]"
                          disabled={purpose.is_deleted}
                        />
                      ) : (
                        <span
                          className={`cursor-pointer hover:underline ${
                            purpose.is_deleted ? "text-muted-foreground" : ""
                          }`}
                          onClick={() => !purpose.is_deleted && setEditingId(purpose.id)}
                        >
                          {purpose.label}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {purpose.icon_name}
                    </TableCell>
                    <TableCell className="flex gap-2">
                      {purpose.is_deleted ? (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleRestore(purpose.id)}
                          disabled={loading}
                        >
                          <RotateCw className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirm(purpose.id)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="hidden mt-6 flex justify-end">
            <Button onClick={handleCloseModal}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Soft Delete Purpose?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the purpose as deleted but keep it in the database 
              so existing records can still reference it. You can restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleSoftDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Soft Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
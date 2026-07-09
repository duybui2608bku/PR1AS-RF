"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ServiceFormDialog } from "@/components/dashboard/service-form-dialog"
import {
  useAdminServices,
  useDeprecateService,
  useReactivateService,
  useDeleteService,
} from "@/lib/hooks/use-admin-services"
import type { AdminServiceItem } from "@/services/admin-service.service"

const ServicesAdminPage = () => {
  const { data: services, isLoading } = useAdminServices()
  const deprecateMutation = useDeprecateService()
  const reactivateMutation = useReactivateService()
  const deleteMutation = useDeleteService()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AdminServiceItem | null>(null)

  const handleCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const handleEdit = (service: AdminServiceItem) => {
    setEditing(service)
    setDialogOpen(true)
  }

  const handleDeprecate = (service: AdminServiceItem) => {
    setPendingId(service.id)
    deprecateMutation.mutate(service.id, {
      onSettled: () => setPendingId(null),
    })
  }

  const handleReactivate = (service: AdminServiceItem) => {
    setPendingId(service.id)
    reactivateMutation.mutate(service.id, {
      onSettled: () => setPendingId(null),
    })
  }

  const handleDelete = (service: AdminServiceItem) => {
    if (
      !window.confirm(
        `Xóa vĩnh viễn dịch vụ "${service.name.vi}"? Chỉ xóa được khi không còn worker hoặc booking nào dùng.`
      )
    ) {
      return
    }
    setPendingId(service.id)
    deleteMutation.mutate(service.id, {
      onSettled: () => setPendingId(null),
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin" aria-label="Đang tải" />
      </div>
    )
  }

  return (
    <section className="space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Quản lý dịch vụ</h1>
        <Button onClick={handleCreate}>Tạo dịch vụ</Button>
      </header>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã</TableHead>
              <TableHead>Tên</TableHead>
              <TableHead>Nhóm</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(services ?? []).map((service) => {
              const isPending = pendingId === service.id
              return (
                <TableRow key={service.id}>
                  <TableCell className="font-mono text-sm">
                    {service.code}
                  </TableCell>
                  <TableCell>{service.name.vi}</TableCell>
                  <TableCell>{service.category}</TableCell>
                  <TableCell>
                    {service.is_active ? (
                      <Badge>Đang hoạt động</Badge>
                    ) : (
                      <Badge variant="secondary">Đã ngừng</Badge>
                    )}
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleEdit(service)}
                    >
                      Sửa
                    </Button>
                    {service.is_active ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleDeprecate(service)}
                      >
                        Ngừng
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleReactivate(service)}
                      >
                        Bật lại
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleDelete(service)}
                    >
                      Xóa
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <ServiceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        service={editing}
      />
    </section>
  )
}

export default ServicesAdminPage

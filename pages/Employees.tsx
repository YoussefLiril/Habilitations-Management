import { Button } from "@/components/ui/button";
import { Plus, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmployeeTableHeader } from "@/components/employees/EmployeeTableHeader";
import { EmployeeTableRow } from "@/components/employees/EmployeeTableRow";
import { FilterBar } from "@/components/employees/FilterBar";
import { BatchActionsToolbar } from "@/components/employees/BatchActionsToolbar";
import { ExportDialog } from "@/components/employees/ExportDialog";
import { BatchRenewDialog } from "@/components/employees/BatchRenewDialog";
import { BatchPdfDialog } from "@/components/employees/BatchPdfDialog";
import { useEmployees } from "@/hooks/useEmployees";
import { useEmployeeFilters } from "@/hooks/useEmployeeFilters";
import { useBatchOperations } from "@/hooks/useBatchOperations";
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/shared/TablePagination";
import { getDivisions, getServicesByDivision, getEquipesByService } from "@/api";
import { Division, Service, Equipe, HabilitationRow } from "@/types";
import { Users } from "lucide-react";

export default function Employees() {
  const { employees, isLoading } = useEmployees();
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  
  // Flatten habilitations into rows
  const allHabilitations: HabilitationRow[] = employees.flatMap((emp) =>
    (emp.habilitations || []).map((hab) => ({
      ...hab,
      matricule: emp.matricule,
      prenom: emp.prenom,
      nom: emp.nom,
      division: emp.division,
      service: emp.service,
      equipe: emp.equipe,
    }))
  );

  // Split HT and ST
  const htHabs = allHabilitations.filter((h) => h.type === "HT");
  const stHabs = allHabilitations.filter((h) => h.type === "ST");

  // Filters
  const htFilters = useEmployeeFilters(htHabs);
  const stFilters = useEmployeeFilters(stHabs);

  // Batch operations
  const batchOps = useBatchOperations();

  // Pagination
  const htPagination = usePagination(htFilters.filteredAndSorted, 50);
  const stPagination = usePagination(stFilters.filteredAndSorted, 50);

  // Dialogs
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    habId: number;
    empName: string;
  }>({ open: false, habId: 0, empName: "" });
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState<{
    open: boolean;
    count: number;
  }>({ open: false, count: 0 });
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [batchRenewOpen, setBatchRenewOpen] = useState(false);
  const [batchPdfOpen, setBatchPdfOpen] = useState(false);

  // Fetch divisions
  useEffect(() => {
    const fetchDivisions = async () => {
      try {
        const data = await getDivisions();
        setDivisions(data);
      } catch (err) {
        console.error("Failed to fetch divisions:", err);
      }
    };
    fetchDivisions();
  }, []);

  // Fetch services when division changes (HT)
  useEffect(() => {
    if (htFilters.filterDivision === "all") {
      setServices([]);
      htFilters.setFilterService("all");
      return;
    }

    const fetchServices = async () => {
      try {
        const division = divisions.find((d) => d.name === htFilters.filterDivision);
        if (division) {
          const data = await getServicesByDivision(division.id);
          setServices(data);
          htFilters.setFilterService("all");
        }
      } catch (err) {
        console.error("Failed to fetch services:", err);
      }
    };
    fetchServices();
  }, [htFilters.filterDivision, divisions]);

  // Fetch equipes when service changes (HT)
  useEffect(() => {
    if (htFilters.filterService === "all") {
      setEquipes([]);
      htFilters.setFilterEquipe("all");
      return;
    }

    const fetchEquipes = async () => {
      try {
        const service = services.find((s) => s.name === htFilters.filterService);
        if (service) {
          const data = await getEquipesByService(service.id);
          setEquipes(data);
          htFilters.setFilterEquipe("all");
        }
      } catch (err) {
        console.error("Failed to fetch equipes:", err);
      }
    };
    fetchEquipes();
  }, [htFilters.filterService, services]);

  // Sync ST filters with HT filters for organization hierarchy
  useEffect(() => {
    stFilters.setFilterDivision(htFilters.filterDivision);
    stFilters.setFilterService(htFilters.filterService);
    stFilters.setFilterEquipe(htFilters.filterEquipe);
  }, [
    htFilters.filterDivision,
    htFilters.filterService,
    htFilters.filterEquipe,
  ]);

  const handleDeleteHabilitation = async (habId: number) => {
    try {
      const response = await fetch(`/api/habilitations/${habId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (!response.ok) throw new Error("Failed to delete habilitation");

      window.location.reload(); // Simple refresh for now
    } catch (err) {
      console.error(err);
    }
    setDeleteConfirm({ open: false, habId: 0, empName: "" });
  };

  if (isLoading) {
    return (
      <Layout>
        <LoadingSpinner message="Chargement des employés..." className="h-96" />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Gestion des Habilitations</h1>
            <p className="text-muted-foreground mt-1">
              {htHabs.length + stHabs.length} habilitation(s) trouvée(s)
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link to="/employees/add">
              <Button className="gap-2 w-full sm:w-auto">
                <Plus className="w-4 h-4" />
                Ajouter
              </Button>
            </Link>
            <Button
              variant="outline"
              className="gap-2 w-full sm:w-auto"
              onClick={() => setExportDialogOpen(true)}
            >
              <Download className="w-4 h-4" />
              Exporter
            </Button>
            <BatchActionsToolbar
              selectedCount={batchOps.selectedIds.length}
              onRenew={() => setBatchRenewOpen(true)}
              onUploadPdf={() => setBatchPdfOpen(true)}
              onDelete={() =>
                setBatchDeleteConfirm({
                  open: true,
                  count: batchOps.selectedIds.length,
                })
              }
              onClearSelection={batchOps.clearSelection}
              isDeleting={batchOps.isDeleting}
              isRenewing={batchOps.isRenewing}
            />
          </div>
        </div>

        {/* Filters */}
        <FilterBar
          searchTerm={htFilters.searchTerm}
          onSearchChange={htFilters.setSearchTerm}
          filterDivision={htFilters.filterDivision}
          onDivisionChange={htFilters.setFilterDivision}
          filterService={htFilters.filterService}
          onServiceChange={htFilters.setFilterService}
          filterEquipe={htFilters.filterEquipe}
          onEquipeChange={htFilters.setFilterEquipe}
          sortBy={htFilters.sortBy}
          onSortChange={htFilters.setSortBy}
          divisions={divisions}
          services={services}
          equipes={equipes}
        />

        {/* HT Habilitations Table */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">
            Habilitations HT ({htFilters.filteredAndSorted.length})
          </h2>
          <div className="border rounded-lg overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <EmployeeTableHeader
                    allSelected={
                      batchOps.selectedHT.size === htPagination.paginatedItems.length &&
                      htPagination.paginatedItems.length > 0
                    }
                    onSelectAll={(checked) => {
                      if (checked) {
                        batchOps.selectAllHT(htPagination.paginatedItems.map((h) => h.id));
                      } else {
                        batchOps.deselectAllHT();
                      }
                    }}
                  />
                </thead>
                <tbody>
                  {htPagination.paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={12}>
                        <EmptyState
                          icon={Users}
                          title="Aucune habilitation HT trouvée"
                          description="Aucune habilitation ne correspond aux filtres sélectionnés"
                        />
                      </td>
                    </tr>
                  ) : (
                    htPagination.paginatedItems.map((hab) => (
                      <EmployeeTableRow
                        key={hab.id}
                        hab={hab}
                        selected={batchOps.selectedHT.has(hab.id)}
                        onSelect={(checked) => {
                          if (checked) {
                            batchOps.toggleHT(hab.id);
                          } else {
                            batchOps.toggleHT(hab.id);
                          }
                        }}
                        onDelete={() => {
                          setDeleteConfirm({
                            open: true,
                            habId: hab.id,
                            empName: `${hab.nom} ${hab.prenom}`,
                          });
                        }}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination
              currentPage={htPagination.currentPage}
              totalPages={htPagination.totalPages}
              onPageChange={htPagination.goToPage}
              hasNextPage={htPagination.hasNextPage}
              hasPreviousPage={htPagination.hasPreviousPage}
              startIndex={htPagination.startIndex}
              endIndex={htPagination.endIndex}
              totalItems={htPagination.totalItems}
            />
          </div>
        </div>

        {/* ST Habilitations Table */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">
            Habilitations ST ({stFilters.filteredAndSorted.length})
          </h2>
          <div className="border rounded-lg overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <EmployeeTableHeader
                    allSelected={
                      batchOps.selectedST.size === stPagination.paginatedItems.length &&
                      stPagination.paginatedItems.length > 0
                    }
                    onSelectAll={(checked) => {
                      if (checked) {
                        batchOps.selectAllST(stPagination.paginatedItems.map((h) => h.id));
                      } else {
                        batchOps.deselectAllST();
                      }
                    }}
                  />
                </thead>
                <tbody>
                  {stPagination.paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={12}>
                        <EmptyState
                          icon={Users}
                          title="Aucune habilitation ST trouvée"
                          description="Aucune habilitation ne correspond aux filtres sélectionnés"
                        />
                      </td>
                    </tr>
                  ) : (
                    stPagination.paginatedItems.map((hab) => (
                      <EmployeeTableRow
                        key={hab.id}
                        hab={hab}
                        selected={batchOps.selectedST.has(hab.id)}
                        onSelect={(checked) => {
                          if (checked) {
                            batchOps.toggleST(hab.id);
                          } else {
                            batchOps.toggleST(hab.id);
                          }
                        }}
                        onDelete={() => {
                          setDeleteConfirm({
                            open: true,
                            habId: hab.id,
                            empName: `${hab.nom} ${hab.prenom}`,
                          });
                        }}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination
              currentPage={stPagination.currentPage}
              totalPages={stPagination.totalPages}
              onPageChange={stPagination.goToPage}
              hasNextPage={stPagination.hasNextPage}
              hasPreviousPage={stPagination.hasPreviousPage}
              startIndex={stPagination.startIndex}
              endIndex={stPagination.endIndex}
              totalItems={stPagination.totalItems}
            />
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        employees={employees}
        divisions={divisions}
      />

      <BatchRenewDialog
        open={batchRenewOpen}
        onOpenChange={setBatchRenewOpen}
        selectedCount={batchOps.selectedIds.length}
        onConfirm={(validationDate) => {
          batchOps.batchRenew({
            habilitationIds: batchOps.selectedIds,
            date_validation: validationDate,
          });
        }}
        isRenewing={batchOps.isRenewing}
      />

      <BatchPdfDialog
        open={batchPdfOpen}
        onOpenChange={setBatchPdfOpen}
        selectedCount={batchOps.selectedIds.length}
        onConfirm={(files) => {
          batchOps.batchUploadPdf({
            habilitationIds: batchOps.selectedIds,
            files,
          });
        }}
        isUploading={batchOps.isUploadingPdf}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm((p) => ({ ...p, open }))}
        title="Supprimer l'habilitation"
        description={`Êtes-vous sûr de vouloir supprimer cette habilitation pour ${deleteConfirm.empName} ? Cette action ne peut pas être annulée.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
        onConfirm={() => handleDeleteHabilitation(deleteConfirm.habId)}
      />

      <ConfirmDialog
        open={batchDeleteConfirm.open}
        onOpenChange={(open) => setBatchDeleteConfirm((p) => ({ ...p, open }))}
        title="Supprimer les habilitations sélectionnées"
        description={`Êtes-vous sûr de vouloir supprimer ${batchDeleteConfirm.count} habilitation(s) ? Cette action ne peut pas être annulée.`}
        confirmText={batchOps.isDeleting ? "Suppression..." : "Supprimer"}
        cancelText="Annuler"
        variant="danger"
        onConfirm={() => batchOps.batchDelete(batchOps.selectedIds)}
      />
    </Layout>
  );
}

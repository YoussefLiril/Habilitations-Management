import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Search, Edit, Trash2, Eye, Calendar, Download, CheckSquare, MoreVertical, RefreshCw, Upload } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { exportEmployeesToExcel } from "@/utils/exportToExcel";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Layout } from "@/components/Layout";
import { format } from "date-fns";

interface Habilitation {
  id: number;
  employee_id: number;
  type: "HT" | "ST";
  codes: string[];
  numero: string | null;
  date_validation: string;
  date_expiration: string;
  pdf_path?: string | null;
}

interface Employee {
  id: number;
  matricule: string;
  prenom: string;
  nom: string;
  division: string;
  service: string;
  equipe: string;
  habilitations?: Habilitation[];
}

interface Division {
  id: number;
  name: string;
}

interface Service {
  id: number;
  name: string;
}

interface Equipe {
  id: number;
  name: string;
}

interface HabilitationRow extends Habilitation {
  matricule: string;
  prenom: string;
  nom: string;
  division: string;
  service: string;
  equipe: string;
}

const COLOR_CONFIG = {
  expired: { name: "Expiré", color: "bg-red-500", textColor: "text-red-600 dark:text-red-400" },
  expiringSoon1Month: { name: "1 mois", color: "bg-red-400", textColor: "text-red-500 dark:text-red-400" },
  expiringSoon2Months: { name: "2 mois", color: "bg-orange-500", textColor: "text-orange-600 dark:text-orange-400" },
  expiringSoon3Months: { name: "3 mois", color: "bg-yellow-500", textColor: "text-yellow-600 dark:text-yellow-400" },
  valid: { name: "Valide", color: "bg-green-500", textColor: "text-green-600 dark:text-green-400" },
};

export default function Employees() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDivision, setFilterDivision] = useState("all");
  const [filterService, setFilterService] = useState("all");
  const [filterEquipe, setFilterEquipe] = useState("all");
  const [sortBy, setSortBy] = useState("matricule");
  const [selectedHT, setSelectedHT] = useState<Set<number>>(new Set());
  const [selectedST, setSelectedST] = useState<Set<number>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; habId: number; empName: string }>({ open: false, habId: 0, empName: "" });
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState<{ open: boolean; count: number }>({ open: false, count: 0 });
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [batchRenewOpen, setBatchRenewOpen] = useState(false);
  const [batchRenewData, setBatchRenewData] = useState({
    validationDate: "",
  });
  const [batchRenewing, setBatchRenewing] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFilters, setExportFilters] = useState({
    status: "all",
    division: "all",
  });
  const [batchPdfOpen, setBatchPdfOpen] = useState(false);
  const [batchPdfFiles, setBatchPdfFiles] = useState<File[]>([]);
  const [batchPdfUploading, setBatchPdfUploading] = useState(false);

  // Fetch employees on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [divRes, empRes] = await Promise.all([
          fetch("/api/divisions", {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          }),
          fetch("/api/employees", {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          }),
        ]);

        if (divRes.ok && empRes.ok) {
          const divs = await divRes.json();
          const emps = await empRes.json();
          setDivisions(divs);
          setEmployees(emps);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
        toast({
          title: "Erreur",
          description: "Impossible de charger les données",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch services when division changes
  useEffect(() => {
    if (filterDivision === "all") {
      setServices([]);
      setFilterService("all");
      return;
    }

    const fetchServices = async () => {
      try {
        const response = await fetch(`/api/divisions/${filterDivision}/services`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (response.ok) {
          const data = await response.json();
          setServices(data);
          setFilterService("all");
        }
      } catch (err) {
        console.error("Failed to fetch services:", err);
      }
    };
    fetchServices();
  }, [filterDivision]);

  // Fetch equipes when service changes
  useEffect(() => {
    if (filterService === "all") {
      setEquipes([]);
      setFilterEquipe("all");
      return;
    }

    const fetchEquipes = async () => {
      try {
        const response = await fetch(`/api/services/${filterService}/equipes`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (response.ok) {
          const data = await response.json();
          setEquipes(data);
          setFilterEquipe("all");
        }
      } catch (err) {
        console.error("Failed to fetch equipes:", err);
      }
    };
    fetchEquipes();
  }, [filterService]);

  // Flatten habilitations into rows
  const flattenHabilitations = (): HabilitationRow[] => {
    const rows: HabilitationRow[] = [];
    employees.forEach((emp) => {
      if (emp.habilitations) {
        emp.habilitations.forEach((hab) => {
          rows.push({
            ...hab,
            matricule: emp.matricule,
            prenom: emp.prenom,
            nom: emp.nom,
            division: emp.division,
            service: emp.service,
            equipe: emp.equipe,
          });
        });
      }
    });
    return rows;
  };

  // Filter habilitations
  const filterHabilitations = (habs: HabilitationRow[]): HabilitationRow[] => {
    return habs.filter((hab) => {
      const matchesSearch =
        hab.matricule.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hab.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hab.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hab.equipe.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDivision =
        filterDivision === "all" || hab.division === filterDivision;

      const matchesService =
        filterService === "all" || hab.service === filterService;

      const matchesEquipe =
        filterEquipe === "all" || hab.equipe === filterEquipe;

      return matchesSearch && matchesDivision && matchesService && matchesEquipe;
    });
  };

  // Sort habilitations
  const sortHabilitations = (habs: HabilitationRow[]): HabilitationRow[] => {
    return habs.sort((a, b) => {
      switch (sortBy) {
        case "matricule":
          return a.matricule.localeCompare(b.matricule);
        case "nom":
          return (a.nom + a.prenom).localeCompare(b.nom + b.prenom);
        case "expiration":
          return new Date(a.date_expiration).getTime() - new Date(b.date_expiration).getTime();
        default:
          return 0;
      }
    });
  };

  const allHabs = flattenHabilitations();
  const htHabs = sortHabilitations(filterHabilitations(allHabs.filter((h) => h.type === "HT")));
  const stHabs = sortHabilitations(filterHabilitations(allHabs.filter((h) => h.type === "ST")));

  const getHabilitationStatus = (hab: Habilitation) => {
    const expDate = new Date(hab.date_expiration);
    const today = new Date();
    const daysUntilExpiry = Math.ceil(
      (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry < 0) return "expired";
    if (daysUntilExpiry <= 30) return "expiringSoon1Month";
    if (daysUntilExpiry <= 60) return "expiringSoon2Months";
    if (daysUntilExpiry <= 90) return "expiringSoon3Months";
    return "valid";
  };

  const getDaysUntilExpiry = (dateExpiration: string): number => {
    const expDate = new Date(dateExpiration);
    const today = new Date();
    return Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "expired":
        return "text-red-600 dark:text-red-400";
      case "expiringSoon1Month":
        return "text-red-500 dark:text-red-400";
      case "expiringSoon2Months":
        return "text-orange-600 dark:text-orange-400";
      case "expiringSoon3Months":
        return "text-yellow-600 dark:text-yellow-400";
      case "valid":
        return "text-green-600 dark:text-green-400";
      default:
        return "";
    }
  };

  const handleFilteredExport = () => {
    let filteredEmps = employees;

    if (exportFilters.division !== "all") {
      filteredEmps = filteredEmps.filter((emp) => emp.division === exportFilters.division);
    }

    if (exportFilters.status !== "all") {
      filteredEmps = filteredEmps.map((emp) => ({
        ...emp,
        habilitations: emp.habilitations?.filter((hab) => {
          const status = getHabilitationStatus(hab);
          return status === exportFilters.status;
        }),
      }));
    }

    const filename = `habilitations_${exportFilters.division !== "all" ? exportFilters.division : 'toutes'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    exportEmployeesToExcel(filteredEmps, filename);

    toast({
      title: "Export réussi",
      description: "Les données filtrées ont été exportées",
    });

    setExportDialogOpen(false);
  };

  const handleBatchPdfUpload = async () => {
    const selectedIds = Array.from(selectedHT).concat(Array.from(selectedST));
    if (selectedIds.length === 0 || batchPdfFiles.length === 0) {
      toast({
        title: "Erreur",
        description: "Sélectionnez au moins une habilitation et un PDF",
        variant: "destructive",
      });
      return;
    }

    setBatchPdfUploading(true);
    try {
      const formData = new FormData();
      batchPdfFiles.forEach((file) => {
        formData.append("pdfs", file);
      });
      formData.append(
        "habilitationIds",
        JSON.stringify(selectedIds.slice(0, batchPdfFiles.length))
      );

      const response = await fetch("/api/habilitations/batch-upload-pdf", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload PDFs");

      const data = await response.json();

      toast({
        title: "PDFs téléchargés",
        description: `${data.uploaded} fichier(s) téléchargé(s) avec succès`,
      });

      // Refresh employees data
      const empResponse = await fetch("/api/employees", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (empResponse.ok) {
        setEmployees(await empResponse.json());
      }

      setBatchPdfOpen(false);
      setBatchPdfFiles([]);
      setSelectedHT(new Set());
      setSelectedST(new Set());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur serveur";
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    } finally {
      setBatchPdfUploading(false);
    }
  };

  const handleDeleteHabilitation = async (habId: number) => {
    try {
      const response = await fetch(`/api/habilitations/${habId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (!response.ok) throw new Error("Failed to delete habilitation");

      setEmployees((prev) =>
        prev.map((emp) => ({
          ...emp,
          habilitations: emp.habilitations?.filter((h) => h.id !== habId),
        }))
      );

      toast({
        title: "Habilitation supprimée",
        description: "L'habilitation a été supprimée avec succès",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur serveur";
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    }
    setDeleteConfirm({ open: false, habId: 0, empName: "" });
  };

  const handleBatchDelete = async () => {
    const selectedIds = Array.from(selectedHT).concat(Array.from(selectedST));
    if (selectedIds.length === 0) return;

    setBatchDeleting(true);
    try {
      const response = await fetch("/api/habilitations/batch-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ habilitationIds: selectedIds }),
      });

      if (!response.ok) throw new Error("Failed to delete habilitations");

      setEmployees((prev) =>
        prev.map((emp) => ({
          ...emp,
          habilitations: emp.habilitations?.filter(
            (h) => !selectedIds.includes(h.id)
          ),
        }))
      );

      toast({
        title: "Habilitations supprimées",
        description: `${selectedIds.length} habilitation(s) supprimée(s) avec succès`,
      });

      setSelectedHT(new Set());
      setSelectedST(new Set());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur serveur";
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    } finally {
      setBatchDeleting(false);
      setBatchDeleteConfirm({ open: false, count: 0 });
    }
  };

  const handleBatchRenewal = async () => {
    const selectedIds = Array.from(selectedHT).concat(Array.from(selectedST));
    if (selectedIds.length === 0 || !batchRenewData.validationDate) return;

    setBatchRenewing(true);
    try {
      const response = await fetch("/api/habilitations/batch-update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          habilitationIds: selectedIds,
          codes: [],
          date_validation: batchRenewData.validationDate,
        }),
      });

      if (!response.ok) throw new Error("Failed to renew habilitations");

      const data = await response.json();

      setEmployees((prev) => {
        const newEmployees = JSON.parse(JSON.stringify(prev));
        const habMap = new Map(
          data.habilitations.map((h: any) => [h.id, h])
        );

        newEmployees.forEach((emp: Employee) => {
          if (emp.habilitations) {
            emp.habilitations = emp.habilitations.map((h: Habilitation) =>
              habMap.has(h.id) ? habMap.get(h.id) : h
            );
          }
        });

        return newEmployees;
      });

      toast({
        title: "Habilitations renouvelées",
        description: `${selectedIds.length} habilitation(s) renouvelée(s) avec succès`,
      });

      setSelectedHT(new Set());
      setSelectedST(new Set());
      setBatchRenewOpen(false);
      setBatchRenewData({ validationDate: "" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur serveur";
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    } finally {
      setBatchRenewing(false);
    }
  };

  const TableRow = ({
    hab,
    selected,
    onSelect,
    onDelete,
  }: {
    hab: HabilitationRow;
    selected: boolean;
    onSelect: (selected: boolean) => void;
    onDelete: () => void;
  }) => {
    const status = getHabilitationStatus(hab);
    const daysUntilExpiry = getDaysUntilExpiry(hab.date_expiration);

    return (
      <tr className="border-b border-border hover:bg-muted/50 transition-colors">
        <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={selected} onCheckedChange={onSelect} />
        </td>
        <td className="px-4 py-3 text-sm font-mono font-semibold cursor-pointer hover:text-primary" onClick={() => navigate(`/employees/${hab.employee_id}`)}>
          {hab.matricule}
        </td>
        <td className="px-4 py-3 text-sm">
          <div className="font-medium">{hab.nom} {hab.prenom}</div>
        </td>
        <td className="hidden sm:table-cell px-4 py-3 text-sm text-muted-foreground">{hab.division}</td>
        <td className="hidden md:table-cell px-4 py-3 text-sm text-muted-foreground">{hab.service}</td>
        <td className="hidden lg:table-cell px-4 py-3 text-sm text-muted-foreground">{hab.equipe}</td>
        <td className="px-4 py-3 text-sm">
          <div className="text-xs bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 px-2 py-1 rounded inline-block">
            {hab.codes.join(", ")}
          </div>
        </td>
        <td className="hidden sm:table-cell px-4 py-3 text-sm font-mono text-muted-foreground">{hab.numero || "—"}</td>
        <td className="hidden md:table-cell px-4 py-3 text-sm">{format(new Date(hab.date_validation), "dd/MM/yyyy")}</td>
        <td className="hidden lg:table-cell px-4 py-3 text-sm">{format(new Date(hab.date_expiration), "dd/MM/yyyy")}</td>
        <td className={cn("px-4 py-3 text-sm font-medium", getStatusColor(status))}>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {daysUntilExpiry > 0 ? `${daysUntilExpiry}j` : "Expiré"}
          </div>
        </td>
        <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/employees/${hab.employee_id}`)}>
                <Eye className="w-4 h-4 mr-2" />
                Voir profil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/employees/${hab.employee_id}/edit`)}>
                <Edit className="w-4 h-4 mr-2" />
                Éditer employé
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-600 dark:text-red-400">
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Chargement des employés...</p>
          </div>
        </div>
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
            {(selectedHT.size > 0 || selectedST.size > 0) && (
              <>
                <Button
                  className="gap-2 w-full sm:w-auto"
                  onClick={() => setBatchRenewOpen(true)}
                  disabled={batchRenewing}
                >
                  <RefreshCw className="w-4 h-4" />
                  Renouveler ({selectedHT.size + selectedST.size})
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 w-full sm:w-auto"
                  onClick={() => setBatchPdfOpen(true)}
                >
                  <Upload className="w-4 h-4" />
                  PDFs ({selectedHT.size + selectedST.size})
                </Button>
                <Button
                  variant="destructive"
                  className="gap-2 w-full sm:w-auto"
                  onClick={() =>
                    setBatchDeleteConfirm({
                      open: true,
                      count: selectedHT.size + selectedST.size,
                    })
                  }
                  disabled={batchDeleting}
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer ({selectedHT.size + selectedST.size})
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 w-full sm:w-auto"
                  onClick={() => {
                    setSelectedHT(new Set());
                    setSelectedST(new Set());
                  }}
                >
                  <CheckSquare className="w-4 h-4" />
                  Désélectionner
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="border rounded-lg p-6 space-y-4 bg-card">
          <h3 className="font-semibold">Filtres et recherche</h3>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Chercher par nom, matricule..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterDivision} onValueChange={setFilterDivision}>
              <SelectTrigger>
                <SelectValue placeholder="Division" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les divisions</SelectItem>
                {divisions.map((div) => (
                  <SelectItem key={div.id} value={div.name}>
                    {div.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterService} onValueChange={setFilterService} disabled={filterDivision === "all"}>
              <SelectTrigger>
                <SelectValue placeholder="Service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les services</SelectItem>
                {services.map((svc) => (
                  <SelectItem key={svc.id} value={svc.name}>
                    {svc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterEquipe} onValueChange={setFilterEquipe} disabled={filterService === "all"}>
              <SelectTrigger>
                <SelectValue placeholder="Équipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les équipes</SelectItem>
                {equipes.map((eq) => (
                  <SelectItem key={eq.id} value={eq.name}>
                    {eq.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="matricule">Matricule</SelectItem>
                <SelectItem value="nom">Nom</SelectItem>
                <SelectItem value="expiration">Expiration</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* HT Habilitations Table */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Habilitations HT ({htHabs.length})</h2>
          <div className="border rounded-lg overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-2 py-3 text-left">
                      <Checkbox
                        checked={selectedHT.size === htHabs.length && htHabs.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedHT(new Set(htHabs.map((h) => h.id)));
                          } else {
                            setSelectedHT(new Set());
                          }
                        }}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Matricule</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Nom Prénom</th>
                    <th className="hidden sm:table-cell px-4 py-3 text-left text-sm font-semibold">Division</th>
                    <th className="hidden md:table-cell px-4 py-3 text-left text-sm font-semibold">Service</th>
                    <th className="hidden lg:table-cell px-4 py-3 text-left text-sm font-semibold">Équipe</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Codes</th>
                    <th className="hidden sm:table-cell px-4 py-3 text-left text-sm font-semibold">N° Titre</th>
                    <th className="hidden md:table-cell px-4 py-3 text-left text-sm font-semibold">Date Validation</th>
                    <th className="hidden lg:table-cell px-4 py-3 text-left text-sm font-semibold">Date Expiration</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Statut</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {htHabs.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-6 py-8 text-center text-muted-foreground">
                        Aucune habilitation HT trouvée
                      </td>
                    </tr>
                  ) : (
                    htHabs.map((hab) => (
                      <TableRow
                        key={hab.id}
                        hab={hab}
                        selected={selectedHT.has(hab.id)}
                        onSelect={(checked) => {
                          const newSelected = new Set(selectedHT);
                          if (checked) {
                            newSelected.add(hab.id);
                          } else {
                            newSelected.delete(hab.id);
                          }
                          setSelectedHT(newSelected);
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
          </div>
        </div>

        {/* ST Habilitations Table */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Habilitations ST ({stHabs.length})</h2>
          <div className="border rounded-lg overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-2 py-3 text-left">
                      <Checkbox
                        checked={selectedST.size === stHabs.length && stHabs.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedST(new Set(stHabs.map((h) => h.id)));
                          } else {
                            setSelectedST(new Set());
                          }
                        }}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Matricule</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Nom Prénom</th>
                    <th className="hidden sm:table-cell px-4 py-3 text-left text-sm font-semibold">Division</th>
                    <th className="hidden md:table-cell px-4 py-3 text-left text-sm font-semibold">Service</th>
                    <th className="hidden lg:table-cell px-4 py-3 text-left text-sm font-semibold">Équipe</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Codes</th>
                    <th className="hidden sm:table-cell px-4 py-3 text-left text-sm font-semibold">N° Titre</th>
                    <th className="hidden md:table-cell px-4 py-3 text-left text-sm font-semibold">Date Validation</th>
                    <th className="hidden lg:table-cell px-4 py-3 text-left text-sm font-semibold">Date Expiration</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Statut</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stHabs.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-6 py-8 text-center text-muted-foreground">
                        Aucune habilitation ST trouvée
                      </td>
                    </tr>
                  ) : (
                    stHabs.map((hab) => (
                      <TableRow
                        key={hab.id}
                        hab={hab}
                        selected={selectedST.has(hab.id)}
                        onSelect={(checked) => {
                          const newSelected = new Set(selectedST);
                          if (checked) {
                            newSelected.add(hab.id);
                          } else {
                            newSelected.delete(hab.id);
                          }
                          setSelectedST(newSelected);
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
          </div>
        </div>
      </div>

      <Dialog open={batchPdfOpen} onOpenChange={setBatchPdfOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Télécharger les PDFs</DialogTitle>
            <DialogDescription>
              Sélectionnez les fichiers PDF pour les {selectedHT.size + selectedST.size} habilitation(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="batch-pdf-files">
                Fichiers PDF (jusqu'à {selectedHT.size + selectedST.size} fichiers)
              </Label>
              <Input
                id="batch-pdf-files"
                type="file"
                accept=".pdf"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setBatchPdfFiles(files);
                }}
              />
              {batchPdfFiles.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {batchPdfFiles.length} fichier(s) sélectionné(s)
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Les PDFs seront associés aux habilitations sélectionnées dans l'ordre.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBatchPdfOpen(false);
                setBatchPdfFiles([]);
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleBatchPdfUpload}
              disabled={
                batchPdfUploading ||
                batchPdfFiles.length === 0
              }
            >
              {batchPdfUploading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Téléchargement...
                </span>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Télécharger
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Exporter les habilitations</DialogTitle>
            <DialogDescription>
              Sélectionnez les filtres pour l'export
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="export-status">Statut</Label>
              <Select
                value={exportFilters.status}
                onValueChange={(value) =>
                  setExportFilters({ ...exportFilters, status: value })
                }
              >
                <SelectTrigger id="export-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="expired">Expiré</SelectItem>
                  <SelectItem value="expiringSoon1Month">
                    Expire dans 1 mois
                  </SelectItem>
                  <SelectItem value="expiringSoon2Months">
                    Expire dans 2 mois
                  </SelectItem>
                  <SelectItem value="expiringSoon3Months">
                    Expire dans 3 mois
                  </SelectItem>
                  <SelectItem value="valid">Valide</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="export-division">Division</Label>
              <Select
                value={exportFilters.division}
                onValueChange={(value) =>
                  setExportFilters({ ...exportFilters, division: value })
                }
              >
                <SelectTrigger id="export-division">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les divisions</SelectItem>
                  {divisions.map((div) => (
                    <SelectItem key={div.id} value={div.name}>
                      {div.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExportDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button onClick={handleFilteredExport} className="gap-2">
              <Download className="w-4 h-4" />
              Exporter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={batchRenewOpen} onOpenChange={setBatchRenewOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Renouveler les habilitations sélectionnées</DialogTitle>
            <DialogDescription>
              Sélectionnez une nouvelle date de validation pour {selectedHT.size + selectedST.size} habilitation(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="batch-renewal-date">
                Nouvelle date de validation *
              </Label>
              <Input
                id="batch-renewal-date"
                type="date"
                value={batchRenewData.validationDate}
                onChange={(e) =>
                  setBatchRenewData({
                    validationDate: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBatchRenewOpen(false);
                setBatchRenewData({ validationDate: "" });
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleBatchRenewal}
              disabled={
                batchRenewing || !batchRenewData.validationDate
              }
            >
              {batchRenewing ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Renouvellement...
                </span>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Renouveler
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        confirmText={batchDeleting ? "Suppression..." : "Supprimer"}
        cancelText="Annuler"
        variant="danger"
        onConfirm={handleBatchDelete}
      />
    </Layout>
  );
}

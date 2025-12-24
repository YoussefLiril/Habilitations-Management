import { Layout } from "@/components/Layout";
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
import { ArrowLeft, Trash2, Plus, FileUp, X } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { PDFUpload } from "@/components/PDFUpload";
import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { Employee, Habilitation, Division, Service, Equipe, HT_CODES, ST_CODES } from "@/types";

export default function EditEmployee() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    matricule: "",
    prenom: "",
    nom: "",
    division_id: "",
    service_id: "",
    equipe_id: "",
  });

  const [divisions, setDivisions] = useState<Division[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);

  const [editingHab, setEditingHab] = useState<{ [key: number]: boolean }>({});
  const [habData, setHabData] = useState<{ [key: number]: Partial<Habilitation> }>({});

  // New habilitation state
  const [showNewHab, setShowNewHab] = useState(false);
  const [newHabData, setNewHabData] = useState({
    type: "HT" as "HT" | "ST",
    codes: [] as string[],
    numero: "",
    dateValidation: "",
    pdfFile: null as File | null,
  });
  const [addingHab, setAddingHab] = useState(false);

  // Fetch divisions on mount
  useEffect(() => {
    const fetchDivisions = async () => {
      try {
        const response = await fetch("/api/divisions");
        if (!response.ok) throw new Error("Failed to fetch divisions");
        const data = await response.json();
        setDivisions(data);
      } catch (err) {
        console.error("Error fetching divisions:", err);
      }
    };
    fetchDivisions();
  }, []);

  // Fetch employee
  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const response = await fetch(`/api/employees/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (!response.ok) throw new Error("Employé non trouvé");

        const data = await response.json();
        setEmployee(data);
        setFormData({
          matricule: data.matricule,
          prenom: data.prenom,
          nom: data.nom,
          division_id: String(data.division_id),
          service_id: String(data.service_id),
          equipe_id: String(data.equipe_id),
        });

        // Initialize habilitation editing state
        if (data.habilitations) {
          const editState: { [key: number]: boolean } = {};
          const habEditData: { [key: number]: Partial<Habilitation> } = {};
          data.habilitations.forEach((hab: Habilitation) => {
            editState[hab.id] = false;
            habEditData[hab.id] = { ...hab };
          });
          setEditingHab(editState);
          setHabData(habEditData);
        }

        // Load services for the division
        if (data.division_id) {
          await loadServices(String(data.division_id));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur de chargement";
        toast({
          title: "Erreur",
          description: message,
          variant: "destructive",
        });
        navigate("/employees");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchEmployee();
  }, [id]);

  // Load services when division changes
  useEffect(() => {
    if (formData.division_id) {
      loadServices(formData.division_id);
    }
  }, [formData.division_id]);

  // Load equipes when service changes
  useEffect(() => {
    if (formData.service_id) {
      loadEquipes(formData.service_id);
    }
  }, [formData.service_id]);

  const loadServices = async (divisionId: string) => {
    try {
      const response = await fetch(`/api/divisions/${divisionId}/services`);
      if (!response.ok) throw new Error("Failed to fetch services");
      const data = await response.json();
      setServices(data);
      setEquipes([]);
      setFormData(prev => ({
        ...prev,
        service_id: "",
        equipe_id: "",
      }));
    } catch (err) {
      console.error("Error loading services:", err);
    }
  };

  const loadEquipes = async (serviceId: string) => {
    try {
      const response = await fetch(`/api/services/${serviceId}/equipes`);
      if (!response.ok) throw new Error("Failed to fetch equipes");
      const data = await response.json();
      setEquipes(data);
      setFormData(prev => ({
        ...prev,
        equipe_id: "",
      }));
    } catch (err) {
      console.error("Error loading equipes:", err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          ...formData,
          division_id: Number(formData.division_id),
          service_id: Number(formData.service_id),
          equipe_id: Number(formData.equipe_id),
        }),
      });

      if (!response.ok) throw new Error("Erreur lors de la mise à jour");

      toast({
        title: "Employé mis à jour",
        description: "Les modifications ont été enregistrées",
      });

      navigate("/employees");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur serveur";
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHabilitation = async (habId: number) => {
    const hab = habData[habId];
    if (!hab || !hab.codes || hab.codes.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins un code",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/habilitations/${habId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          codes: hab.codes,
          numero: hab.numero,
          date_validation: hab.date_validation,
          date_expiration: hab.date_expiration,
        }),
      });

      if (!response.ok) throw new Error("Erreur lors de la mise à jour");

      const updated = await response.json();
      
      // Update employee habilitations
      if (employee?.habilitations) {
        const newHabs = employee.habilitations.map(h =>
          h.id === habId ? updated : h
        );
        setEmployee({ ...employee, habilitations: newHabs });
      }

      setEditingHab(prev => ({ ...prev, [habId]: false }));
      toast({
        title: "Habilitation mise à jour",
        description: "Les codes ont été enregistrés",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur serveur";
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteHabilitation = async (habId: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette habilitation?")) {
      return;
    }

    try {
      const response = await fetch(`/api/habilitations/${habId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) throw new Error("Erreur lors de la suppression");

      // Update employee habilitations
      if (employee?.habilitations) {
        const newHabs = employee.habilitations.filter(h => h.id !== habId);
        setEmployee({ ...employee, habilitations: newHabs });
      }

      toast({
        title: "Habilitation supprimée",
        description: "L'habilitation a été supprimée",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur serveur";
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleCodeToggle = (habId: number, code: string) => {
    setHabData(prev => {
      const hab = prev[habId];
      const codes = hab.codes || [];
      const newCodes = codes.includes(code)
        ? codes.filter(c => c !== code)
        : [...codes, code];
      return {
        ...prev,
        [habId]: { ...hab, codes: newCodes },
      };
    });
  };

  const handleAddHabilitation = async () => {
    if (!newHabData.codes || newHabData.codes.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins un code",
        variant: "destructive",
      });
      return;
    }

    if (!newHabData.dateValidation) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une date de validation",
        variant: "destructive",
      });
      return;
    }

    setAddingHab(true);

    try {
      // Create habilitation first
      const createResponse = await fetch("/api/habilitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          employee_id: employee.id,
          type: newHabData.type,
          codes: newHabData.codes,
          numero: newHabData.numero || null,
          date_validation: newHabData.dateValidation,
        }),
      });

      if (!createResponse.ok) throw new Error("Erreur lors de l'ajout de l'habilitation");

      const newHab = await createResponse.json();

      // Upload PDF if provided
      if (newHabData.pdfFile) {
        const pdfFormData = new FormData();
        pdfFormData.append("pdf", newHabData.pdfFile);
        pdfFormData.append("habilitationId", String(newHab.id));

        const pdfResponse = await fetch("/api/habilitations/upload-pdf", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: pdfFormData,
        });

        if (pdfResponse.ok) {
          const pdfData = await pdfResponse.json();
          newHab.pdf_path = pdfData.pdfPath;
        }
      }

      // Add to employee habilitations
      if (employee?.habilitations) {
        setEmployee({
          ...employee,
          habilitations: [...employee.habilitations, newHab],
        });
      }

      // Reset form
      setNewHabData({
        type: "HT",
        codes: [],
        numero: "",
        dateValidation: "",
        pdfFile: null,
      });
      setShowNewHab(false);

      toast({
        title: "Habilitation ajoutée",
        description: "La nouvelle habilitation a été enregistrée" + (newHabData.pdfFile ? " avec le PDF" : ""),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur serveur";
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    } finally {
      setAddingHab(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Chargement de l'employé...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!employee) {
    return (
      <Layout>
        <div className="glass p-8 rounded-xl text-center space-y-4">
          <h2 className="text-lg font-semibold">Employé non trouvé</h2>
          <Link to="/employees">
            <Button className="glass-button">Retour</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const currentHab = employee.habilitations?.[0];
  const htCodes = currentHab?.type === "HT" ? HT_CODES : [];
  const stCodes = currentHab?.type === "ST" ? ST_CODES : [];
  const availableCodes = currentHab?.type === "HT" ? HT_CODES : ST_CODES;

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <BreadcrumbNav
          items={[
            { label: "Employés", href: "/employees" },
            { label: `${employee.prenom} ${employee.nom}`, href: `/employees/${id}` },
            { label: "Modifier" },
          ]}
        />
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/employees">
            <Button variant="ghost" size="icon" className="rounded-lg">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold gradient-text">
              Modifier l'Employé
            </h1>
            <p className="text-muted-foreground mt-1">
              Mettez à jour les informations de l'employé
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-8">
          {/* Employee Information */}
          <div className="glass p-6 rounded-xl space-y-4">
            <h2 className="text-lg font-semibold">Informations de l'employé</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="matricule">Matricule</Label>
                <Input
                  id="matricule"
                  type="text"
                  value={formData.matricule}
                  disabled
                  className="glass-input opacity-60"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom</Label>
                <Input
                  id="prenom"
                  type="text"
                  value={formData.prenom}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      prenom: e.target.value,
                    }))
                  }
                  className="glass-input"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nom">Nom</Label>
                <Input
                  id="nom"
                  type="text"
                  value={formData.nom}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, nom: e.target.value }))
                  }
                  className="glass-input"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="division">Division</Label>
                <Select
                  value={formData.division_id}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, division_id: value }))
                  }
                >
                  <SelectTrigger className="glass-input">
                    <SelectValue placeholder="Sélectionner une division" />
                  </SelectTrigger>
                  <SelectContent>
                    {divisions.map((div) => (
                      <SelectItem key={div.id} value={String(div.id)}>
                        {div.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="service">Service</Label>
                <Select
                  value={formData.service_id}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, service_id: value }))
                  }
                >
                  <SelectTrigger className="glass-input">
                    <SelectValue placeholder="Sélectionner un service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((svc) => (
                      <SelectItem key={svc.id} value={String(svc.id)}>
                        {svc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="equipe">Équipe</Label>
                <Select
                  value={formData.equipe_id}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, equipe_id: value }))
                  }
                >
                  <SelectTrigger className="glass-input">
                    <SelectValue placeholder="Sélectionner une équipe" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipes.map((eq) => (
                      <SelectItem key={eq.id} value={String(eq.id)}>
                        {eq.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Habilitations */}
          <div className="glass p-6 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Habilitations</h2>
              {!showNewHab && (
                <Button
                  type="button"
                  size="sm"
                  className="glass-button gap-2"
                  onClick={() => setShowNewHab(true)}
                >
                  <Plus className="w-4 h-4" />
                  Ajouter
                </Button>
              )}
            </div>

            {/* New Habilitation Form */}
            {showNewHab && (
              <div className="border border-white/20 rounded-lg p-4 space-y-4 bg-white/5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Nouvelle habilitation</h3>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowNewHab(false);
                      setNewHabData({
                        type: "HT",
                        codes: [],
                        numero: "",
                        dateValidation: "",
                        pdfFile: null,
                      });
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type d'habilitation</Label>
                    <Select
                      value={newHabData.type}
                      onValueChange={(value) =>
                        setNewHabData(prev => ({
                          ...prev,
                          type: value as "HT" | "ST",
                          codes: [],
                        }))
                      }
                    >
                      <SelectTrigger className="glass-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HT">HT (3 ans)</SelectItem>
                        <SelectItem value="ST">ST (1 an)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Date de validation</Label>
                    <Input
                      type="date"
                      value={newHabData.dateValidation}
                      onChange={(e) =>
                        setNewHabData(prev => ({
                          ...prev,
                          dateValidation: e.target.value,
                        }))
                      }
                      className="glass-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>N° de titre (optionnel)</Label>
                    <Input
                      type="text"
                      value={newHabData.numero}
                      onChange={(e) =>
                        setNewHabData(prev => ({
                          ...prev,
                          numero: e.target.value,
                        }))
                      }
                      className="glass-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>PDF (optionnel)</Label>
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) =>
                        setNewHabData(prev => ({
                          ...prev,
                          pdfFile: e.target.files?.[0] || null,
                        }))
                      }
                      className="glass-input"
                    />
                    {newHabData.pdfFile && (
                      <p className="text-xs text-muted-foreground">
                        Fichier: {newHabData.pdfFile.name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Codes d'habilitation</Label>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {(newHabData.type === "HT" ? HT_CODES : ST_CODES).map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() =>
                          setNewHabData(prev => ({
                            ...prev,
                            codes: prev.codes.includes(code)
                              ? prev.codes.filter(c => c !== code)
                              : [...prev.codes, code],
                          }))
                        }
                        className={`px-3 py-2 rounded-lg text-sm font-mono transition-all ${
                          newHabData.codes.includes(code)
                            ? "bg-blue-500 text-white"
                            : "bg-white/10 border border-white/20 text-muted-foreground hover:border-white/40"
                        }`}
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-lg"
                    onClick={() => {
                      setShowNewHab(false);
                      setNewHabData({
                        type: "HT",
                        codes: [],
                        numero: "",
                        dateValidation: "",
                        pdfFile: null,
                      });
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    className="glass-button"
                    disabled={addingHab}
                    onClick={handleAddHabilitation}
                  >
                    {addingHab ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Ajout...
                      </span>
                    ) : (
                      "Ajouter"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Existing Habilitations */}
            {employee.habilitations && employee.habilitations.length > 0 && (
              <div className="space-y-4">
                {employee.habilitations.map((hab) => {
                  const isEditing = editingHab[hab.id];
                  const habEditing = habData[hab.id] || hab;
                  const codes = habEditing.codes || hab.codes;

                  return (
                    <div
                      key={hab.id}
                      className="border border-white/20 rounded-lg p-4 space-y-4"
                    >
                      {/* Header */}
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-sm">
                            Habilitation {hab.type} - N° {hab.numero || "Non défini"}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Valide jusqu'au {new Date(hab.date_expiration).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {!isEditing && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingHab(prev => ({ ...prev, [hab.id]: true }));
                              }}
                              className="rounded-lg"
                            >
                              Modifier
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:bg-red-500/20"
                            onClick={() => handleDeleteHabilitation(hab.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="space-y-4 pt-4 border-t border-white/20">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Date de validation</Label>
                              <Input
                                type="date"
                                value={habEditing.date_validation || ""}
                                onChange={(e) =>
                                  setHabData(prev => ({
                                    ...prev,
                                    [hab.id]: {
                                      ...prev[hab.id],
                                      date_validation: e.target.value,
                                    },
                                  }))
                                }
                                className="glass-input"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>N° de titre (optionnel)</Label>
                              <Input
                                type="text"
                                value={habEditing.numero || ""}
                                onChange={(e) =>
                                  setHabData(prev => ({
                                    ...prev,
                                    [hab.id]: {
                                      ...prev[hab.id],
                                      numero: e.target.value,
                                    },
                                  }))
                                }
                                className="glass-input"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Codes d'habilitation</Label>
                            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                              {(hab.type === "HT" ? HT_CODES : ST_CODES).map((code) => (
                                <button
                                  key={code}
                                  type="button"
                                  onClick={() => handleCodeToggle(hab.id, code)}
                                  className={`px-3 py-2 rounded-lg text-sm font-mono transition-all ${
                                    codes.includes(code)
                                      ? "bg-blue-500 text-white"
                                      : "bg-white/10 border border-white/20 text-muted-foreground hover:border-white/40"
                                  }`}
                                >
                                  {code}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-lg"
                              onClick={() => {
                                setEditingHab(prev => ({ ...prev, [hab.id]: false }));
                                setHabData(prev => ({
                                  ...prev,
                                  [hab.id]: hab,
                                }));
                              }}
                            >
                              Annuler
                            </Button>
                            <Button
                              type="button"
                              className="glass-button"
                              onClick={() => handleSaveHabilitation(hab.id)}
                            >
                              Enregistrer
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {codes.map((code: string) => (
                              <div
                                key={code}
                                className="text-xs bg-white/10 rounded px-2 py-1 font-mono"
                              >
                                {code}
                              </div>
                            ))}
                          </div>
                          <div className="border-t border-white/20 pt-4">
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Document PDF
                            </p>
                            <PDFUpload
                              habilitationId={hab.id}
                              type={hab.type}
                              currentPdfPath={hab.pdf_path || undefined}
                              onUploadComplete={() => {
                                // Refresh employee data to show updated PDF path
                                const fetchEmployee = async () => {
                                  try {
                                    const response = await fetch(`/api/employees/${id}`, {
                                      headers: {
                                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                                      },
                                    });
                                    if (response.ok) {
                                      const data = await response.json();
                                      setEmployee(data);
                                    }
                                  } catch (err) {
                                    console.error("Failed to refresh employee data:", err);
                                  }
                                };
                                fetchEmployee();
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4 justify-end">
            <Link to="/employees">
              <Button variant="outline" className="rounded-lg">
                Annuler
              </Button>
            </Link>
            <Button type="submit" disabled={saving} className="glass-button gap-2">
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enregistrement...
                </span>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

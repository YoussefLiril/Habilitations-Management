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
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { Division, Service, Equipe, HT_CODES, ST_CODES } from "@/types";

export default function AddEmployee() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);

  const [formData, setFormData] = useState({
    matricule: "",
    prenom: "",
    nom: "",
    division_id: "",
    service_id: "",
    equipe_id: "",
  });

  const [htData, setHtData] = useState({
    hasHT: false,
    codes: [] as string[],
    numero: "",
    dateValidation: "",
  });

  const [stData, setStData] = useState({
    hasST: false,
    codes: [] as string[],
    numero: "",
    dateValidation: "",
  });

  // Load divisions on mount
  useEffect(() => {
    const fetchDivisions = async () => {
      try {
        const response = await fetch("/api/divisions");
        if (!response.ok) throw new Error("Failed to fetch divisions");
        const data = await response.json();
        setDivisions(data);
      } catch (err) {
        console.error("Error fetching divisions:", err);
        toast({
          title: "Erreur",
          description: "Impossible de charger les divisions",
          variant: "destructive",
        });
      }
    };
    fetchDivisions();
  }, []);

  // Load services when division changes
  const handleDivisionChange = async (divisionId: string) => {
    setFormData(prev => ({
      ...prev,
      division_id: divisionId,
      service_id: "",
      equipe_id: "",
    }));

    if (!divisionId) {
      setServices([]);
      setEquipes([]);
      return;
    }

    try {
      const response = await fetch(`/api/divisions/${divisionId}/services`);
      if (!response.ok) throw new Error("Failed to fetch services");
      const data = await response.json();
      setServices(data);
      setEquipes([]);
    } catch (err) {
      console.error("Error fetching services:", err);
    }
  };

  // Load equipes when service changes
  const handleServiceChange = async (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      service_id: serviceId,
      equipe_id: "",
    }));

    if (!serviceId) {
      setEquipes([]);
      return;
    }

    try {
      const response = await fetch(`/api/services/${serviceId}/equipes`);
      if (!response.ok) throw new Error("Failed to fetch equipes");
      const data = await response.json();
      setEquipes(data);
    } catch (err) {
      console.error("Error fetching equipes:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.division_id || !formData.service_id || !formData.equipe_id) {
        toast({
          title: "Erreur",
          description: "Veuillez remplir tous les champs organisationnels",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const response = await fetch("/api/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          ...formData,
          division_id: Number(formData.division_id),
          service_id: Number(formData.service_id),
          equipe_id: Number(formData.equipe_id),
          habilitations: [
            ...(htData.hasHT
              ? [
                  {
                    type: "HT",
                    codes: htData.codes,
                    numero: htData.numero,
                    dateValidation: htData.dateValidation,
                  },
                ]
              : []),
            ...(stData.hasST
              ? [
                  {
                    type: "ST",
                    codes: stData.codes,
                    numero: stData.numero,
                    dateValidation: stData.dateValidation,
                  },
                ]
              : []),
          ],
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la création de l'employé");
      }

      toast({
        title: "Employé créé",
        description: "L'employé a été ajouté avec succès",
      });

      navigate("/employees");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur lors de la création";
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <BreadcrumbNav
          items={[
            { label: "Employés", href: "/employees" },
            { label: "Ajouter" },
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
            <h1 className="text-3xl font-bold gradient-text">Ajouter un Employé</h1>
            <p className="text-muted-foreground mt-1">
              Remplissez les informations de l'employé et ses habilitations
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Employee Information */}
          <div className="glass p-6 rounded-xl space-y-4">
            <h2 className="text-lg font-semibold">Informations de l'employé</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="matricule">Matricule (5 chiffres)</Label>
                <Input
                  id="matricule"
                  type="text"
                  placeholder="00001"
                  value={formData.matricule}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 5);
                    setFormData((prev) => ({ ...prev, matricule: val }));
                  }}
                  className="glass-input"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom</Label>
                <Input
                  id="prenom"
                  type="text"
                  placeholder="Jean"
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
                  placeholder="Dupont"
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
                  onValueChange={handleDivisionChange}
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
                  onValueChange={handleServiceChange}
                  disabled={!formData.division_id}
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
                  disabled={!formData.service_id}
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

          {/* Habilitation HT */}
          <div className="glass p-6 rounded-xl space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox
                id="hasHT"
                checked={htData.hasHT}
                onCheckedChange={(checked) =>
                  setHtData((prev) => ({
                    ...prev,
                    hasHT: checked as boolean,
                  }))
                }
              />
              <Label htmlFor="hasHT" className="text-base font-semibold">
                Habilitation HT (3 ans)
              </Label>
            </div>

            {htData.hasHT && (
              <div className="space-y-4 pt-4 border-t border-white/20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="htNumero">N° de titre</Label>
                    <Input
                      id="htNumero"
                      type="text"
                      placeholder="HT-2024-001"
                      value={htData.numero}
                      onChange={(e) =>
                        setHtData((prev) => ({
                          ...prev,
                          numero: e.target.value,
                        }))
                      }
                      className="glass-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="htDate">Date de validation</Label>
                    <Input
                      id="htDate"
                      type="date"
                      value={htData.dateValidation}
                      onChange={(e) =>
                        setHtData((prev) => ({
                          ...prev,
                          dateValidation: e.target.value,
                        }))
                      }
                      className="glass-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Codes HT</Label>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                    {HT_CODES.map((code) => (
                      <label
                        key={code}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <Checkbox
                          checked={htData.codes.includes(code)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setHtData((prev) => ({
                                ...prev,
                                codes: [...prev.codes, code],
                              }));
                            } else {
                              setHtData((prev) => ({
                                ...prev,
                                codes: prev.codes.filter((c) => c !== code),
                              }));
                            }
                          }}
                        />
                        <span className="text-sm font-mono">{code}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Habilitation ST */}
          <div className="glass p-6 rounded-xl space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox
                id="hasST"
                checked={stData.hasST}
                onCheckedChange={(checked) =>
                  setStData((prev) => ({
                    ...prev,
                    hasST: checked as boolean,
                  }))
                }
              />
              <Label htmlFor="hasST" className="text-base font-semibold">
                Habilitation ST (1 an)
              </Label>
            </div>

            {stData.hasST && (
              <div className="space-y-4 pt-4 border-t border-white/20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stNumero">N° de titre</Label>
                    <Input
                      id="stNumero"
                      type="text"
                      placeholder="ST-2024-001"
                      value={stData.numero}
                      onChange={(e) =>
                        setStData((prev) => ({
                          ...prev,
                          numero: e.target.value,
                        }))
                      }
                      className="glass-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stDate">Date de validation</Label>
                    <Input
                      id="stDate"
                      type="date"
                      value={stData.dateValidation}
                      onChange={(e) =>
                        setStData((prev) => ({
                          ...prev,
                          dateValidation: e.target.value,
                        }))
                      }
                      className="glass-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Codes ST</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {ST_CODES.map((code) => (
                      <label
                        key={code}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <Checkbox
                          checked={stData.codes.includes(code)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setStData((prev) => ({
                                ...prev,
                                codes: [...prev.codes, code],
                              }));
                            } else {
                              setStData((prev) => ({
                                ...prev,
                                codes: prev.codes.filter((c) => c !== code),
                              }));
                            }
                          }}
                        />
                        <span className="text-sm font-mono">{code}</span>
                      </label>
                    ))}
                  </div>
                </div>
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
            <Button
              type="submit"
              disabled={loading}
              className="glass-button gap-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Création...
                </span>
              ) : (
                "Créer l'employé"
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

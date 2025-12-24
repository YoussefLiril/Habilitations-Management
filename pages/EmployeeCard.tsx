import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, FileText, Badge } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { PDFUpload } from "@/components/PDFUpload";
import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { Employee, Habilitation } from "@/types";

export default function EmployeeCard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);

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

  const getStatusColor = (expirationDate: string) => {
    const today = new Date();
    const expDate = new Date(expirationDate);
    const daysUntilExpiration = Math.ceil(
      (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiration < 0) return "text-red-600 dark:text-red-400";
    if (daysUntilExpiration < 90) return "text-yellow-600 dark:text-yellow-400";
    return "text-green-600 dark:text-green-400";
  };

  const getStatusText = (expirationDate: string) => {
    const today = new Date();
    const expDate = new Date(expirationDate);
    const daysUntilExpiration = Math.ceil(
      (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiration < 0) return "Expirée";
    if (daysUntilExpiration < 90) return `${daysUntilExpiration} jours`;
    return "Valide";
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Chargement du profil...</p>
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

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <BreadcrumbNav
          items={[
            { label: "Employés", href: "/employees" },
            { label: `${employee.prenom} ${employee.nom}` },
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
              {employee.prenom} {employee.nom}
            </h1>
            <p className="text-muted-foreground mt-1">
              Matricule: {employee.matricule}
            </p>
          </div>
        </div>

        {/* Personal Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Card */}
          <div className="lg:col-span-2 glass p-6 rounded-xl space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Informations Personnelles</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Prénom</p>
                  <p className="text-sm font-semibold">{employee.prenom}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Nom</p>
                  <p className="text-sm font-semibold">{employee.nom}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Matricule</p>
                  <p className="text-sm font-mono font-semibold">{employee.matricule}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Division</p>
                  <p className="text-sm font-semibold">{employee.division}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-white/20 pt-6">
              <h3 className="text-lg font-semibold mb-4">Affectation Organisationnelle</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Service</p>
                  <p className="text-sm font-semibold">{employee.service}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Section</p>
                  <p className="text-sm font-semibold">{employee.section}</p>
                </div>
                <div className="col-span-2 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Équipe</p>
                  <p className="text-sm font-semibold">{employee.equipe}</p>
                </div>
              </div>
            </div>

            {/* Habilitations */}
            {employee.habilitations && employee.habilitations.length > 0 && (
              <div className="border-t border-white/20 pt-6">
                <h3 className="text-lg font-semibold mb-4">Habilitations</h3>
                <div className="space-y-4">
                  {employee.habilitations.map((hab) => (
                    <div
                      key={hab.id}
                      className="border border-white/20 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400">
                              {hab.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              N° {hab.numero || "Non défini"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Codes: {hab.codes.join(", ")}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <span>Validation: {new Date(hab.date_validation).toLocaleDateString("fr-FR")}</span>
                        </div>
                        <div className={`flex items-center gap-1 font-semibold ${getStatusColor(hab.date_expiration)}`}>
                          <Calendar className="w-3 h-3" />
                          <span>Expire: {new Date(hab.date_expiration).toLocaleDateString("fr-FR")}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/10">
                        <PDFUpload
                          habilitationId={hab.id}
                          type={hab.type}
                          currentPdfPath={hab.pdf_path || undefined}
                          onUploadComplete={() => {
                            // Refetch employee data
                            if (id) {
                              fetch(`/api/employees/${id}`, {
                                headers: {
                                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                                },
                              })
                                .then((res) => res.json())
                                .then((data) => setEmployee(data));
                            }
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Stats Card */}
          <div className="glass p-6 rounded-xl space-y-4 h-fit">
            <h2 className="text-lg font-semibold">Statistiques</h2>

            <div className="space-y-3">
              <div className="bg-white/5 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Total Habilitations</p>
                <p className="text-2xl font-bold gradient-text">
                  {employee.habilitations?.length || 0}
                </p>
              </div>

              <div className="bg-white/5 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">HT Habilitations</p>
                <p className="text-2xl font-bold text-blue-500">
                  {employee.habilitations?.filter((h) => h.type === "HT").length || 0}
                </p>
              </div>

              <div className="bg-white/5 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">ST Habilitations</p>
                <p className="text-2xl font-bold text-cyan-500">
                  {employee.habilitations?.filter((h) => h.type === "ST").length || 0}
                </p>
              </div>

              {employee.habilitations && employee.habilitations.length > 0 && (
                <div className="bg-white/5 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">Status</p>
                  <div className="flex flex-col gap-2 text-xs">
                    {(() => {
                      const expired = employee.habilitations.filter(
                        (h) => new Date(h.date_expiration) <= new Date()
                      ).length;
                      const expiring = employee.habilitations.filter((h) => {
                        const daysUntil = Math.ceil(
                          (new Date(h.date_expiration).getTime() - new Date().getTime()) /
                            (1000 * 60 * 60 * 24)
                        );
                        return daysUntil > 0 && daysUntil < 90;
                      }).length;

                      return (
                        <>
                          {expired > 0 && (
                            <p className="text-red-600 dark:text-red-400">
                              {expired} expirée{expired > 1 ? "s" : ""}
                            </p>
                          )}
                          {expiring > 0 && (
                            <p className="text-yellow-600 dark:text-yellow-400">
                              {expiring} expire bientôt
                            </p>
                          )}
                          {expired === 0 && expiring === 0 && (
                            <p className="text-green-600 dark:text-green-400">
                              Toutes valides
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            <Link to={`/employees/${employee.id}/edit`} className="block">
              <Button className="glass-button w-full">Modifier</Button>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}

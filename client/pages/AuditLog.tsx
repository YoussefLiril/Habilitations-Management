import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, User, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

interface AuditEntry {
  id: number;
  user: string;
  action: string;
  entityType: string;
  entityId: number;
  changes: string;
  createdAt: string;
}

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  async function fetchAuditLogs() {
    try {
      const response = await fetch("/api/audit-logs", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (err) {
      console.error("Error fetching audit logs:", err);
    } finally {
      setLoading(false);
    }
  }

  function getActionColor(action: string) {
    if (action.includes("DELETE")) return "destructive";
    if (action.includes("CREATE")) return "default";
    if (action.includes("UPDATE")) return "secondary";
    return "outline";
  }

  function getActionIcon(action: string) {
    if (action.includes("DELETE")) return "🗑️";
    if (action.includes("CREATE")) return "➕";
    if (action.includes("UPDATE")) return "✏️";
    return "📝";
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold neon-text flex items-center gap-2">
            <FileText className="w-8 h-8" />
            Journal d'Audit
          </h1>
          <p className="text-muted-foreground mt-1">
            Historique complet des modifications
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">Chargement...</div>
        ) : logs.length === 0 ? (
          <Card className="electric-card">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Aucune entrée d'audit disponible</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <Card key={log.id} className="electric-card">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getActionIcon(log.action)}</span>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {log.action}
                          <Badge variant={getActionColor(log.action)}>
                            {log.entityType}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="mt-1 flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {log.user || "Système"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(log.createdAt).toLocaleString("fr-FR")}
                          </span>
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                {log.changes && (
                  <CardContent>
                    <div className="bg-secondary/10 rounded p-3">
                      <pre className="text-xs overflow-x-auto">{JSON.stringify(JSON.parse(log.changes), null, 2)}</pre>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

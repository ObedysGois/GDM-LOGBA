import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Clock } from "lucide-react";

export const AdminBadge = () => (
  <Badge className="bg-purple-100 text-purple-800 border-purple-300">
    <Shield className="w-3 h-3 mr-1" />
    Admin
  </Badge>
);

export const BeingMonitoredButton = ({ delivery, onMarkAsMonitored, loading, userType }) => {
  // Verificar se o botão deve ser exibido com base no tipo de usuário
  if (delivery.being_monitored || !delivery.problem_type || (userType !== 'admin' && userType !== 'colaborador')) return null;
  
  return (
    <Button
      onClick={() => onMarkAsMonitored(delivery.id)}
      disabled={loading}
      className="bg-blue-600 hover:bg-blue-700 text-white"
      size="sm"
    >
      <Clock className="w-4 h-4 mr-2" />
      {loading ? "Marcando..." : "Marcar como Sendo Acompanhada"}
    </Button>
  );
};

export default { AdminBadge, BeingMonitoredButton };
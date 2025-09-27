import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { HeartHandshake } from "lucide-react";

export default function SupportRequestButton({ delivery, userEmail, isAdmin }) {
  const [isVisible, setIsVisible] = useState(false);
  const [timeInStore, setTimeInStore] = useState("");

  // Only show for the user who created the delivery or admin
  const canSeeButton = isAdmin || delivery.user_email === userEmail;
  
  // Only show for ongoing deliveries
  const isOngoing = delivery.status === "Entrega em andamento";

  useEffect(() => {
    if (!canSeeButton || !isOngoing) return;

    const checkVisibility = () => {
      const checkinTime = new Date(delivery.checkin_time);
      const now = new Date();
      const minutesPassed = (now - checkinTime) / (1000 * 60);
      
      // Show button every 30 minutes for 5 minutes
      const cycle = minutesPassed % 30;
      const shouldShow = cycle >= 30 && cycle < 35;
      
      setIsVisible(shouldShow);
      
      // Calculate time in store
      const hours = Math.floor(minutesPassed / 60);
      const minutes = Math.floor(minutesPassed % 60);
      setTimeInStore(hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`);
    };

    checkVisibility();
    const interval = setInterval(checkVisibility, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [delivery, canSeeButton, isOngoing]);

  const handleSupportRequest = () => {
    const message = `🆘 SOLICITAÇÃO DE APOIO 🆘

🚛 Fretista: ${delivery.driver}
👤 Cliente: ${delivery.client}
⏰ Tempo em Loja: ${timeInStore}
📅 Data: ${new Date().toLocaleDateString('pt-BR')}

🔔 ESTOU EM LOJA AGUARDANDO, POR FAVOR, ACOMPANHAR! 🔔

⚠️ Favor verificar a situação e dar suporte necessário.`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
    
    // Hide button for 30 minutes after use
    setIsVisible(false);
  };

  if (!isVisible || !canSeeButton || !isOngoing) return null;

  return (
    <Button
      onClick={handleSupportRequest}
      className="bg-orange-600 hover:bg-orange-700 animate-pulse"
      size="sm"
    >
      <HeartHandshake className="w-4 h-4 mr-2" />
      🆘 SOLICITAR APOIO 📞
    </Button>
  );
}
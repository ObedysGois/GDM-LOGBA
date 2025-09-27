
const ADMIN_EMAILS = [
    "colaboradordocemel@gmail.com",
    "jrobed10@gmail.com", 
    "eujunio13@gmail.com",
    "obedysgois@gmail.com",
    "adm.salvador@frutasdocemel.com.br",
    "usuariodocemel@gmail.com",
    "obedysg@gmail.com",
    "faturamentosalvador@frutasdocemel.com.br",
    "jessica.louvores@frutasdocemel.com.br"
  ];
  
  export const isAdmin = (userEmail) => {
    return ADMIN_EMAILS.includes(userEmail?.toLowerCase());
  };
  
  export const canEditDelivery = (userEmail, delivery) => {
    if (isAdmin(userEmail)) return true;
    
    // Non-admin users can only edit their own ongoing deliveries or those with problems
    if (delivery.user_email !== userEmail) return false;
    
    return delivery.status === "Entrega em andamento" || delivery.problem_type;
  };
  
  export const canDeleteDelivery = (userEmail, delivery) => {
    // Only admins can delete finalized deliveries
    if (delivery.status === "Entrega finalizada" || delivery.status === "Entrega devolvida") {
      return isAdmin(userEmail);
    }
    
    return canEditDelivery(userEmail, delivery);
  };
  
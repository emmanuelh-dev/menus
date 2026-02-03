export function isAdmin(email: string | undefined): boolean {
  if (!email) return false;
  
  const adminEmailsVar = import.meta.env.ADMIN_EMAILS || '';
  const adminEmails = adminEmailsVar 
    ? adminEmailsVar.split(',').map((e: string) => e.trim().toLowerCase()) 
    : ['emmanuelh.dev@gmail.com', 'admin@bysmax.com', 'e805177@gmail.com'];
    
  return adminEmails.includes(email.toLowerCase());
}

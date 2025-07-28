/**
 * API Route para login administrativo
 * Valida credenciais admin e retorna perfil
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { UserProfile, Sector } from '@/lib/appwrite';
import { Role } from '@/lib/roles';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { email, password } = req.body;
    
    // Verificar se são credenciais admin
    if (email === process.env.NEXT_PUBLIC_ADMIN_EMAIL && password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      const adminProfile: UserProfile = {
        $id: 'admin',
        userId: 'admin',
        name: 'Administrador',
        sector: Sector.TI,
        role: Role.ADMIN,
        $createdAt: new Date().toISOString(),
        $updatedAt: new Date().toISOString()
      };
      
      res.status(200).json({
        user: { $id: 'admin', email },
        profile: adminProfile
      });
    } else {
      res.status(401).json({ error: 'Credenciais inválidas' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
/**
 * Componente de formulário para criar/editar usuários
 * Usado no painel administrativo
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sector } from '@/lib/appwrite';
import { Role } from '@/lib/roles';

interface UserFormProps {
  onSubmit: (userData: {
    email: string;
    password: string;
    sector: Sector;
    role: Role;
  }) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

export function UserForm({ onSubmit, loading, error }: UserFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sector, setSector] = useState<Sector | ''>('');
  const [role, setRole] = useState<Role | ''>('');

  const handleSectorChange = (value: string) => {
    setSector(value as Sector);
  };

  const handleRoleChange = (value: string) => {
    setRole(value as Role);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sector || !role) {
      return;
    }
    
    await onSubmit({
      email,
      password,
      sector: sector as Sector,
      role: role as Role
    });
    
    // Reset form
    setEmail('');
    setPassword('');
    setSector('');
    setRole('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar Usuário</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="sector">Setor</Label>
            <Select value={sector} onValueChange={handleSectorChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TI">TI</SelectItem>
                <SelectItem value="RH">RH</SelectItem>
                <SelectItem value="LOGISTICA">Logística</SelectItem>
                <SelectItem value="PORTARIA">Portaria</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Função</Label>
            <Select value={role} onValueChange={handleRoleChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="collaborator">Colaborador</SelectItem>
                <SelectItem value="manager">Gestor</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          <Button 
            type="submit" 
            className="w-full"
            disabled={loading || !sector || !role}
          >
            {loading ? 'Criando...' : 'Criar Usuário'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
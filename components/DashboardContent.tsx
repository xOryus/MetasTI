/**
 * Componente de conteúdo para o Dashboard
 * Renderiza a UI do dashboard baseada no perfil do usuário (role)
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Chart } from '@/components/Chart';
import { Role } from '@/lib/roles';
import { Submission } from '@/lib/appwrite';
import { format } from 'date-fns';

interface DashboardContentProps {
  profile: { role: Role; sector: string } | null;
  submissions: Submission[];
  completionStats: { completed: number; total: number; percentage: number };
  chartData: { date: string; value: number }[];
  handleLogout: () => void;
}

export function DashboardContent({
  profile,
  submissions,
  completionStats,
  chartData,
  handleLogout,
}: DashboardContentProps) {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard do Setor: {profile?.sector}</h1>
          <p className="text-gray-600">
            Bem-vindo, {profile?.role === Role.MANAGER ? 'Gestor' : 'Colaborador'}.
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Sair
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Conformidade Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{completionStats.percentage.toFixed(1)}%</p>
            <p className="text-gray-500">
              {completionStats.completed} de {completionStats.total} checklists preenchidos
            </p>
          </CardContent>
        </Card>
        {/* Adicionar mais cards de estatísticas se necessário */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Checklists Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.slice(0, 5).map((sub) => (
                  <TableRow key={sub.$id}>
                    <TableCell>{format(new Date(sub.date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>
                      <Badge>Preenchido</Badge>
                    </TableCell>
                    <TableCell>{sub.observation || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conformidade nos Últimos 7 Dias</CardTitle>
          </CardHeader>
          <CardContent>
            <Chart 
              data={chartData.map(item => ({ 
                date: item.date, 
                completion: item.value 
              }))} 
              title="" 
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

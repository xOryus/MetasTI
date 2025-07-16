/**
 * Componente de gráfico reutilizável
 * Exibe métricas de completion usando Recharts
 */

'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartData {
  date: string;
  completion: number;
}

interface ChartProps {
  data: ChartData[];
  title: string;
  type?: 'line' | 'bar';
}

export function Chart({ data, title, type = 'line' }: ChartProps) {
  const ChartComponent = type === 'line' ? LineChart : BarChart;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ChartComponent data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                formatter={(value) => [`${value}%`, 'Completion']}
                labelFormatter={(label) => `Data: ${label}`}
              />
              {type === 'line' ? (
                <Line 
                  type="monotone" 
                  dataKey="completion" 
                  stroke="#2563eb" 
                  strokeWidth={2}
                  dot={{ fill: '#2563eb', strokeWidth: 2 }}
                />
              ) : (
                <Bar dataKey="completion" fill="#2563eb" />
              )}
            </ChartComponent>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
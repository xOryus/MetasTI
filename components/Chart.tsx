/**
 * Componente de gráfico moderno usando Chart.js
 * Gráficos bonitos, responsivos e com animações suaves
 */

'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartData {
  date: string;
  completion: number;
  [key: string]: any;
}

interface ChartProps {
  data: ChartData[];
  title: string;
  type?: 'line' | 'bar' | 'doughnut' | 'area';
  height?: number;
}

export function Chart({ data, title, type = 'line', height = 300 }: ChartProps) {
  // Preparar dados para Chart.js
  const chartData = {
    labels: data.map(item => item.date),
    datasets: [
      {
        label: 'Taxa de Conclusão',
        data: data.map(item => item.completion),
        borderColor: 'rgb(59, 130, 246)', // blue-500
        backgroundColor: type === 'area' || type === 'doughnut' 
          ? 'rgba(59, 130, 246, 0.1)'
          : 'rgba(59, 130, 246, 0.8)',
        borderWidth: 3,
        fill: type === 'area',
        tension: 0.4, // Suavizar linhas
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: 'rgb(37, 99, 235)', // blue-600
      },
    ],
  };

  // Configurações básicas do gráfico
  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#374151',
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgba(59, 130, 246, 0.5)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: function(context: any) {
            return `${context.parsed.y}% de conclusão`;
          },
        },
      },
    },
    scales: type !== 'doughnut' ? {
      x: {
        grid: {
          color: 'rgba(156, 163, 175, 0.2)',
          borderDash: [5, 5],
        },
        ticks: {
          color: '#6B7280',
        },
      },
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: 'rgba(156, 163, 175, 0.2)',
          borderDash: [5, 5],
        },
        ticks: {
          color: '#6B7280',
          callback: function(value: any) {
            return value + '%';
          },
        },
      },
    } : {},
    animation: {
      duration: 1000,
    },
  };

  // Dados especiais para Doughnut
  const doughnutData = {
    labels: data.map(item => item.date),
    datasets: [
      {
        data: data.map(item => item.completion),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',   // blue
          'rgba(16, 185, 129, 0.8)',   // emerald
          'rgba(245, 101, 101, 0.8)',  // red
          'rgba(251, 191, 36, 0.8)',   // amber
          'rgba(139, 92, 246, 0.8)',   // violet
          'rgba(236, 72, 153, 0.8)',   // pink
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(245, 101, 101)',
          'rgb(251, 191, 36)',
          'rgb(139, 92, 246)',
          'rgb(236, 72, 153)',
        ],
        borderWidth: 2,
        hoverBorderWidth: 3,
      },
    ],
  };

  const renderChart = () => {
    const commonProps = {
      data: type === 'doughnut' ? doughnutData : chartData,
      options,
      height,
    };

    switch (type) {
      case 'bar':
        return <Bar {...commonProps} />;
      case 'doughnut':
        return <Doughnut {...commonProps} />;
      case 'area':
      case 'line':
      default:
        return <Line {...commonProps} />;
    }
  };

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {data.length > 0 ? (
          <div style={{ height: `${height}px` }} className="relative">
            {renderChart()}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-inner">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">Nenhum dado disponível</h3>
            <p className="text-sm text-gray-500 text-center">Os dados do gráfico aparecerão aqui quando estiverem disponíveis</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
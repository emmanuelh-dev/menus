import React from 'react';
import { Check, Store, Utensils, QrCode, User } from 'lucide-react';

interface OnboardingProgressProps {
  restaurantsCount: number;
  hasMenus: boolean; // We might need to pass this logic down
}

export default function OnboardingProgress({ restaurantsCount, hasMenus }: OnboardingProgressProps) {
  const steps = [
    {
      id: 1,
      title: 'Crear Cuenta',
      icon: <User className="w-5 h-5" />,
      completed: true,
      description: 'Perfil configurado'
    },
    {
      id: 2,
      title: 'Tu Negocio',
      icon: <Store className="w-5 h-5" />,
      completed: restaurantsCount > 0,
      description: 'Registra tu restaurante'
    },
    {
      id: 3,
      title: 'Tu Menú',
      icon: <Utensils className="w-5 h-5" />,
      completed: hasMenus,
      description: 'Sube tus platillos'
    },
    {
      id: 4,
      title: 'Código QR',
      icon: <QrCode className="w-5 h-5" />,
      completed: hasMenus, // Usually if they have a menu, they can get the QR
      description: 'Listo para imprimir'
    }
  ];

  const currentStep = steps.findIndex(step => !step.completed) + 1 || 5;

  return (
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 mb-8 overflow-hidden relative">
      <div className="absolute top-0 right-0 p-8 opacity-5">
        <Store className="w-32 h-32 text-slate-900" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Pasos para activar tu menú</h2>
            <p className="text-slate-500 text-sm">Completa estos pasos para empezar a recibir pedidos.</p>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold text-slate-900">{Math.round((steps.filter(s => s.completed).length / steps.length) * 100)}%</span>
            <div className="w-32 h-2 bg-slate-100 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${(steps.filter(s => s.completed).length / steps.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div key={step.id} className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${step.completed ? 'bg-emerald-50/50 border-emerald-100' :
                step.id === currentStep ? 'bg-white border-slate-200 shadow-md ring-2 ring-slate-900/5' :
                  'bg-slate-50 border-transparent opacity-60'
              }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${step.completed ? 'bg-emerald-500 text-white' :
                  step.id === currentStep ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-400'
                }`}>
                {step.completed ? <Check className="w-5 h-5" /> : step.icon}
              </div>
              <div>
                <h3 className={`font-bold text-sm ${step.completed ? 'text-emerald-900' : 'text-slate-900'}`}>{step.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {currentStep === 2 && (
          <div className="mt-8 bg-slate-900 text-white p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                🚀
              </div>
              <div>
                <p className="font-bold">¡Casi listo!</p>
                <p className="text-sm text-slate-300 text-slate-400">Haz clic en "+ Añadir Lugar" para registrar tu restaurante.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

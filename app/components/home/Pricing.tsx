'use client';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Básico',
    price: '29',
    features: [
      'Hasta 50 habitaciones',
      'Gestión de estados',
      'Sistema de logs',
      'Soporte básico'
    ]
  },
  {
    name: 'Premium',
    price: '99',
    features: [
      'Habitaciones ilimitadas',
      'Portal para huéspedes',
      'API access',
      'Soporte 24/7'
    ]
  }
];

export default function Pricing() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold text-center text-gray-900 sm:text-4xl">
          Planes simples y transparentes
        </h2>
        
        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="bg-white rounded-lg shadow-lg divide-y divide-gray-200"
            >
              <div className="p-6">
                <h3 className="text-2xl font-semibold text-gray-900">{plan.name}</h3>
                <p className="mt-4">
                  <span className="text-4xl font-extrabold">${plan.price}</span>
                  <span className="text-base font-medium text-gray-500">/mes</span>
                </p>
                <button className="mt-8 w-full py-3 px-4 rounded-md shadow bg-blue-600 text-white font-medium hover:bg-blue-700">
                  Comenzar
                </button>
              </div>
              <div className="px-6 pt-6 pb-8">
                <ul className="space-y-4">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <Check className="flex-shrink-0 h-5 w-5 text-green-500" />
                      <span className="ml-3 text-base text-gray-500">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
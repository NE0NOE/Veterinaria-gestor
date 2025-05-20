import React, { useState } from 'react';
import { PetSelector } from '../components/PetSelector';
import fondoMascota from '../assets/fondo-perrito.jpeg'; // Cambiar imagen
import purinaLogo from '../assets/purina-logo.png'; // Cambiar logo si lo tenés
import { Navbar } from '../components/Navbar'; // Asegúrate de que la ruta esté correcta

const FoodCalculator: React.FC = () => {
  const [petType, setPetType] = useState<'puppy' | 'active' | 'less_active'>('puppy'); // Tipo de mascota
  const [weight, setWeight] = useState(5); // Peso de la mascota (kg)

  // Función para calcular la ración de comida (usando Purina Pro Plan)
  const calculateFood = () => {
    let caloriesPerKg: number;

    if (petType === 'puppy') {
      // Cachorros requieren más calorías
      caloriesPerKg = 120; // Ejemplo: 120 calorías por kg para cachorros
    } else if (petType === 'active') {
      // Adultos activos (por ejemplo, perros que hacen ejercicio o actividad física)
      caloriesPerKg = 30; // Ejemplo: 30 calorías por kg para perros activos
    } else {
      // Adultos menos activos (perros más sedentarios)
      caloriesPerKg = 25; // Ejemplo: 25 calorías por kg para perros menos activos
    }

    const totalCalories = caloriesPerKg * weight; // Total calorías por peso
    const foodGrams = totalCalories / 3.5; // Aproximado (3.5 calorías por gramo de comida Purina Pro Plan)
    return `${foodGrams.toFixed(2)}g`;
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat py-10 px-4 flex items-center justify-center"
      style={{
        backgroundImage: `url(${fondoMascota})`,
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Barra de navegación */}
      <Navbar />

      {/* Contenedor de la calculadora */}
      <div className="max-w-xl w-full bg-white/90 backdrop-blur-md p-8 rounded-xl shadow-2xl border border-gray-200 mt-16">
        {/* Logo de Purina */}
        <div className="flex justify-center mb-6">
          <img src={purinaLogo} alt="Purina Logo" className="h-16" />
        </div>

        {/* Título */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Calculadora de Alimentos Purina</h2>
          <p className="text-sm text-gray-600">Recomendada por <strong>Purina</strong></p>
        </div>

        {/* Selector de Perro/Gato */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-700 text-center mb-4">Selecciona el tipo de tu mascota</h3>
          <div className="flex justify-around">
            <button
              onClick={() => setPetType('puppy')}
              className={`px-6 py-2 rounded-full ${petType === 'puppy' ? 'bg-indigo-600 text-white' : 'bg-gray-300'}`}
            >
              Cachorro
            </button>
            <button
              onClick={() => setPetType('active')}
              className={`px-6 py-2 rounded-full ${petType === 'active' ? 'bg-indigo-600 text-white' : 'bg-gray-300'}`}
            >
              Adulto Activo
            </button>
            <button
              onClick={() => setPetType('less_active')}
              className={`px-6 py-2 rounded-full ${petType === 'less_active' ? 'bg-indigo-600 text-white' : 'bg-gray-300'}`}
            >
              Adulto Menos Activo
            </button>
          </div>
        </div>

        {/* Peso */}
        <div className="mb-8">
          <label className="block text-md font-medium text-gray-700 mb-2 text-center">Peso de la mascota (kg)</label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
            min="1"
            max="100"
          />
          <p className="text-center text-lg mt-2 text-gray-700">Peso: <strong>{weight}</strong> kg</p>
        </div>

        {/* Resultado */}
        <div className="text-center mt-6">
          <h3 className="text-2xl font-semibold text-gray-800 mb-2">Ración recomendada:</h3>
          <p className="text-xl font-bold text-[#d60029]">{calculateFood()} de comida diaria</p>
          <p className="text-sm text-gray-500 mt-1 italic">*Basado en recomendaciones generales para {petType === 'puppy' ? 'cachorros' : petType === 'active' ? 'adultos activos' : 'adultos menos activos'}</p>
        </div>
      </div>
    </div>
  );
};

export default FoodCalculator;

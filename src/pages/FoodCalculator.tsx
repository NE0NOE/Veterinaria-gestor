import React, { useState, useEffect, useCallback } from 'react';
import fondoMascota from '../assets/fondo-perrito.jpeg'; // Ruta a tu imagen de fondo
import { Navbar } from '../components/Navbar'; // Asegúrate de que esta ruta sea correcta y que Navbar acepte la prop 'className'

// Importación de iconos de Lucide React
import { Dog, Cat, Flame, Scale, Calculator, Info, ShoppingBag, PawPrint, Loader2, AlertCircle, BookOpen, UtensilsCrossed } from 'lucide-react';

// Importación de AOS (Animate On Scroll)
import AOS from 'aos';
import 'aos/dist/aos.css'; // <--- RUTA DE AOS CSS CORREGIDA AQUÍ

const FoodCalculator: React.FC = () => {
  // Estados para la calculadora
  const [petType, setPetType] = useState<'perro' | 'gato' | null>(null); // Tipo de mascota: null por defecto
  const [activityLevel, setActivityLevel] = useState<'cachorro' | 'adulto_neutro' | 'adulto_intacto' | 'adulto_activo' | 'adulto_mayor' | 'perdida_peso' | null>(null); // Niveles de actividad/estado fisiológico
  const [weight, setWeight] = useState<number | ''>(''); // Peso de la mascota (kg): vacío por defecto
  const [foodResult, setFoodResult] = useState<string | null>(null); // Resultado del cálculo: null por defecto
  const [calculationError, setCalculationError] = useState<string | null>(null); // Errores de cálculo
  const [isLoading, setIsLoading] = useState(false); // Estado de carga (simulado)

  // Inicialización de AOS
  useEffect(() => {
    AOS.init({ duration: 1000, once: true }); // Inicializa AOS con duración de 1 segundo y solo una vez
  }, []);

  // Función para calcular la ración de comida, encapsulada en useCallback para memoización
  const calculateFood = useCallback(() => {
    setCalculationError(null); // Limpiar errores previos
    setFoodResult(null); // Limpiar resultado previo
    setIsLoading(true); // Simular carga para una mejor UX

    // Validaciones básicas antes de calcular
    if (petType === null) {
      setCalculationError('Por favor, selecciona el tipo de mascota.');
      setIsLoading(false);
      return;
    }
    if (activityLevel === null) {
      setCalculationError('Por favor, selecciona el estado de tu mascota.');
      setIsLoading(false);
      return;
    }
    if (typeof weight !== 'number' || weight <= 0 || weight > 200) { // Límite de peso más realista
      setCalculationError('Ingresa un peso válido para tu mascota (entre 0.1 y 200 kg).'); // Ajustado a 0.1kg
      setIsLoading(false);
      return;
    }

    // Paso 1: Calcular la Necesidad Energética en Reposo (RER)
    // Fórmula estándar: RER = 70 * (Peso_kg)^0.75
    const metabolicWeight = Math.pow(weight, 0.75);
    const rer = 70 * metabolicWeight; // kcal/día

    // Paso 2: Aplicar el Factor de Necesidad Energética Diaria (DER Factor)
    // Estos factores son GENERALES y pueden variar. Son de fuentes como WSAVA, AAHA.
    let derFactor: number;
    switch (activityLevel) {
      case 'cachorro':
        derFactor = petType === 'perro' ? 2.5 : 2.0; // Más alto para cachorros en crecimiento
        break;
      case 'adulto_neutro':
        derFactor = petType === 'perro' ? 1.6 : 1.2; // Adulto castrado/esterilizado, menos activo
        break;
      case 'adulto_intacto':
        derFactor = petType === 'perro' ? 1.8 : 1.4; // Adulto intacto, más activo metabólicamente
        break;
      case 'adulto_activo':
        derFactor = petType === 'perro' ? 2.0 : 1.6; // Adulto con ejercicio regular
        break;
      case 'adulto_mayor':
        derFactor = petType === 'perro' ? 1.4 : 1.0; // Adulto mayor, menos activo
        break;
      case 'perdida_peso':
        derFactor = petType === 'perro' ? 1.0 : 0.8; // Para inducción de pérdida de peso (bajo supervisión)
        break;
      default:
        derFactor = 1.0; // Fallback, aunque no debería ocurrir con las validaciones
    }

    const der = rer * derFactor; // Necesidad Energética Diaria en kcal/día

    // Paso 3: Convertir DER a gramos de alimento
    // Este valor depende ENORMEMENTE del alimento específico.
    // Usamos un promedio típico para alimento seco (croquetas).
    // EL USUARIO DEBE VERIFICAR LA ETIQUETA DE SU ALIMENTO.
    const avgKcalPerGramOfFood = 3.7; // Típico para croquetas secas (ej. 3700 kcal/kg = 3.7 kcal/g)

    const foodGrams = der / avgKcalPerGramOfFood; // Gramos de alimento requeridos al día

    // Pequeño retardo para simular un cálculo y ver el efecto de carga
    setTimeout(() => {
      setFoodResult(`${foodGrams.toFixed(0)}g`); // Redondear a enteros para una ración más práctica
      setIsLoading(false); // Finalizar carga
    }, 700); // Retardo de 700ms para una simulación más notoria
    
  }, [petType, activityLevel, weight]); // Dependencias de useCallback

  // useEffect para re-ejecutar el cálculo cada vez que cambian las dependencias relevantes
  useEffect(() => {
    // Solo calcular si hay suficiente información para evitar errores al inicio
    if (petType && activityLevel && typeof weight === 'number' && weight > 0) {
      calculateFood();
    } else {
      setFoodResult(null); // Limpiar resultado si las selecciones no están completas
      setCalculationError(null); // Limpiar error si se está rellenando
      setIsLoading(false); // Asegurarse de que no esté en estado de carga si falta información
    }
  }, [petType, activityLevel, weight, calculateFood]); // La dependencia es la función calculateFood memoizada por useCallback

  // Definimos el número de teléfono y el mensaje para el enlace de WhatsApp (para contacto general)
  const whatsappNumber = '57660362';
  const whatsappMessage = encodeURIComponent('¡Hola Max\'s Groomer! Estoy interesado en el asesoramiento nutricional para mi mascota.');

  return (
    <div
      className="relative min-h-screen bg-cover bg-center bg-no-repeat pt-0 px-4 flex flex-col items-center font-inter text-gray-800" // Removí el pt-10 de aquí para que la navbar se encargue
      style={{
        backgroundImage: `url(${fondoMascota})`,
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Overlay oscuro para mejorar la legibilidad del texto sobre la imagen de fondo */}
      <div className="absolute inset-0 bg-gray-900 opacity-70 z-0"></div>

      {/* Navbar con un padding superior para compensar su altura fija */}
      <Navbar className="relative z-10 w-full" /> 
      {/* Este div actúa como un "espaciador" para que el contenido comience debajo de la Navbar fija */}
      <div className="pt-16 w-full"></div> {/* pt-16 (64px) coincide con la altura estándar h-16 de la Navbar */}

      {/* Contenedor principal: Flexbox para organizar la calculadora y la sección de información */}
      <div className="relative z-10 max-w-5xl w-full bg-gradient-to-br from-blue-950 to-blue-800 p-8 rounded-2xl shadow-2xl border border-blue-700 text-white flex flex-col lg:flex-row gap-8 mt-4 md:mt-8">
        
        {/* Sección de la Calculadora de Alimentos */}
        <div className="lg:w-1/2 p-6 bg-blue-900 rounded-xl shadow-lg flex flex-col items-center border border-blue-700" data-aos="fade-right" data-aos-once="true">
          {/* Título de la sección de la calculadora (sin logo de marca) */}
          <div className="text-center mb-8">
            <h2 className="text-4xl font-extrabold text-indigo-400 flex items-center justify-center gap-3">
              <Calculator size={32} className="text-indigo-300" /> {/* Icono de calculadora */}
              Calculadora Nutricional
            </h2>
            <p className="text-md text-gray-300 mt-2">
              Guía general de ración diaria para tu compañero.
            </p>
          </div>

          {/* Mensaje de error de cálculo */}
          {calculationError && (
            <div className="flex items-center bg-red-800 border border-red-600 text-red-100 px-4 py-3 rounded-lg relative mb-4 w-full text-sm animate-fade-in" data-aos="fade-down" data-aos-once="true">
              <AlertCircle size={20} className="mr-2" />
              <span>{calculationError}</span>
            </div>
          )}

          {/* Selector de Tipo de Mascota (Perro o Gato) */}
          <div className="mb-6 w-full">
            <h3 className="text-lg font-semibold text-gray-200 text-center mb-3 flex items-center justify-center gap-2">
              <PawPrint size={20} className="text-indigo-400" /> Tipo de Mascota
            </h3>
            <div className="flex justify-center gap-4 flex-wrap">
              <button
                onClick={() => { setPetType('perro'); setActivityLevel(null); setWeight(''); setFoodResult(null); setCalculationError(null); }}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 ${
                  petType === 'perro' ? 'bg-indigo-600 text-white shadow-lg border-2 border-indigo-700' : 'bg-blue-700 text-blue-100 hover:bg-blue-600 border border-blue-800'
                }`}
              >
                <Dog size={20} /> Perro
              </button>
              <button
                onClick={() => { setPetType('gato'); setActivityLevel(null); setWeight(''); setFoodResult(null); setCalculationError(null); }}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 ${
                  petType === 'gato' ? 'bg-indigo-600 text-white shadow-lg border-2 border-indigo-700' : 'bg-blue-700 text-blue-100 hover:bg-blue-600 border border-blue-800'
                }`}
              >
                <Cat size={20} /> Gato
              </button>
            </div>
          </div>

          {/* Selector de Nivel de Actividad/Estado Fisiológico (visible solo si se ha seleccionado un tipo de mascota) */}
          {petType && (
            <div className="mb-6 w-full" data-aos="fade-up" data-aos-once="true">
              <h3 className="text-lg font-semibold text-gray-200 text-center mb-3 flex items-center justify-center gap-2">
                <Flame size={20} className="text-orange-400" /> Estado / Nivel de Actividad
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 justify-center">
                <button
                  onClick={() => { setActivityLevel('cachorro'); setFoodResult(null); setCalculationError(null); }}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 transform hover:scale-105 ${
                    activityLevel === 'cachorro' ? 'bg-teal-600 text-white shadow-lg border-2 border-teal-700' : 'bg-blue-700 text-blue-100 hover:bg-blue-600 border border-blue-800'
                  }`}
                >
                  Cachorro
                </button>
                <button
                  onClick={() => { setActivityLevel('adulto_neutro'); setFoodResult(null); setCalculationError(null); }}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 transform hover:scale-105 ${
                    activityLevel === 'adulto_neutro' ? 'bg-teal-600 text-white shadow-lg border-2 border-teal-700' : 'bg-blue-700 text-blue-100 hover:bg-blue-600 border border-blue-800'
                  }`}
                >
                  Adulto (Neutro/Esterilizado)
                </button>
                <button
                  onClick={() => { setActivityLevel('adulto_intacto'); setFoodResult(null); setCalculationError(null); }}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 transform hover:scale-105 ${
                    activityLevel === 'adulto_intacto' ? 'bg-teal-600 text-white shadow-lg border-2 border-teal-700' : 'bg-blue-700 text-blue-100 hover:bg-blue-600 border border-blue-800'
                  }`}
                >
                  Adulto (Intacto)
                </button>
                <button
                  onClick={() => { setActivityLevel('adulto_activo'); setFoodResult(null); setCalculationError(null); }}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 transform hover:scale-105 ${
                    activityLevel === 'adulto_activo' ? 'bg-teal-600 text-white shadow-lg border-2 border-teal-700' : 'bg-blue-700 text-blue-100 hover:bg-blue-600 border border-blue-800'
                  }`}
                >
                  Adulto Activo
                </button>
                 <button
                  onClick={() => { setActivityLevel('adulto_mayor'); setFoodResult(null); setCalculationError(null); }}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 transform hover:scale-105 ${
                    activityLevel === 'adulto_mayor' ? 'bg-teal-600 text-white shadow-lg border-2 border-teal-700' : 'bg-blue-700 text-blue-100 hover:bg-blue-600 border border-blue-800'
                  }`}
                >
                  Adulto Mayor
                </button>
                <button
                  onClick={() => { setActivityLevel('perdida_peso'); setFoodResult(null); setCalculationError(null); }}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 transform hover:scale-105 ${
                    activityLevel === 'perdida_peso' ? 'bg-teal-600 text-white shadow-lg border-2 border-teal-700' : 'bg-blue-700 text-blue-100 hover:bg-blue-600 border border-blue-800'
                  }`}
                >
                  Pérdida de Peso
                </button>
              </div>
            </div>
          )}

          {/* Input para el Peso de la Mascota (visible solo si se ha seleccionado un nivel de actividad) */}
          {activityLevel && (
            <div className="mb-8 w-full" data-aos="fade-up" data-aos-once="true">
              <label className="block text-md font-medium text-gray-200 mb-2 text-center flex items-center justify-center gap-2">
                <Scale size={20} className="text-green-400" /> Peso de la mascota (kg)
              </label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-3 border-2 border-blue-600 rounded-md text-center text-xl font-bold text-white focus:border-indigo-400 focus:ring-indigo-400 transition shadow-sm bg-blue-800 placeholder-gray-300"
                min="0.1"
                max="200"
                step="0.1"
                placeholder="Ej: 5.5"
              />
              {typeof weight === 'number' && weight > 0 && (
                <p className="text-center text-md mt-2 text-gray-300">Peso actual: <strong className="text-indigo-400">{weight}</strong> kg</p>
              )}
            </div>
          )}

          {/* Sección de Resultado del Cálculo (visible si no hay error y hay resultado) */}
          {!calculationError && foodResult && !isLoading && (
            <div className="text-center mt-6 p-4 bg-blue-800 rounded-lg border border-blue-700 w-full animate-fade-in shadow-inner" data-aos="zoom-in" data-aos-once="true">
              <h3 className="text-2xl font-bold text-blue-200 mb-2">Ración Diaria Sugerida:</h3>
              <p className="text-6xl font-extrabold text-yellow-300 animate-pulse">{foodResult}</p>
              <p className="text-sm text-gray-300 mt-2 italic">
                *Esta es una guía general. La ración exacta depende del alimento específico.
              </p>
            </div>
          )}
          {isLoading && !calculationError && (
             <div className="text-center mt-6 p-4 w-full">
                <Loader2 className="animate-spin text-indigo-400 mx-auto" size={36} />
                <p className="text-indigo-400 mt-2">Calculando ración...</p>
             </div>
          )}
        </div>

        {/* Sección de Asesoramiento Nutricional */}
        <div className="lg:w-1/2 p-6 bg-blue-900 text-white rounded-xl shadow-lg flex flex-col justify-between border border-blue-700" data-aos="fade-left" data-aos-once="true">
          <div>
            <h2 className="text-3xl font-extrabold text-center text-blue-300 mb-6">
              Asesoramiento Nutricional Personalizado
            </h2>
            <p className="text-lg text-blue-100 mb-8 text-center">
              Cada mascota es única. Para un plan de alimentación que se ajuste perfectamente a sus necesidades, ¡consulta a nuestros expertos!
            </p>

            {/* Lista de puntos clave sobre el asesoramiento profesional */}
            <ul className="space-y-4 mb-8 text-blue-100 text-base">
              <li className="flex items-start gap-3">
                <Info size={24} className="flex-shrink-0 text-yellow-300 mt-1" />
                <div>
                  <strong className="text-white">Planes a Medida:</strong>
                  <p>Dietas personalizadas según raza, edad, estado de salud y nivel de actividad.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Info size={24} className="flex-shrink-0 text-yellow-300 mt-1" />
                <div>
                  <strong className="text-white">Manejo de Peso:</strong>
                  <p>Estrategias efectivas para la pérdida o ganancia de peso saludable.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Info size={24} className="flex-shrink-0 text-yellow-300 mt-1" />
                <div>
                  <strong className="text-white">Condiciones Médicas:</strong>
                  <p>Recomendaciones dietéticas para mascotas con necesidades especiales o enfermedades.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Info size={24} className="flex-shrink-0 text-yellow-300 mt-1" />
                <div>
                  <strong className="text-white">Alimentos Específicos:</strong>
                  <p>Guía sobre la mejor elección de alimentos comerciales o dietas caseras.</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Llamada a la acción para contactar por asesoramiento */}
          <div className="text-center mt-auto">
            <a
              href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`} // Enlace directo a WhatsApp con mensaje predefinido
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-8 py-4 bg-yellow-400 hover:bg-yellow-500 text-blue-950 text-lg font-bold rounded-full shadow-lg transition-all duration-300 transform hover:scale-105"
            >
              <ShoppingBag size={24} className="mr-3" /> {/* Icono de bolsa de compras (reutilizado, o se podría buscar uno de contacto) */}
              ¡Agenda una Consulta Nutricional!
            </a>
            <p className="text-sm text-blue-200 mt-3">¡Estamos aquí para cuidar a tu mascota!</p>
          </div>
        </div>
      </div>

      {/* Sección de Fuentes y Descargo de Responsabilidad - MUY IMPORTANTE Y DETALLADA */}
      <section className="relative z-10 max-w-5xl w-full bg-gray-800 text-gray-200 p-8 rounded-xl shadow-lg border border-gray-700 mt-8" data-aos="fade-up" data-aos-once="true">
        <h3 className="text-2xl font-bold text-indigo-300 mb-4 flex items-center gap-2">
          <BookOpen size={24} /> Fuentes y Descargo de Responsabilidad
        </h3>
        <div className="text-sm leading-relaxed space-y-3">
          <p>
            Esta Calculadora Nutricional de Max's Groomer proporciona una estimación de la necesidad calórica diaria para perros y gatos, y una ración aproximada de alimento seco, basándose en principios fundamentales de nutrición veterinaria.
          </p>
          <p className="font-semibold text-yellow-300">
            Es CRÍTICO entender que esta herramienta es **ILUSTRATIVA, simplificada y de referencia rápida**, y bajo NINGUNA circunstancia debe sustituir el consejo, diagnóstico o tratamiento de un veterinario certificado.
          </p>
          <ul className="list-disc list-inside space-y-2 pl-4">
            <li>
              <strong className="text-white">Cálculo de RER/DER:</strong> La estimación de la Necesidad Energética en Reposo (RER) se basa en la fórmula estándar `70 * (Peso en kg)^0.75`. La Necesidad Energética Diaria (DER) se calcula multiplicando el RER por un factor de actividad/estado fisiológico. Estos factores son promedios generales y pueden variar.
            </li>
            <li>
              <strong className="text-white">Densidad Calórica del Alimento:</strong> La conversión de calorías a gramos de alimento utiliza un valor promedio de **3.7 kcal/gramo**, que es típico para muchos alimentos secos comerciales para mascotas. Sin embargo, la densidad calórica real de cada alimento varía significativamente. **Siempre debe verificar la etiqueta nutricional de su alimento específico** para conocer su contenido exacto de calorías (generalmente expresado en `kcal/kg` o `kcal/taza`).
            </li>
            <li>
              <strong className="text-white">Variabilidad Individual:</strong> Las necesidades nutricionales son altamente individuales y dependen de factores como la raza específica, la edad exacta, el nivel de actividad preciso, la presencia de enfermedades, estado reproductivo (gestación, lactancia), y el metabolismo único de cada animal.
            </li>
            <li>
              <strong className="text-white">Fuentes de Referencia (Principios Generales):</strong>
              <p className="mt-1">
                Los principios de cálculo de RER y DER, así como los factores de actividad utilizados, se basan en directrices aceptadas en la nutrición de pequeños animales, como las publicadas por organizaciones profesionales y textos de referencia:
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li><a href="https://www.wsava.org/WSAVA/media/Documents/Committee%20Resources/Global%20Nutrition%20Committee/Nutrition-Assessment-Guidelines-English.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Global Nutrition Committee of the World Small Animal Veterinary Association (WSAVA) - Nutritional Assessment Guidelines.</a></li>
                <li><a href="https://www.aaha.org/globalassets/02-guidelines/nutrition/2021-aaha-nutrition-and-weight-management-guidelines.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">American Animal Hospital Association (AAHA) - Nutritional and Weight Management Guidelines.</a></li>
                <li>National Research Council (NRC) - Nutrient Requirements of Dogs and Cats. (Esta es una publicación extensa, no hay un URL directo a una "calculadora", pero es la base de muchos cálculos nutricionales).</li>
              </ul>
            </li>
          </ul>
          <p className="mt-4 text-center text-lg font-bold text-yellow-200">
            Para un plan nutricional seguro, preciso y adaptado a las necesidades específicas de tu mascota, te instamos a **agendar una consulta con nuestros veterinarios** en Max's Groomer.
          </p>
        </div>
      </section>

      {/* Pie de página de la calculadora */}
      <footer className="relative z-10 w-full text-center text-gray-400 text-sm mt-10 pb-6">
        <p>&copy; {new Date().getFullYear()} Max's Groomer. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};

export default FoodCalculator;

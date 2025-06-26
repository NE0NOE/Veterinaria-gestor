import React, { useEffect, useState } from 'react'; // Importamos useState para la sección de FAQ
import imagenHero from '../assets/max.webp';
import rivas from '../assets/RivasParque.jpg';
import groom from '../assets/groom.jpg';
import vet from '../assets/vet.jpeg';
import purinaLogo from '../assets/purina-logo.png';
import { Navbar } from '../components/Navbar';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronDown, MessageCircle, Heart } from 'lucide-react'; // Iconos para la sección de FAQ

const LandingPage = () => {
  // Estado para controlar la apertura de las preguntas frecuentes
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  useEffect(() => {
    AOS.init({ duration: 1000, once: true });
  }, []);

  // Definimos el número de teléfono y el mensaje para WhatsApp
  const whatsappNumber = '57660362'; // Tu número sin + ni espacios
  const whatsappMessage = encodeURIComponent('¡Hola Max\'s Groomer! Estoy interesado en sus servicios y me gustaría hacer una consulta.'); // Mensaje codificado para URL

  // Preguntas Frecuentes (FAQ)
  const faqs = [
    {
      question: '¿Qué servicios ofrecen en Max\'s Groomer?',
      answer: 'En Max\'s Groomer ofrecemos servicios completos de grooming y citas veterinarias para el bienestar integral de tu mascota. ¡Nos encanta verlos felices y sanos!',
    },
    {
      question: '¿Dónde están ubicados?',
      answer: 'Nos encontramos en Rivas, Nicaragua, convenientemente ubicados frente a la Farmacia "San Francisco". ¡Siempre listos para recibir a tu peludito!',
    },
    {
      question: '¿Cómo puedo agendar una cita?',
      answer: 'Puedes agendar una cita directamente a través de nuestra plataforma web si ya eres usuario, o contactándonos por WhatsApp para coordinar. ¡Estamos aquí para ayudarte!',
    },
    {
      question: '¿Cuál es la importancia de la nutrición para mi mascota?',
      answer: 'Una nutrición adecuada es fundamental para la vitalidad y longevidad de tu mascota. Las dietas balanceadas, como las de Purina, apoyan su energía, pelaje y salud general.',
    },
  ];

  return (
    <div className="bg-gray-950 text-white font-inter">
      <Navbar />

      {/* Hero principal */}
      <section
        className="relative h-screen flex items-center justify-center text-center text-white p-4 sm:p-6 md:p-8" // Padding responsivo
        style={{
          backgroundImage: `url(${imagenHero})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black opacity-60"></div>
        <div className="relative z-10 max-w-4xl mx-auto"> {/* Contenedor centrado y max-width */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 text-indigo-300 leading-tight hover:scale-105 transition duration-500"> {/* Tamaño de texto responsivo */}
            Bienvenidos a Max's Groomer
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-300"> {/* Tamaño de texto responsivo */}
            Tu clínica veterinaria de confianza en Rivas
          </p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-8"
          >
            <Link
              to="/create-appointment"
              className="inline-flex items-center px-6 py-3 sm:px-8 sm:py-4 border border-transparent text-base sm:text-lg font-medium rounded-full text-white bg-blue-600 hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Agenda tu cita ahora
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Sobre Nosotros */}
      <section className="py-16 sm:py-20 px-4 md:px-8 lg:px-16 bg-gray-900 text-white"> {/* Padding responsivo */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 items-center"> {/* Grid responsivo */}
          <div data-aos="fade-right" className="overflow-hidden rounded-lg shadow-lg">
            <img
              src={rivas}
              alt="Instalaciones"
              className="w-full h-auto object-cover rounded-lg transform hover:scale-105 transition-transform duration-500" // Responsividad y efecto
            />
          </div>
          <div data-aos="fade-left">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-indigo-400 mb-4">Sobre Nosotros</h2> {/* Tamaño de texto responsivo */}
            <p className="text-gray-300 mb-4 text-sm sm:text-base"> {/* Tamaño de texto responsivo */}
              En Max's Groomer, nos dedicamos al cuidado integral de las mascotas. Fundada hace más de ocho años en Rivas, Nicaragua, nuestra clínica combina tradición y modernidad para ofrecer atención veterinaria de alta calidad.
            </p>
            <p className="text-gray-300 text-sm sm:text-base"> {/* Tamaño de texto responsivo */}
              Nuestro equipo, comprometido y cercano, se esfuerza por brindar servicios de grooming y citas veterinarias, siempre con el cariño y profesionalismo que tu mascota merece.
            </p>
          </div>
        </div>
      </section>

      {/* Servicios */}
      <section className="py-16 sm:py-20 bg-gray-950 text-white"> {/* Padding responsivo */}
        <div className="max-w-6xl mx-auto px-4 md:px-8 lg:px-16"> {/* Padding responsivo */}
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-indigo-300 mb-12 sm:mb-16" data-aos="fade-up"> {/* Tamaño de texto responsivo */}
            Nuestros Servicios
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12"> {/* Grid responsivo */}
            <div className="text-center bg-gray-900 p-6 rounded-xl shadow-lg border border-blue-800" data-aos="zoom-in">
              <div className="w-48 h-48 sm:w-64 sm:h-64 mx-auto mb-6 overflow-hidden rounded-full shadow-lg border-4 border-indigo-600"> {/* Ajuste de tamaño y forma */}
                <img
                  src={groom}
                  alt="Servicio de Grooming"
                  className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-500"
                />
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold text-indigo-400 mb-2">Grooming</h3> {/* Tamaño de texto responsivo */}
              <p className="text-gray-400 text-sm sm:text-base">
                Ofrecemos servicios de estética y aseo para que tu mascota luzca siempre radiante.
              </p>
            </div>
            <div className="text-center bg-gray-900 p-6 rounded-xl shadow-lg border border-blue-800" data-aos="zoom-in" data-aos-delay="200">
              <div className="w-48 h-48 sm:w-64 sm:h-64 mx-auto mb-6 overflow-hidden rounded-full shadow-lg border-4 border-indigo-600"> {/* Ajuste de tamaño y forma */}
                <img
                  src={vet}
                  alt="Citas Veterinarias"
                  className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-500"
                />
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold text-indigo-400 mb-2">Citas Veterinarias</h3> {/* Tamaño de texto responsivo */}
              <p className="text-gray-400 text-sm sm:text-base">
                Agenda una consulta con nuestros expertos para asegurar el bienestar de tu compañero.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Alimentación Purina (sin botón) */}
      <section className="py-12 sm:py-16 bg-indigo-950 px-4 md:px-8 lg:px-16 text-center"> {/* Padding responsivo */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-indigo-200 mb-6 sm:mb-8">Alimentación Purina</h2> {/* Tamaño de texto responsivo */}

          <div className="flex justify-center mb-6">
            <img src={purinaLogo} alt="Purina Logo" className="h-16 sm:h-20" /> {/* Tamaño de logo responsivo */}
          </div>

          <motion.p
            className="text-base sm:text-lg text-gray-300 mb-4 sm:mb-8" // Tamaño de texto responsivo
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            Ofrecemos productos Purina Pro Plan, diseñados para satisfacer las necesidades nutricionales de tu mascota.{' '}
            <strong className="text-white">Descubre la mejor nutrición para tu compañero peludo.</strong>
          </motion.p>
          {/* El botón de la calculadora de alimentos ha sido removido aquí */}
        </div>
      </section>

      {/* Sección de Preguntas Frecuentes (FAQ) */}
      <section className="py-16 sm:py-20 bg-gray-900 text-white px-4 md:px-8 lg:px-16"> {/* Padding responsivo */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-blue-400 mb-12" data-aos="fade-up">
            Preguntas Frecuentes (FAQ)
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-gray-800 rounded-lg shadow-md border border-blue-700 overflow-hidden cursor-pointer"
                onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                data-aos="fade-up"
                data-aos-delay={`${index * 100}`}
              >
                <div className="flex justify-between items-center p-4 sm:p-5">
                  <h3 className="text-lg sm:text-xl font-semibold text-indigo-300 flex-grow">
                    {faq.question}
                  </h3>
                  <ChevronDown
                    className={`transform transition-transform duration-300 ${openFAQ === index ? 'rotate-180' : ''} text-gray-400`}
                    size={24}
                  />
                </div>
                <div
                  className={`px-4 sm:px-5 pb-4 sm:pb-5 text-gray-300 text-sm sm:text-base transition-all duration-300 ease-in-out overflow-hidden ${
                    openFAQ === index ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
                  }`}
                  style={{ transitionProperty: 'max-height, opacity' }} // Asegura una transición suave
                >
                  <p>{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12" data-aos="fade-up" data-aos-delay="400">
            <p className="text-lg sm:text-xl text-gray-300 mb-6">
              ¿Aún tienes dudas o necesitas una consulta más específica?
            </p>
            <a
              href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 sm:px-8 sm:py-4 border border-transparent text-base sm:text-lg font-medium rounded-full text-white bg-green-600 hover:bg-green-700 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <MessageCircle size={24} className="mr-3" /> ¡Habla con un Veterinario Ahora!
            </a>
            <p className="text-xs sm:text-sm text-gray-500 mt-4">
              (Respuestas generales. Para diagnósticos, consulta a nuestros expertos en clínica.)
            </p>
          </div>
        </div>
      </section>

      {/* Ubicación */}
      <section className="py-16 sm:py-20 px-4 md:px-8 lg:px-16 bg-gray-950 text-white"> {/* Padding responsivo */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 items-center"> {/* Grid responsivo */}
          <div data-aos="fade-right">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-indigo-400 mb-4">Nuestra Ubicación</h2> {/* Tamaño de texto responsivo */}
            <p className="text-gray-300 mb-4 text-sm sm:text-base">
              Nos encontramos en el corazón de Rivas, Nicaragua, frente a la Farmacia "San Francisco".
            </p>
            <p className="text-gray-300 text-sm sm:text-base">
              ¡Estamos listos para cuidar a tu compañero peludo con el cariño y la dedicación que se merece!
            </p>
          </div>
          <div className="overflow-hidden rounded-lg shadow-lg" data-aos="fade-left">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d345.650984937308!2d-85.83319817262564!3d11.43695100033114!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sni!4v1743146154133!5m2=1sen!2sni"
              width="100%"
              height="300" // Altura ajustable para móvil
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Ubicación de Max's Groomer en Google Maps"
            ></iframe>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-white py-8 sm:py-10"> {/* Padding responsivo */}
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 text-sm text-gray-300"> {/* Grid responsivo */}
          <div>
            <h4 className="font-semibold text-white mb-2">Dirección</h4>
            <p>Del portón principal de la uniav, 2 cuadras al sur, media al lago</p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Contacto</h4>
            <p>
              Teléfono:{' '}
              <a
                href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors duration-200"
              >
                (505)5766-0362
              </a>
            </p>
            <p>Email: contacto@maxsgroomer.com</p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Redes Sociales</h4>
            <p className="flex flex-wrap gap-x-3 gap-y-1">
              <a href="#" className="hover:underline text-indigo-400">Facebook</a> |
              <a href="#" className="hover:underline text-indigo-400">Instagram</a> |
              <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="hover:underline text-indigo-400">WhatsApp</a>
            </p>
          </div>
        </div>
        <div className="text-center text-gray-500 mt-6 text-xs sm:text-sm"> {/* Tamaño de texto responsivo */}
          &copy; {new Date().getFullYear()} Max's Groomer. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

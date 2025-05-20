import React, { useEffect } from 'react';
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

const LandingPage = () => {
  useEffect(() => {
    AOS.init({ duration: 1000, once: true });
  }, []);

  return (
    <div className="bg-gray-50">
      <Navbar />

      {/* Hero principal */}
      <section
        className="relative h-screen flex items-center justify-center text-center text-white"
        style={{
          backgroundImage: `url(${imagenHero})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black opacity-50"></div>
        <div className="relative z-10 px-4">
          <h1 className="text-5xl font-extrabold mb-4 transition duration-500 transform hover:scale-105">
            Bienvenidos a Max's Groomer
          </h1>
          <p className="text-xl">
            Tu clínica veterinaria de confianza en Rivas
          </p>
        </div>
      </section>

      {/* Sobre Nosotros */}
      <section className="py-20 px-4 md:px-16 bg-white">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div data-aos="fade-right" className="overflow-hidden rounded-lg shadow-lg">
            <img
              src={rivas}
              alt="Instalaciones"
              className="w-full h-full object-cover"
            />
          </div>
          <div data-aos="fade-left">
            <h2 className="text-4xl font-extrabold text-gray-800 mb-4">Sobre Nosotros</h2>
            <p className="text-gray-700 mb-4">
              En Max's Groomer, nos dedicamos al cuidado integral de las mascotas. Fundada hace más de ocho años en Rivas, Nicaragua, nuestra clínica combina tradición y modernidad para ofrecer atención veterinaria de alta calidad.
            </p>
            <p className="text-gray-700">
              Nuestro equipo, comprometido y cercano, se esfuerza por brindar servicios de grooming y citas veterinarias, siempre con el cariño y profesionalismo que tu mascota merece.
            </p>
          </div>
        </div>
      </section>

      {/* Servicios */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 md:px-16">
          <h2 className="text-4xl font-extrabold text-center text-gray-800 mb-16" data-aos="fade-up">
            Nuestros Servicios
          </h2>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="text-center" data-aos="zoom-in">
              <div className="w-64 h-64 mx-auto mb-6 overflow-hidden rounded-xl shadow-lg">
                <img
                  src={groom}
                  alt="Servicio de Grooming"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-2xl font-semibold mb-2">Grooming</h3>
              <p className="text-gray-600">
                Ofrecemos servicios de estética y aseo para que tu mascota luzca siempre radiante.
              </p>
            </div>
            <div className="text-center" data-aos="zoom-in" data-aos-delay="200">
              <div className="w-64 h-64 mx-auto mb-6 overflow-hidden rounded-xl shadow-lg">
                <img
                  src={vet}
                  alt="Citas Veterinarias"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-2xl font-semibold mb-2">Citas Veterinarias</h3>
              <p className="text-gray-600">
                Agenda una consulta con nuestros expertos para asegurar el bienestar de tu compañero.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
  <div className="max-w-6xl mx-auto text-center">
    <h2 className="text-4xl font-extrabold text-gray-800 mb-8">Alimentación Purina</h2>
    
    <div className="flex justify-center mb-6">
      <img src={purinaLogo} alt="Purina Logo" className="h-20" />
    </div>
    
    <motion.p
      className="text-lg text-gray-600 mb-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, delay: 0.3 }}
    >
      Ofrecemos productos Purina Pro Plan, diseñados para satisfacer las necesidades nutricionales de tu mascota. 
      <strong> Descubre la mejor nutrición para tu compañero peludo.</strong>
    </motion.p>

    {/* Botón aquí 👇 */}
    <Link
      to="/calculadora-alimentos"
      className="inline-flex items-center px-8 py-3 border border-transparent text-sm font-medium rounded-full text-white bg-red-600 hover:bg-red-700 transition-all duration-300"
    >
      ¡Calcula la Ración Ideal!
    </Link>
  </div>
</section>


      {/* Ubicación */}
      <section className="py-20 px-4 md:px-16 bg-gray-100">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div data-aos="fade-right">
            <h2 className="text-4xl font-extrabold text-gray-800 mb-4">Nuestra Ubicación</h2>
            <p className="text-gray-700 mb-4">
              Nos encontramos en el corazón de Rivas, Nicaragua, frente a la Farmacia "San Francisco".
            </p>
            <p className="text-gray-700">
              ¡Estamos listos para cuidar a tu compañero peludo con el cariño y la dedicación que se merece!
            </p>
          </div>
          <div className="overflow-hidden rounded-lg shadow-lg" data-aos="fade-left">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d345.650984937308!2d-85.83319817262564!3d11.43695100033114!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sni!4v1743146154133!5m2!1sen!2sni"
              width="100%"
              height="400"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-10 mt-16">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-3 gap-8 text-sm text-gray-300">
          <div>
            <h4 className="font-semibold text-white mb-2">Dirección</h4>
            <p>Coloca aquí la dirección de la clínica</p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Contacto</h4>
            <p>Teléfono: (000) 0000-0000</p>
            <p>Email: contacto@maxsgroomer.com</p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Redes Sociales</h4>
            <p>Facebook | Instagram | WhatsApp</p>
          </div>
        </div>
        <div className="text-center text-gray-500 mt-6 text-xs">
          &copy; {new Date().getFullYear()} Max's Groomer. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;


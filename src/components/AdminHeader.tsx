// src/components/AdminHeader.tsx
import React from 'react';
import imagenHero from '../assets/maxi.jpg';

interface AdminHeaderProps {
  titulo: string;
  subtitulo: string;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ titulo, subtitulo }) => {
  return (
    <section
      className="relative h-56 text-white flex items-center justify-center text-center"
      style={{
        backgroundImage: `url(${imagenHero})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black bg-opacity-50" />
      <div className="relative z-10 px-4">
        <h2 className="text-4xl font-bold mb-2">{titulo}</h2>
        <p className="text-lg text-gray-200">{subtitulo}</p>
      </div>
    </section>
  );
};

export default AdminHeader;

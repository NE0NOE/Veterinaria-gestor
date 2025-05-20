import React from 'react';

const Home = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Resumen</h2>

      <div className="bg-white text-black p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-2">Próximas Citas</h3>
        <p>Aquí se mostrarán las próximas citas del cliente...</p>
      </div>

      <div className="bg-white text-black p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-2">Mascotas Registradas</h3>
        <p>Información breve de las mascotas del cliente.</p>
      </div>
    </div>
  );
};

export default Home;

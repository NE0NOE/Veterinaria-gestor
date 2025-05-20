import { motion } from "framer-motion";
import { useState } from "react";
import { Dog, Cat } from "lucide-react";

type PetType = 'dog' | 'cat';

interface Props {
  selected: PetType;
  onSelect: (value: PetType) => void;
}

export const PetSelector: React.FC<Props> = ({ selected, onSelect }) => {
  return (
    <div className="flex justify-center gap-8">
      {['dog', 'cat'].map((pet) => (
        <motion.div
          key={pet}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className={`cursor-pointer border-2 rounded-xl p-6 w-40 text-center transition-all duration-300 shadow-md ${
            selected === pet
              ? 'border-indigo-500 bg-indigo-50 shadow-indigo-300'
              : 'border-gray-300 bg-white'
          }`}
          onClick={() => onSelect(pet as PetType)}
        >
          <div className="flex justify-center mb-3">
            {pet === 'dog' ? (
              <Dog className="h-10 w-10 text-indigo-600" />
            ) : (
              <Cat className="h-10 w-10 text-pink-600" />
            )}
          </div>
          <span className="text-lg font-semibold capitalize">{pet === 'dog' ? 'Perro' : 'Gato'}</span>
        </motion.div>
      ))}
    </div>
  );
};

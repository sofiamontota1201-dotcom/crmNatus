import React, { useState } from 'react';

interface LoginFormProps {
  onLogin: (credentials: { email: string; password: string }) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin({ email, password });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block mb-1 text-gray-700">Correo</label>
        <input
          type="email"
          className="w-full border border-gray-300 px-3 py-2 rounded shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block mb-1 text-gray-700">Contraseña</label>
        <input
          type="password"
          className="w-full border border-gray-300 px-3 py-2 rounded shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
      </div>
      <button
        type="submit"
        className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-black/30"
      >
        Iniciar Sesión
      </button>
    </form>
  );
};

export default LoginForm;

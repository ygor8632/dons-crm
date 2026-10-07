'use client';

import { useState } from 'react';
import { createClient } from '../../utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(`Erro: ${error.message}`);
    } else {
      setMessage('Registo efetuado com sucesso! (Pode ser necessário confirmar o e-mail no Supabase)');
    }
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(`Erro: ${error.message}`);
    } else {
      router.push('/dashboard'); // Redireciona para o painel após o login
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">Dons CRM</h1>
        <form className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">E-mail</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border p-2 text-gray-900"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Palavra-passe</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border p-2 text-gray-900"
              required
            />
          </div>
          
          {message && <p className="text-sm text-center text-blue-600 font-medium">{message}</p>}

          <div className="flex gap-4 mt-6">
            <button 
              onClick={handleSignIn}
              disabled={loading}
              className="w-full rounded-md bg-blue-600 p-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Entrar
            </button>
            <button 
              onClick={handleSignUp}
              disabled={loading}
              className="w-full rounded-md border border-blue-600 p-2 text-blue-600 hover:bg-blue-50 disabled:opacity-50"
            >
              Registar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
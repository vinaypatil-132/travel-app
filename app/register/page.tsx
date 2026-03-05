'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Input } from '@/components/ui/Input';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Registration failed.');
        setLoading(false);
        return;
      }

      // Auto sign in after registration
      const result = await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        router.push('/login');
      } else {
        window.location.href = '/dashboard';
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <span className="text-3xl">🗺️</span>
            <h1 className="mt-3 text-xl font-bold text-stone-900">Create your account</h1>
            <p className="mt-1 text-sm text-stone-500">Start planning your first blueprint</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: 'Name', name: 'name', type: 'text', placeholder: 'Jane Doe', autoComplete: 'name' },
              { label: 'Email', name: 'email', type: 'email', placeholder: 'you@example.com', autoComplete: 'email' },
              { label: 'Password', name: 'password', type: 'password', placeholder: '••••••••', autoComplete: 'new-password' },
            ].map((field) => (
              <div key={field.name}>
                <label htmlFor={field.name} className="block text-xs font-medium text-stone-700">
                  {field.label}
                </label>
                <Input
                  id={field.name}
                  name={field.name}
                  type={field.type}
                  autoComplete={field.autoComplete}
                  required
                  value={form[field.name as keyof typeof form]}
                  onChange={onChange}
                  placeholder={field.placeholder}
                  minLength={field.name === 'password' ? 8 : field.name === 'name' ? 2 : undefined}
                />
              </div>
            ))}

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-stone-500">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-amber-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

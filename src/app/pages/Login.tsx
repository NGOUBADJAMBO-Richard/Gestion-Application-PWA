import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../contexts/AuthContext';
import { BrandLogo } from '../components/BrandLogo';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

export function Login() {
  const { login } = useAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@mgn.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError('Veuillez renseigner votre email et votre mot de passe.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await login(email.trim(), password);
      navigate('/', { replace: true });
    } catch {
      setError('Connexion impossible. Veuillez reessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl overflow-hidden border-border/70 surface-card">
        <div className="grid md:grid-cols-[1fr_1.1fr]">
          <div className="brand-gradient p-8 text-white hidden md:flex flex-col justify-between">
            <div>
              <BrandLogo size="lg" showText={false} mode="color" />
              <p className="mt-6 text-2xl font-semibold leading-tight">
                Pilotez vos clients, projets et factures depuis un seul espace.
              </p>
            </div>

            <p className="text-sm text-white/85">
              Concu pour les equipes locales et entreprises au Gabon.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <CardHeader className="px-0 pt-0">
              <div className="md:hidden mb-4">
                <BrandLogo
                  size="md"
                  mode={theme === 'dark' ? 'mono' : 'color'}
                  subtitle={t('brand.businessSuite')}
                />
              </div>
              <CardTitle>Connexion</CardTitle>
              <CardDescription>Accedez a votre espace M.G.N Manager</CardDescription>
            </CardHeader>

            <CardContent className="px-0 pb-0">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@mgn.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="********"
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                  style={{ backgroundColor: '#004aad' }}
                >
                  {isSubmitting ? 'Connexion...' : 'Se connecter'}
                </Button>
              </form>
            </CardContent>
          </div>
        </div>
      </Card>
    </div>
  );
}

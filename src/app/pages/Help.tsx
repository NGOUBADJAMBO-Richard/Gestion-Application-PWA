import React from 'react';
import { Book, Video, MessageCircle, FileQuestion, Zap, Shield, Globe, Smartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useLanguage } from '../contexts/LanguageContext';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';

export function Help() {
  const { t } = useLanguage();

  const resources = [
    {
      title: 'Documentation',
      description: 'Complete guides and API references',
      icon: Book,
      color: '#004aad',
    },
    {
      title: 'Video Tutorials',
      description: 'Step-by-step video walkthroughs',
      icon: Video,
      color: '#10b981',
    },
    {
      title: 'Community Forum',
      description: 'Connect with other users',
      icon: MessageCircle,
      color: '#f59e0b',
    },
    {
      title: 'FAQs',
      description: 'Frequently asked questions',
      icon: FileQuestion,
      color: '#ef4444',
    },
  ];

  const features = [
    {
      title: 'Progressive Web App',
      description: 'Works offline and installs like a native app',
      icon: Smartphone,
    },
    {
      title: 'Real-time Updates',
      description: 'Instant synchronization across all devices',
      icon: Zap,
    },
    {
      title: 'Secure & Private',
      description: 'Enterprise-grade security and encryption',
      icon: Shield,
    },
    {
      title: 'Multi-language',
      description: 'Available in French and English',
      icon: Globe,
    },
  ];

  const faqs = [
    {
      question: 'Comment créer un nouveau projet ?',
      answer: 'Allez dans la section "Projets" et cliquez sur le bouton "Nouveau Projet". Remplissez les informations requises comme le nom du projet, le client, le budget et la date d\'échéance.',
    },
    {
      question: 'Comment gérer les factures ?',
      answer: 'Dans la section "Facturation", vous pouvez créer de nouvelles factures, suivre les paiements et télécharger les factures en PDF. Le système vous alerte automatiquement pour les factures en retard.',
    },
    {
      question: 'Puis-je utiliser l\'application hors ligne ?',
      answer: 'Oui ! M.G.N Manager est une Progressive Web App (PWA). Une fois installée, vous pouvez accéder aux données critiques même sans connexion internet.',
    },
    {
      question: 'Comment changer le thème ?',
      answer: 'Cliquez sur l\'icône Soleil/Lune dans la barre supérieure pour basculer entre le mode clair et le mode sombre.',
    },
    {
      question: 'Comment changer la langue ?',
      answer: 'Utilisez le bouton de langue (Globe) dans la barre supérieure pour basculer entre le français et l\'anglais.',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1>{t('nav.help')}</h1>
        <p className="text-muted-foreground mt-1">Tout ce dont vous avez besoin pour bien démarrer</p>
      </div>

      {/* Resources */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {resources.map((resource, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                style={{ backgroundColor: `${resource.color}15` }}
              >
                <resource.icon className="w-6 h-6" style={{ color: resource.color }} />
              </div>
              <CardTitle className="text-base">{resource.title}</CardTitle>
              <CardDescription>{resource.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle>Key Features</CardTitle>
          <CardDescription>Discover what makes M.G.N Manager powerful</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="flex gap-4">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#004aad15' }}
                >
                  <feature.icon className="w-5 h-5" style={{ color: '#004aad' }} />
                </div>
                <div>
                  <h4 className="font-medium mb-1">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* FAQs */}
      <Card>
        <CardHeader>
          <CardTitle>Questions Fréquentes</CardTitle>
          <CardDescription>Trouvez rapidement les réponses à vos questions</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Quick Start */}
      <Card style={{ borderColor: '#004aad' }}>
        <CardHeader>
          <CardTitle>Installation PWA</CardTitle>
          <CardDescription>Installez M.G.N Manager comme une application</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Sur Desktop (Chrome/Edge)</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Cliquez sur l'icône d'installation dans la barre d'adresse</li>
              <li>Ou Menu → Installer M.G.N Manager</li>
              <li>L'application sera ajoutée à votre bureau</li>
            </ol>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">Sur Mobile (iOS/Android)</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>iOS: Safari → Partager → Ajouter à l'écran d'accueil</li>
              <li>Android: Chrome → Menu → Installer l'application</li>
              <li>L'icône apparaîtra sur votre écran d'accueil</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

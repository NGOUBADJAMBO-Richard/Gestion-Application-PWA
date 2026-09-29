import { useState } from "react";
import { CalendarClock, Pencil, Save, Shield, UserRound, X } from "lucide-react";
import { toast } from "sonner";

import { type EditableUser, useAuth } from "../contexts/AuthContext";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

/**
 * Fiche du compte connecté.
 *
 * Le nom affiché était **déduit de l'adresse e-mail** et modifiable nulle
 * part : « mgncodewave18@gmail.com » donnait « Mgncodewave18 », qui n'est le
 * nom de personne. Il apparaissait pourtant dans la barre latérale à chaque
 * ouverture.
 *
 * Ces champs ne sont que des libellés d'affichage : les changer n'affecte ni
 * le mot de passe, ni le code de récupération, ni l'accès. C'est dit à
 * l'écran, pour que personne n'hésite à corriger son propre nom de peur de
 * casser sa connexion.
 */

const CHAMPS: readonly {
  readonly cle: keyof EditableUser;
  readonly libelle: string;
  readonly type?: string;
  readonly exemple: string;
}[] = [
  { cle: "name", libelle: "Nom affiché", exemple: "NGOUBADJAMBO Richard" },
  {
    cle: "email",
    libelle: "Adresse e-mail",
    type: "email",
    exemple: "prenom@exemple.com",
  },
  { cle: "phone", libelle: "Téléphone", exemple: "+241 66 00 00 00" },
  { cle: "company", libelle: "Entreprise", exemple: "M.G.N CodeWave" },
  { cle: "department", libelle: "Fonction", exemple: "Direction" },
];

export function UserProfilePanel() {
  const { user, updateUser } = useAuth();
  const [edition, setEdition] = useState(false);
  const [brouillon, setBrouillon] = useState<Partial<EditableUser>>({});

  if (user === null) return null;

  const ouvrir = () => {
    setBrouillon({
      name: user.name,
      email: user.email,
      phone: user.phone,
      company: user.company,
      department: user.department,
    });
    setEdition(true);
  };

  const enregistrer = () => {
    updateUser(brouillon);
    setEdition(false);
    toast.success("Profil mis à jour.", {
      description: "Ton accès et ton code de récupération sont inchangés.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <UserRound className="h-5 w-5" aria-hidden="true" />
            Profil utilisateur
          </CardTitle>

          {edition ? (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={() => setEdition(false)}
              >
                <X className="h-4 w-4" />
                Annuler
              </Button>
              <Button size="sm" className="gap-2" onClick={enregistrer}>
                <Save className="h-4 w-4" />
                Enregistrer
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="gap-2" onClick={ouvrir}>
              <Pencil className="h-4 w-4" />
              Modifier
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {edition ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {CHAMPS.map((champ) => (
                <div key={champ.cle} className="space-y-2">
                  <Label htmlFor={`compte-${champ.cle}`}>{champ.libelle}</Label>
                  <Input
                    id={`compte-${champ.cle}`}
                    type={champ.type ?? "text"}
                    value={brouillon[champ.cle] ?? ""}
                    placeholder={champ.exemple}
                    onChange={(event) =>
                      setBrouillon((prev) => ({
                        ...prev,
                        [champ.cle]: event.target.value,
                      }))
                    }
                  />
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Ce sont des libellés d&rsquo;affichage. Les modifier ne touche ni
              au mot de passe, ni au code de récupération, ni à
              l&rsquo;accès — un champ laissé vide garde sa valeur actuelle.
            </p>
          </>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {CHAMPS.map((champ) => (
                <div key={champ.cle}>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {champ.libelle}
                  </p>
                  <p className="mt-1 text-sm">{user[champ.cle]}</p>
                </div>
              ))}

              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Rôle
                </p>
                <Badge variant="secondary" className="mt-1">
                  <Shield className="mr-1 h-3 w-3" aria-hidden="true" />
                  {user.role === "admin" ? "Administrateur" : "Équipe"}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                Dernière connexion le{" "}
                {new Date(user.lastLoginAt).toLocaleString("fr-FR")}
              </span>
              <span>
                Compte créé le{" "}
                {new Date(`${user.joinedAt}T00:00:00`).toLocaleDateString("fr-FR")}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

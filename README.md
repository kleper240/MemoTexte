## 🧠 Apprendre par Cœur - Outil de Mémorisation Active

Cet outil est une application web simple conçue pour aider l'utilisateur à mémoriser des textes longs en utilisant la technique de la **répétition espacée** et du **texte à trous (Cloze Test)**, optimisée par paragraphe et chronométrée.

---

### 📝 Fonctionnalités Principales

* **Division du Texte Automatique :** Le texte long soumis est automatiquement divisé en un nombre gérable de paragraphes (entre 3 et 7) pour faciliter l'apprentissage par morceaux.
* **Lecture Chronométrée :** Chaque paragraphe est soumis à une session de lecture chronométrée (temps configurable : 3, 5, ou 8 minutes par défaut) pour encourager une concentration intense.
* **Quiz à Trous Personnalisé :** Après la lecture, l'utilisateur passe un quiz à trous (Cloze Test) sur le paragraphe. Le niveau de difficulté (densité des mots cachés) est réglable :
    * **Facile** ($\approx 35\%$)
    * **Moyen** ($\approx 60\%$)
    * **Expert** ($\approx 90\%$)
* **Feedback Visuel Immédiat :** Lors de la vérification du quiz, les mots correctement saisis sont affichés en **vert gras** et les erreurs sont affichées en **rouge gras** (avec la bonne réponse affichée).
* **Reprise du Chrono du Quiz :** Le temps du quiz se met en pause lors de la vérification et reprend exactement là où il s'est arrêté si l'utilisateur choisit de refaire le quiz.
* **Suivi de Progrès :** Un graphique final affiche les scores obtenus lors des quiz d'entraînement pour chaque paragraphe.
* **Test Final Global :** Une fois tous les paragraphes étudiés, un test final sur l'intégralité du texte est proposé.

---

### 🛠️ Structure des Fichiers

| Fichier | Rôle | Description |
| :--- | :--- | :--- |
| `index.html` | **Structure** | Contient le squelette de l'application, les formulaires, les sections de lecture/quiz, les modales Bootstrap et le lien vers les scripts et styles. |
| `style.css` | **Apparence** | Définit le style visuel, incluant l'aspect des chronomètres et le **rendu visuel de la correction** (texte en vert/rouge pour les inputs). |
| `script.js` | **Logique** | Contient toute la logique de l'application : division du texte, gestion des timers, génération des quiz à trous, calcul des scores, affichage des résultats, et navigation entre les étapes. |

---

### 🚀 Guide d'Utilisation

1.  **Démarrer :** Collez votre texte long dans la zone de saisie et cliquez sur **Analyser et Configurer**.
2.  **Configuration :** Une fenêtre modale apparaît pour définir le temps de lecture par paragraphe (par exemple, 5 minutes).
3.  **Lecture :** Lisez le paragraphe affiché. Le chronomètre compte à rebours. Vous pouvez le mettre en pause ou le cacher.
4.  **Quiz :** Une fois le temps écoulé (ou si vous cliquez sur "Pratiquer le Quiz Directement"), choisissez la densité des trous (Facile, Moyen, Expert) et lancez le quiz. Un second chronomètre se déclenche.
5.  **Vérification :** Cliquez sur **Vérifier le Quiz**. Observez immédiatement votre score. Les mots réussis restent en vert, les erreurs passent en rouge avec la bonne réponse affichée.
6.  **Progression :**
    * Si le score est faible, vous pouvez **Refaire (nouvelle lecture)** ou **Refaire le Quiz** (avec le temps restant).
    * Cliquez sur **Continuer** pour passer au paragraphe suivant.
7.  **Résultat Final :** Après le dernier paragraphe, passez au test final global, puis visualisez vos scores d'entraînement grâce au graphique.

---

### 💡 Points Clés du Code

* La fonction `splitIntoParagraphs(text)` adapte la taille des blocs pour garantir une session d'étude efficace (max 7 paragraphes).
* La fonction `calculateClozeScore(isFinal)` est responsable de l'application des classes CSS (`.correct` ou `.incorrect`) et du statut `readOnly` aux champs de saisie, assurant ainsi le feedback vert/rouge souhaité sans ligne pointillée.
* Les variables `quizTimeLeft` et `quizIsPaused` sont conservées pour permettre la reprise exacte du chronomètre du quiz après consultation des résultats.

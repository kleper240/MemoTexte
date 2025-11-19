let paragraphs = [];
let currentPara = 0;
let scores = [];
let timerInterval;
let quizTimerInterval;
let initialTime = 300; 
let timeLeft = 300;
let quizTimeLeft = 600; // 10 minutes par défaut pour le quiz
let isPaused = false;
let quizIsPaused = false;
let timerHidden = false;
let quizTimerHidden = false;
let fullText = '';
let totalParas = 0;
let clozeInputs = []; 
let currentQuizRatio = 0.35; // Niveau par défaut

// --- Fonctions Utilitaires ---

/**
 * Divise le texte en paragraphes basés sur des sauts de ligne ou des phrases, 
 * en limitant le résultat à 3-7 morceaux pour l'apprentissage.
 * @param {string} text - Le texte complet à diviser.
 * @returns {string[]} Tableau de chaînes de caractères (paragraphes).
 */
function splitIntoParagraphs(text) {
    let paras = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    if (paras.length > 7) {
        const chunkSize = Math.ceil(paras.length / 7);
        const chunks = [];
        for (let i = 0; i < 7; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, paras.length);
            if (start < paras.length) {
                chunks.push(paras.slice(start, end).join('\n\n'));
            }
        }
        paras = chunks;
    } else if (paras.length < 3) {
        let sentences = text.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(s => s.trim().length > 0);
        const numParas = Math.min(5, Math.max(3, Math.ceil(sentences.length / 3)));
        const sentPerPara = Math.ceil(sentences.length / numParas);
        const finalParas = [];
        for (let i = 0; i < numParas; i++) {
            const start = i * sentPerPara;
            const end = Math.min(start + sentPerPara, sentences.length);
            if (start < sentences.length) {
                finalParas.push(sentences.slice(start, end).join(' '));
            }
        }
        paras = finalParas;
    }
    return paras;
}

/**
 * Génère le contenu HTML du texte à trous.
 * @param {string} text - Le texte à transformer.
 * @param {string} containerId - L'ID de l'élément conteneur.
 * @param {number} holeRatio - Le pourcentage de mots à masquer (e.g., 0.35).
 * @param {boolean} forCorrection - Si true, génère pour correction (avec classes CSS pour couleurs).
 */
function generateClozeText(text, containerId, holeRatio, forCorrection = false) {
    const cleanWord = (word) => word.toLowerCase().replace(/[^\w]/g, ''); 
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    clozeInputs = []; 
    let html = '';
    let holesCount = 0;
    
    words.forEach((word, index) => {
        const cleaned = cleanWord(word);
        
        // Cacher les mots de plus de 3 lettres avec la probabilité holeRatio
        if (cleaned.length > 3 && Math.random() < holeRatio) {
            const inputId = `cloze-${containerId}-${index}`;
            const finalPunctuationMatch = word.match(/([.,!?;:"']+)$/);
            const finalPunctuation = finalPunctuationMatch ? finalPunctuationMatch[0] : '';
            const wordWithoutPunct = word.replace(finalPunctuation, '');
            
            const inputLength = Math.max(10, wordWithoutPunct.length * 1.5);
            const inputClass = forCorrection ? 'cloze-input' : 'cloze-input';
            
            html += `<input type="text" id="${inputId}" class="${inputClass}" style="width:${inputLength}ch;" placeholder="..." data-original="${wordWithoutPunct.toLowerCase().trim()}" autocomplete="off" ${forCorrection ? 'readonly' : ''}>`;
            html += finalPunctuation + ' ';
            holesCount++;
        } else {
            html += word + ' ';
        }
    });
    
    container.innerHTML = html.trim().replace(/\s*([.,!?;:"'])/g, '$1 ');
    
    if (!forCorrection) {
        clozeInputs = Array.from(container.querySelectorAll('.cloze-input'));
    }
    
    const feedbackId = containerId.includes('quiz') ? 'quiz-cloze-feedback' : 'final-cloze-feedback';
    const feedback = document.getElementById(feedbackId);
    
    if (holesCount < 3) {
        feedback.textContent = `Avertissement : Seulement ${holesCount} trou(s) généré(s). Le texte est peut-être trop court.`;
        feedback.classList.remove('hidden');
    } else {
        feedback.classList.add('hidden');
    }
}

/**
 * Calcule le score du texte à trous et affiche le feedback visuel.
 * @param {boolean} isFinal - Indique s'il s'agit du test final ou du quiz de paragraphe.
 * @returns {number} Le score en pourcentage.
 */
function calculateClozeScore(isFinal = false) {
    let correct = 0;
    let total = clozeInputs.length;
    
    clozeInputs.forEach(input => {
        const userWord = input.value.toLowerCase().trim();
        const origWord = input.dataset.original.toLowerCase().trim();
        
        // Réinitialiser les styles
        input.classList.remove('correct', 'incorrect');
        
        if (userWord === origWord) {
            correct++;
            input.classList.add('correct'); // Ajout pour feedback immédiat
        } else {
            input.classList.add('incorrect'); // Ajout pour feedback immédiat
            // Montrer la bonne réponse uniquement si c'est le test final ou un quiz d'entraînement après soumission
            if (isFinal || !isFinal) {
                // Pour le quiz d'entraînement, on peut laisser la mauvaise réponse pour la correction détaillée
            }
        }
        
        // Verrouiller l'input après soumission
        input.readOnly = true; 
    });
    
    const score = total > 0 ? (correct / total) * 100 : 0;
    
    if (!isFinal) {
        scores[currentPara] = score;
        document.getElementById('submit-quiz').classList.add('hidden');
        document.getElementById('reset-quiz').classList.remove('hidden');
    } else {
         document.getElementById('submit-final').classList.add('hidden');
    }
    
    return score;
}

/**
 * Génère une version de correction pour les résultats (copie du cloze avec couleurs appliquées).
 */
function generateCorrectionDisplay() {
    // La fonction calculateClozeScore a déjà appliqué les classes .correct/.incorrect
    // et mis l'input en readOnly. Il suffit de copier le contenu du quiz
    // et d'afficher la bonne réponse dans les inputs .incorrect.
    const quizContainer = document.getElementById('quiz-cloze-container');
    const correctionContainer = document.getElementById('correction-cloze');
    correctionContainer.innerHTML = quizContainer.innerHTML;
    
    const correctionInputs = correctionContainer.querySelectorAll('.cloze-input');
    correctionInputs.forEach(input => {
        input.readOnly = true;
        if (input.classList.contains('incorrect')) {
            // Afficher la bonne réponse
            input.value = input.dataset.original; 
        }
        else {
            input.value = input.dataset.original;
        }
    });
}

// --- Fonctions Chrono et Navigation ---

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    isPaused = false;
    document.getElementById('pause-timer').textContent = 'Pause';
    document.getElementById('pause-timer').classList.remove('btn-success');
    document.getElementById('pause-timer').classList.add('btn-outline-secondary');

    updateTimer();
    
    timerInterval = setInterval(() => {
        if (!isPaused) {
            timeLeft--;
            updateTimer();
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                showQuizLevelModal();
            }
        }
    }, 1000);
}

function updateTimer() {
    if (!timerHidden) {
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        document.getElementById('timer').textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

/**
 * Démarre le timer pour le quiz.
 */
function startQuizTimer() {
    if (quizTimerInterval) clearInterval(quizTimerInterval);
    
    // Si déjà en pause, on ne change pas le texte du bouton, on reprend le décompte
    if (quizIsPaused) {
        quizIsPaused = false;
        document.getElementById('pause-quiz-timer').textContent = 'Pause';
        document.getElementById('pause-quiz-timer').classList.remove('btn-success');
        document.getElementById('pause-quiz-timer').classList.add('btn-outline-secondary');
    }

    updateQuizTimer();
    
    quizTimerInterval = setInterval(() => {
        if (!quizIsPaused) {
            quizTimeLeft--;
            updateQuizTimer();
            if (quizTimeLeft <= 0) {
                clearInterval(quizTimerInterval);
                // Auto-vérifier si temps écoulé
                document.getElementById('submit-quiz').click();
            }
        }
    }, 1000);
}

function updateQuizTimer() {
    if (!quizTimerHidden) {
        const mins = Math.floor(quizTimeLeft / 60);
        const secs = quizTimeLeft % 60;
        document.getElementById('quiz-timer').textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

/**
 * Affiche la section spécifiée et masque les autres.
 * @param {string} sectionId - L'ID de la section à afficher.
 */
function showSection(sectionId) {
    document.querySelectorAll('[id$="-section"], #input-section, #progress-section, #final-results').forEach(el => el.classList.add('hidden'));
    document.getElementById(sectionId).classList.remove('hidden');
    if (sectionId.includes('progress')) document.getElementById('progress-section').classList.remove('hidden');
}

function showQuizLevelModal() {
    if (timerInterval) clearInterval(timerInterval); 
    
    document.getElementById('current-para-number').textContent = currentPara + 1;
    
    const modalElement = document.getElementById('quiz-level-modal');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}

function startQuizFromLevel() {
    const selectedRatio = parseFloat(document.querySelector('input[name="quiz-level"]:checked').value);
    currentQuizRatio = selectedRatio;
    
    const currentParagraphText = paragraphs[currentPara];
    generateClozeText(currentParagraphText, 'quiz-cloze-container', selectedRatio);
    
    bootstrap.Modal.getInstance(document.getElementById('quiz-level-modal')).hide();
    
    showSection('quiz-section');
    document.getElementById('quiz-para-num').textContent = currentPara + 1;
    
    // Afficher/Réinitialiser les boutons du quiz
    document.getElementById('submit-quiz').classList.remove('hidden');
    document.getElementById('reset-quiz').classList.add('hidden');
    
    // Reset et démarrer le timer quiz
    quizTimeLeft = 600; // 10 min
    quizIsPaused = false;
    quizTimerHidden = false;
    document.getElementById('quiz-timer').classList.remove('d-none');
    document.getElementById('hide-quiz-timer').textContent = 'Cacher';
    document.getElementById('pause-quiz-timer').textContent = 'Pause';
    document.getElementById('pause-quiz-timer').classList.remove('btn-success');
    document.getElementById('pause-quiz-timer').classList.add('btn-outline-secondary');
    startQuizTimer();
}

// --- Événements et Flux d'Application ---

// 1. Soumission du Texte
document.getElementById('text-form').addEventListener('submit', (e) => {
    e.preventDefault();
    fullText = document.getElementById('full-text').value.trim();
    if (fullText.length === 0) return;
    
    paragraphs = splitIntoParagraphs(fullText);
    totalParas = paragraphs.length;
    if (totalParas === 0) { alert("Le texte est invalide."); return; }

    document.getElementById('total-paras').textContent = totalParas;
    document.getElementById('para-count-in-modal').textContent = totalParas;
    
    const modal = new bootstrap.Modal(document.getElementById('time-modal'));
    modal.show();
});

// 2. Confirmer temps -> Lancement de la Lecture
document.getElementById('confirm-time').addEventListener('click', () => {
    const radioSelected = document.querySelector('input[name="read-time"]:checked');
    const customTimeInput = document.getElementById('custom-time');
    
    // Priorité au champ custom s'il a été modifié
    if (document.activeElement === customTimeInput) {
         initialTime = parseInt(customTimeInput.value) || 300;
    } else {
         initialTime = radioSelected ? parseInt(radioSelected.value) : 300;
    }
    
    timeLeft = initialTime;
    currentPara = 0;
    scores = new Array(totalParas).fill(0); 

    bootstrap.Modal.getInstance(document.getElementById('time-modal')).hide();
    showSection('progress-section');
    showReading();
});

// 3. Affichage de la Lecture
function showReading() {
    if (timerInterval) clearInterval(timerInterval);
    if (quizTimerInterval) clearInterval(quizTimerInterval);
    timeLeft = initialTime;
    
    showSection('reading-section');
    document.getElementById('reading-title').textContent = `Lecture du Paragraphe ${currentPara + 1}`;
    document.getElementById('reading-text').textContent = paragraphs[currentPara];
    
    isPaused = false;
    timerHidden = false;
    document.getElementById('timer').classList.remove('d-none');
    document.getElementById('hide-timer').textContent = 'Cacher';
    document.getElementById('pause-timer').textContent = 'Pause';
    document.getElementById('pause-timer').classList.remove('btn-success');
    document.getElementById('pause-timer').classList.add('btn-outline-secondary');

    startTimer();
}

// 4. Clic sur "Pratiquer le Quiz Directement"
document.getElementById('start-quiz-btn').addEventListener('click', () => {
    showQuizLevelModal();
});

// 5. Lancer le Quiz depuis le modal de niveau
document.getElementById('start-quiz-with-level').addEventListener('click', () => {
     startQuizFromLevel();
});

// 6. Soumission du Quiz de Paragraphe (Texte à Trous)
document.getElementById('submit-quiz').addEventListener('click', () => {
    if (quizTimerInterval) clearInterval(quizTimerInterval);
    quizIsPaused = true; // Met en pause le temps du quiz après soumission
    const score = calculateClozeScore(false); 
    
    showResults(score);
});

// 7. Affichage des Résultats de Paragraphe
function showResults(score) {
    showSection('results-section');
    document.getElementById('result-para').textContent = currentPara + 1;
    document.getElementById('score-percent').textContent = `Score : ${Math.round(score)}%`;
    const details = `Mots corrects trouvés : ${Math.round(score)}%`;
    document.getElementById('score-details').textContent = details;
    updateProgress();
    
    // Si score bas (<50%), montrer la correction détaillée
    if (score < 50) {
        generateCorrectionDisplay();
        document.getElementById('correction-section').classList.remove('hidden');
        document.getElementById('retry-quiz-btn').classList.remove('hidden');
    } else {
        document.getElementById('correction-section').classList.add('hidden');
        document.getElementById('retry-quiz-btn').classList.add('hidden');
    }
}

function updateProgress() {
    const progress = ((currentPara + 1) / totalParas) * 100;
    document.getElementById('progress-bar').style.width = `${progress}%`;
    document.getElementById('progress-text').textContent = `Paragraphe ${currentPara + 1}/${totalParas}`;
}

// 8. Boutons "Refaire" et "Continuer"
document.getElementById('redo-btn').addEventListener('click', () => {
    showReading();
});

document.getElementById('continue-btn').addEventListener('click', () => {
    currentPara++;
    if (currentPara < totalParas) {
        showReading();
    } else {
        // Test Final
        // Assurez-vous que le texte n'a pas été modifié si on a refait le quiz et que les résultats ont été affichés
        const finalFullText = paragraphs.join('\n\n'); 
        generateClozeText(finalFullText, 'final-cloze-container', 0.15); // 15% de densité
        
        document.getElementById('submit-final').classList.remove('hidden');
        
        showSection('final-section');
    }
});

// 9. Bouton "Refaire le Quiz" (pour correction)
document.getElementById('retry-quiz-btn').addEventListener('click', () => {
    // Regénérer le quiz avec même ratio
    generateClozeText(paragraphs[currentPara], 'quiz-cloze-container', currentQuizRatio);
    showSection('quiz-section');
    document.getElementById('quiz-para-num').textContent = currentPara + 1;
    
    // Remettre le timer du quiz à l'état de pause pour qu'il reprenne
    document.getElementById('quiz-timer').classList.remove('d-none');
    document.getElementById('submit-quiz').classList.remove('hidden');
    document.getElementById('reset-quiz').classList.add('hidden');
    
    // Reprendre le timer là où il s'était arrêté.
    quizIsPaused = false; 
    startQuizTimer();
});

// 10. Contrôles Timer Lecture
document.getElementById('hide-timer').addEventListener('click', () => {
    timerHidden = !timerHidden;
    document.getElementById('timer').classList.toggle('d-none', timerHidden);
    document.getElementById('hide-timer').textContent = timerHidden ? 'Afficher' : 'Cacher';
});

document.getElementById('pause-timer').addEventListener('click', () => {
    isPaused = !isPaused;
    document.getElementById('pause-timer').textContent = isPaused ? 'Reprendre' : 'Pause';
    document.getElementById('pause-timer').classList.toggle('btn-success', isPaused);
    document.getElementById('pause-timer').classList.toggle('btn-outline-secondary', !isPaused);
});

// 11. Contrôles Timer Quiz
document.getElementById('hide-quiz-timer').addEventListener('click', () => {
    quizTimerHidden = !quizTimerHidden;
    document.getElementById('quiz-timer').classList.toggle('d-none', quizTimerHidden);
    document.getElementById('hide-quiz-timer').textContent = quizTimerHidden ? 'Afficher' : 'Cacher';
});

document.getElementById('pause-quiz-timer').addEventListener('click', () => {
    quizIsPaused = !quizIsPaused;
    document.getElementById('pause-quiz-timer').textContent = quizIsPaused ? 'Reprendre' : 'Pause';
    document.getElementById('pause-quiz-timer').classList.toggle('btn-success', quizIsPaused);
    document.getElementById('pause-quiz-timer').classList.toggle('btn-outline-secondary', !quizIsPaused);
    
    // Si on met en pause, on arrête le décompte
    if (quizIsPaused) {
        if (quizTimerInterval) clearInterval(quizTimerInterval);
    } else {
        // Si on reprend, on relance
        startQuizTimer(); 
    }
});

// 12. Bouton Réinitialiser Quiz
document.getElementById('reset-quiz').addEventListener('click', () => {
    generateClozeText(paragraphs[currentPara], 'quiz-cloze-container', currentQuizRatio);
    
    // Remettre les boutons
    document.getElementById('submit-quiz').classList.remove('hidden');
    document.getElementById('reset-quiz').classList.add('hidden');
    
    // Reset timer quiz et redémarrer
    quizTimeLeft = 600;
    quizIsPaused = false;
    document.getElementById('quiz-timer').classList.remove('d-none');
    document.getElementById('pause-quiz-timer').textContent = 'Pause';
    document.getElementById('pause-quiz-timer').classList.remove('btn-success');
    document.getElementById('pause-quiz-timer').classList.add('btn-outline-secondary');
    
    startQuizTimer();
});

// 13. Test Final
document.getElementById('submit-final').addEventListener('click', () => {
    const finalScore = calculateClozeScore(true);
    showFinalResults(finalScore);
});

function showFinalResults(finalScore) {
    showSection('final-results');
    document.getElementById('final-percent').textContent = `${Math.round(finalScore)}%`;

    const labels = Array.from({length: totalParas}, (_, i) => `Para ${i+1}`);
    const ctx = document.getElementById('scores-chart').getContext('2d');
    
    if (window.scoresChartInstance) {
        window.scoresChartInstance.destroy();
    }

    window.scoresChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Score d\'Entraînement (%)',
                data: scores,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true, max: 100 } },
            plugins: { legend: { display: true } }
        }
    });
}

// 14. Recommencer
document.getElementById('restart-btn').addEventListener('click', () => {
    document.getElementById('full-text').value = '';
    paragraphs = [];
    currentPara = 0;
    scores = [];
    if (timerInterval) clearInterval(timerInterval);
    if (quizTimerInterval) clearInterval(quizTimerInterval);
    showSection('input-section');
});

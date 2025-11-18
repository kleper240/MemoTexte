let paragraphs = [];
let currentPara = 0;
let scores = [];
let timerInterval;
let initialTime = 300; 
let timeLeft = 300;
let isPaused = false;
let timerHidden = false; // Maintenu pour le contrôle du bouton "Cacher"
let fullText = '';
let totalParas = 0;

// --- Fonctions Utilitaires (Raccourci) ---

function splitIntoParagraphs(text) {
    let paras = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    // Logique de regroupement si trop de paragraphes ou trop peu
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
    } else if (paras.length < 3 && text.split('.').length > 5) { // Basé sur le nombre de phrases
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
 */
function generateClozeText(text, containerId, holeRatio) {
    const cleanWord = (word) => word.toLowerCase().replace(/[^\w]/g, ''); 
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    let html = '';
    let holesCount = 0;
    
    // Réinitialisation du bouton "Voir les Réponses"
    const isQuiz = containerId.includes('quiz');
    const btnId = isQuiz ? 'show-answers-btn-quiz' : 'show-answers-btn-final';
    const btn = document.getElementById(btnId);
    if (btn) {
        btn.disabled = false;
        btn.textContent = 'Voir les Réponses';
    }

    words.forEach((word, index) => {
        const cleaned = cleanWord(word);
        
        if (cleaned.length > 3 && Math.random() < holeRatio) {
            const inputId = `cloze-${containerId}-${index}`;
            const finalPunctuationMatch = word.match(/([.,!?;:"']+)$/);
            const finalPunctuation = finalPunctuationMatch ? finalPunctuationMatch[0] : '';
            const wordWithoutPunct = word.replace(finalPunctuation, '');
            
            const inputLength = Math.max(10, wordWithoutPunct.length * 1.5);
            
            html += `<input type="text" id="${inputId}" class="cloze-input" style="width:${inputLength}ch;" placeholder="..." data-original="${wordWithoutPunct.toLowerCase().trim()}" aria-label="mot manquant" autocomplete="off">`;
            html += finalPunctuation + ' ';
            holesCount++;
        } else {
            html += word + ' ';
        }
    });
    
    container.innerHTML = html.trim().replace(/\s*([.,!?;:"'])/g, '$1 ');
    
    const feedbackId = isQuiz ? 'quiz-cloze-feedback' : 'final-cloze-feedback';
    const feedback = document.getElementById(feedbackId);
    
    if (holesCount < 3) {
        feedback.textContent = `Avertissement : Seulement ${holesCount} trou(s) généré(s). Le texte est peut-être trop court.`;
        feedback.classList.remove('hidden');
    } else {
        feedback.classList.add('hidden');
    }
}

/**
 * Calcule le score du quiz.
 * @param {string} containerId - ID du conteneur des inputs ('quiz-cloze-container' ou 'final-cloze-container').
 * @param {boolean} isFinal - Indique si c'est le test final.
 */
function calculateClozeScore(containerId, isFinal = false) {
    // CORRECTION MAJEURE: On récupère les inputs directement dans le conteneur cible.
    const container = document.getElementById(containerId);
    const inputs = container.querySelectorAll('.cloze-input');
    
    let correct = 0;
    let total = inputs.length;
    
    inputs.forEach(input => {
        const userWord = input.value.toLowerCase().trim();
        const origWord = input.dataset.original.toLowerCase().trim();
        
        input.style.borderBottomColor = ''; 
        input.style.color = '';
        
        if (userWord === origWord) {
            correct++;
            input.style.borderBottomColor = '#198754'; // Vert
            input.style.color = '#198754';
        } else {
            input.style.borderBottomColor = '#dc3545'; // Rouge
            input.style.color = '#dc3545';
            if (isFinal) {
                // Montrer la bonne réponse dans le test final après vérification
                input.value = origWord; 
            }
        }
        input.disabled = true; // Désactive les inputs après vérification
    });
    
    // Arrêter le chrono du quiz s'il est actif
    if (containerId === 'quiz-cloze-container') {
        clearInterval(timerInterval);
        document.getElementById('pause-timer-quiz').disabled = true;
    }
    
    // Désactiver le bouton "Voir les réponses" après la vérification
    const btnId = isFinal ? 'show-answers-btn-final' : 'show-answers-btn-quiz';
    const btn = document.getElementById(btnId);
    if (btn) {
        btn.disabled = true;
    }

    const score = total > 0 ? (correct / total) * 100 : 0;
    
    if (!isFinal) {
        scores[currentPara] = score;
    }
    
    return score;
}

/**
 * Affiche la bonne réponse dans chaque champ de saisie du texte à trous.
 * @param {string} containerId - L'ID du conteneur du quiz.
 */
function showAnswers(containerId) {
    // CORRECTION MAJEURE: On récupère les inputs directement dans le conteneur cible.
    const container = document.getElementById(containerId);
    const inputs = container.querySelectorAll('.cloze-input');
    
    inputs.forEach(input => {
        const origWord = input.dataset.original.trim();
        input.value = origWord;
        input.style.borderBottomColor = '#198754'; // Vert
        input.style.color = '#198754';
        input.disabled = true; // Désactiver l'input après avoir montré la réponse
    });
    
    const btnId = containerId.includes('quiz') ? 'show-answers-btn-quiz' : 'show-answers-btn-final';
    document.getElementById(btnId).disabled = true;
    document.getElementById(btnId).textContent = 'Réponses Affichées';
    
    // NOUVEAU: Arrêter le chrono du quiz quand on affiche les réponses
    if (containerId.includes('quiz')) {
        clearInterval(timerInterval);
        const timerElement = document.getElementById('timer-quiz');
        updateTimerDisplay(timerElement, 0); // Afficher 00:00
        document.getElementById('pause-timer-quiz').disabled = true;
    }
}

// --- Fonctions Chrono et Navigation (Généralisées) ---

/**
 * Met à jour l'affichage du chrono.
 */
function updateTimerDisplay(element, time) {
    const mins = Math.floor(time / 60);
    const secs = time % 60;
    element.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Démarre le chrono pour la lecture ou le quiz.
 */
function startTimer(duration, elementId, onFinishCallback, usePauseButton = true) {
    if (timerInterval) clearInterval(timerInterval);
    
    timeLeft = duration; 
    
    const timerElement = document.getElementById(elementId);
    if (!timerElement) return;

    // Réinitialisation de la pause
    isPaused = false;
    const pauseBtnId = elementId === 'timer' ? 'pause-timer' : 'pause-timer-quiz';
    const pauseBtn = document.getElementById(pauseBtnId);
    if (pauseBtn) {
        pauseBtn.textContent = 'Pause';
        pauseBtn.classList.remove('btn-success');
        pauseBtn.classList.add('btn-outline-secondary');
        pauseBtn.disabled = !usePauseButton;
    }

    updateTimerDisplay(timerElement, timeLeft);
    
    timerInterval = setInterval(() => {
        if (!isPaused) {
            timeLeft--;
            updateTimerDisplay(timerElement, timeLeft);
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                if (onFinishCallback) onFinishCallback();
            }
        }
    }, 1000);
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
    
    const currentParagraphText = paragraphs[currentPara];
    generateClozeText(currentParagraphText, 'quiz-cloze-container', selectedRatio);
    
    bootstrap.Modal.getInstance(document.getElementById('quiz-level-modal')).hide();
    
    showSection('quiz-section');
    document.getElementById('quiz-para-num').textContent = currentPara + 1;
    
    // NOUVEAU: Démarrer le chrono du quiz avec le même temps initial
    startTimer(initialTime, 'timer-quiz', () => {
        // Soumission automatique si le temps est écoulé
        document.getElementById('submit-quiz').click(); 
    });
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
    
    if (document.activeElement === customTimeInput && customTimeInput.value) {
         initialTime = parseInt(customTimeInput.value) || 300;
    } else {
         initialTime = radioSelected ? parseInt(radioSelected.value) : 300;
    }
    
    currentPara = 0;
    scores = new Array(totalParas).fill(0); 

    bootstrap.Modal.getInstance(document.getElementById('time-modal')).hide();
    showSection('progress-section');
    showReading();
});

// 3. Affichage de la Lecture
function showReading() {
    if (timerInterval) clearInterval(timerInterval);
    
    showSection('reading-section');
    document.getElementById('reading-title').textContent = `Lecture du Paragraphe ${currentPara + 1}`;
    document.getElementById('reading-text').textContent = paragraphs[currentPara];
    
    timerHidden = false;
    document.getElementById('timer').classList.remove('d-none');
    document.getElementById('hide-timer').textContent = 'Cacher';
    
    // Démarrer le chrono de lecture
    startTimer(initialTime, 'timer', showQuizLevelModal);
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
    const score = calculateClozeScore('quiz-cloze-container', false); 
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
}

function updateProgress() {
    const percent = ((currentPara + 1) / totalParas) * 100;
    document.getElementById('progress-bar').style.width = `${percent}%`;
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
        generateClozeText(fullText, 'final-cloze-container', 0.15); // 15% de densité
        showSection('final-section');
    }
});

// 9. Contrôles Timer (Lecture)
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

// 10. Contrôles Timer (Quiz)
document.getElementById('pause-timer-quiz').addEventListener('click', () => {
    isPaused = !isPaused;
    document.getElementById('pause-timer-quiz').textContent = isPaused ? 'Reprendre' : 'Pause';
    document.getElementById('pause-timer-quiz').classList.toggle('btn-success', isPaused);
    document.getElementById('pause-timer-quiz').classList.toggle('btn-outline-secondary', !isPaused);
});

// 11. Test Final
document.getElementById('submit-final').addEventListener('click', () => {
    const finalScore = calculateClozeScore('final-cloze-container', true);
    showFinalResults(finalScore);
});

// 12. Gestionnaires pour le bouton "Voir les Réponses"
document.getElementById('show-answers-btn-quiz').addEventListener('click', () => {
    showAnswers('quiz-cloze-container');
});

document.getElementById('show-answers-btn-final').addEventListener('click', () => {
    showAnswers('final-cloze-container');
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

// 13. Recommencer
document.getElementById('restart-btn').addEventListener('click', () => {
    document.getElementById('full-text').value = '';
    paragraphs = [];
    currentPara = 0;
    scores = [];
    showSection('input-section');
    if (timerInterval) clearInterval(timerInterval);
});

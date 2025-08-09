document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS (no changes needed here) ---
    const setupScreen = document.getElementById('setup-screen');
    const quizScreen = document.getElementById('quiz-screen');
    const resultsScreen = document.getElementById('results-screen');
    
    const modeTitle = document.getElementById('mode-title');
    const sectionSelect = document.getElementById('section-select');
    const numQuestionsSelect = document.getElementById('num-questions');
    const timeLimitInput = document.getElementById('time-limit');
    const startBtn = document.getElementById('start-btn');
    const quizOptions = document.getElementById('quiz-options');

    const questionCounter = document.getElementById('question-counter');
    const timerDisplay = document.getElementById('timer');
    const passageContainer = document.getElementById('passage-container');
    const questionContainer = document.getElementById('question-container');
    const answersContainer = document.getElementById('answers-container');
    const nextBtn = document.getElementById('next-btn');
    const feedback = document.getElementById('feedback');

    const scoreText = document.getElementById('score-text');
    const percentageText = document.getElementById('percentage-text');
    
    // --- STATE VARIABLES ---
    let sectionsData = {};
    let currentQuestions = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let timerInterval;
    let isFlashcardMode = false;

    // --- NEW: FETCH SECTIONS, THEN FETCH QUESTIONS ON DEMAND ---
    async function fetchSections() {
        try {
            const response = await fetch('/api/sections');
            sectionsData = await response.json();
            populateSectionSelect();
        } catch (error) {
            console.error("Failed to load sections:", error);
        }
    }

    function populateSectionSelect() {
        sectionSelect.innerHTML = '';
        for (const key in sectionsData) {
            const displayName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            sectionSelect.innerHTML += `<option value="${key}">${displayName}</option>`;
        }
        sectionSelect.dispatchEvent(new Event('change'));
    }

    sectionSelect.addEventListener('change', () => {
        const selectedSectionKey = sectionSelect.value;
        const questionCount = sectionsData[selectedSectionKey].count;
        numQuestionsSelect.innerHTML = '';
        if (questionCount > 0) {
            for (let i = 5; i <= questionCount; i += 5) {
                numQuestionsSelect.innerHTML += `<option value="${i}">${i}</option>`;
            }
            if (questionCount % 5 !== 0 || questionCount < 5) {
                 numQuestionsSelect.innerHTML += `<option value="${questionCount}">${questionCount}</option>`;
            }
        } else {
            numQuestionsSelect.innerHTML = '<option value="0">0</option>';
        }
    });

    // --- START QUIZ / FLASHCARDS ---
    startBtn.addEventListener('click', async () => {
        const sectionKey = sectionSelect.value;
        // Fetch only the questions we need for this session
        const response = await fetch(`/api/questions?section=${sectionKey}`);
        const questionsForSection = await response.json();

        isFlashcardMode = modeTitle.textContent.includes("Flashcard"); // Simple check
        const num = isFlashcardMode ? questionsForSection.length : parseInt(numQuestionsSelect.value);
        
        currentQuestions = shuffleArray(questionsForSection).slice(0, num);
        currentQuestionIndex = 0;
        score = 0;

        if (currentQuestions.length === 0) {
            alert("No questions available for this section.");
            return;
        }

        setupScreen.classList.add('hidden');
        quizScreen.classList.remove('hidden');
        resultsScreen.classList.add('hidden');
        
        displayQuestion();

        if (!isFlashcardMode) {
            const time = parseInt(timeLimitInput.value);
            startTimer(time * 60);
            timerDisplay.style.display = 'block';
            nextBtn.textContent = "Submit Answer";
        } else {
            timerDisplay.style.display = 'none';
            nextBtn.textContent = "Reveal Answer";
        }
    });
    
    // The rest of the script (displayQuestion, startTimer, handleNext, etc.)
    // remains exactly the same as the previous version. I'm including it
    // here for completeness.

    function displayQuestion() {
        feedback.textContent = '';
        feedback.className = '';
        nextBtn.disabled = false;
        
        const q = currentQuestions[currentQuestionIndex];
        questionCounter.textContent = `Question ${currentQuestionIndex + 1} of ${currentQuestions.length}`;
        passageContainer.textContent = q.passage || '';
        passageContainer.style.display = q.passage ? 'block' : 'none';
        questionContainer.textContent = q.question;
        
        answersContainer.innerHTML = '';
        const choices = shuffleArray(q.choices);
        choices.forEach(choice => {
            const label = document.createElement('label');
            label.className = 'answer-option';
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'answer';
            input.value = choice;
            label.appendChild(input);
            label.append(choice);
            answersContainer.appendChild(label);
        });

        if (isFlashcardMode) {
            nextBtn.textContent = "Reveal Answer";
        }
    }

    function startTimer(duration) {
        let timeLeft = duration;
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            const minutes = Math.floor(timeLeft / 60);
            let seconds = timeLeft % 60;
            seconds = seconds < 10 ? '0' + seconds : seconds;
            timerDisplay.textContent = `Time: ${minutes}:${seconds}`;
            if (--timeLeft < 0) {
                clearInterval(timerInterval);
                showResults();
            }
        }, 1000);
    }
    
    function handleQuizAnswer() {
        const selectedRadio = answersContainer.querySelector('input[name="answer"]:checked');
        if (!selectedRadio) {
            feedback.textContent = "Please select an answer.";
            return;
        }

        const selectedLabel = selectedRadio.parentElement;
        const isCorrect = selectedRadio.value === currentQuestions[currentQuestionIndex].answer;
        
        if (isCorrect) {
            score++;
            selectedLabel.classList.add('correct');
            feedback.textContent = "Correct!";
            feedback.className = 'correct';
        } else {
            selectedLabel.classList.add('incorrect');
            feedback.textContent = `Incorrect. The correct answer is highlighted.`;
            feedback.className = 'incorrect';
            const correctChoice = currentQuestions[currentQuestionIndex].answer;
            const correctRadio = Array.from(answersContainer.querySelectorAll('input[name="answer"]')).find(r => r.value === correctChoice);
            if(correctRadio) correctRadio.parentElement.classList.add('correct');
        }

        nextBtn.disabled = true;
        setTimeout(() => {
            currentQuestionIndex++;
            if (currentQuestionIndex < currentQuestions.length) {
                displayQuestion();
            } else {
                showResults();
            }
        }, 2000);
    }

    function handleFlashcard() {
        if (nextBtn.textContent === "Reveal Answer") {
            const correctAnswer = currentQuestions[currentQuestionIndex].answer;
            feedback.textContent = `Answer: ${correctAnswer}`;
            feedback.className = 'correct';
            nextBtn.textContent = "Next Card";
        } else {
            currentQuestionIndex++;
            if (currentQuestionIndex < currentQuestions.length) {
                displayQuestion();
            } else {
                showResults();
            }
        }
    }

    nextBtn.addEventListener('click', () => {
        if (isFlashcardMode) {
            handleFlashcard();
        } else {
            handleQuizAnswer();
        }
    });

    function showResults() {
        clearInterval(timerInterval);
        quizScreen.classList.add('hidden');
        resultsScreen.classList.remove('hidden');
        
        if (isFlashcardMode) {
            resultsScreen.querySelector('h2').textContent = "Study Session Complete!";
            scoreText.textContent = `You reviewed ${currentQuestions.length} cards.`;
            percentageText.textContent = '';
        } else {
            resultsScreen.querySelector('h2').textContent = "Quiz Complete!";
            scoreText.textContent = `Your final score is: ${score} out of ${currentQuestions.length}`;
            const percentage = currentQuestions.length > 0 ? (score / currentQuestions.length * 100).toFixed(2) : 0;
            percentageText.textContent = `Percentage: ${percentage}%`;
        }
    }
    
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // --- INITIALIZE ---
    fetchSections();
});
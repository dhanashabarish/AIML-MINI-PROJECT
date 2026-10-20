document.addEventListener('DOMContentLoaded', () => {
  const questions = [
    {
      key: 'study_time',
      group: 'Study routine',
      title: 'How much time do you spend studying each week?',
      help: 'Count focused study time outside of class.',
      min: 0,
      max: 80,
      step: 0.5,
      suffix: 'hours per week',
      placeholder: 'e.g. 8',
    },
    {
      key: 'failures',
      group: 'Past performance',
      title: 'How many classes have you had to repeat?',
      help: 'Enter 0 if you have not repeated a class.',
      min: 0,
      max: 5,
      step: 1,
      suffix: 'classes',
      placeholder: 'e.g. 0',
    },
    {
      key: 'absences',
      group: 'Attendance',
      title: 'How many classes have you missed?',
      help: 'Count missed class sessions this school year.',
      min: 0,
      max: 300,
      step: 1,
      suffix: 'classes missed',
      placeholder: 'e.g. 4',
    },
    {
      key: 'classes_attended',
      group: 'Attendance',
      title: 'How many classes have you attended?',
      help: 'Count attended class sessions this school year.',
      min: 0,
      max: 300,
      step: 1,
      suffix: 'classes attended',
      placeholder: 'e.g. 12',
    },
    {
      key: 'previous_grade',
      group: 'Past performance',
      title: 'What was your previous grade?',
      help: 'Use your last overall grade on a scale from 0 to 20.',
      min: 0,
      max: 20,
      step: 0.1,
      suffix: 'out of 20',
      placeholder: 'e.g. 14.5',
    },
    {
      key: 'age',
      group: 'About you',
      title: 'How old are you?',
      help: 'Enter your age in years.',
      min: 15,
      max: 30,
      step: 1,
      suffix: 'years old',
      placeholder: 'e.g. 17',
    },
  ];

  const form = document.getElementById('predict-form');
  const questionContent = document.getElementById('question-content');
  const stepCount = document.getElementById('step-count');
  const quizCurrent = document.getElementById('quiz-current');
  const quizTotal = document.getElementById('quiz-total');
  const progress = document.querySelector('[role="progressbar"]');
  const progressFill = document.getElementById('progress-fill');
  const backButton = document.getElementById('back-btn');
  const nextButton = document.getElementById('next-btn');
  const result = document.getElementById('result');
  const historyButton = document.getElementById('history-btn');
  const historyPanel = document.getElementById('history-panel');
  const historyContent = document.getElementById('history-content');
  const historyCount = document.getElementById('history-count');
  const answers = {};
  let currentStep = 0;

  function renderQuestion() {
    const question = questions[currentStep];
    const previousAnswer = answers[question.key] ?? '';
    stepCount.textContent = `Question ${currentStep + 1} of ${questions.length}`;
    quizCurrent.textContent = String(currentStep + 1).padStart(2, '0');
    quizTotal.textContent = `/ ${String(questions.length).padStart(2, '0')}`;
    progress.setAttribute('aria-valuenow', String(currentStep + 1));
    progress.setAttribute('aria-valuemax', String(questions.length));
    progressFill.style.width = `${((currentStep + 1) / questions.length) * 100}%`;
    questionContent.innerHTML = `
      <p class="question-group">${question.group}</p>
      <label class="question-title" for="answer">${question.title}</label>
      <div class="answer-field">
        <input id="answer" name="${question.key}" type="number" inputmode="decimal"
          min="${question.min}" max="${question.max}" step="${question.step}"
          placeholder="${question.placeholder}" value="${previousAnswer}" required />
        <span>${question.suffix}</span>
      </div>
      <p class="question-help">${question.help}</p>
    `;
    backButton.disabled = currentStep === 0;
    nextButton.innerHTML = currentStep === questions.length - 1
      ? 'Predict my grade <span aria-hidden="true">→</span>'
      : 'Continue <span aria-hidden="true">→</span>';
    document.getElementById('answer').focus();
  }

  function showResult(prediction) {
    result.replaceChildren();
    result.className = `result result-${String(prediction.category).toLowerCase()}`;
    result.hidden = false;

    const label = document.createElement('p');
    label.className = 'result-label';
    label.textContent = 'YOUR ESTIMATED FINAL GRADE';
    const grade = document.createElement('p');
    grade.className = 'result-grade';
    grade.textContent = `${prediction.predicted_final_grade} / 20`;
    const category = document.createElement('p');
    category.className = 'result-category';
    category.textContent = `${prediction.category} performance range`;
    const restart = document.createElement('button');
    restart.type = 'button';
    restart.className = 'restart-button';
    restart.textContent = 'Start a new check-in';
    restart.addEventListener('click', () => {
      currentStep = 0;
      Object.keys(answers).forEach((key) => delete answers[key]);
      result.hidden = true;
      form.hidden = false;
      renderQuestion();
    });
    result.append(label, grade, category, restart);
    form.hidden = true;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = document.getElementById('answer');
    if (!input.reportValidity()) return;
    answers[questions[currentStep].key] = Number(input.value);

    if (currentStep < questions.length - 1) {
      currentStep += 1;
      renderQuestion();
      return;
    }

    nextButton.disabled = true;
    nextButton.textContent = 'Calculating...';
    try {
      const response = await fetch('/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answers),
      });
      const prediction = await response.json();
      if (!response.ok) throw new Error(prediction.error || 'Could not calculate your grade.');
      showResult(prediction);
      if (!historyPanel.hidden) loadHistory();
    } catch (error) {
      window.alert(error.message || 'Something went wrong. Please try again.');
    } finally {
      nextButton.disabled = false;
      nextButton.innerHTML = 'Predict my grade <span aria-hidden="true">→</span>';
    }
  });

  backButton.addEventListener('click', () => {
    if (currentStep === 0) return;
    const input = document.getElementById('answer');
    if (input.value !== '') answers[questions[currentStep].key] = Number(input.value);
    currentStep -= 1;
    renderQuestion();
  });

  async function loadHistory() {
    historyContent.innerHTML = '<p class="history-empty">Loading your predictions...</p>';
    try {
      const response = await fetch('/history');
      if (!response.ok) throw new Error('Could not load prediction history.');
      const records = await response.json();
      historyCount.textContent = `${records.length} ${records.length === 1 ? 'record' : 'records'}`;
      historyContent.replaceChildren();
      if (records.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'history-empty';
        empty.textContent = 'No predictions yet. Complete the check-in to start your history.';
        historyContent.append(empty);
        return;
      }

      const list = document.createElement('div');
      list.className = 'history-list';
      records.forEach((record) => {
        const item = document.createElement('article');
        item.className = 'history-item';
        const detail = document.createElement('div');
        const title = document.createElement('p');
        title.className = 'history-item-title';
        title.textContent = `Check-in #${record.id}`;
        const date = document.createElement('p');
        date.className = 'history-date';
        const attendance = record.attendance_recorded
          ? `${record.classes_attended} classes attended`
          : 'attendance not recorded';
        date.textContent = `${new Date(record.timestamp).toLocaleString()} · ${record.study_time} study hours · ${attendance}`;
        const grade = document.createElement('p');
        grade.className = 'history-grade';
        grade.textContent = `${record.predicted_grade} / 20`;
        detail.append(title, date);
        item.append(detail, grade);
        list.append(item);
      });
      historyContent.append(list);
    } catch (error) {
      historyCount.textContent = 'Unavailable';
      historyContent.replaceChildren();
      const message = document.createElement('p');
      message.className = 'history-empty';
      message.textContent = error.message;
      historyContent.append(message);
    }
  }

  historyButton.addEventListener('click', () => {
    const isOpening = historyPanel.hidden;
    historyPanel.hidden = !isOpening;
    historyButton.setAttribute('aria-expanded', String(isOpening));
    if (isOpening) loadHistory();
  });

  renderQuestion();
});
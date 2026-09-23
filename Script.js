'use strict';

const NAME_PATTERN = /^[A-Za-zА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі\s-]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function setError(key, message) {
    const field = document.getElementById(key);
    const errorBox = document.getElementById(key + '-error');
    const isValid = message === '';

    errorBox.textContent = message;
    field.classList.toggle('is-invalid', !isValid);
    field.classList.toggle('is-valid', isValid);
    field.setAttribute('aria-invalid', String(!isValid));
    return isValid;
}

function focusFirstError(form) {
    const firstInvalid = form.querySelector('.is-invalid');
    if (!firstInvalid) return;
    const target = firstInvalid.matches('input, select, textarea')
        ? firstInvalid
        : firstInvalid.querySelector('input, select, textarea');
    target.focus();
}

function showResult(box, html) {
    box.innerHTML = html;
    box.hidden = false;
    box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatMoney(amount) {
    return amount.toLocaleString('ru-RU') + ' ₸';
}

function validateName(name) {
    if (name === '') return 'Введите имя';
    if (name.length < 2) return 'Имя слишком короткое: нужно минимум 2 буквы';
    if (!NAME_PATTERN.test(name)) return 'Имя может содержать только буквы, пробел и дефис';
    return '';
}

function validateEmail(email) {
    if (email === '') return 'Введите e-mail';
    if (!EMAIL_PATTERN.test(email)) return 'Проверьте e-mail: он должен выглядеть как name@mail.kz';
    return '';
}

const panels = document.querySelectorAll('.panel');
const dots = document.querySelectorAll('.dot');
const prevButton = document.getElementById('prevButton');
const nextButton = document.getElementById('nextButton');
const stepText = document.getElementById('stepText');
let currentIndex = 0;

function showPanel(index, direction) {
    panels.forEach((panel, i) => {
        panel.hidden = i !== index;
    });

    const panel = panels[index];
    panel.classList.remove('slide-from-left', 'slide-from-right');
    void panel.offsetWidth;
    panel.classList.add(direction > 0 ? 'slide-from-right' : 'slide-from-left');

    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));

    prevButton.hidden = index === 0;
    nextButton.hidden = index === panels.length - 1;
    stepText.textContent = `Форма ${index + 1} из ${panels.length}`;
    currentIndex = index;
}

prevButton.addEventListener('click', () => {
    if (currentIndex > 0) showPanel(currentIndex - 1, -1);
    if (prevButton.hidden) nextButton.focus();
});

nextButton.addEventListener('click', () => {
    if (currentIndex < panels.length - 1) showPanel(currentIndex + 1, 1);
    if (nextButton.hidden) prevButton.focus();
});

const formsView = document.getElementById('formsView');
const gameView = document.getElementById('gameView');

const WATER_RADIUS = 30;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function arcPoint(centerX, centerY, radius, angle) {
    const normalX = Math.cos(angle);
    const normalY = Math.sin(angle);
    return [centerX + radius * normalX, centerY + radius * normalY, normalX, normalY];
}

function createOutline(width, height, radius) {
    const arc = (Math.PI * radius) / 2;
    const segments = [
        { length: width - 2 * radius, at: (s) => [radius + s, 0, 0, -1] },
        { length: arc, at: (s) => arcPoint(width - radius, radius, radius, -Math.PI / 2 + s / radius) },
        { length: height - 2 * radius, at: (s) => [width, radius + s, 1, 0] },
        { length: arc, at: (s) => arcPoint(width - radius, height - radius, radius, s / radius) },
        { length: width - 2 * radius, at: (s) => [width - radius - s, height, 0, 1] },
        { length: arc, at: (s) => arcPoint(radius, height - radius, radius, Math.PI / 2 + s / radius) },
        { length: height - 2 * radius, at: (s) => [0, height - radius - s, -1, 0] },
        { length: arc, at: (s) => arcPoint(radius, radius, radius, Math.PI + s / radius) },
    ];
    const perimeter = segments.reduce((sum, segment) => sum + segment.length, 0);

    function pointAt(distance) {
        for (const segment of segments) {
            if (distance <= segment.length) return segment.at(distance);
            distance -= segment.length;
        }
        return segments[0].at(0);
    }

    return { perimeter, pointAt };
}

function toSmoothPath(points) {
    const count = points.length;
    const point = (i) => points[(i + count) % count];
    const f = (value) => value.toFixed(1);
    let path = `M${f(point(0)[0])} ${f(point(0)[1])}`;

    for (let i = 0; i < count; i++) {
        const [x0, y0] = point(i - 1);
        const [x1, y1] = point(i);
        const [x2, y2] = point(i + 1);
        const [x3, y3] = point(i + 2);
        path += ` C${f(x1 + (x2 - x0) / 6)} ${f(y1 + (y2 - y0) / 6)} ${f(x2 - (x3 - x1) / 6)} ${f(y2 - (y3 - y1) / 6)} ${f(x2)} ${f(y2)}`;
    }
    return path + 'Z';
}

function buildWaterPath(width, height, time) {
    const amplitude = width < 500 ? 6 : 9;
    const radius = Math.min(WATER_RADIUS, width / 4, height / 4);
    const outline = createOutline(width - 2 * amplitude, height - 2 * amplitude, radius);
    const perimeter = outline.perimeter;
    const count = Math.max(32, Math.round(perimeter / 14));
    const ripples = [
        { waves: Math.max(2, Math.round(perimeter / 420)), speed: 0.45, weight: 0.45, phase: 0 },
        { waves: Math.max(3, Math.round(perimeter / 230)), speed: -0.7, weight: 0.3, phase: 1.7 },
        { waves: Math.max(5, Math.round(perimeter / 130)), speed: 0.95, weight: 0.17, phase: 4.2 },
        { waves: Math.max(7, Math.round(perimeter / 75)), speed: -1.3, weight: 0.08, phase: 2.6 },
    ];
    const points = [];

    for (let i = 0; i < count; i++) {
        const distance = (perimeter * i) / count;
        const [x, y, normalX, normalY] = outline.pointAt(distance);
        const angle = (2 * Math.PI * distance) / perimeter;
        const offset = amplitude * ripples.reduce(
            (sum, ripple) => sum + ripple.weight * Math.sin(ripple.waves * angle + ripple.speed * time + ripple.phase),
            0
        );
        points.push([amplitude + x + normalX * offset, amplitude + y + normalY * offset]);
    }
    return toSmoothPath(points);
}

function animateWater(now) {
    const time = reduceMotion.matches ? 0 : now / 1000;

    panels.forEach((panel) => {
        if (formsView.hidden || panel.hidden || panel.offsetWidth === 0) return;
        panel.style.clipPath = `path('${buildWaterPath(panel.offsetWidth, panel.offsetHeight, time)}')`;
    });
    requestAnimationFrame(animateWater);
}

requestAnimationFrame(animateWater);

const COMMENT_MAX = 300;
const RATING_LABELS = { 1: 'очень плохо', 2: 'плохо', 3: 'нормально', 4: 'хорошо', 5: 'отлично' };

const surveyForm = document.getElementById('surveyForm');
const commentInput = document.getElementById('surveyComment');
const commentCounter = document.getElementById('commentCounter');
const surveyResult = document.getElementById('surveyResult');

const ratingInputs = surveyForm.querySelectorAll('input[name="rating"]');
const ratingButtons = document.getElementById('ratingButtons');

function paintRating(value, className) {
    ratingInputs.forEach((input) => {
        input.nextElementSibling.classList.toggle(className, Number(input.value) <= value);
    });
}

ratingInputs.forEach((input) => {
    input.addEventListener('change', () => paintRating(Number(input.value), 'is-lit'));
    input.parentElement.addEventListener('mouseenter', () => paintRating(Number(input.value), 'is-preview'));
});

ratingButtons.addEventListener('mouseleave', () => paintRating(0, 'is-preview'));

commentInput.addEventListener('input', () => {
    const length = commentInput.value.length;
    commentCounter.textContent = length;
    commentCounter.parentElement.classList.toggle('is-over', length > COMMENT_MAX);
});

surveyForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const name = document.getElementById('surveyName').value.trim();
    const ratingInput = surveyForm.querySelector('input[name="rating"]:checked');
    const comment = commentInput.value.trim();
    const agree = document.getElementById('surveyAgree').checked;

    const commentError = comment.length > COMMENT_MAX
        ? `Комментарий длиннее ${COMMENT_MAX} символов, сократите его на ${comment.length - COMMENT_MAX}`
        : '';

    const checks = [
        setError('surveyName', validateName(name)),
        setError('rating', ratingInput ? '' : 'Выберите оценку от 1 до 5'),
        setError('surveyComment', commentError),
        setError('surveyAgree', agree ? '' : 'Отметьте согласие, без него ответ не сохранится'),
    ];

    if (checks.includes(false)) {
        surveyResult.hidden = true;
        focusFirstError(surveyForm);
        return;
    }

    const rating = ratingInput.value;
    showResult(surveyResult, `
    <h3>Ответ принят, спасибо!</h3>
    <dl>
      <dt>Имя</dt><dd>${escapeHtml(name)}</dd>
      <dt>Оценка</dt><dd>${rating} из 5 (${RATING_LABELS[rating]})</dd>
      <dt>Комментарий</dt><dd>${comment ? escapeHtml(comment) : 'не оставлен'}</dd>
    </dl>
  `);
});

const PASSWORD_MIN = 8;
const LOGIN_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
const STRENGTH_TEXT = {
    low: 'Надёжность: слабый пароль',
    mid: 'Надёжность: средний пароль',
    high: 'Надёжность: хороший пароль',
};

const accountForm = document.getElementById('accountForm');
const loginInput = document.getElementById('login');
const accountEmailInput = document.getElementById('accountEmail');
const passwordInput = document.getElementById('password');
const repeatInput = document.getElementById('passwordRepeat');
const togglePasswordButton = document.getElementById('togglePassword');
const strengthBar = document.getElementById('strengthBar');
const strengthText = document.getElementById('strengthText');
const accountResult = document.getElementById('accountResult');

function validateLogin(login) {
    if (login === '') return 'Придумайте логин';
    if (!LOGIN_PATTERN.test(login)) return 'Логин: от 3 до 20 символов, только латинские буквы, цифры и _';
    return '';
}

function validatePassword(password) {
    if (password === '') return 'Придумайте пароль';
    if (password.length < PASSWORD_MIN) {
        return `Пароль слишком короткий: ${password.length} из ${PASSWORD_MIN} символов`;
    }
    return '';
}

function validateRepeat(repeat, password) {
    if (repeat === '') return 'Повторите пароль';
    if (repeat !== password) return 'Пароли не совпадают';
    return '';
}

const accountRules = {
    login: () => validateLogin(loginInput.value.trim()),
    accountEmail: () => validateEmail(accountEmailInput.value.trim()),
    password: () => validatePassword(passwordInput.value),
    passwordRepeat: () => validateRepeat(repeatInput.value, passwordInput.value),
};

function checkAccountField(key) {
    return setError(key, accountRules[key]());
}

Object.keys(accountRules).forEach((key) => {
    const input = document.getElementById(key);

    input.addEventListener('blur', () => {
        if (input.value !== '') checkAccountField(key);
    });

    input.addEventListener('input', () => {
        const wasChecked = input.classList.contains('is-invalid') || input.classList.contains('is-valid');
        if (wasChecked) checkAccountField(key);
    });
});

function getPasswordScore(password) {
    let score = 0;
    if (password.length >= PASSWORD_MIN) score++;
    if (password.length >= 12) score++;
    if (/[a-zа-яё]/.test(password) && /[A-ZА-ЯЁ]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-zА-Яа-яЁё0-9]/.test(password)) score++;
    return score;
}

function updateStrength(password) {
    if (password === '') {
        strengthBar.style.width = '0';
        strengthBar.dataset.level = '';
        strengthText.textContent = 'Минимум 8 символов. Цифры, заглавные буквы и знаки делают пароль надёжнее';
        return;
    }

    const score = getPasswordScore(password);
    const isShort = password.length < PASSWORD_MIN;
    let level = 'low';
    if (!isShort && score >= 4) level = 'high';
    else if (!isShort && score >= 3) level = 'mid';

    strengthBar.style.width = (Math.max(score, 1) / 5) * 100 + '%';
    strengthBar.dataset.level = level;
    strengthText.textContent = isShort
        ? `Ещё ${PASSWORD_MIN - password.length} симв. до минимума`
        : STRENGTH_TEXT[level];
}

passwordInput.addEventListener('input', () => {
    updateStrength(passwordInput.value);
    if (repeatInput.value !== '') checkAccountField('passwordRepeat');
});

togglePasswordButton.addEventListener('click', () => {
    const isHidden = passwordInput.type === 'password';
    passwordInput.type = isHidden ? 'text' : 'password';
    repeatInput.type = passwordInput.type;
    togglePasswordButton.textContent = isHidden ? 'Скрыть' : 'Показать';
    togglePasswordButton.setAttribute('aria-pressed', String(isHidden));
});

accountForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const checks = Object.keys(accountRules).map(checkAccountField);

    if (checks.includes(false)) {
        accountResult.hidden = true;
        focusFirstError(accountForm);
        return;
    }

    showResult(accountResult, `
    <h3>Аккаунт создан</h3>
    <dl>
      <dt>Логин</dt><dd>${escapeHtml(loginInput.value.trim())}</dd>
      <dt>E-mail</dt><dd>${escapeHtml(accountEmailInput.value.trim())}</dd>
      <dt>Пароль</dt><dd>${'•'.repeat(passwordInput.value.length)}</dd>
    </dl>
  `);
});

const TICKETS = {
    standard: { title: 'Стандарт', price: 8000 },
    parter: { title: 'Партер', price: 15000 },
    vip: { title: 'VIP', price: 30000 },
};

const EXTRAS = {
    merch: { title: 'Мерч-набор', price: 3500, perTicket: true },
    photo: { title: 'Фото с артистами', price: 2000, perTicket: true },
    parking: { title: 'Парковка', price: 1500, perTicket: false },
};

const QUANTITY_MIN = 1;
const QUANTITY_MAX = 10;
const DISCOUNT_FROM = 5;
const DISCOUNT_RATE = 0.1;

const eventForm = document.getElementById('eventForm');
const categorySelect = document.getElementById('category');
const quantityInput = document.getElementById('quantity');
const totalValue = document.getElementById('totalValue');
const totalNote = document.getElementById('totalNote');
const eventResult = document.getElementById('eventResult');

function validateCategory(category) {
    return category === '' ? 'Выберите категорию билета' : '';
}

function validateQuantity(rawValue) {
    if (rawValue === '') return 'Укажите количество билетов цифрами';
    const quantity = Number(rawValue);
    if (!Number.isInteger(quantity)) return 'Количество должно быть целым числом';
    if (quantity < QUANTITY_MIN || quantity > QUANTITY_MAX) {
        return `Можно забронировать от ${QUANTITY_MIN} до ${QUANTITY_MAX} билетов`;
    }
    return '';
}

function getSelectedExtras() {
    return Array.from(eventForm.querySelectorAll('input[name="extras"]:checked'))
        .map((checkbox) => checkbox.value);
}

function calculateOrder(category, quantity, extras) {
    const ticketsCost = TICKETS[category].price * quantity;
    const extrasCost = extras.reduce((sum, key) => {
        const extra = EXTRAS[key];
        return sum + extra.price * (extra.perTicket ? quantity : 1);
    }, 0);
    const discount = quantity >= DISCOUNT_FROM ? Math.round(ticketsCost * DISCOUNT_RATE) : 0;

    return { ticketsCost, extrasCost, discount, total: ticketsCost + extrasCost - discount };
}

function updatePreview() {
    const category = categorySelect.value;
    const quantityRaw = quantityInput.value;

    if (validateCategory(category) || validateQuantity(quantityRaw)) {
        totalValue.textContent = '—';
        totalNote.textContent = `Выберите категорию и количество от ${QUANTITY_MIN} до ${QUANTITY_MAX}`;
        return;
    }

    const order = calculateOrder(category, Number(quantityRaw), getSelectedExtras());
    totalValue.textContent = formatMoney(order.total);
    totalNote.textContent = order.discount > 0
        ? `Скидка на билеты: −${formatMoney(order.discount)}`
        : `Скидка 10% на билеты при заказе от ${DISCOUNT_FROM} шт.`;
}

eventForm.addEventListener('input', updatePreview);
updatePreview();

eventForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const name = document.getElementById('eventName').value.trim();
    const email = document.getElementById('eventEmail').value.trim();
    const category = categorySelect.value;
    const quantityRaw = quantityInput.value;

    const checks = [
        setError('eventName', validateName(name)),
        setError('eventEmail', validateEmail(email)),
        setError('category', validateCategory(category)),
        setError('quantity', validateQuantity(quantityRaw)),
    ];

    if (checks.includes(false)) {
        eventResult.hidden = true;
        focusFirstError(eventForm);
        return;
    }

    const quantity = Number(quantityRaw);
    const extras = getSelectedExtras();
    const ticket = TICKETS[category];
    const order = calculateOrder(category, quantity, extras);
    const extrasText = extras.length > 0
        ? extras.map((key) => EXTRAS[key].title).join(', ') + ' = ' + formatMoney(order.extrasCost)
        : 'нет';

    showResult(eventResult, `
    <h3>Бронь оформлена</h3>
    <dl>
      <dt>Покупатель</dt><dd>${escapeHtml(name)}, ${escapeHtml(email)}</dd>
      <dt>Билеты</dt><dd>${ticket.title}: ${quantity} × ${formatMoney(ticket.price)} = ${formatMoney(order.ticketsCost)}</dd>
      <dt>Опции</dt><dd>${extrasText}</dd>
      <dt>Скидка</dt><dd>${order.discount > 0 ? '−' + formatMoney(order.discount) : 'нет'}</dd>
      <dt>Итого</dt><dd class="result-total">${formatMoney(order.total)}</dd>
    </dl>
  `);
});

const stepButtons = document.querySelectorAll('.stepper-btn');
const ticketMarks = document.querySelectorAll('#ticketMeter span');

function updateStepper() {
    const quantity = Number.parseInt(quantityInput.value, 10) || 0;

    stepButtons.forEach((button) => {
        const step = Number(button.dataset.step);
        button.disabled = step < 0 ? quantity <= QUANTITY_MIN : quantity >= QUANTITY_MAX;
    });

    ticketMarks.forEach((mark, index) => {
        mark.classList.toggle('is-on', index < quantity);
        mark.classList.toggle('is-discount', quantity >= DISCOUNT_FROM);
    });
}

function spawnBubbles(button) {
    for (let i = 0; i < 3; i++) {
        const bubble = document.createElement('span');
        bubble.className = 'bubble';
        bubble.style.left = 8 + Math.random() * 20 + 'px';
        bubble.style.setProperty('--size', 5 + Math.random() * 6 + 'px');
        bubble.style.setProperty('--drift', (Math.random() - 0.5) * 24 + 'px');
        bubble.style.animationDelay = i * 90 + 'ms';
        bubble.addEventListener('animationend', () => bubble.remove());
        button.append(bubble);
    }
}

stepButtons.forEach((button) => {
    button.addEventListener('click', () => {
        const step = Number(button.dataset.step);
        const current = Number.parseInt(quantityInput.value, 10) || 0;
        const next = Math.min(QUANTITY_MAX, Math.max(QUANTITY_MIN, current + step));
        if (next === current) return;

        quantityInput.value = next;
        quantityInput.classList.remove('bump-up', 'bump-down');
        void quantityInput.offsetWidth;
        quantityInput.classList.add(step > 0 ? 'bump-up' : 'bump-down');
        spawnBubbles(button);

        const wasChecked = quantityInput.classList.contains('is-invalid') || quantityInput.classList.contains('is-valid');
        if (wasChecked) setError('quantity', validateQuantity(quantityInput.value));
        quantityInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
});

quantityInput.addEventListener('input', updateStepper);
updateStepper();

const baitButton = document.getElementById('baitButton');
const backButton = document.getElementById('backButton');
const scene = document.getElementById('scene');
const rod = document.getElementById('rod');
const fishingLine = document.getElementById('fishingLine');
const bobber = document.getElementById('bobber');
const castTarget = document.getElementById('castTarget');
const ripplesLayer = document.getElementById('ripples');
const shimmerLayer = document.getElementById('shimmer');
const sun = document.getElementById('sun');
const sunGlow = document.getElementById('sunGlow');
const catchStatus = document.getElementById('catchStatus');
const catchStatusText = document.getElementById('catchStatusText');
const catchCard = document.getElementById('catchCard');
const catchQuestion = document.getElementById('catchQuestion');
const catchNote = document.getElementById('catchNote');
const castAgainButton = document.getElementById('castAgain');
const answersBox = document.getElementById('answers');
const catchFeedback = document.getElementById('catchFeedback');
const bucket = document.getElementById('bucket');
const bucketMouth = document.getElementById('bucketMouth');
const bucketFish = document.getElementById('bucketFish');
const bucketCount = document.getElementById('bucketCount');
const gift = document.getElementById('gift');
const openGiftButton = document.getElementById('openGift');
const giftMessage = document.getElementById('giftMessage');
const giftText = document.getElementById('giftText');
const playAgainButton = document.getElementById('playAgain');

const SVG_NS = 'http://www.w3.org/2000/svg';
const SCENE_HEIGHT = 600;
const ROD_LENGTH = 560;
const HANG = 70;
const ANGLE_FACTORS = { idle: 0.6, back: 0.2, forward: 0.9, wait: 0.75, lift: 0.35 };

const QUESTIONS = [
    {
        text: 'Что такое HTML-форма?',
        answers: ['Элемент <form>, который собирает данные пользователя через поля ввода', 'Таблица для вывода данных на странице', 'Файл со стилями оформления страницы'],
        explanation: 'Форма объединяет поля input, select, textarea и кнопки, чтобы собрать данные и отправить их.',
    },
    {
        text: 'Для чего используются элементы input, select и button?',
        answers: ['input для ввода данных, select для выбора из списка, button для действия', 'Все три нужны только для вывода текста', 'input делает заголовок, select вставляет картинку, button создаёт ссылку'],
        explanation: 'Это основные элементы управления формы: ввод, выбор и запуск действия.',
    },
    {
        text: 'Чем checkbox отличается от radio?',
        answers: ['В checkbox можно отметить несколько вариантов, в группе radio только один', 'Checkbox всегда круглый, а radio квадратный', 'Ничем, это одно и то же'],
        explanation: 'Radio-кнопки с одинаковым name образуют группу, где выбран только один вариант.',
    },
    {
        text: 'Что такое клиентская валидация?',
        answers: ['Проверка введённых данных в браузере до отправки', 'Проверка пароля администратором сервера', 'Проверка скорости интернета пользователя'],
        explanation: 'Она работает на JavaScript прямо в браузере и сразу подсказывает, что исправить.',
    },
    {
        text: 'Для чего используется событие submit?',
        answers: ['Оно срабатывает при отправке формы, в нём удобно проверять данные', 'Оно срабатывает при каждом нажатии клавиши', 'Оно заново загружает страницу'],
        explanation: 'На submit вешают обработчик, который проверяет поля перед отправкой.',
    },
    {
        text: 'Что делает event.preventDefault()?',
        answers: ['Отменяет стандартное действие браузера, например отправку формы с перезагрузкой', 'Удаляет форму со страницы', 'Очищает все поля формы'],
        explanation: 'Без него форма отправится и страница перезагрузится.',
    },
    {
        text: 'Как получить значение текстового поля в JavaScript?',
        answers: ["Через свойство value: document.getElementById('name').value", 'Через свойство checked', 'Через свойство length у формы'],
        explanation: 'Свойство value хранит текст, который ввёл пользователь.',
    },
    {
        text: 'Как проверить состояние checkbox?',
        answers: ['Через свойство checked: true, если отмечен', 'Через свойство value, оно станет пустым', 'Через свойство selectedIndex'],
        explanation: 'checked возвращает true или false в зависимости от того, стоит ли галочка.',
    },
    {
        text: 'Как получить выбранное значение select?',
        answers: ['Через свойство value у элемента select', 'Через свойство checked у select', 'Через свойство placeholder'],
        explanation: 'select.value возвращает value выбранного option.',
    },
    {
        text: 'Почему клиентская валидация не заменяет серверную?',
        answers: ['Её можно обойти: отключить JavaScript или отправить запрос напрямую', 'Потому что она работает слишком медленно', 'Потому что браузеры не умеют проверять формы'],
        explanation: 'Сервер обязан проверять данные сам, ведь браузер находится под контролем пользователя.',
    },
    {
        text: 'Как сделать сообщение об ошибке понятным пользователю?',
        answers: ['Показать его рядом с полем и написать, что именно исправить', 'Вывести код ошибки, например ERR_42', 'Закрасить всю страницу красным'],
        explanation: 'Хорошее сообщение объясняет проблему и подсказывает решение.',
    },
    {
        text: 'Какие тестовые случаи следует проверить для формы?',
        answers: ['Корректный ввод, пустые поля, неверный формат и граничные значения', 'Только корректный ввод', 'Только внешний вид формы на телефоне'],
        explanation: 'Нужно проверить и правильные данные, и все типичные ошибки.',
    },
];

const FISH_GOAL = 3;

const WISHES = [
    'Пусть жизнь будет как хорошая рыбалка: терпение всегда вознаграждается, а самый большой улов ещё впереди.',
    'Пусть твои ошибки будут как хорошая валидация: вовремя замечены, понятно объяснены и легко исправимы.',
    'Не бойся закидывать удочку снова. Иногда клюёт именно тогда, когда уже собирался уходить.',
    'Пусть в голове будет ясно, как в утреннем озере, а на душе спокойно, как у воды в безветренный день.',
    'Желаю, чтобы рядом всегда были люди, с которыми даже тишина кажется хорошим разговором.',
    'Пусть мечты сбываются без event.preventDefault(): сразу и по-настоящему.',
    'Пусть каждый день приносит хотя бы одну маленькую радость, которую захочется запомнить.',
    'Береги себя: высыпайся, пей воду и почаще смотри на небо. Всё остальное приложится.',
    'Пусть любимое дело однажды начнёт не только радовать, но и кормить.',
    'Пусть все важные проверки в жизни ты проходишь с первого раза, а если нет, то с понятной подсказкой, что исправить.',
];

const game = {
    running: false,
    state: 'idle',
    stateStart: 0,
    waitTime: 0,
    width: 1000,
    pivot: { x: 860, y: 640 },
    length: ROD_LENGTH,
    target: { x: 420, y: 380 },
    aim: -60,
    release: { x: 0, y: 0 },
    deck: [],
    caught: 0,
    statusTimer: 0,
    typingTimer: 0,
    lastWish: -1,
};

const lerp = (from, to, t) => from + (to - from) * t;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const angleFor = (name) => game.aim * ANGLE_FACTORS[name];

function rodTip(angle) {
    const radians = (angle * Math.PI) / 180;
    return {
        x: game.pivot.x + game.length * Math.sin(radians),
        y: game.pivot.y - game.length * Math.cos(radians),
    };
}

function hillPath(baseY, height, ripples) {
    let path = `M0 ${baseY}`;
    for (let x = 0; x <= 5000; x += 20) {
        const shape = ripples.reduce((sum, [length, weight, phase]) => sum + weight * Math.sin(x / length + phase), 0);
        path += ` L${x} ${(baseY - height * (0.55 + shape)).toFixed(1)}`;
    }
    return path + ` L5000 ${baseY} Z`;
}

function buildShimmer(width) {
    shimmerLayer.replaceChildren();
    for (let i = 0; i < 34; i++) {
        const depth = Math.random();
        const y = 262 + depth * depth * 330;
        const length = 6 + (y - 250) * 0.14;
        const x = Math.random() * width;
        const line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('class', 'shimmer-line');
        line.setAttribute('x1', x.toFixed(1));
        line.setAttribute('x2', (x + length).toFixed(1));
        line.setAttribute('y1', y.toFixed(1));
        line.setAttribute('y2', y.toFixed(1));
        line.setAttribute('stroke-width', (1 + depth * 2).toFixed(1));
        line.style.animationDuration = 3 + Math.random() * 4 + 's';
        line.style.animationDelay = -Math.random() * 6 + 's';
        shimmerLayer.append(line);
    }
}

function layoutScene() {
    const width = SCENE_HEIGHT * (gameView.clientWidth / Math.max(gameView.clientHeight, 1));
    game.width = width;
    scene.setAttribute('viewBox', `0 0 ${width.toFixed(1)} ${SCENE_HEIGHT}`);
    game.pivot = { x: width * 0.86, y: 640 };
    game.length = Math.min(ROD_LENGTH, Math.max(300, width * 0.56));
    game.target = { x: width * 0.42, y: width < 600 ? 330 : 380 };
    game.aim = (Math.atan2(game.target.x - game.pivot.x, game.pivot.y - game.target.y) * 180) / Math.PI;

    castTarget.setAttribute('transform', `translate(${game.target.x.toFixed(1)} ${game.target.y})`);
    const bucketScale = Math.min(1, Math.max(0.65, width / 1000));
    bucket.setAttribute('transform', `translate(${(width * 0.14).toFixed(1)} 560) scale(${bucketScale.toFixed(3)})`);
    sun.setAttribute('cx', (width * 0.72).toFixed(1));
    sunGlow.setAttribute('cx', (width * 0.72).toFixed(1));
    buildShimmer(width);
}

function spawnRipples(point) {
    const scale = game.length / ROD_LENGTH;
    for (let i = 0; i < 3; i++) {
        const ripple = document.createElementNS(SVG_NS, 'ellipse');
        ripple.setAttribute('class', 'ripple');
        ripple.setAttribute('cx', point.x.toFixed(1));
        ripple.setAttribute('cy', point.y.toFixed(1));
        ripple.setAttribute('rx', (14 * scale).toFixed(1));
        ripple.setAttribute('ry', (4 * scale).toFixed(1));
        ripple.style.animationDelay = i * 260 + 'ms';
        ripple.addEventListener('animationend', () => ripple.remove());
        ripplesLayer.append(ripple);
    }
}

function setState(state, now = performance.now()) {
    game.state = state;
    game.stateStart = now;
    castTarget.classList.toggle('is-hidden', state !== 'idle');
    bobber.classList.toggle('is-floating', state === 'waiting' || state === 'bite');
}

function showStatus(text, mode) {
    clearTimeout(game.statusTimer);
    catchStatusText.textContent = text;
    catchStatus.classList.toggle('is-bite', mode === 'bite');
    catchStatus.classList.toggle('is-info', mode === 'info');
    catchStatus.hidden = false;
    if (mode === 'info') {
        game.statusTimer = setTimeout(() => {
            catchStatus.hidden = true;
        }, 1800);
    }
}

function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

function nextQuestionIndex() {
    if (game.deck.length === 0) {
        game.deck = shuffle(QUESTIONS.map((_, index) => index));
    }
    return game.deck.pop();
}

function showCatch() {
    const index = nextQuestionIndex();
    const question = QUESTIONS[index];
    const options = shuffle(question.answers.map((text, i) => ({ text, isCorrect: i === 0 })));

    catchQuestion.textContent = question.text;
    catchNote.textContent = `Контрольный вопрос №${index + 1}. Выбери правильный ответ`;
    catchFeedback.hidden = true;
    castAgainButton.hidden = true;
    answersBox.classList.remove('is-answered');
    answersBox.replaceChildren();

    options.forEach((option, i) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'answer';
        button.dataset.correct = String(option.isCorrect);
        button.innerHTML = `<span class="answer-letter">${'АБВ'[i]}</span><span>${escapeHtml(option.text)}</span>`;
        button.addEventListener('click', () => chooseAnswer(button, option.isCorrect, question));
        answersBox.append(button);
    });

    catchCard.classList.remove('is-leaving');
    catchCard.hidden = false;
}

function chooseAnswer(button, isCorrect, question) {
    const buttons = answersBox.querySelectorAll('.answer');
    buttons.forEach((item) => {
        item.disabled = true;
    });
    answersBox.classList.add('is-answered');

    if (isCorrect) {
        button.classList.add('is-correct');
        catchFeedback.className = 'catch-feedback is-good';
        catchFeedback.textContent = 'Верно! Рыба отправляется в ведро';
        catchFeedback.hidden = false;
        setTimeout(sendFishToBucket, 800);
        return;
    }

    button.classList.add('is-wrong');
    buttons.forEach((item) => {
        if (item.dataset.correct === 'true') item.classList.add('is-correct');
    });
    catchFeedback.className = 'catch-feedback is-bad';
    catchFeedback.innerHTML = `Рыба сорвалась! Правильный ответ подсвечен зелёным.<small>${escapeHtml(question.explanation)}</small>`;
    catchFeedback.hidden = false;
    castAgainButton.hidden = false;
    castAgainButton.focus({ preventScroll: true });
}

function addFishToBucket(index) {
    const places = [[-26, -24], [4, 6], [30, 28]];
    const [x, rotation] = places[index % places.length];
    const holder = document.createElementNS(SVG_NS, 'g');
    holder.setAttribute('transform', `translate(${x} -60) rotate(${rotation})`);
    holder.innerHTML = '<g class="bucket-fish-inner"><ellipse class="fish-body" cx="0" cy="-4" rx="7" ry="10"/><path class="fish-tail" d="M0 -12 L-10 -30 L0 -24 L10 -30 Z"/></g>';
    bucketFish.append(holder);
}

function updateBucket() {
    bucketCount.textContent = `${game.caught} / ${FISH_GOAL}`;
}

function sendFishToBucket() {
    const cardBox = catchCard.getBoundingClientRect();
    const mouthBox = bucketMouth.getBoundingClientRect();
    const start = { x: cardBox.left + cardBox.width / 2, y: cardBox.top + cardBox.height / 2 };
    const end = { x: mouthBox.left + mouthBox.width / 2, y: mouthBox.top + mouthBox.height / 2 };
    const peak = Math.min(start.y, end.y) - 140;

    catchCard.classList.add('is-leaving');
    setTimeout(() => {
        catchCard.hidden = true;
    }, 350);

    const fish = document.createElement('div');
    fish.className = 'flying-fish';
    fish.innerHTML = '<svg viewBox="0 0 70 36" aria-hidden="true"><path class="fish-tail" d="M50 18 L68 4 L64 18 L68 32 Z"/><ellipse class="fish-body" cx="30" cy="18" rx="26" ry="13"/><circle class="fish-eye" cx="15" cy="14" r="3"/></svg>';
    gameView.append(fish);

    const flight = fish.animate([
        { transform: `translate(${start.x}px, ${start.y}px) rotate(0deg) scale(1.3)` },
        { transform: `translate(${(start.x + end.x) / 2}px, ${peak}px) rotate(-200deg) scale(1)`, offset: 0.5 },
        { transform: `translate(${end.x}px, ${end.y}px) rotate(-340deg) scale(0.55)` },
    ], { duration: 1000, easing: 'cubic-bezier(0.45, 0, 0.55, 1)', fill: 'forwards' });

    flight.onfinish = () => {
        fish.remove();
        addFishToBucket(game.caught);
        game.caught += 1;
        updateBucket();
        bucket.classList.remove('is-splash');
        void bucket.getBoundingClientRect();
        bucket.classList.add('is-splash');

        if (game.caught >= FISH_GOAL) {
            showStatus('Ведро полное!', 'info');
            setTimeout(showGift, 700);
        } else {
            showStatus(`Улов: ${game.caught} из ${FISH_GOAL}. Закидывай снова`, 'info');
            setState('idle');
            castTarget.focus({ preventScroll: true });
        }
    };
}

function showGift() {
    setState('gift');
    gift.classList.remove('is-open');
    giftMessage.hidden = true;
    openGiftButton.hidden = false;
    playAgainButton.hidden = true;
    gift.hidden = false;
    openGiftButton.focus({ preventScroll: true });
}

function typeText(element, text) {
    clearInterval(game.typingTimer);
    if (reduceMotion.matches) {
        element.textContent = text;
        return;
    }
    let shown = 0;
    element.textContent = '';
    element.classList.add('is-typing');
    game.typingTimer = setInterval(() => {
        shown += 1;
        element.textContent = text.slice(0, shown);
        if (shown >= text.length) {
            clearInterval(game.typingTimer);
            element.classList.remove('is-typing');
        }
    }, 28);
}

function openGift() {
    let index;
    do {
        index = Math.floor(Math.random() * WISHES.length);
    } while (index === game.lastWish && WISHES.length > 1);
    game.lastWish = index;

    gift.classList.add('is-open');
    openGiftButton.hidden = true;
    giftMessage.hidden = false;
    typeText(giftText, WISHES[index]);
    playAgainButton.hidden = false;
}

function resetRound() {
    clearInterval(game.typingTimer);
    game.caught = 0;
    bucketFish.replaceChildren();
    updateBucket();
    gift.hidden = true;
    catchCard.hidden = true;
    setState('idle');
    castTarget.focus({ preventScroll: true });
}

function castLine() {
    if (game.state !== 'idle') return;
    clearTimeout(game.statusTimer);
    catchStatus.hidden = true;
    setState('windup');
}

function renderGame(now) {
    if (!game.running) return;

    const elapsed = now - game.stateStart;
    const scale = game.length / ROD_LENGTH;
    const sway = Math.sin(now / 900) * 1.2;
    let angle = angleFor('idle') + sway;
    let bobberPoint;
    let bobberScale = 1.1;
    let sag = 0;

    if (game.state === 'idle' || game.state === 'caught' || game.state === 'gift') {
        angle = angleFor(game.state === 'idle' ? 'idle' : 'lift') + sway;
        const tip = rodTip(angle);
        bobberPoint = { x: tip.x + Math.sin(now / 700) * 3 * scale, y: tip.y + HANG * scale };
    } else if (game.state === 'windup') {
        const progress = Math.min(elapsed / 350, 1);
        angle = lerp(angleFor('idle'), angleFor('back'), ease(progress));
        const tip = rodTip(angle);
        bobberPoint = { x: tip.x, y: tip.y + HANG * scale * (1 - progress * 0.6) };
        if (progress >= 1) {
            game.release = { ...bobberPoint };
            setState('cast', now);
        }
    } else if (game.state === 'cast') {
        const swing = Math.min(elapsed / 220, 1);
        const flight = Math.min(elapsed / 900, 1);
        angle = lerp(angleFor('back'), angleFor('forward'), ease(swing));
        bobberPoint = {
            x: lerp(game.release.x, game.target.x, flight),
            y: lerp(game.release.y, game.target.y, flight) - Math.sin(flight * Math.PI) * 170 * scale,
        };
        bobberScale = lerp(1.1, 0.75, flight);
        sag = 20 * scale;
        if (flight >= 1) {
            spawnRipples(game.target);
            game.waitTime = 3000 + Math.random() * 1000;
            showStatus('Ждите улова', 'wait');
            setState('waiting', now);
        }
    } else if (game.state === 'waiting') {
        const settle = Math.min(elapsed / 400, 1);
        angle = lerp(angleFor('forward'), angleFor('wait'), ease(settle)) + sway * 0.5;
        bobberPoint = { x: game.target.x, y: game.target.y + Math.sin(now / 450) * 2 };
        bobberScale = 0.75;
        sag = 40 * scale;
        if (elapsed >= game.waitTime) {
            spawnRipples(game.target);
            showStatus('Клюёт!', 'bite');
            setState('bite', now);
        }
    } else if (game.state === 'bite') {
        angle = angleFor('wait') + Math.sin(elapsed / 45) * 1.5;
        const dip = Math.abs(Math.sin((elapsed / 700) * 3 * Math.PI)) * 9;
        bobberPoint = { x: game.target.x, y: game.target.y + dip };
        bobberScale = 0.75;
        sag = 10 * scale;
        if (elapsed >= 700) setState('reel', now);
    } else if (game.state === 'reel') {
        const progress = Math.min(elapsed / 1000, 1);
        const eased = ease(progress);
        angle = lerp(angleFor('wait'), angleFor('lift'), eased);
        const tip = rodTip(angle);
        bobberPoint = {
            x: lerp(game.target.x, tip.x, eased),
            y: lerp(game.target.y, tip.y + HANG * scale, eased) - Math.sin(progress * Math.PI) * 40 * scale,
        };
        bobberScale = lerp(0.75, 1.1, eased);
        if (progress >= 1) {
            catchStatus.hidden = true;
            setState('caught', now);
            showCatch();
        }
    }

    const tip = rodTip(angle);
    const size = bobberScale * scale;
    const lineEndY = bobberPoint.y - 18 * size;
    const controlX = (tip.x + bobberPoint.x) / 2;
    const controlY = (tip.y + lineEndY) / 2 + sag;

    rod.setAttribute('transform', `translate(${game.pivot.x.toFixed(1)} ${game.pivot.y}) rotate(${angle.toFixed(2)}) scale(${scale.toFixed(3)})`);
    bobber.setAttribute('transform', `translate(${bobberPoint.x.toFixed(1)} ${bobberPoint.y.toFixed(1)}) scale(${size.toFixed(3)})`);
    fishingLine.setAttribute('d', `M${tip.x.toFixed(1)} ${tip.y.toFixed(1)} Q${controlX.toFixed(1)} ${controlY.toFixed(1)} ${bobberPoint.x.toFixed(1)} ${lineEndY.toFixed(1)}`);

    requestAnimationFrame(renderGame);
}

function startGame() {
    layoutScene();
    catchCard.hidden = true;
    catchStatus.hidden = true;
    if (game.caught >= FISH_GOAL) {
        showGift();
    } else {
        gift.hidden = true;
        setState('idle');
    }
    if (!game.running) {
        game.running = true;
        requestAnimationFrame(renderGame);
    }
}

function stopGame() {
    game.running = false;
}

function showView(name) {
    const isGame = name === 'game';
    formsView.hidden = isGame;
    gameView.hidden = !isGame;

    const view = isGame ? gameView : formsView;
    view.classList.remove('view-enter');
    void view.offsetWidth;
    view.classList.add('view-enter');

    if (isGame) {
        startGame();
        castTarget.focus({ preventScroll: true });
    } else {
        stopGame();
    }
}

function syncViewWithHash() {
    showView(location.hash === '#game' ? 'game' : 'forms');
}

document.getElementById('farHills').setAttribute('d', hillPath(252, 70, [[310, 0.25, 0.4], [97, 0.15, 2.1], [31, 0.05, 4.4]]));
document.getElementById('nearHills').setAttribute('d', hillPath(252, 24, [[140, 0.2, 1.3], [37, 0.15, 0.2], [11, 0.1, 3.1]]));

baitButton.addEventListener('click', () => {
    location.hash = 'game';
});

backButton.addEventListener('click', () => {
    location.hash = '';
});

castTarget.addEventListener('click', castLine);
castTarget.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        castLine();
    }
});

openGiftButton.addEventListener('click', openGift);
playAgainButton.addEventListener('click', resetRound);

castAgainButton.addEventListener('click', () => {
    catchCard.hidden = true;
    setState('idle');
    castTarget.focus({ preventScroll: true });
});

window.addEventListener('resize', () => {
    if (game.running) layoutScene();
});

window.addEventListener('hashchange', syncViewWithHash);
syncViewWithHash();

document.documentElement.dataset.script = '5';
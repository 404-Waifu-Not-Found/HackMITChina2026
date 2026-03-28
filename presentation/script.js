// ── Slide state ──
let currentSlide = 1;
const totalSlides = 13;
const presentationDuration = 7 * 60; // 7 minutes
let startTime = null;
let timerInterval = null;

// ── Slide navigation ──

function updateSlide() {
    document.querySelectorAll('.slide').forEach((slide, index) => {
        const slideNum = index + 1;
        slide.classList.remove('active', 'prev');
        if (slideNum === currentSlide) {
            slide.classList.add('active');
        } else if (slideNum < currentSlide) {
            slide.classList.add('prev');
        }
    });

    const progress = (currentSlide / totalSlides) * 100;
    document.getElementById('progressBar').style.width = progress + '%';
}

function nextSlide() {
    if (currentSlide < totalSlides) {
        currentSlide++;
        updateSlide();
    }
}

function prevSlide() {
    if (currentSlide > 1) {
        currentSlide--;
        updateSlide();
    }
}

// ── Timer ──

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateTimer() {
    if (!startTime) return;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = Math.max(0, presentationDuration - elapsed);
    document.getElementById('timer').textContent =
        `${formatTime(elapsed)} / 07:00`;

    if (remaining === 0) {
        document.getElementById('timer').style.color = '#ef4444';
    }
}

// ── Keyboard navigation ──

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextSlide();
    } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
    } else if (e.key === 'Home') {
        e.preventDefault();
        currentSlide = 1;
        updateSlide();
    } else if (e.key === 'End') {
        e.preventDefault();
        currentSlide = totalSlides;
        updateSlide();
    }
});

// ── Touch / swipe support ──

let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) nextSlide();
        else prevSlide();
    }
}

// ── Floating words ──

const floatingWords = [
    'Hello', 'World', 'Learn', 'Speak', 'Think',
    '你好', '学习', '语言', '世界', '知识',
    'Hola', 'Mundo', 'Hablar', 'Idioma',
    'Bonjour', 'Monde', 'Parler', 'Langue',
    'Hallo', 'Welt', 'Lernen', 'Sprache',
    'こんにちは', '世界', '学ぶ', '言葉',
    '안녕', '세계', '배우다', '말',
    'مرحبا', 'عالم', 'تعلم', 'لغة',
    'Привет', 'Мир', 'Учить', 'Язык',
    'Olá', 'Mundo', 'Falar', 'Língua',
    'Ciao', 'Mondo', 'Parlare', 'Lingua'
];

// Soft, varied tints per word (randomly assigned)
const floatColors = [
    'rgba(74, 222, 128, 0.12)',
    'rgba(134, 239, 172, 0.10)',
    'rgba(187, 247, 208, 0.08)',
    'rgba(167, 139, 250, 0.10)',
    'rgba(96, 165, 250, 0.09)',
    'rgba(244, 114, 182, 0.09)',
    'rgba(251, 191, 36, 0.08)',
    'rgba(45, 212, 191, 0.10)',
];

/**
 * Spawn a floating word with natural, organic drift.
 *
 * Motion: slow vertical rise + gentle sine-wave horizontal sway.
 * Each word gets unique speed, size, opacity, and drift amplitude
 * for a living, breathing background effect.
 */
function createFloatingWord(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const text = floatingWords[Math.floor(Math.random() * floatingWords.length)];
    const el = document.createElement('div');
    el.className = 'floating-word';
    el.textContent = text;

    // Randomised per-element properties
    const startX = 5 + Math.random() * 90;              // 5-95 % from left
    const fontSize = 13 + Math.random() * 16;            // 13-29 px
    const peakOpacity = 0.06 + Math.random() * 0.14;     // 0.06-0.20 (subtle)
    const duration = 20000 + Math.random() * 22000;       // 20-42 s (slow drift)
    const swayAmount = 20 + Math.random() * 50;           // 20-70 px horizontal
    const swayCycles = 1.5 + Math.random() * 2;           // 1.5-3.5 sine cycles
    const startRotation = -8 + Math.random() * 16;        // slight tilt -8°..+8°

    el.style.left = startX + '%';
    el.style.fontSize = fontSize + 'px';
    el.style.color = floatColors[Math.floor(Math.random() * floatColors.length)];

    container.appendChild(el);

    // Build smooth keyframes
    const keyframes = [];
    const steps = 80;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        // Vertical: 105% → -5% (bottom to above top)
        const y = (1 - t) * 110 - 5;
        // Horizontal sine drift
        const xOffset = Math.sin(t * Math.PI * 2 * swayCycles) * swayAmount;
        // Gentle rotation oscillation
        const rot = startRotation * Math.cos(t * Math.PI * 2);
        // Smooth bell-curve opacity
        let opacity;
        if (t < 0.12) opacity = (t / 0.12) * peakOpacity;
        else if (t > 0.88) opacity = ((1 - t) / 0.12) * peakOpacity;
        else opacity = peakOpacity;

        keyframes.push({
            transform: `translate(${xOffset}px, ${y}vh) rotate(${rot}deg)`,
            opacity: opacity,
            offset: t
        });
    }

    const anim = el.animate(keyframes, {
        duration: duration,
        easing: 'linear',  // keyframes already have smooth curves built in
        fill: 'forwards'
    });

    anim.onfinish = () => el.remove();
}

function initFloatingWords() {
    // Staggered initial burst
    for (let i = 0; i < 18; i++) {
        const delay = Math.random() * 8000; // spread over 8 s
        setTimeout(() => createFloatingWord('floatingWords1'), delay);
        setTimeout(() => createFloatingWord('floatingWords12'), delay);
    }

    // Continuous organic spawning
    function scheduleNext(id) {
        const delay = 1200 + Math.random() * 2800; // 1.2-4 s
        setTimeout(() => {
            if (document.getElementById(id)) {
                createFloatingWord(id);
            }
            scheduleNext(id);
        }, delay);
    }
    scheduleNext('floatingWords1');
    scheduleNext('floatingWords12');
}

// ── Initialise ──

startTime = Date.now();
timerInterval = setInterval(updateTimer, 1000);
updateSlide();
initFloatingWords();

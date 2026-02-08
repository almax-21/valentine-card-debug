// Глобальные переменные
const iframe = document.getElementById('outputFrame');
const diffBtn = document.getElementById('diffBtn');
const opacityValue = document.getElementById('opacityValue');
const compareModal = document.getElementById('compareModal');
const successOverlay = document.getElementById('successOverlay');
const confettiContainer = document.getElementById('confettiContainer');

/**
 * Изменяет прозрачность iframe
 */
function changeOpacity(value) {
    iframe.style.opacity = value;
    opacityValue.textContent = Math.round(value * 100) + '%';
}

/**
 * Переключает режим различий
 */
function toggleDiff() {
    iframe.classList.toggle('diff');
    diffBtn.classList.toggle('active');
}

/**
 * Закрывает модальное окно
 */
function closeModal() {
    compareModal.style.display = 'none';
}

/**
 * Загружает изображение и возвращает Promise
 */
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Ошибка загрузки изображения: ' + src));
        img.src = src;
    });
}

/**
 * Сравнивает скриншоты
 */
async function compareScreenshots() {
    const compareBtn = document.getElementById('compareBtn');
    compareBtn.disabled = true;
    compareBtn.textContent = '⏳ Сравнение...';

    // Цвет фона — совпадает с body в styles/output.css,
    // используется и для html2canvas, и для reference-canvas, чтобы
    // фон не давал ложных несовпадений.
    const VALENTINE_BG = '#f2f2f2';

    let prevIframeWidth;
    let prevIframeHeight;
    let iframeResized = false;

    try {
        // Грузим эталон первым — его натуральный размер становится
        // каноническим размером сравнения, не зависящим от окна / devtools.
        const referenceImg = await loadImage('./images/input.png');
        const canonicalWidth = referenceImg.naturalWidth;
        const canonicalHeight = referenceImg.naturalHeight;

        // Временно фиксируем iframe в каноническом размере,
        // чтобы html2canvas снял вёрстку в воспроизводимом виде.
        prevIframeWidth = iframe.style.width;
        prevIframeHeight = iframe.style.height;
        iframe.style.width = canonicalWidth + 'px';
        iframe.style.height = canonicalHeight + 'px';
        iframeResized = true;

        // Даём браузеру пересчитать layout iframe после ресайза.
        await new Promise(requestAnimationFrame);

        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        const iframeBody = iframeDoc.body;

        const canvas = await html2canvas(iframeBody, {
            width: canonicalWidth,
            height: canonicalHeight,
            windowWidth: canonicalWidth,
            windowHeight: canonicalHeight,
            scale: 1,
            useCORS: true,
            allowTaint: true,
            backgroundColor: VALENTINE_BG
        });

        // Возвращаем iframe к прежним размерам сразу после снимка.
        iframe.style.width = prevIframeWidth;
        iframe.style.height = prevIframeHeight;
        iframeResized = false;

        const screenshotDataUrl = canvas.toDataURL('image/png');

        // Эталонный canvas того же канонического размера — масштабирование
        // не требуется, рисуем изображение 1:1.
        const refCanvas = document.createElement('canvas');
        refCanvas.width = canonicalWidth;
        refCanvas.height = canonicalHeight;
        const refCtx = refCanvas.getContext('2d');
        refCtx.fillStyle = VALENTINE_BG;
        refCtx.fillRect(0, 0, refCanvas.width, refCanvas.height);
        refCtx.drawImage(referenceImg, 0, 0, canonicalWidth, canonicalHeight);

        const referenceDataUrl = refCanvas.toDataURL('image/png');

        resemble(referenceDataUrl)
            .compareTo(screenshotDataUrl)
            .ignoreAntialiasing()
            .onComplete(function(data) {
                const matchPercent = 100 - parseFloat(data.misMatchPercentage);

                document.getElementById('diffPercent').textContent = data.misMatchPercentage + '%';
                document.getElementById('matchPercent').textContent = matchPercent.toFixed(2) + '%';

                document.getElementById('referencePreview').src = referenceDataUrl;
                document.getElementById('screenshotPreview').src = screenshotDataUrl;
                document.getElementById('diffPreview').src = data.getImageDataUrl();

                if (matchPercent >= 99) {
                    showSuccessAnimation(matchPercent);
                } else {
                    compareModal.style.display = 'flex';
                }

                compareBtn.disabled = false;
                compareBtn.textContent = '📸 Сравнить с эталоном';
            });
    } catch (error) {
        if (iframeResized) {
            iframe.style.width = prevIframeWidth;
            iframe.style.height = prevIframeHeight;
        }
        console.error('Ошибка при сравнении:', error);
        alert('Произошла ошибка при сравнении: ' + error.message);
        compareBtn.disabled = false;
        compareBtn.textContent = '📸 Сравнить с эталоном';
    }
}

/**
 * Показывает анимацию успеха с конфетти
 */
function showSuccessAnimation(matchPercent) {
    // Устанавливаем процент совпадения
    document.getElementById('successPercent').textContent = matchPercent.toFixed(2);
    
    // Очищаем предыдущее конфетти
    confettiContainer.innerHTML = '';
    
    // Создаём конфетти — цвета в айдентике проекта (жёлтый + чёрный + серый)
    const colors = ['#FED42B', '#fee47c', '#1A1D1D', '#F2F2F2', '#333333', '#666666'];
    const shapes = ['square', 'circle'];
    
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti ' + shapes[Math.floor(Math.random() * shapes.length)];
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 1.5 + 's';
        confetti.style.animationDuration = (Math.random() * 1 + 1.5) + 's';
        confettiContainer.appendChild(confetti);
    }
    
    // Показываем оверлей
    successOverlay.classList.add('active');
    
    // Скрываем через 2 секунды и показываем модальное окно
    setTimeout(() => {
        successOverlay.classList.remove('active');
        compareModal.style.display = 'flex';
    }, 2000);
}

/**
 * Инициализация обработчиков событий
 */
function initEventHandlers() {
    // Обработчик кнопки режима различий
    diffBtn.addEventListener('click', toggleDiff);

    // Обработчик кнопки сравнения
    document.getElementById('compareBtn').addEventListener('click', compareScreenshots);

    // Обработчик слайдера прозрачности
    const opacitySlider = document.getElementById('opacitySlider');
    opacitySlider.addEventListener('input', (e) => changeOpacity(e.target.value));
    opacitySlider.addEventListener('change', (e) => changeOpacity(e.target.value));

    // Закрытие модального окна при клике вне его
    window.addEventListener('click', (event) => {
        if (event.target === compareModal) {
            closeModal();
        }
    });

    // Закрытие модального окна по кнопке
    document.querySelector('.modal-close').addEventListener('click', closeModal);

    // Закрытие анимации успеха при клике
    successOverlay.addEventListener('click', function() {
        this.classList.remove('active');
        compareModal.style.display = 'flex';
    });
}

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', initEventHandlers);
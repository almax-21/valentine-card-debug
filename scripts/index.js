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
 * Сравнивает скриншоты
 */
async function compareScreenshots() {
    const compareBtn = document.getElementById('compareBtn');
    compareBtn.disabled = true;
    compareBtn.textContent = '⏳ Сравнение...';

    try {
        // Получаем содержимое iframe
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        const iframeBody = iframeDoc.body;

        // Создаём скриншот содержимого iframe
        const canvas = await html2canvas(iframeBody, {
            width: iframe.offsetWidth,
            height: iframe.offsetHeight,
            scale: 1,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff'
        });

        const screenshotDataUrl = canvas.toDataURL('image/png');

        // Загружаем эталонное изображение
        const referenceImg = new Image();
        referenceImg.crossOrigin = 'anonymous';
        
        referenceImg.onload = function() {
            // Создаём canvas для эталонного изображения с тем же размером
            const refCanvas = document.createElement('canvas');
            refCanvas.width = canvas.width;
            refCanvas.height = canvas.height;
            const refCtx = refCanvas.getContext('2d');
            refCtx.fillStyle = '#ffffff';
            refCtx.fillRect(0, 0, refCanvas.width, refCanvas.height);
            
            // Масштабируем эталонное изображение
            const scale = Math.min(
                refCanvas.width / referenceImg.width,
                refCanvas.height / referenceImg.height
            );
            const x = (refCanvas.width - referenceImg.width * scale) / 2;
            const y = (refCanvas.height - referenceImg.height * scale) / 2;
            refCtx.drawImage(referenceImg, x, y, referenceImg.width * scale, referenceImg.height * scale);
            
            const referenceDataUrl = refCanvas.toDataURL('image/png');

            // Сравниваем изображения с помощью Resemble.js
            resemble(referenceDataUrl)
                .compareTo(screenshotDataUrl)
                .ignoreAntialiasing()
                .onComplete(function(data) {
                    const matchPercent = 100 - parseFloat(data.misMatchPercentage);
                    
                    // Показываем результаты
                    document.getElementById('diffPercent').textContent = data.misMatchPercentage + '%';
                    document.getElementById('matchPercent').textContent = matchPercent.toFixed(2) + '%';
                    
                    document.getElementById('referencePreview').src = referenceDataUrl;
                    document.getElementById('screenshotPreview').src = screenshotDataUrl;
                    document.getElementById('diffPreview').src = data.getImageDataUrl();
                    
                    // Если совпадение более 99%, показываем анимацию успеха
                    if (matchPercent >= 99) {
                        showSuccessAnimation(matchPercent);
                    } else {
                        compareModal.style.display = 'flex';
                    }
                    
                    compareBtn.disabled = false;
                    compareBtn.textContent = '📸 Сравнить с эталоном';
                });
        };

        referenceImg.onerror = function() {
            alert('Ошибка загрузки эталонного изображения');
            compareBtn.disabled = false;
            compareBtn.textContent = '📸 Сравнить с эталоном';
        };

        referenceImg.src = './images/input.png';

    } catch (error) {
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
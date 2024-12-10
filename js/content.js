console.log('[Content] 脚本开始加载');

// 状态变量
let strengthIncreaseInterval = null;
const STRENGTH_INCREASE_INTERVAL = 30000;  // 每30秒增加一次强度
const STRENGTH_INCREASE_AMOUNT = 2;        // 每次增加2点强度

// 添加一个用于追踪最近使用过的消息的变量
let recentMessages = [];

// 创建强度显示
function createStrengthDisplay() {
    const display = document.createElement('div');
    display.id = 'strength-display';
    display.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(253, 242, 248, 0.95);
        color: #abb2bf;
        padding: 15px 20px;
        border-radius: 15px;
        z-index: 10000;
        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        font-size: 14px;
        box-shadow: 0 4px 15px rgba(255, 182, 193, 0.2);
        backdrop-filter: blur(5px);
        border: 1px solid rgba(255, 182, 193, 0.3);
        min-width: 150px;
        transition: all 0.3s ease;
    `;

    const title = document.createElement('div');
    title.style.cssText = `
        font-weight: 600;
        color: #ff6b8b;
        margin-bottom: 10px;
        text-align: center;
        border-bottom: 1px solid rgba(255, 192, 203, 0.3);
        padding-bottom: 8px;
        font-size: 15px;
        letter-spacing: 1px;
    `;
    title.innerHTML = '💗 主人的小玩具 💗';

    const channelA = createChannelDisplay('A通道', 'strength-a');
    const channelB = createChannelDisplay('B通道', 'strength-b');
    const timer = createTimerDisplay();

    display.appendChild(title);
    display.appendChild(channelA);
    display.appendChild(channelB);
    display.appendChild(timer);
    document.body.appendChild(display);

    // 添加悬停效果
    display.onmouseover = () => {
        display.style.transform = 'translateY(2px)';
        display.style.boxShadow = '0 6px 20px rgba(255, 182, 193, 0.3)';
    };
    display.onmouseout = () => {
        display.style.transform = 'translateY(0)';
        display.style.boxShadow = '0 4px 15px rgba(255, 182, 193, 0.2)';
    };
}

function createChannelDisplay(label, id) {
    const container = document.createElement('div');
    container.style.cssText = `
        margin: 8px 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;

    const labelSpan = document.createElement('span');
    // 根据通道设置不同名称
    if (label === 'A通道') {
        labelSpan.innerHTML = '🌸 前边强度';  // 或 '💗 左边'
    } else {
        labelSpan.innerHTML = '🌺 后边强度';  // 或 '💕 右边'
    }
    labelSpan.style.color = '#98c379';

    const valueSpan = document.createElement('span');
    valueSpan.id = id;
    valueSpan.textContent = '0';
    valueSpan.style.cssText = `
        font-weight: 600;
        color: #e06c75;
        min-width: 30px;
        text-align: right;
        transition: all 0.3s ease;
        position: relative;
        display: inline-block;
    `;

    container.appendChild(labelSpan);
    container.appendChild(valueSpan);
    return container;
}

function createTimerDisplay() {
    const container = document.createElement('div');
    container.style.cssText = `
        margin-top: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        padding-top: 8px;
    `;

    const labelSpan = document.createElement('span');
    labelSpan.innerHTML = '⏰ 已经玩耍';  // 更可爱的时间标签
    labelSpan.style.color = '#98c379';

    const timeContainer = document.createElement('div');
    timeContainer.style.display = 'flex';
    timeContainer.style.alignItems = 'center';

    const valueSpan = document.createElement('span');
    valueSpan.id = 'time-elapsed';
    valueSpan.textContent = '0';
    valueSpan.style.cssText = `
        font-weight: 600;
        color: #61afef;
        min-width: 30px;
        text-align: right;
        margin-right: 3px;
    `;

    const unitSpan = document.createElement('span');
    unitSpan.textContent = '秒';
    unitSpan.style.color = '#61afef';

    timeContainer.appendChild(valueSpan);
    timeContainer.appendChild(unitSpan);

    container.appendChild(labelSpan);
    container.appendChild(timeContainer);
    return container;
}

// 修改强度增长曲线函数
function calculateStrengthIncrease(elapsed) {
    const minutes = elapsed / 60000;  // 转换为分钟
    let increase;
    
    if (minutes <= 5) {
        // 前5分钟，快速起步
        increase = minutes * 2;  // 每分钟增加2点
    } else if (minutes <= 15) {
        // 5-15分钟，加速增长
        increase = 10 + (minutes - 5) * 3;  // 从10点开始，每分钟增加3点
    } else {
        // 15分钟后，指数增长
        increase = 40 + Math.pow(minutes - 15, 1.5) * 2;  // 从40点开始，指数增长
    }
    
    // 确保增长不会超过上限
    return Math.min(Math.round(increase), 100);
}

// 修改 startStrengthIncrease 函数
function startStrengthIncrease() {
    if (strengthIncreaseInterval) return;

    let startTime = Date.now();
    let lastIncrease = 0;
    let timeDisplay = document.getElementById('time-elapsed');

    // 每秒更新时间显示
    setInterval(() => {
        const elapsed = Date.now() - startTime;
        timeDisplay.textContent = Math.floor(elapsed / 1000);
    }, 1000);

    // 立即发送第一次脉冲
    chrome.runtime.sendMessage({ 
        type: 'START_PULSE'
    });

    // 每60秒发送一次脉冲
    setInterval(() => {
        chrome.runtime.sendMessage({ 
            type: 'START_PULSE'
        });
    }, 60000);

    // 定期增加强度，同时显示提示消息
    strengthIncreaseInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newIncrease = calculateStrengthIncrease(elapsed);
        
        if (newIncrease > lastIncrease) {
            const messages = [
                "哼哼～强度又要上升了呢～",
                "啊啦～变得更强了呢～能承受住吗？",
                "还不够哦～让我们继续增加吧～",
                "这样的强度还满足不了主人呢～",
                "乖巧的孩子就要接受更多惩罚呢～",
                "感受到了吗？主人在慢慢加重呢～",
                "这点程度应该还可以继续吧？",
                "真乖～让我们再增加一点点～",
                "还不够呢～再稍微加强一些吧～",
                "主人很温柔的在增加强度哦～"
            ];

            let message;
            do {
                message = messages[Math.floor(Math.random() * messages.length)];
            } while (recentMessages.includes(message) && recentMessages.length < messages.length);

            recentMessages.push(message);
            if (recentMessages.length > 3) {
                recentMessages.shift();
            }

            showNotification('info', message);
            lastIncrease = newIncrease;
        }

        chrome.runtime.sendMessage({ 
            type: 'INCREASE_STRENGTH',
            amount: STRENGTH_INCREASE_AMOUNT
        });
    }, STRENGTH_INCREASE_INTERVAL);
}

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'STRENGTH_UPDATE') {
        updateStrengthWithAnimation(document.getElementById('strength-a'), message.strength.A || 0);
        updateStrengthWithAnimation(document.getElementById('strength-b'), message.strength.B || 0);
    }
    else if (message.type === 'SHOW_NOTIFICATION') {
        showNotification(message.notificationType, message.message);
    }
});

// 添加提示显示函数
function showNotification(type, message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 24px;
        border-radius: 20px;
        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        font-size: 14px;
        font-weight: 500;
        z-index: 10001;
        animation: notification-slide-in 0.3s ease-out, notification-slide-out 0.3s ease-in 2.7s;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 8px;
        opacity: 0;
        backdrop-filter: blur(5px);
    `;

    // 根据类型设置不同的样式
    if (type === 'success') {
        notification.style.background = 'rgba(255, 241, 242, 0.95)';
        notification.style.border = '1px solid #fecdd3';
        notification.style.color = '#e11d48';
        message = `✨ ${message}`;
    } else if (type === 'error') {
        notification.style.background = 'rgba(253, 242, 248, 0.95)';
        notification.style.border = '1px solid #fbcfe8';
        notification.style.color = '#be185d';
        message = `💕 ${message}`;
    } else if (type === 'info') {
        notification.style.background = 'rgba(243, 244, 246, 0.95)';
        notification.style.border = '1px solid #e5e7eb';
        notification.style.color = '#ff6b8b';
        message = `💝 ${message}`;
    }

    notification.textContent = message;

    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes notification-slide-in {
            from {
                transform: translate(-50%, -100%);
                opacity: 0;
            }
            to {
                transform: translate(-50%, 0);
                opacity: 1;
            }
        }
        @keyframes notification-slide-out {
            from {
                transform: translate(-50%, 0);
                opacity: 1;
            }
            to {
                transform: translate(-50%, -100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);
    setTimeout(() => notification.style.opacity = '1', 0);
    setTimeout(() => notification.remove(), 3000);
}

// 添加数值更新动画函数
function updateStrengthWithAnimation(element, newValue) {
    const oldValue = parseInt(element.textContent);
    if (oldValue === newValue) return;

    // 添加缩放动画
    element.style.transform = 'scale(1.2)';
    setTimeout(() => element.style.transform = 'scale(1)', 300);

    // 根据数值变化设置颜色
    if (newValue > oldValue) {
        element.style.color = '#f43f5e';  // 增加时显示亮粉色
        element.style.textShadow = '0 0 8px rgba(244, 63, 94, 0.5)';  // 添加发光效果
    } else if (newValue < oldValue) {
        element.style.color = '#22c55e';  // 减少时显示绿色
        element.style.textShadow = '0 0 8px rgba(34, 197, 94, 0.5)';
    }

    // 300ms后恢复原始颜色
    setTimeout(() => {
        element.style.color = '#e06c75';
        element.style.textShadow = 'none';
    }, 300);

    // 更新数值
    element.textContent = newValue;

    // 添加波纹效果
    const ripple = document.createElement('span');
    ripple.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 20px;
        height: 20px;
        background: currentColor;
        border-radius: 50%;
        opacity: 0.5;
        pointer-events: none;
        animation: ripple 0.6s ease-out;
    `;

    // 添加波纹动画样式
    if (!document.querySelector('#ripple-style')) {
        const style = document.createElement('style');
        style.id = 'ripple-style';
        style.textContent = `
            @keyframes ripple {
                from {
                    transform: translate(-50%, -50%) scale(0);
                    opacity: 0.5;
                }
                to {
                    transform: translate(-50%, -50%) scale(2);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    element.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

// 初始化逻辑
function initialize() {
    console.log('[Content] 开始初始化');
    
    // 确保 DOM 已经加载
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAfterLoad);
    } else {
        initializeAfterLoad();
    }
}

function initializeAfterLoad() {
    console.log('[Content] DOM已加载，开始创建UI');
    
    // 检查是否在题目页面
    if (window.location.pathname.includes('/problems/')) {
        console.log('[Content] 检测到题目页面');
        createStrengthDisplay();
        startStrengthIncrease();
    } else {
        console.log('[Content] 不是题目页面，跳过初始化');
    }
}

// 启动初始化
initialize();
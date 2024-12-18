console.log('[Content] 脚本开始加载');

// 状态变量
let strengthIncreaseInterval = null;
const STRENGTH_INCREASE_INTERVAL = 3000;  // 每3秒增加一次强度
let STRENGTH_INCREASE_AMOUNT = 0;        // 初始增长强度为0

// 添加一个用于追踪最近使用过的消息的变量
let recentMessages = [];

// 为每个通道添加最后更新时间和实际值
let lastUpdate = {
    A: { time: 0, actualValue: 0 },
    B: { time: 0, actualValue: 0 }
};
const UPDATE_THROTTLE = 500; // 500ms内只更新一次

// 添加惩罚对话集合
const PUNISHMENT_MESSAGES = [
    "哼哼～这点惩罚可不够呢～想要更多吗？",
    "啊～又做错了呢，该好好惩罚一下了～",
    "诶嘿～这就是错误的代价哦～",
    "呜呜～怎么又错了，要加倍惩罚才行呢～",
    "笨笨的～这样下去会被玩坏的哦～",
    "嘻嘻～这么喜欢被惩罚吗？",
    "啊啦啦～看来还需要更多管教呢～",
    "不乖的孩子就要接受惩罚哦～",
    "真是个小笨蛋呢，这么简单都能错～",
    "呐呐～这样的惩罚还受得了吗？",
    "哎呀～又要惩罚你了呢～",
    "这么喜欢犯错的话，人家就不客气了哦～"
];

// 添加奖励对话集合
const REWARD_MESSAGES = [
    "真棒呢～这次就稍微奖励一下吧～",
    "啊～太厉害了呢～",
    "诶嘿～做得好棒，要给奖励哦～",
    "呜呜～好厉害，让人家好感动～",
    "真是个天才呢～这题都能做对～",
    "嘻嘻～乖孩子就要给糖吃哦～",
    "啊啦啦～看来进步了呢～",
    "好孩子值得奖励呢～",
    "真是太聪明了，这么快就做对了～",
    "呐呐～这样的奖励喜欢吗？",
    "做得不错呢～让人家好开心～",
    "真是个优秀的孩子呢～"
];

// 修改强度上升的消息数组
const STRENGTH_INCREASE_MESSAGES = [
    "哼哼～强度要上升了哦～",
    "啊啦～变得更强了呢～还能继续吗？",
    "还不够呢～让人家继续加强吧～",
    "这样的强度还不够呢～再增加一点～",
    "乖巧的孩子要接受更多惩罚呢～",
    "感受到了吗？人家在慢慢加重哦～",
    "这点程度应该还可以继续吧？",
    "嘻嘻～让我们再增加一点点～",
    "呐呐～强度又要提升了呢～",
    "人家温柔地增加强度中～",
    "时间越久越舒服对吧～",
    "让人家帮你调高一点呢～"
];

// 添加消息历史记录
const messageHistory = {
    punishment: [],
    reward: [],
    increase: []
};

// 封装随机消息选择函数
function getRandomMessage(type) {
    let messages;
    switch(type) {
        case 'punishment':
            messages = PUNISHMENT_MESSAGES;
            break;
        case 'reward':
            messages = REWARD_MESSAGES;
            break;
        case 'increase':
            messages = STRENGTH_INCREASE_MESSAGES;
            break;
    }

    // 直接随机选择一条消息
    return messages[Math.floor(Math.random() * messages.length)];
}

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
    title.innerHTML = '💗 小玩具状态 💗';

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
    const minutes = Math.round(elapsed/ 1000);  // 转换为秒
    let increase;
    
    if (minutes < 10) {
        // 10秒前不惩罚
        increase = 0;  // 每分钟增加2点
    } else if (minutes >= 10 && minutes < 20) {
        // 10秒-20秒，速率2
        increase = 2;
    } else if (minutes >= 20 && minutes < 30) {
        // 20秒后 速率5
        increase = 5
    } else if (minutes >= 30 && minutes < 60) {
        increase = 10;
    } else if ( minutes >= 60) {
        increase = 100
    }
    return increase
}
// 设置答题开始时间
let startTime = Date.now();
let lastIncrease = 0;
// 修改 startStrengthIncrease 函数
function startStrengthIncrease() {
    if (strengthIncreaseInterval) return;

    let timeDisplay = document.getElementById('time-elapsed');

    // 每更新时间显示
    setInterval(() => {
        const elapsed = Date.now() - startTime;
        timeDisplay.textContent = Math.floor(elapsed / 1000);
    }, 1000);

    // 立即发送第一次脉冲
    chrome.runtime.sendMessage({ 
        type: 'START_PULSE'
    });

    // 每60秒发送次脉冲
    setInterval(() => {
        chrome.runtime.sendMessage({ 
            type: 'START_PULSE'
        });
    }, 60000);

    // 定期增加强度，同时显示提示消息
    strengthIncreaseInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newIncrease = calculateStrengthIncrease(elapsed);
        const message = getRandomMessage('increase');
        if (newIncrease > lastIncrease) {
            showNotification('info', message);
            STRENGTH_INCREASE_AMOUNT = newIncrease;
            lastIncrease = newIncrease;
        }
        chrome.runtime.sendMessage({
            type: 'INCREASE_STRENGTH',
            amount: STRENGTH_INCREASE_AMOUNT
        });
    }, STRENGTH_INCREASE_INTERVAL);

}
/**/
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

// 修改强度更新函数
function updateStrengthWithAnimation(element, newValue) {
    const channel = element.id === 'strength-a' ? 'A' : 'B';
    const now = Date.now();

    // 记录实际值
    lastUpdate[channel].actualValue = newValue;

    // 检查是否需要节流
    if (now - lastUpdate[channel].time < UPDATE_THROTTLE) {
        // 在节流时间内，设置一个定时器在结束后检查值
        if (!lastUpdate[channel].timeoutId) {
            lastUpdate[channel].timeoutId = setTimeout(() => {
                lastUpdate[channel].timeoutId = null;
                // 检查显示值是否与实际值一致
                const displayValue = parseInt(element.textContent);
                if (displayValue !== lastUpdate[channel].actualValue) {
                    updateStrengthWithAnimation(element, lastUpdate[channel].actualValue);
                }
            }, UPDATE_THROTTLE);
        }
        return;
    }

    const oldValue = parseInt(element.textContent);
    if (oldValue === newValue) return;

    // 更新最后更新时间
    lastUpdate[channel].time = now;

    // 添加缩放动画
    element.style.transform = 'scale(1.2)';
    setTimeout(() => element.style.transform = 'scale(1)', 300);

    // 根据数值变化设置颜色
    if (newValue > oldValue) {
        element.style.color = '#f43f5e';
        element.style.textShadow = '0 0 8px rgba(244, 63, 94, 0.5)';
    } else if (newValue < oldValue) {
        element.style.color = '#22c55e';
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
    
    // 检测是否在题目页面
    if (window.location.pathname.includes('/app')) {
        console.log('[Content] 检测到题目页面');
        createStrengthDisplay();
        startStrengthIncrease();
    } else {
        console.log('[Content] 不是题目页面，跳过初始化');
    }
}

// 修改显示消息的函数
function showPunishmentMessage() {
    const message = getRandomMessage('punishment');
    showNotification('error', message);
}

function showRewardMessage() {
    const message = getRandomMessage('reward');
    showNotification('success', message);
}


let previousHasWrongAnswer = false; // 用于保存上一题是否存在wronganswer类的selectItem元素
let previousHasRightAnswer = false; // 用于保存上一题是否存在rightanswer类的selectItem元素
// 定义一个函数来检查元素是否符合条件，和之前类似，但这里是在内容脚本里直接操作DOM
function checkSelectItemElements() {
    const selectItems = document.querySelectorAll('.selectItem');
    let hasWrongAnswer = false;
    let hasRightAnswer = false;
    selectItems.forEach((item) => {
        if (item.classList.contains('wronganswer')) {
            hasWrongAnswer = true;
            previousHasWrongAnswer = true;
        }else if (item.classList.contains('rightanswer')) {
            hasRightAnswer = true;
            previousHasWrongAnswer = true;
        }
    });
    return { hasWrongAnswer , hasRightAnswer };
}

// 监听页面加载完成事件（对于初始内容），加载完成后发送消息告知后台脚本
window.addEventListener('load', () => {
    let isQuizContainerExist = false; // 标记是否存在id为quiz的容器元素
    let isSelectItemClickEventLoaded = false; // 用于标记是否已经为selectItem元素挂载过点击事件
    // 启动监听，当且为题目页面时为选项挂载点击事件
    const observer = new MutationObserver((mutationsList) => {
        mutationsList.forEach((mutation) => {
            if (mutation.type === 'childList' || mutation.type === 'attributes') {
                const targetContainer = document.getElementById('quiz');
                const quizControlUl = document.querySelector('ul.quiz-control');
                if (targetContainer &&!isQuizContainerExist) {
                    // 当首次发现quiz容器存在时
                    isQuizContainerExist = true;
                    initSelectItemClickEvents(targetContainer); // 调用函数初始化挂载点击事件
                    initNextQuestionLiClickEvent(quizControlUl); // 调用函数初始化“下一题”li元素点击事件
                    isSelectItemClickEventLoaded = true;
                } else if (!targetContainer && isQuizContainerExist) {
                    // 当quiz容器消失时（可根据实际需求添加相应处理逻辑，这里简单重置标记）
                    isQuizContainerExist = false;
                    isSelectItemClickEventLoaded = false;
                } else if (targetContainer && isQuizContainerExist) {
                    // 当quiz容器存在且之前已发现过，重新挂载所有selectItem元素的点击事件以及更新“下一题”li元素点击事件
                    initSelectItemClickEvents(targetContainer);
                    initNextQuestionLiClickEvent(quizControlUl);
                }
            }
        });
    });

    const config = { attributes: true, childList: true, subtree: true };
    observer.observe(document.documentElement, config);
    //点击答案选项事件触发的函数
    function initSelectItemClickEvents(container) {
        const selectItems = container.querySelectorAll('.selectItem');
        selectItems.forEach((item) => {
            if (!item.hasAttribute('data-click-event-loaded')) {
                item.addEventListener('click', function (event) {
                    if (!previousHasRightAnswer &&!previousHasWrongAnswer){
                        event.stopPropagation();
                        const result = checkSelectItemElements();
                        chrome.runtime.sendMessage({
                            type: 'CHECK_ELEMENTS_RESULT',
                            result
                        });
                        previousHasWrongAnswer = result.hasWrongAnswer; // 用于保存上一题是否存在wronganswer类的selectItem元素
                        previousHasRightAnswer = result.hasRightAnswer;
                        startTime = Date.now();
                        lastIncrease = 0;
                        STRENGTH_INCREASE_AMOUNT = 0;
                    }
                });
                if (previousHasRightAnswer) {
                    const result = checkSelectItemElements();
                    previousHasWrongAnswer = result.hasWrongAnswer; // 用于保存上一题是否存在wronganswer类的selectItem元素
                    previousHasRightAnswer = result.hasRightAnswer;
                }
                item.setAttribute('data-click-event-loaded', 'true');
            }
        });
    }
    //点击切换题目选项和显示答案选项触发的函数
    function initNextQuestionLiClickEvent(quizControlUl) {
        if (quizControlUl) {
            const lis = quizControlUl.querySelectorAll('li');
            lis.forEach((li) => {
                if (li.textContent.trim() === '下一题' &&!li.hasAttribute('data-click-event-loaded')) {
                    li.addEventListener('click', function (event) {
                        event.stopPropagation();
                        if (!previousHasWrongAnswer && !previousHasRightAnswer) {
                            const result = { hasWrongAnswer: true };
                            chrome.runtime.sendMessage({
                                type: 'CHECK_ELEMENTS_RESULT',
                                result
                            });
                        }else{
                            previousHasWrongAnswer = false;
                            previousHasRightAnswer = false;
                        }
                        startTime = Date.now();
                        lastIncrease = 0;
                        STRENGTH_INCREASE_AMOUNT = 0;
                    });
                    li.setAttribute('data-click-event-loaded', 'true');
                }else if (li.textContent.trim() === "显示答案" && !li.hasAttribute('data-click-event-loaded')) {
                    li.addEventListener('click', function (event) {
                        event.stopPropagation();
                        const result = { hasWrongAnswer: true };
                        chrome.runtime.sendMessage({
                            type: 'CHECK_ELEMENTS_RESULT',
                            result
                        });
                        previousHasWrongAnswer = true;
                        startTime = Date.now();
                        lastIncrease = 0;
                        STRENGTH_INCREASE_AMOUNT = 0;
                    })
                    li.setAttribute('data-click-event-loaded', 'true');
                }else if (li.textContent.trim() === "上一题" && !li.hasAttribute('data-click-event-loaded')) {
                    li.addEventListener('click', function (event) {
                        event.stopPropagation();
                        const result = checkSelectItemElements();
                        if (result.hasWrongAnswer || result.hasRightAnswer) {
                        }else {
                            previousHasWrongAnswer = false;
                            previousHasRightAnswer = false;
                        }
                        startTime = Date.now();
                        lastIncrease = 0;
                        STRENGTH_INCREASE_AMOUNT = 0;
                    })
                    li.setAttribute('data-click-event-loaded', 'true');
                }
            });
        }
    }
});
// 接收来自后台脚本的消息并根据消息类型执行相应操作
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.type === 'CHECK_ELEMENTS_INITIAL') {
        const result = checkSelectItemElements();
        // 将初始检查结果发送回后台脚本
        chrome.runtime.sendMessage({
            type: 'CHECK_ELEMENTS_RESULT',
            result
        });
    } else if (message.type === 'CHECK_ELEMENTS_ON_CHANGE') {
        const result = checkSelectItemElements();
        // 将DOM变化后的检查结果发送回后台脚本
        chrome.runtime.sendMessage({
            type: 'CHECK_ELEMENTS_RESULT',
            result
        });
    } else if (message.type === 'CHECK_ELEMENTS_AFTER_REQUEST') {
        // 这里可以根据后台脚本传递的url等信息模拟获取响应内容并检查元素（类似之前直接拦截请求的逻辑简化处理）
        fetch(message.url)
            .then(response => response.text())
            .then(responseText => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = responseText;
                document.body.appendChild(tempDiv);
                const result = checkSelectItemElements();
                tempDiv.remove();
                // 将请求相关检查结果发送回后台脚本
                chrome.runtime.sendMessage({
                    type: 'CHECK_ELEMENTS_RESULT',
                    result
                });
            })
            .catch(e => {
                console.error('[Content] 处理响应内容失败:', e);
            });
    } else if (message.type === 'STRENGTH_UPDATE') {
        updateStrengthWithAnimation(document.getElementById('strength-a'), message.strength.A || 0);
        updateStrengthWithAnimation(document.getElementById('strength-b'), message.strength.B || 0);
    }
    else if (message.type === 'SHOW_NOTIFICATION') {
        if (message.notificationType === 'PUNISHMENT') {
            showPunishmentMessage();
        } else if (message.notificationType === 'REWARD') {
            showRewardMessage();
        }
    }
});
// 启动初始化
initialize();